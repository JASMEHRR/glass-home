package local.glasshome;

import android.animation.ValueAnimator;
import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Matrix;
import android.graphics.Paint;
import android.graphics.PixelFormat;
import android.graphics.RadialGradient;
import android.graphics.RectF;
import android.graphics.Shader;
import android.graphics.SweepGradient;
import android.graphics.Typeface;
import android.os.Handler;
import android.os.Looper;
import android.text.TextUtils;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.view.animation.LinearInterpolator;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

/**
 * Jarvis over any app, without covering it: a small swirling orb in the bottom-left corner with what
 * you said and Jarvis's answer in small text beside it, and a glow that runs around the edges of the
 * screen while Jarvis listens, thinks and speaks. An accessibility overlay (needs Guard), so it never
 * takes the remote's focus. Everything fades away a few seconds after Jarvis is done.
 */
final class SidePanel {
    private static final long HIDE_AFTER_DONE = 6_000, HIDE_IDLE = 45_000;
    private static final Handler ui = new Handler(Looper.getMainLooper());
    private static SidePanel shown;

    private final Guard host;
    private final WindowManager wm;
    private final FrameLayout root;
    private final Edges edges;
    private final Orb orb;
    private final TextView you, answer;
    private final Runnable hide = this::hide;
    private boolean leaving;

    /** kind: open | you | jarvis | state (listening/thinking/speaking) | done | close. Main thread. */
    static boolean handle(String kind, String text) {
        Guard g = Guard.running;
        if (g == null) return false;
        if ("close".equals(kind)) {
            if (shown != null) shown.hide();
            return true;
        }
        if (shown == null || shown.leaving) shown = new SidePanel(g);
        shown.on(kind, text == null ? "" : text);
        return true;
    }

    private SidePanel(Guard g) {
        host = g;
        wm = (WindowManager) g.getSystemService(Context.WINDOW_SERVICE);
        root = new FrameLayout(g);

        edges = new Edges(g, dp(1));
        root.addView(edges, new FrameLayout.LayoutParams(-1, -1));

        LinearLayout corner = new LinearLayout(g);
        corner.setGravity(Gravity.CENTER_VERTICAL);
        orb = new Orb(g);
        corner.addView(orb, new LinearLayout.LayoutParams(dp(46), dp(46)));
        LinearLayout words = new LinearLayout(g);
        words.setOrientation(LinearLayout.VERTICAL);
        you = text(12, Color.rgb(147, 197, 253), 1);
        answer = text(14, Color.WHITE, 3);
        words.addView(you);
        words.addView(answer);
        LinearLayout.LayoutParams wp = new LinearLayout.LayoutParams(dp(400), -2);
        wp.leftMargin = dp(12);
        corner.addView(words, wp);
        FrameLayout.LayoutParams cp = new FrameLayout.LayoutParams(-2, -2, Gravity.START | Gravity.BOTTOM);
        cp.leftMargin = dp(40);
        MainActivity home = MainActivity.current;
        cp.bottomMargin = dp(home != null && home.resumed ? 116 : 30); // above Glass Home's dock
        root.addView(corner, cp);

        WindowManager.LayoutParams w = new WindowManager.LayoutParams(WindowManager.LayoutParams.MATCH_PARENT, WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE
                        | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
                PixelFormat.TRANSLUCENT);
        wm.addView(root, w);

        root.setAlpha(0f);
        root.animate().alpha(1f).setDuration(220).start();
        orb.setScaleX(0.4f);
        orb.setScaleY(0.4f);
        orb.animate().scaleX(1f).scaleY(1f).setDuration(320).start();
        orb.start();
        edges.start();
    }

    private void on(String kind, String text) {
        ui.removeCallbacks(hide);
        switch (kind) {
            case "you":
                you.setText(text);
                answer.setText("");
                setState("thinking");
                pop(you);
                break;
            case "jarvis":
                answer.setText(text);
                pop(answer);
                break;
            case "state": setState(text); break;
            case "done":
                edges.fadeOut();
                orb.setState(Color.rgb(125, 211, 252), 1f);
                // time to read it: longer answers stay up longer
                ui.postDelayed(hide, Math.min(16_000, HIDE_AFTER_DONE + 45L * answer.getText().length()));
                return;
            default: setState("listening"); break;
        }
        ui.postDelayed(hide, HIDE_IDLE);
    }

    private void setState(String s) {
        int c = "thinking".equals(s) ? Color.rgb(167, 139, 250) : "speaking".equals(s) ? Color.rgb(45, 212, 191) : Color.rgb(56, 189, 248);
        float speed = "thinking".equals(s) ? 2.4f : "speaking".equals(s) ? 1.6f : 1f;
        orb.setState(c, speed);
        edges.setState(c, speed);
    }

    private void pop(View v) {
        v.setAlpha(0f);
        v.setTranslationX(dp(-10));
        v.animate().alpha(1f).translationX(0).setDuration(220).start();
    }

    private void hide() {
        if (leaving) return;
        leaving = true;
        ui.removeCallbacks(hide);
        root.animate().alpha(0f).setDuration(260).withEndAction(() -> {
            orb.stop();
            edges.stop();
            try {
                wm.removeView(root);
            } catch (RuntimeException ignored) {
                // already gone (the service restarted)
            }
            if (shown == this) shown = null;
        }).start();
    }

    private TextView text(int sp, int color, int lines) {
        TextView t = new TextView(host);
        t.setTextSize(TypedValue.COMPLEX_UNIT_SP, sp);
        t.setTextColor(color);
        t.setTypeface(Typeface.create("sans-serif-medium", Typeface.NORMAL));
        t.setMaxLines(lines);
        t.setEllipsize(TextUtils.TruncateAt.END);
        t.setLineSpacing(0, 1.12f);
        t.setShadowLayer(dp(6), 0, dp(1), Color.argb(230, 0, 0, 0)); // readable over any picture, no box
        return t;
    }

    private int dp(float v) {
        return Math.round(v * host.getResources().getDisplayMetrics().density);
    }

    /** Shared clock for the two animations; speed changes keep the phase continuous. */
    private abstract static class Spin extends View {
        final ValueAnimator tick = ValueAnimator.ofFloat(0f, 1f);
        int color = Color.rgb(56, 189, 248);
        float speed = 1f, phase;
        private long last;

        Spin(Context c) {
            super(c);
            tick.setDuration(1000);
            tick.setRepeatCount(ValueAnimator.INFINITE);
            tick.setInterpolator(new LinearInterpolator());
            tick.addUpdateListener(a -> {
                long now = System.nanoTime();
                if (last != 0) phase += speed * (now - last) / 1e9f;
                last = now;
                invalidate();
            });
        }

        void setState(int c, float s) { color = c; speed = s; }
        void start() { last = 0; tick.start(); }
        void stop() { tick.cancel(); }

        static int alpha(int c, float a) {
            return Color.argb(Math.round(255 * Math.max(0f, Math.min(1f, a))), Color.red(c), Color.green(c), Color.blue(c));
        }
    }

    /** The small orb: a bright core and three arcs swirling around it at different speeds. */
    private static final class Orb extends Spin {
        private final Paint core = new Paint(Paint.ANTI_ALIAS_FLAG), arc = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final RectF box = new RectF();
        private final Matrix m = new Matrix();

        Orb(Context c) {
            super(c);
            arc.setStyle(Paint.Style.STROKE);
            arc.setStrokeCap(Paint.Cap.ROUND);
        }

        @Override
        protected void onDraw(Canvas c) {
            float cx = getWidth() / 2f, cy = getHeight() / 2f, r = Math.min(cx, cy);
            float breathe = 0.5f + 0.5f * (float) Math.sin(phase * Math.PI * 2 * 0.8f);
            float cr = r * (0.34f + 0.05f * breathe);
            core.setShader(new RadialGradient(cx, cy, r * 0.62f, new int[]{Color.WHITE, alpha(color, 0.9f), alpha(color, 0f)},
                    new float[]{0f, cr / (r * 0.62f), 1f}, Shader.TileMode.CLAMP));
            c.drawCircle(cx, cy, r * 0.62f, core);
            for (int i = 0; i < 3; i++) {
                float rr = r * (0.66f + 0.13f * i), turn = phase * 360f * (i % 2 == 0 ? 1f : -0.7f) * (1.1f - 0.2f * i) + i * 120f;
                arc.setStrokeWidth(r * (0.1f - 0.022f * i));
                SweepGradient sg = new SweepGradient(cx, cy, new int[]{alpha(color, 0f), alpha(color, 0.95f - 0.25f * i), alpha(color, 0f)}, new float[]{0f, 0.35f, 0.7f});
                m.setRotate(turn, cx, cy);
                sg.setLocalMatrix(m);
                arc.setShader(sg);
                box.set(cx - rr, cy - rr, cx + rr, cy + rr);
                c.drawArc(box, turn, 250f, false, arc);
            }
        }
    }

    /** The screen-edge glow: light travelling around the border, fading inward. */
    private static final class Edges extends Spin {
        private final Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final Matrix m = new Matrix();
        private final RectF r = new RectF();
        private final float unit;
        private float strength = 1f;

        Edges(Context c, float dp) {
            super(c);
            unit = dp;
            p.setStyle(Paint.Style.STROKE);
        }

        void fadeOut() { animate().alpha(0f).setDuration(500).start(); }

        @Override
        void setState(int c, float s) {
            super.setState(c, s);
            if (getAlpha() < 1f) animate().alpha(1f).setDuration(200).start();
        }

        @Override
        protected void onDraw(Canvas c) {
            float w = getWidth(), h = getHeight(), cx = w / 2f, cy = h / 2f;
            int lite = Color.rgb(Math.min(255, Color.red(color) + 90), Math.min(255, Color.green(color) + 60), 255);
            SweepGradient sg = new SweepGradient(cx, cy, new int[]{alpha(color, 0.15f), alpha(lite, 1f), alpha(color, 0.5f), alpha(0xff7c3aed, 0.9f), alpha(color, 0.15f)}, null);
            m.setRotate(phase * 120f, cx, cy);
            sg.setLocalMatrix(m);
            p.setShader(sg);
            strength = 0.75f + 0.25f * (float) Math.sin(phase * Math.PI * 2 * 0.7f);
            // a few strokes, wider and fainter inward: a soft glow without a costly blur
            float[] widths = {4, 12, 26, 44};
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
