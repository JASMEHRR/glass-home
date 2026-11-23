package local.glasshome;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.graphics.Color;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;
import android.webkit.ConsoleMessage;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/**
 * The home screen. All of it is one full-screen WebView showing assets/ui/index.html; the page
 * talks to Android through {@link Bridge} (window.GH). Keys the page cannot see on its own
 * (Menu, Back, a HOME press while already on top) are forwarded to window.UI.
 */
public final class MainActivity extends Activity {
    static volatile MainActivity current;

    final Handler ui = new Handler(Looper.getMainLooper());
    WebView web;
    Bridge bridge;
    boolean resumed;

    private final BroadcastReceiver packages = new BroadcastReceiver() {
        @Override
        public void onReceive(Context c, Intent i) {
            bridge.forgetApps();
            js("window.UI&&UI.appsChanged()");
        }
    };

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        current = this;
        web = new WebView(this);
        web.setBackgroundColor(Color.BLACK);
        web.setFocusable(true);
        web.setFocusableInTouchMode(true);
        web.setVerticalScrollBarEnabled(false);
        web.setHorizontalScrollBarEnabled(false);
        configure(web.getSettings());
        bridge = new Bridge(this);
        web.addJavascriptInterface(bridge, "GH");
        // Lets the laptop inspect the page over adb (Chrome's chrome://inspect). The page's debug
        // socket only accepts adb's shell user and this app, so it adds nothing adb cannot already do.
        WebView.setWebContentsDebuggingEnabled(true);
        web.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView v, String url) {
                android.util.Log.i("GlassHome", "page loaded: " + url);
            }

            @Override
            public void onReceivedError(WebView v, android.webkit.WebResourceRequest r, android.webkit.WebResourceError e) {
                if (r.isForMainFrame()) android.util.Log.w("GlassHome", "page failed: " + e.getDescription());
            }

            @Override
            public boolean onRenderProcessGone(WebView v, android.webkit.RenderProcessGoneDetail d) {
                // The page's process died (usually out of memory). Start over instead of crashing.
                android.util.Log.e("GlassHome", "page process gone, crashed=" + d.didCrash());
                if (v == web) {
                    ((android.view.ViewGroup) v.getParent()).removeView(v);
                    v.destroy();
                    web = null;
                    recreate();
                }
                return true;
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onConsoleMessage(ConsoleMessage m) {
                android.util.Log.i("GlassHome", m.message() + " (" + m.sourceId() + ":" + m.lineNumber() + ")");
                return true;
            }
        });
        setContentView(web);
        web.loadUrl("file:///android_asset/ui/index.html");
        web.requestFocus(View.FOCUS_DOWN);

        IntentFilter f = new IntentFilter();
        f.addAction(Intent.ACTION_PACKAGE_ADDED);
        f.addAction(Intent.ACTION_PACKAGE_REMOVED);
        f.addAction(Intent.ACTION_PACKAGE_CHANGED);
        f.addDataScheme("package");
        registerReceiver(packages, f);
        PhoneService.start(this);
        heard(getIntent());
        dream(getIntent());
    }

    private volatile String pendingHeard;
    private volatile boolean pendingDream;

    /** Opened by Dream (the TV's screensaver): show Glass Home's own screensaver. */
    private boolean dream(Intent i) {
        if (i == null || !i.getBooleanExtra(Dream.EXTRA, false)) return false;
        pendingDream = true;
        js("window.UI&&UI.dreamPending()");
        return true;
    }

    boolean takeDream() {
        boolean d = pendingDream;
        pendingDream = false;
        return d;
    }

    /** Words from the phone page: kept until the page asks for them (it may still be loading). */
    private void heard(Intent i) {
        String t = i == null ? null : i.getStringExtra(PhoneService.HEARD);
        if (t == null || t.isEmpty()) return;
        pendingHeard = t;
        js("window.UI&&UI.heardPending()");
    }

    String takeHeard() {
        String t = pendingHeard;
        pendingHeard = null;
        return t == null ? "" : t;
    }

    @SuppressLint("SetJavaScriptEnabled")
    @SuppressWarnings("deprecation")
    private static void configure(WebSettings s) {
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(true);
        // The page is a local file; this lets it load posters and fonts from the web.
        s.setAllowFileAccessFromFileURLs(true);
        s.setAllowUniversalAccessFromFileURLs(true);
        s.setTextZoom(100);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
    }

    /** Runs a line of JavaScript on the page, from any thread. */
    void js(String code) {
        ui.post(() -> {
            if (web != null) web.evaluateJavascript(code, null);
        });
    }

    @Override
    protected void onResume() {
        super.onResume();
        resumed = true;
        Guard.arrived(this);
        // While Glass Home holds HOME it runs its own screensaver and sleep timer, so the screen
        // stays on here; without the Guard, Fire OS keeps its own screensaver.
        if (Guard.isRunning()) getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        else getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if (web != null) web.onResume();
        js("window.UI&&UI.resume()");
    }

    @Override
    protected void onPause() {
        super.onPause();
        resumed = false;
        js("window.UI&&UI.pause()");
        if (web != null) web.onPause();
    }

    @Override
    public void onEnterAnimationComplete() {
        Guard.shown();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        if (intent != null && intent.hasExtra(PhoneService.HEARD)) heard(intent);
        else if (!dream(intent)) js("window.UI&&UI.home()");
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent e) {
        int code = e.getKeyCode();
        // Logs remote buttons other than the D-pad, to see which ones (the mic button?) reach us.
        if (e.getAction() == KeyEvent.ACTION_DOWN && (code < KeyEvent.KEYCODE_DPAD_UP || code > KeyEvent.KEYCODE_DPAD_CENTER))
            android.util.Log.i("GlassHome", "key " + KeyEvent.keyCodeToString(code) + " (" + code + ")");
        if (code == KeyEvent.KEYCODE_MENU) {
            if (e.getAction() == KeyEvent.ACTION_DOWN && e.getRepeatCount() == 0) js("window.UI&&UI.key('menu')");
            return true;
        }
        if (code == KeyEvent.KEYCODE_BACK) {
            if (e.getAction() == KeyEvent.ACTION_UP) js("window.UI&&UI.back()");
            return true;
        }
        return super.dispatchKeyEvent(e);
    }

    @Override
    protected void onDestroy() {
        unregisterReceiver(packages);
        if (current == this) current = null;
        if (bridge != null) bridge.shutdown();
        if (web != null) {
            web.destroy();
            web = null;
        }
        super.onDestroy();
    }
}
