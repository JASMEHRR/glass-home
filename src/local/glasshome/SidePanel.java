package local.glasshome;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Matrix;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.PixelFormat;
import android.graphics.RectF;
import android.graphics.SweepGradient;
import android.graphics.Typeface;
import android.os.SystemClock;
import android.text.SpannableString;
import android.text.Spanned;
import android.text.TextUtils;
import android.text.style.ForegroundColorSpan;
import android.util.TypedValue;
import android.view.Choreographer;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.widget.TextView;

import java.util.ArrayList;
import java.util.List;

/**
 * Jarvis over any app, without covering it: Glass Home's Jarvis orb (the big Jarvis screen's sphere
 * of dots) in the bottom-right corner, turning faster while it thinks; Jarvis's answer in a speech
 * bubble coming out of it, word by word in step with the voice; and a glow running around the screen
 * edges while Jarvis is busy. An accessibility overlay (needs Guard), so it never takes the remote.
 *
 * Everything moves on the display's frame clock (Choreographer), not Android's animators: this TV has
 * "animation scale" off, which freezes ValueAnimator and view animations.
 */
final class SidePanel implements Choreographer.FrameCallback {
    private static final long HIDE_AFTER_DONE = 5_000, HIDE_IDLE = 45_000, LEAD_MS = 180;
    private static SidePanel shown;

    private final Guard host;
    private final WindowManager wm;
    private final FrameLayout root;
    private final Edges edges;
    private final JarvisOrb orb;
    private final Bubble bubble;
    private boolean leaving, removed;

    // fades, eased every frame towards their targets
    private float edgeA = 0f, edgeTo = 1f, bubbleK = 0f, bubbleTo = 0f;
    // the orb's size rides a spring: it pops out of the corner with an overshoot and collapses back
    private float orbS = 0f, orbV = 0f, orbTo = 1f;
    private long hideAt, leftAt;

    // the answer, and how much of it the voice has reached
    private String full = "";
    private long speakStart, speakDur;
    private float shownChars = -1;
    private long lastFrame;

    /** kind: open | you | jarvis | state (listening/thinking/speaking) | done | close. Main thread. */
    static boolean handle(String kind, String text) {
        Guard g = Guard.running;
        if (g == null) return false;
        if ("close".equals(kind)) {
            if (shown != null) shown.hideSoon(0);
            return true;
        }
        if (shown == null || shown.leaving) shown = new SidePanel(g);
        shown.on(kind, text == null ? "" : text);
        return true;
    }

    /** The voice started and lasts about durMs: the answer appears along with it. Main thread. */
    static void speaking(long durMs) {
        SidePanel p = shown;
        if (p == null || p.leaving || durMs <= 0) return;
        p.speakStart = SystemClock.uptimeMillis();
        p.speakDur = durMs;
        p.setState("speaking");
        if (!p.full.isEmpty()) p.bubbleTo = 1f;
    }

    /** Pico reports where it is in the text: the reveal follows the real voice from there. */
    static void spokenUpTo(int end, int total) {
        SidePanel p = shown;
        if (p == null || p.leaving || total <= 0 || p.speakDur <= 0) return;
        p.speakStart = SystemClock.uptimeMillis() - Math.round(Math.min(1f, end / (float) total) * p.speakDur);
    }

    private SidePanel(Guard g) {
        host = g;
        wm = (WindowManager) g.getSystemService(Context.WINDOW_SERVICE);
        root = new FrameLayout(g);

        edges = new Edges(g, dp(1));
        root.addView(edges, new FrameLayout.LayoutParams(-1, -1));

        int orbSize = dp(92), right = dp(18), bottom = dp(12);
        orb = new JarvisOrb(g);
        FrameLayout.LayoutParams op = new FrameLayout.LayoutParams(orbSize, orbSize, Gravity.END | Gravity.BOTTOM);
        op.rightMargin = right;
        op.bottomMargin = bottom;
        root.addView(orb, op);

        bubble = new Bubble(g, dp(1));
        FrameLayout.LayoutParams bp = new FrameLayout.LayoutParams(-2, -2, Gravity.END | Gravity.BOTTOM);
        bp.rightMargin = right + orbSize / 2 - dp(8); // sits on top of the orb, tail pointing down into it
        bp.bottomMargin = bottom + orbSize - dp(2);  // and clear of Glass Home's dock
        root.addView(bubble, bp);

        WindowManager.LayoutParams w = new WindowManager.LayoutParams(WindowManager.LayoutParams.MATCH_PARENT, WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE
                        | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
                PixelFormat.TRANSLUCENT);
        wm.addView(root, w);
        orb.setScaleX(0f);
        orb.setScaleY(0f);
        bubble.setAlpha(0f);
        Choreographer.getInstance().postFrameCallback(this);
    }

    private void on(String kind, String text) {
        hideSoon(HIDE_IDLE);
        switch (kind) {
            case "you": // only Jarvis's answer is shown; your words start the thinking
                full = "";
                speakDur = 0;
                shownChars = -1;
                bubbleTo = 0f;
                setState("thinking");
                break;
            case "jarvis": // held back until the voice starts (or shown whole when there is no voice)
                full = text;
                speakDur = 0;
                shownChars = -1;
                paint(0);
                break;
            case "state": setState(text); break;
            case "done":
                speakDur = 0;
                paint(full.length());
                if (!full.isEmpty()) bubbleTo = 1f;
                edgeTo = 0f;
                orb.set("idle");
                hideSoon(Math.min(14_000, HIDE_AFTER_DONE + 40L * full.length()));
                break;
            default: setState("listening"); break;
        }
    }

    private void setState(String s) {
        orb.set(s);
        edges.set(JarvisOrb.color(s), "thinking".equals(s) ? 2.4f : "speaking".equals(s) ? 1.6f : 1f);
        edgeTo = 1f;
    }

    private void hideSoon(long ms) {
        hideAt = SystemClock.uptimeMillis() + ms;
    }

    @Override
    public void doFrame(long nanos) {
        if (removed) return;
        long now = SystemClock.uptimeMillis();
        float dt = lastFrame == 0 ? 0.016f : Math.min((now - lastFrame) / 1000f, 0.05f);
        lastFrame = now;
        if (!leaving && now >= hideAt) { // going out: the bubble folds into the orb first
            leaving = true;
            leftAt = now;
            bubbleTo = 0f;
            edgeTo = 0f;
        }
        if (leaving && now - leftAt > 170) orbTo = 0f; // then the orb collapses into the corner

        edgeA += (edgeTo - edgeA) * (1 - (float) Math.exp(-dt * (leaving ? 9 : 6)));
        bubbleK += (bubbleTo - bubbleK) * (1 - (float) Math.exp(-dt * (leaving ? 18 : 14)));
        edges.setAlpha(edgeA);
        // orb spring: stiff and a little bouncy coming in, quicker and flatter going out
        float stiff = orbTo > 0 ? 260f : 420f, damp = orbTo > 0 ? 17f : 30f;
        orbV += ((orbTo - orbS) * stiff - orbV * damp) * dt;
        orbS = Math.max(0f, orbS + orbV * dt);
        orb.setScaleX(orbS);
        orb.setScaleY(orbS);
        orb.setAlpha(Math.min(1f, orbS * 1.5f));
        if (leaving) orb.spin(dt * 6f * (1f - orbS)); // it whirls as it shrinks
        // the bubble grows out of its tail (and shrinks back into it), with a little overshoot
        float pop = bubbleK < 0.01f ? 0f : bubbleK + (leaving ? 0f : 0.08f * (float) Math.sin(Math.min(1f, bubbleK) * Math.PI));
        bubble.setAlpha(Math.min(1f, bubbleK * 1.4f));
        bubble.setPivotX(bubble.getWidth());
        bubble.setPivotY(bubble.getHeight());
        bubble.setScaleX(0.15f + 0.85f * pop);
        bubble.setScaleY(0.15f + 0.85f * pop);

        if (speakDur > 0 && !full.isEmpty()) {
            float f = Math.min(1f, (now - speakStart + LEAD_MS) / (float) speakDur);
            paint(f * full.length());
        }
        orb.step(dt);
        edges.step(dt);

        if (leaving && orbS < 0.02f && orbTo == 0f && bubbleK < 0.02f && edgeA < 0.02f) {
            removed = true;
            try {
                wm.removeView(root);
            } catch (RuntimeException ignored) {
                // already gone (the service restarted)
            }
            if (shown == this) shown = null;
            return;
        }
        Choreographer.getInstance().postFrameCallback(this);
    }

    /** Whole words up to chars are white; the word being said fades in; the rest is laid out but clear. */
    private void paint(float chars) {
        if (shownChars >= 0 && Math.abs(chars - shownChars) < 0.5f) return;
        shownChars = chars;
        SpannableString s = new SpannableString(full);
        int n = full.length(), at = 0;
        while (at < n) {
            int end = full.indexOf(' ', at);
            if (end < 0) end = n;
            float a = end <= chars ? 1f : at >= chars ? 0f : (chars - at) / Math.max(1, end - at);
            if (a < 1f) s.setSpan(new ForegroundColorSpan(Color.argb(Math.round(255 * a), 255, 255, 255)), at, end, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
            at = end + 1;
        }
        bubble.setText(s);
    }

    private int dp(float v) {
        return Math.round(v * host.getResources().getDisplayMetrics().density);
    }

    /** A speech bubble: dark glass, rounded, with its tail at the bottom right pointing at the orb. */
    private static final class Bubble extends TextView {
        private final Paint fill = new Paint(Paint.ANTI_ALIAS_FLAG), edge = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final Path path = new Path();
        private final RectF box = new RectF();
        private final float u, tail;

        Bubble(Context c, float dp) {
            super(c);
            u = dp;
            tail = 12 * dp;
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
            setTextColor(Color.WHITE);
            setTypeface(Typeface.create("sans-serif-medium", Typeface.NORMAL));
            setLineSpacing(0, 1.14f);
            setMaxLines(5);
            setEllipsize(TextUtils.TruncateAt.END);
            setMaxWidth(Math.round(400 * dp));
            setPadding(Math.round(16 * dp), Math.round(11 * dp), Math.round(16 * dp), Math.round(12 * dp + tail));
            fill.setColor(Color.argb(215, 14, 19, 31));
            edge.setStyle(Paint.Style.STROKE);
            edge.setStrokeWidth(dp);
            edge.setColor(Color.argb(60, 255, 255, 255));
            setWillNotDraw(false);
        }

        @Override
        protected void onDraw(Canvas c) {
            float w = getWidth(), h = getHeight() - tail, r = 18 * u;
            path.reset();
            box.set(0, 0, w, h);
            path.addRoundRect(box, r, r, Path.Direction.CW);
            Path t = new Path(); // tail: from the bubble's bottom edge down-right towards the orb
            t.moveTo(w - 46 * u, h - 1);
            t.lineTo(w - 22 * u, h - 1);
            t.lineTo(w - 6 * u, h + tail);
            t.close();
            path.op(t, Path.Op.UNION);
            c.drawPath(path, fill);
            c.drawPath(path, edge);
            super.onDraw(c);
        }
    }

    /**
     * Glass Home's Jarvis orb (assets/ui/orb.js, the big Jarvis screen's settings: 140 dots, 3 links
     * each): a fibonacci sphere of dots with neuron links, turning; states change colour, speed, how
     * many dots are lit and a shimmer.
     */
    private static final class JarvisOrb extends View {
        // sp, act, r, g, b, lk, gl  (same values as orb.js)
        private static final float[] IDLE = {0.3f, 0.6f, 94, 234, 212, 1.2f, 0.1f};
        private static final float[] LISTENING = {0.55f, 0.86f, 56, 189, 248, 1.5f, 0.25f};
        private static final float[] THINKING = {1.8f, 1.0f, 167, 139, 250, 2.2f, 0.15f};
        private static final float[] SPEAKING = {0.8f, 0.93f, 94, 234, 212, 1.6f, 0.6f};
        private static final int N = 140;

        private final float[][] pts = new float[N][3];
        private final List<int[]> links = new ArrayList<>();
        private final float[] px = new float[N], py = new float[N], pz = new float[N];
        private final float[] cur = LISTENING.clone();
        private float[] target = LISTENING;
        private final Paint line = new Paint(Paint.ANTI_ALIAS_FLAG), dot = new Paint(Paint.ANTI_ALIAS_FLAG);
        private float ang = (float) (Math.random() * 6.28), t;

        static int color(String s) {
            float[] v = of(s);
            return Color.rgb(Math.round(v[2]), Math.round(v[3]), Math.round(v[4]));
        }

        private static float[] of(String s) {
            return "thinking".equals(s) ? THINKING : "speaking".equals(s) ? SPEAKING : "idle".equals(s) ? IDLE : LISTENING;
        }

        JarvisOrb(Context c) {
            super(c);
            double gold = Math.PI * (3 - Math.sqrt(5));
            for (int i = 0; i < N; i++) {
                double y = 1 - (i / (double) (N - 1)) * 2, r = Math.sqrt(1 - y * y), a = gold * i;
                pts[i][0] = (float) (Math.cos(a) * r);
                pts[i][1] = (float) y;
                pts[i][2] = (float) (Math.sin(a) * r);
            }
            java.util.Set<Long> seen = new java.util.HashSet<>();
            for (int i = 0; i < N; i++) { // each dot links to its 3 nearest
                int[] best = {-1, -1, -1};
                float[] bd = {9, 9, 9};
                for (int j = 0; j < N; j++) {
                    if (i == j) continue;
                    float dx = pts[i][0] - pts[j][0], dy = pts[i][1] - pts[j][1], dz = pts[i][2] - pts[j][2], d = dx * dx + dy * dy + dz * dz;
                    for (int s = 0; s < 3; s++) {
                        if (d < bd[s]) {
                            for (int q = 2; q > s; q--) { bd[q] = bd[q - 1]; best[q] = best[q - 1]; }
                            bd[s] = d;
                            best[s] = j;
                            break;
                        }
                    }
                }
                for (int j : best) {
                    int lo = Math.min(i, j), hi = Math.max(i, j);
                    if (seen.add((long) lo * N + hi)) links.add(new int[]{lo, hi});
                }
            }
            line.setStyle(Paint.Style.STROKE);
        }

        void set(String s) { target = of(s); }

        void spin(float extra) { ang += extra; }

        void step(float dt) {
            t += dt;
            float k = (float) (1 - Math.exp(-dt * 3.5));
            for (int i = 0; i < cur.length; i++) cur[i] += (target[i] - cur[i]) * k;
            ang += cur[0] * dt;
            invalidate();
        }

        @Override
        protected void onDraw(Canvas c) {
            float size = Math.min(getWidth(), getHeight()), half = size / 2, rad = size * 0.4f, persp = size * 1.6f;
            float wob = (float) Math.sin(t * 0.25) * 0.3f, ca = (float) Math.cos(ang), sa = (float) Math.sin(ang), cw = (float) Math.cos(wob), sn = (float) Math.sin(wob);
            for (int i = 0; i < N; i++) {
                float[] d = pts[i];
                float x = d[0] * ca + d[2] * sa, z = -d[0] * sa + d[2] * ca, y = d[1] * cw - z * sn;
                z = d[1] * sn + z * cw;
                float sc = persp / (persp - z * rad);
                px[i] = half + x * rad * sc;
                py[i] = half + y * rad * sc;
                pz[i] = z;
            }
            int act = Math.round(cur[1] * N), r = Math.round(cur[2]), g = Math.round(cur[3]), b = Math.round(cur[4]);
            line.setStrokeWidth(Math.max(0.8f, size / 160));
            for (int[] l : links) {
                if (l[0] >= act || l[1] >= act) continue;
                float dp = (pz[l[0]] + pz[l[1]]) / 2, al = Math.min(1f, (0.07f + 0.2f * (dp + 1) * 0.5f) * cur[5]);
                line.setColor(Color.argb(Math.round(255 * al), r, g, b));
                c.drawLine(px[l[0]], py[l[0]], px[l[1]], py[l[1]], line);
            }
            float db = Math.max(1.2f, size / 70);
            int rr = Math.min(255, r + 70), gg = Math.min(255, g + 25), bb = Math.min(255, b + 35);
            for (int j = 0; j < act; j++) {
                float dd = (pz[j] + 1) * 0.5f, sh = 1 + cur[6] * (float) (Math.sin(t * 7 + j * 1.7) * Math.sin(t * 3.1 + j * 0.9));
                dot.setColor(Color.argb(Math.round(255 * Math.max(0f, Math.min(1f, (0.3f + 0.7f * dd) * sh))), rr, gg, bb));
                c.drawCircle(px[j], py[j], db * (0.55f + 0.8f * dd), dot);
            }
        }
    }

    /** The screen-edge glow: light travelling around the border, fading inward. */
    private static final class Edges extends View {
        private final Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final Matrix m = new Matrix();
        private final RectF r = new RectF();
        private final float unit;
        private int color = Color.rgb(56, 189, 248);
        private float speed = 1f, phase;

        Edges(Context c, float dp) {
            super(c);
            unit = dp;
            p.setStyle(Paint.Style.STROKE);
        }

        void set(int c, float s) { color = c; speed = s; }

        void step(float dt) {
            phase += speed * dt;
            if (getAlpha() > 0.01f) invalidate();
        }

        private static int alpha(int c, float a) {
            return Color.argb(Math.round(255 * Math.max(0f, Math.min(1f, a))), Color.red(c), Color.green(c), Color.blue(c));
        }

        @Override
        protected void onDraw(Canvas c) {
            float w = getWidth(), h = getHeight(), cx = w / 2f, cy = h / 2f;
            int lite = Color.rgb(Math.min(255, Color.red(color) + 90), Math.min(255, Color.green(color) + 60), 255);
            SweepGradient sg = new SweepGradient(cx, cy, new int[]{alpha(color, 0.15f), alpha(lite, 1f), alpha(color, 0.5f), alpha(0xff7c3aed, 0.9f), alpha(color, 0.15f)}, null);
            m.setRotate(phase * 120f, cx, cy);
            sg.setLocalMatrix(m);
            p.setShader(sg);
            float strength = 0.75f + 0.25f * (float) Math.sin(phase * Math.PI * 2 * 0.7f);
            float[] widths = {4, 12, 26, 44}; // wider and fainter inward: a soft glow without a costly blur
            float[] alphas = {1f, 0.45f, 0.18f, 0.07f};
            for (int i = 0; i < widths.length; i++) {
                float sw = widths[i] * unit;
                p.setStrokeWidth(sw);
                p.setAlpha(Math.round(255 * alphas[i] * strength));
                r.set(sw / 2, sw / 2, w - sw / 2, h - sw / 2);
                c.drawRoundRect(r, 18 * unit, 18 * unit, p);
            }
        }
    }
}
