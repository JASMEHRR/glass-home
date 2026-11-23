package local.glasshome;

import android.app.ActivityManager;
import android.app.ActivityOptions;
import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.ActivityNotFoundException;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.drawable.Drawable;
import android.media.AudioManager;
import android.net.Uri;
import android.net.wifi.WifiInfo;
import android.net.wifi.WifiManager;
import android.os.Bundle;
import android.os.SystemClock;
import android.provider.Settings;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.util.Base64;
import android.view.KeyEvent;
import android.webkit.JavascriptInterface;

import io.nayuki.qrcodegen.QrCode;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * window.GH: everything the page needs from Android. Methods that take an id answer later
 * through window.GH_done(id, ok, text) so the page never waits on the network.
 */
final class Bridge {
    static final String DEFAULT_HIDE = "com.amazon.bueller.music,com.amazon.minitv.android.app,"
            + "com.amazon.firetv.troubleshooting,me.efesser.flauncher,com.amazon.spiderpork,tv.dumbtv.home,"
            + "com.amazon.gamehub,com.android.providers.downloads.ui,com.amazon.ftv.profilepicker,com.amazon.avod,"
            + "com.amazon.ftv.screensaver,com.amazon.ssm,com.amazon.vizzini.ftvcds,"
            + "com.amazon.cloud9,com.amazon.tahoe";
    static final String DEFAULT_ORDER = "local.sendtotv,org.smarttube.stable,com.stremio.one,com.amazon.firebat";
    static final String STREMIO = "com.stremio.one";
    static final String APPSTORE = "com.amazon.venezia";
    static final String SMARTTUBE = "org.smarttube.stable";
    static final String SPEED_URL = "https://speed.cloudflare.com/__down?bytes=25000000";

    private final MainActivity a;
    private final Net net;
    private final ExecutorService io = Executors.newFixedThreadPool(3);
    private final Map<String, String> icons = new ConcurrentHashMap<>();
    private volatile String apps;
    private TextToSpeech tts;
    private volatile boolean ttsReady;

    Bridge(MainActivity a) {
        this.a = a;
        this.net = new Net(a.getCacheDir());
        tts = new TextToSpeech(a, status -> {
            ttsReady = status == TextToSpeech.SUCCESS;
            if (ttsReady) {
                tts.setSpeechRate(1.05f);
                tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                    @Override
                    public void onStart(String id) {
                        a.js("window.UI&&UI.voice('start')");
                    }

                    @Override
                    public void onDone(String id) {
                        a.js("window.UI&&UI.voice('done')");
                    }

                    @Override
                    @SuppressWarnings("deprecation")
                    public void onError(String id) {
                        a.js("window.UI&&UI.voice('done')");
                    }
                });
            }
        }, "com.svox.pico"); // Fire TV's default (IVONA) has no voice installed, so it speaks silence
    }

    void forgetApps() {
        apps = null;
        icons.clear();
    }

    private Prefs store() {
        return Prefs.get(a);
    }

    private void done(String id, boolean ok, String data) {
        a.js("window.GH_done&&GH_done(" + JSONObject.quote(id) + "," + ok + ","
                + JSONObject.quote(data == null ? "" : data) + ")");
    }

    // ---- apps -------------------------------------------------------------------------------

    @JavascriptInterface
    public String apps() {
        String cached = apps;
        if (cached != null) return cached;
        apps = appList(a);
        return apps;
    }

    /** The dock's apps as JSON [{id,label}] in dock order; also used by the phone page. */
    static String appList(Context a) {
        PackageManager pm = a.getPackageManager();
        Prefs store = Prefs.get(a);
        Set<String> hide = new HashSet<>(Arrays.asList(store.get("apps.hide", DEFAULT_HIDE).split(",")));
        hide.add(a.getPackageName());
        hide.add(Guard.AMAZON);
        Map<String, String> found = new LinkedHashMap<>();
        for (String cat : new String[] {Intent.CATEGORY_LEANBACK_LAUNCHER, Intent.CATEGORY_LAUNCHER}) {
            List<ResolveInfo> list = pm.queryIntentActivities(new Intent(Intent.ACTION_MAIN).addCategory(cat), 0);
            for (ResolveInfo r : list) {
                String pkg = r.activityInfo.packageName;
                if (hide.contains(pkg) || found.containsKey(pkg)) continue;
                found.put(pkg, String.valueOf(r.loadLabel(pm)));
            }
        }
        List<String> order = new ArrayList<>(Arrays.asList(store.get("apps.order", DEFAULT_ORDER).split(",")));
        List<String> keys = new ArrayList<>(found.keySet());
        keys.sort((x, y) -> {
            int ix = order.indexOf(x), iy = order.indexOf(y);
            if (ix >= 0 || iy >= 0) return (ix < 0 ? 999 : ix) - (iy < 0 ? 999 : iy);
            return found.get(x).compareToIgnoreCase(found.get(y));
        });
        JSONArray out = new JSONArray();
        try {
            for (String k : keys) out.put(new JSONObject().put("id", k).put("label", found.get(k)));
        } catch (JSONException ignored) {
            // values are plain strings
        }
        return out.toString();
    }

    /** The app's icon as a 216px PNG data URL (its TV banner, cropped, when the icon is tiny). */
    @JavascriptInterface
    public String icon(String pkg) {
        String hit = icons.get(pkg);
        if (hit != null) return hit;
        String data = "";
        try {
            PackageManager pm = a.getPackageManager();
            ApplicationInfo ai = pm.getApplicationInfo(pkg, 0);
            Intent li = pm.getLeanbackLaunchIntentForPackage(pkg);
            if (li == null) li = pm.getLaunchIntentForPackage(pkg);
            ComponentName cn = li == null ? null : li.getComponent();
            Drawable icon = cn != null ? pm.getActivityIcon(cn) : ai.loadIcon(pm);
            Drawable banner = cn != null ? pm.getActivityBanner(cn) : null;
            if (banner == null) banner = ai.loadBanner(pm);
            int size = 216;
            Bitmap b = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
            Canvas c = new Canvas(b);
            boolean useIcon = icon != null && (banner == null || icon.getIntrinsicWidth() >= 96);
            if (useIcon) drawFit(icon, c, size);
            else if (banner != null) drawFit(banner, c, size);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            b.compress(Bitmap.CompressFormat.PNG, 100, out);
            data = "data:image/png;base64," + Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP);
        } catch (PackageManager.NameNotFoundException | RuntimeException e) {
            data = "";
        }
        icons.put(pkg, data);
        return data;
    }

    /** Draws d inside a size x size square keeping its shape: many Fire TV icons are wide logos. */
    private static void drawFit(Drawable d, Canvas c, int size) {
        int w = d.getIntrinsicWidth(), h = d.getIntrinsicHeight();
        if (w <= 0 || h <= 0) {
            d.setBounds(0, 0, size, size);
        } else {
            float s = Math.min(size / (float) w, size / (float) h);
            int dw = Math.round(w * s), dh = Math.round(h * s), l = (size - dw) / 2, t = (size - dh) / 2;
            d.setBounds(l, t, l + dw, t + dh);
        }
        d.draw(c);
    }

    @JavascriptInterface
    public boolean launch(String pkg) {
        Intent i = launchIntent(a, pkg);
        if (i == null) return false;
        if (Guard.AMAZON.equals(pkg)) Guard.pause();
        return start(i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED));
    }

    /** How to open an app (the Appstore opens on its store front). Null if it cannot be opened. */
    static Intent launchIntent(Context a, String pkg) {
        PackageManager pm = a.getPackageManager();
        Intent i = pm.getLeanbackLaunchIntentForPackage(pkg);
        if (i == null) i = pm.getLaunchIntentForPackage(pkg);
        if (i == null) return null;
        // The Appstore's own launch screen is just "Your Apps & Games"; its store front (search,
        // featured, categories) is ADEHomeActivity.
        if (APPSTORE.equals(pkg)) i = new Intent(Intent.ACTION_MAIN).setClassName(APPSTORE, APPSTORE + ".ade.ADEHomeActivity");
        return i;
    }

    private boolean start(Intent i) {
        try {
            a.startActivity(i, ActivityOptions.makeCustomAnimation(a, 0, 0).toBundle());
            return true;
        } catch (ActivityNotFoundException | SecurityException e) {
            return false;
        }
    }

    /** Opens a title in Stremio's detail page, or Stremio itself if it cannot take the link. */
    @JavascriptInterface
    public boolean openStremio(String type, String id) {
        if (type == null || id == null || !type.matches("movie|series") || !id.matches("[A-Za-z0-9:._-]{1,80}")) {
            return launch(STREMIO);
        }
        Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse("stremio:///detail/" + type + "/" + id + "/" + id))
                .setPackage(STREMIO).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        if (i.resolveActivity(a.getPackageManager()) != null && start(i)) return true;
        return launch(STREMIO);
    }

    /** A phone-remote press from the Ascend page: to Glass Home's page or, over another app, the accessibility service. */
    @JavascriptInterface
    public void remote(String k, String text) {
        a.sendBroadcast(new Intent(a, RemoteReceiver.class).putExtra(RemoteReceiver.KEY, k).putExtra(RemoteReceiver.TEXT, text == null ? "" : text));
    }

    /** Brings Glass Home to the front (Jarvis answers from the phone show and speak on the TV). */
    @JavascriptInterface
    public void showMe() {
        if (a.resumed) return;
        start(new Intent(a, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT));
    }

    /** Jarvis's "play X on Stremio" / "search X on YouTube": opens that app's search for X. */
    @JavascriptInterface
    public boolean searchIn(String app, String query) {
        String q = query == null ? "" : query.trim();
        if (q.isEmpty() || q.length() > 120) return false;
        String enc = Uri.encode(q);
        Intent i;
        if ("stremio".equals(app)) {
            i = new Intent(Intent.ACTION_VIEW, Uri.parse("stremio:///search?search=" + enc)).setPackage(STREMIO);
        } else if ("youtube".equals(app)) {
            i = new Intent(Intent.ACTION_VIEW, Uri.parse("https://www.youtube.com/results?search_query=" + enc)).setPackage(SMARTTUBE);
        } else {
            return false;
        }
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        if (i.resolveActivity(a.getPackageManager()) != null && start(i)) return true;
        return launch("stremio".equals(app) ? STREMIO : SMARTTUBE);
    }

    // ---- settings and system --------------------------------------------------------------

    private static final String[][] FIRE_SETTINGS = {
        {"wifi", "com.amazon.device.settings.action.ADD_NETWORK", "com.amazon.tv.settings.v2",
            "com.amazon.tv.settings.v2.tv.network.NetworkActivity", Settings.ACTION_WIFI_SETTINGS},
        {"bluetooth", "com.amazon.device.settings.action.CONTROLLERS", "com.amazon.tv.settings.v2",
            "com.amazon.tv.settings.v2.tv.controllers_bluetooth_devices.ControllersAndBluetoothActivity",
            Settings.ACTION_BLUETOOTH_SETTINGS},
        {"apps", "com.amazon.device.settings.action.APPLICATIONS", "com.amazon.tv.settings.v2",
            "com.amazon.tv.settings.v2.tv.applications.ApplicationsActivity", Settings.ACTION_APPLICATION_SETTINGS},
        {"device", "com.amazon.device.settings.action.DEVICE", "com.amazon.tv.settings.v2",
            "com.amazon.tv.settings.v2.tv.device.DeviceActivity", Settings.ACTION_DEVICE_INFO_SETTINGS},
    };

    @JavascriptInterface
    public boolean settings(String which) {
        for (String[] s : FIRE_SETTINGS) {
            if (!s[0].equals(which)) continue;
            Intent own = new Intent(s[1]).setClassName(s[2], s[3])
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
            if (startable(own) && start(own)) return true;
            if (start(new Intent(s[4]).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))) return true;
        }
        Intent tv = new Intent(Intent.ACTION_MAIN).addCategory("android.intent.category.LEANBACK_SETTINGS")
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        if (tv.resolveActivity(a.getPackageManager()) != null && start(tv)) return true;
        return start(new Intent(Settings.ACTION_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
    }

    private boolean startable(Intent i) {
        PackageManager pm = a.getPackageManager();
        try {
            ActivityInfo ai = pm.getActivityInfo(i.getComponent(), 0);
            if (!ai.exported || !ai.isEnabled()) return false;
            return ai.permission == null
                    || pm.checkPermission(ai.permission, a.getPackageName()) == PackageManager.PERMISSION_GRANTED;
        } catch (PackageManager.NameNotFoundException e) {
            return false;
        }
    }

    /** Wi-Fi, memory and the sleep timer, as JSON. */
    @JavascriptInterface
    @SuppressWarnings("deprecation")
    public String status() {
        JSONObject o = new JSONObject();
        try {
            WifiManager wm = (WifiManager) a.getApplicationContext().getSystemService(Context.WIFI_SERVICE);
            if (wm != null && wm.isWifiEnabled()) {
                WifiInfo w = wm.getConnectionInfo();
                if (w != null && w.getNetworkId() != -1) {
                    String ssid = w.getSSID() == null ? "" : w.getSSID().replace("\"", "");
                    if (ssid.contains("unknown")) ssid = "";
                    o.put("wifi", true).put("ssid", ssid)
                            .put("signal", WifiManager.calculateSignalLevel(w.getRssi(), 101))
                            .put("link", w.getLinkSpeed());
                }
            }
            ActivityManager am = (ActivityManager) a.getSystemService(Context.ACTIVITY_SERVICE);
            ActivityManager.MemoryInfo mi = new ActivityManager.MemoryInfo();
            am.getMemoryInfo(mi);
            o.put("memUsed", Math.round(100.0 * (mi.totalMem - mi.availMem) / Math.max(1, mi.totalMem)))
                    .put("memFreeMb", mi.availMem / (1024 * 1024));
            o.put("ip", PhoneService.lanAddress());
            o.put("guard", Guard.isRunning());
            o.put("sleepAt", store().get("sleep.at", ""));
            o.put("lastSpeed", store().get("speed.last", ""));
        } catch (JSONException ignored) {
            // plain values
        }
        return o.toString();
    }

    /** Stops background apps and reports how much memory came back. */
    @JavascriptInterface
    public void freeMemory(String id) {
        io.execute(() -> {
            ActivityManager am = (ActivityManager) a.getSystemService(Context.ACTIVITY_SERVICE);
            ActivityManager.MemoryInfo before = new ActivityManager.MemoryInfo();
            am.getMemoryInfo(before);
            PackageManager pm = a.getPackageManager();
            for (ApplicationInfo ai : pm.getInstalledApplications(0)) {
                if (ai.packageName.equals(a.getPackageName())) continue;
                if ((ai.flags & ApplicationInfo.FLAG_SYSTEM) != 0) continue;
                am.killBackgroundProcesses(ai.packageName);
            }
            SystemClock.sleep(800);
            ActivityManager.MemoryInfo after = new ActivityManager.MemoryInfo();
            am.getMemoryInfo(after);
            long freed = Math.max(0, (after.availMem - before.availMem) / (1024 * 1024));
            done(id, true, "{\"freedMb\":" + freed + "}");
        });
    }

    @JavascriptInterface
    public void speedTest(String id) {
        io.execute(() -> {
            double mbps = Net.speedTest(SPEED_URL, 8000);
            if (mbps > 0) store().set("speed.last", String.valueOf(Math.round(mbps)));
            done(id, mbps > 0, "{\"mbps\":" + Math.round(mbps) + "}");
        });
    }

    @JavascriptInterface
    public boolean guardOn() {
        return Guard.isRunning();
    }

    @JavascriptInterface
    public boolean sleep() {
        return Guard.sleep();
    }

    /** Sleeps the TV in this many minutes (0 cancels). Returns the end time in ms, or "". */
    @JavascriptInterface
    public String sleepTimer(int minutes) {
        AlarmManager alarms = (AlarmManager) a.getSystemService(Context.ALARM_SERVICE);
        PendingIntent pi = PendingIntent.getBroadcast(a, 1,
                new Intent(a, SleepReceiver.class), PendingIntent.FLAG_UPDATE_CURRENT);
        alarms.cancel(pi);
        if (minutes <= 0) {
            store().set("sleep.at", null);
            return "";
        }
        long at = System.currentTimeMillis() + minutes * 60_000L;
        alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
        store().set("sleep.at", String.valueOf(at));
        return String.valueOf(at);
    }

    /** play_pause, play, pause, next, previous: sent to whatever is playing. */
    @JavascriptInterface
    public void media(String action) {
        PhoneService.mediaKey(a, action);
    }

    // ---- network ----------------------------------------------------------------------------

    @JavascriptInterface
    public void fetch(String id, String url, String body, int maxAgeSec) {
        io.execute(() -> {
            Net.Result r = net.get(url, body == null || body.isEmpty() ? null : body, Math.max(0, maxAgeSec));
            done(id, r.ok, r.body);
        });
    }

    // ---- settings file -------------------------------------------------------------------------

    @JavascriptInterface
    public String prefs() {
        return new JSONObject(store().all()).toString();
    }

    @JavascriptInterface
    public void setPref(String key, String value) {
        if (key == null || key.startsWith("phone.")) return;
        store().set(key, value == null || value.isEmpty() ? null : value);
        if (key.startsWith("apps.")) forgetApps();
    }

    // ---- Jarvis voice and phone ------------------------------------------------------------------

    /**
     * Says text through the TV speakers: in Ascend's Jarvis voice (ElevenLabs, via Ascend's
     * /api/tv/speak) when Ascend is connected, else in the TV's own Pico voice. Returns at once;
     * the page hears UI.voice('start') and UI.voice('done').
     */
    @JavascriptInterface
    public boolean speak(String text) {
        if (text == null || text.trim().isEmpty()) return false;
        final String words = text.length() > 400 ? text.substring(0, 400) : text;
        final int gen = ++speakGen;
        stopPlayer();
        if (ttsReady) tts.stop();
        String url = store().get("ascend.url", ""), key = store().get("ascend.key", "");
        if (url.isEmpty() || key.isEmpty()) return localSpeak(words);
        io.execute(() -> {
            File mp3 = new File(a.getCacheDir(), "jarvis-voice.mp3");
            boolean got = false;
            try {
                got = Net.download(url.replaceAll("/+$", "") + "/api/tv/speak",
                        new JSONObject().put("key", key).put("text", words).toString(), mp3);
            } catch (IOException | JSONException e) {
                got = false;
            }
            final boolean ok = got;
            a.ui.post(() -> {
                if (gen != speakGen) return; // a newer reply took over
                if (!ok || !play(mp3)) localSpeak(words);
            });
        });
        return true;
    }

    private int speakGen;
    private android.media.MediaPlayer player;

    private boolean play(File mp3) {
        try {
            android.media.MediaPlayer p = new android.media.MediaPlayer();
            p.setAudioAttributes(new android.media.AudioAttributes.Builder()
                    .setUsage(android.media.AudioAttributes.USAGE_ASSISTANT)
                    .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SPEECH).build());
            p.setDataSource(mp3.getPath());
            p.setOnCompletionListener(m -> { a.js("window.UI&&UI.voice('done')"); stopPlayer(); });
            p.setOnErrorListener((m, what, extra) -> { a.js("window.UI&&UI.voice('done')"); stopPlayer(); return true; });
            p.prepare();
            player = p;
            p.start();
            a.js("window.UI&&UI.voice('start')");
            return true;
        } catch (IOException | RuntimeException e) {
            stopPlayer();
            return false;
        }
    }

    private void stopPlayer() {
        android.media.MediaPlayer p = player;
        player = null;
        if (p != null) {
            try {
                p.release();
            } catch (RuntimeException ignored) {
                // already gone
            }
        }
    }

    private boolean localSpeak(String words) {
        if (!ttsReady) return false;
        tts.setLanguage(Locale.UK);
        return tts.speak(words, TextToSpeech.QUEUE_FLUSH, new Bundle(), "j" + SystemClock.uptimeMillis()) == TextToSpeech.SUCCESS;
    }

    @JavascriptInterface
    public void stopSpeaking() {
        speakGen++;
        a.ui.post(this::stopPlayer);
        if (ttsReady) tts.stop();
    }

    /** Where the phone page lives, for the QR code: {"url":..., "pin":...}. */
    @JavascriptInterface
    public String phone() {
        JSONObject o = new JSONObject();
        try {
            o.put("url", "https://" + PhoneService.lanAddress() + ":" + PhoneService.TLS_PORT)
                    .put("pin", PhoneService.pin(a));
        } catch (JSONException ignored) {
            // plain values
        }
        return o.toString();
    }

    /** The last Jarvis lines, for the phone page to show. */
    @JavascriptInterface
    public void jarvisLog(String json) {
        if (json == null || json.length() > 20000) return;
        File f = new File(a.getFilesDir(), PhoneService.LOG_FILE);
        File tmp = new File(a.getFilesDir(), PhoneService.LOG_FILE + ".tmp");
        try (OutputStream out = new FileOutputStream(tmp)) {
            out.write(json.getBytes(StandardCharsets.UTF_8));
        } catch (IOException e) {
            return;
        }
        if (!tmp.renameTo(f) && f.delete() && !tmp.renameTo(f)) tmp.delete();
    }

    /** The song or video playing on the TV (needs music access switched on), as JSON or "". */
    @JavascriptInterface
    public String nowPlaying() {
        return MusicListener.nowPlaying(a);
    }

    /** Opens a title, or the exact episode when videoId is given, in Stremio. */
    @JavascriptInterface
    public boolean openStremioVideo(String type, String id, String videoId) {
        if (videoId == null || !videoId.matches("[A-Za-z0-9:._-]{1,100}") || type == null || !type.matches("movie|series")
                || id == null || !id.matches("[A-Za-z0-9:._-]{1,80}")) {
            return openStremio(type, id);
        }
        Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse("stremio:///detail/" + type + "/" + id + "/" + videoId))
                .setPackage(STREMIO).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        if (i.resolveActivity(a.getPackageManager()) != null && start(i)) return true;
        return openStremio(type, id);
    }

    /** A QR code for text, as an SVG data URL (Project Nayuki's generator, MIT). */
    @JavascriptInterface
    public String qr(String text) {
        return qrSvg(text);
    }

    static String qrSvg(String text) {
        if (text == null || text.length() > 300) return "";
        QrCode qr = QrCode.encodeText(text, QrCode.Ecc.MEDIUM);
        int border = 2, size = qr.size + border * 2;
        StringBuilder path = new StringBuilder();
        for (int y = 0; y < qr.size; y++) {
            for (int x = 0; x < qr.size; x++) {
                if (qr.getModule(x, y)) path.append('M').append(x + border).append(',').append(y + border).append("h1v1h-1z");
            }
        }
        String svg = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 " + size + " " + size
                + "\" shape-rendering=\"crispEdges\"><rect width=\"100%\" height=\"100%\" fill=\"#fff\"/><path d=\""
                + path + "\" fill=\"#000\"/></svg>";
        return "data:image/svg+xml;base64," + java.util.Base64.getEncoder().encodeToString(svg.getBytes(StandardCharsets.UTF_8));
    }

    /** Words the phone page sent while the page was loading, or "". */
    @JavascriptInterface
    public String takeHeard() {
        return a.takeHeard();
    }

    void shutdown() {
        io.shutdownNow();
        if (tts != null) tts.shutdown();
    }
}
