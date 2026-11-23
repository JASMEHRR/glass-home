package local.glasshome;

import android.accessibilityservice.AccessibilityService;
import android.app.ActivityOptions;
import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.graphics.PixelFormat;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.view.View;
import android.view.ViewTreeObserver;
import android.view.WindowManager;
import android.os.Bundle;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;

/**
 * Puts Glass Home back when Fire OS shows Amazon's home screen, and puts the TV to sleep on request.
 *
 * Adapted from dumbtv home's Guard (MIT License, Copyright (c) 2026 dumbtv contributors,
 * github.com/humblemuzzu/dumbtv). Fire OS keeps HOME bound to Amazon's launcher, so this service
 * waits for Amazon's home window and replaces it. The launch goes through an alarm-fired
 * PendingIntent (sent by system_server, so exempt from the five-second app-switch delay); that only
 * fires at once with alarm_manager_constants min_futurity=0, which dumbtv's installer already set.
 * Amazon's home is hidden under a black cover window until ours has drawn.
 */
public final class Guard extends AccessibilityService {
    static final String AMAZON = "com.amazon.tv.launcher";
    private static final String AMAZON_HOME = "com.amazon.tv.launcher.ui.HomeActivity_vNext";
    private static final long COVER_MAX_MS = 1500;
    private static final long LAUNCH_FALLBACK_MS = 150;

    private static volatile boolean paused;
    private static volatile Guard running;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Runnable uncover = this::uncover;
    private final Runnable launch = () -> home(this);
    private final HomeRetry homeRetry = new HomeRetry();
    private final Runnable retry = this::retryHome;
    private View cover;
    private boolean onAmazonHome;
    private final BroadcastReceiver screenOn = new BroadcastReceiver() {
        @Override
        public void onReceive(Context c, Intent i) {
            if (!paused && onAmazonHome) launchWhenCovered();
        }
    };

    static boolean isRunning() {
        return running != null;
    }

    /** Lets Amazon's home stay on screen until the user leaves it. */
    static void pause() {
        paused = true;
        Guard g = running;
        if (g != null) g.cancelRetry();
    }

    /**
     * The phone remote inside other apps. Fire OS blocks apps from pressing keys (and from its own
     * debugging port), so this moves the focus the way the D-pad would, clicks the focused item,
     * types into the focused box, and uses the system's own Back and Home. Apps that draw their own
     * interface (games, some players) may not respond to the arrows.
     */
    static boolean remote(String k, String text) {
        Guard g = running;
        if (g == null) return false;
        switch (k == null ? "" : k) {
            case "back": return g.performGlobalAction(GLOBAL_ACTION_BACK);
            case "home": return g.performGlobalAction(GLOBAL_ACTION_HOME);
            case "up": return g.move(View.FOCUS_UP);
            case "down": return g.move(View.FOCUS_DOWN);
            case "left": return g.move(View.FOCUS_LEFT);
            case "right": return g.move(View.FOCUS_RIGHT);
            case "ok": return g.click();
            case "type": return g.type(text == null ? "" : text, false);
            case "del": return g.type("", true);
            default: return false;
        }
    }

    private AccessibilityNodeInfo focused() {
        AccessibilityNodeInfo f = findFocus(AccessibilityNodeInfo.FOCUS_INPUT);
        if (f != null) return f;
        AccessibilityNodeInfo root = getRootInActiveWindow();
        return root == null ? null : firstFocusable(root, 0);
    }

    private static AccessibilityNodeInfo firstFocusable(AccessibilityNodeInfo n, int depth) {
        if (n == null || depth > 40) return null;
        if (n.isFocusable() && n.isVisibleToUser()) return n;
        for (int i = 0; i < n.getChildCount(); i++) {
            AccessibilityNodeInfo hit = firstFocusable(n.getChild(i), depth + 1);
            if (hit != null) return hit;
        }
        return null;
    }

    private boolean move(int direction) {
        AccessibilityNodeInfo f = focused();
        if (f == null) return false;
        if (!f.isFocused()) return f.performAction(AccessibilityNodeInfo.ACTION_FOCUS);
        AccessibilityNodeInfo next = f.focusSearch(direction);
        return next != null && next.performAction(AccessibilityNodeInfo.ACTION_FOCUS);
    }

    private boolean click() {
        for (AccessibilityNodeInfo n = focused(); n != null; n = n.getParent()) {
            if (n.isClickable()) return n.performAction(AccessibilityNodeInfo.ACTION_CLICK);
        }
        return false;
    }

    private boolean type(String text, boolean deleteOne) {
        AccessibilityNodeInfo f = findFocus(AccessibilityNodeInfo.FOCUS_INPUT);
        if (f == null || !f.isEditable()) return false;
        CharSequence now = f.getText() == null ? "" : f.getText();
        String value = deleteOne ? (now.length() > 0 ? now.subSequence(0, now.length() - 1).toString() : "") : text;
        Bundle b = new Bundle();
        b.putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, value);
        return f.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, b);
    }

    /** Puts the TV to sleep (screen off), as the power button does. False without the service. */
    static boolean sleep() {
        Guard g = running;
        return g != null && g.performGlobalAction(GLOBAL_ACTION_LOCK_SCREEN);
    }

    static void home(Context c) {
        home(c, 0);
    }

    private static void home(Context c, long delayMs) {
        AlarmManager alarms = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        alarms.setExact(AlarmManager.ELAPSED_REALTIME, SystemClock.elapsedRealtime() + delayMs, launch(c));
    }

    /** Drops a queued launch, so it cannot pull the user back after they opened an app. */
    static void arrived(Context c) {
        AlarmManager alarms = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        alarms.cancel(launch(c));
    }

    /** Called once our home window is on screen. */
    static void shown() {
        Guard g = running;
        if (g != null) g.uncover();
    }

    private static PendingIntent launch(Context c) {
        Intent i = new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
                .setClass(c, MainActivity.class)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED);
        return PendingIntent.getActivity(c, 0, i, PendingIntent.FLAG_UPDATE_CURRENT,
                ActivityOptions.makeCustomAnimation(c, 0, 0).toBundle());
    }

    @Override
    protected void onServiceConnected() {
        running = this;
        View view = new View(this);
        view.setVisibility(View.GONE);
        WindowManager.LayoutParams lp = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT, WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                        | WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE
                        | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
                PixelFormat.OPAQUE);
        lp.windowAnimations = 0;
        ((WindowManager) getSystemService(WINDOW_SERVICE)).addView(view, lp);
        cover = view;
        registerReceiver(screenOn, new IntentFilter(Intent.ACTION_SCREEN_ON));
        // After an update or restart, Amazon's home may already be up and no new window event will
        // come, so look once now instead of waiting for the user to move.
        handler.postDelayed(this::checkStartupWindow, 800);
    }

    private void checkStartupWindow() {
        AccessibilityNodeInfo root = getRootInActiveWindow();
        if (root == null || root.getPackageName() == null || !AMAZON.contentEquals(root.getPackageName()) || paused) return;
        onAmazonHome = true;
        homeRetry.request();
        retryHome();
    }

    @Override
    public void onDestroy() {
        cancelRetry();
        handler.removeCallbacks(uncover);
        handler.removeCallbacks(launch);
        handler.removeCallbacksAndMessages(null);
        try {
            unregisterReceiver(screenOn);
        } catch (IllegalArgumentException ignored) {
            // never registered
        }
        if (cover != null) ((WindowManager) getSystemService(WINDOW_SERVICE)).removeView(cover);
        if (running == this) running = null;
        super.onDestroy();
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent e) {
        if (e.getEventType() != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return;
        CharSequence pkg = e.getPackageName(), cls = e.getClassName();
        if (pkg == null) return;
        if (!AMAZON.contentEquals(pkg)) {
            if ("com.android.systemui".contentEquals(pkg) || "android".contentEquals(pkg)) return;
            cancelRetry();
            onAmazonHome = false;
            paused = false;
            if (!getPackageName().contentEquals(pkg)) arrived(this);
            return;
        }
        onAmazonHome = cls != null && AMAZON_HOME.contentEquals(cls);
        if (paused || !onAmazonHome) {
            cancelRetry();
            return;
        }
        homeRetry.request();
        retryHome();
    }

    private void retryHome() {
        handler.removeCallbacks(retry);
        if (running != this || paused || !onAmazonHome) {
            homeRetry.cancel();
            return;
        }
        long now = SystemClock.uptimeMillis();
        if (homeRetry.take(now)) launchWhenCovered();
        long delay = homeRetry.delay(now);
        if (delay >= 0) handler.postAtTime(retry, now + delay);
    }

    private void cancelRetry() {
        handler.removeCallbacks(retry);
        homeRetry.cancel();
    }

    private void launchWhenCovered() {
        handler.removeCallbacks(launch);
        if (cover == null) {
            home(this);
            return;
        }
        boolean shown = cover.getVisibility() == View.VISIBLE;
        cover();
        if (shown) {
            home(this);
            return;
        }
        final ViewTreeObserver observer = cover.getViewTreeObserver();
        observer.addOnPreDrawListener(new ViewTreeObserver.OnPreDrawListener() {
            @Override
            public boolean onPreDraw() {
                cover.getViewTreeObserver().removeOnPreDrawListener(this);
                handler.removeCallbacks(launch);
                home(Guard.this);
                return true;
            }
        });
        handler.postDelayed(launch, LAUNCH_FALLBACK_MS);
    }

    private void cover() {
        if (cover == null) return;
        cover.setBackgroundColor(0xFF000000);
        cover.setVisibility(View.VISIBLE);
        handler.removeCallbacks(uncover);
        handler.postDelayed(uncover, COVER_MAX_MS);
    }

    private void uncover() {
        handler.removeCallbacks(uncover);
        if (cover != null) cover.setVisibility(View.GONE);
    }

    @Override
    public void onInterrupt() {
        // nothing to interrupt
    }
}
