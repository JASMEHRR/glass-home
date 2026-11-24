package local.glasshome;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.media.AudioManager;
import android.os.IBinder;
import android.os.SystemClock;
import android.view.KeyEvent;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.NetworkInterface;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.SocketException;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * The phone page for Jarvis: http://TV-IP:8766, protected by a 4-digit PIN shown on the TV.
 * Playback words (pause, play, next, previous) act at once, even over another app; everything else
 * opens Glass Home's Jarvis screen with the words. Runs in its own process (":phone").
 */
public final class PhoneService extends Service {
    static final int PORT = 8766;
    /** The same page over https, so the phone's browser lets the page use the microphone. */
    static final int TLS_PORT = 8767;
    static final String LOG_FILE = "jarvis-log.json";
    static final String HEARD = "heard";
    private static final String CHANNEL = "phone";
    private static final int MAX_FAILS = 20;

    private final ExecutorService pool = Executors.newFixedThreadPool(4);
    private ServerSocket server;
    private ServerSocket tlsServer;
    private Thread thread;
    private int fails;
    private int lockouts;
    private long lockedUntil;

    static void start(Context c) {
        try {
            c.startForegroundService(new Intent(c, PhoneService.class));
        } catch (RuntimeException ignored) {
            // not allowed right now; the home screen starts it again on its next open
        }
    }

    /** The PIN for the phone page, made once. */
    static String pin(Context c) {
        Prefs p = Prefs.get(c);
        String pin = p.get("phone.pin", "");
        if (!pin.matches("\\d{4}")) {
            pin = String.format(Locale.ROOT, "%04d", new SecureRandom().nextInt(10000));
            p.set("phone.pin", pin);
        }
        return pin;
    }

    /** The TV's address on the home network, or 0.0.0.0. */
    static String lanAddress() {
        try {
            for (NetworkInterface ni : Collections.list(NetworkInterface.getNetworkInterfaces())) {
                if (!ni.isUp() || ni.isLoopback()) continue;
                for (InetAddress ad : Collections.list(ni.getInetAddresses())) {
                    if (ad instanceof Inet4Address && ad.isSiteLocalAddress()) return ad.getHostAddress();
                }
            }
        } catch (SocketException ignored) {
            // no network
        }
        return "0.0.0.0";
    }

    static boolean mediaKey(Context c, String action) {
        int code;
        switch (action == null ? "" : action) {
            case "play": code = KeyEvent.KEYCODE_MEDIA_PLAY; break;
            case "pause": code = KeyEvent.KEYCODE_MEDIA_PAUSE; break;
            case "next": code = KeyEvent.KEYCODE_MEDIA_NEXT; break;
            case "previous": code = KeyEvent.KEYCODE_MEDIA_PREVIOUS; break;
            case "play_pause": code = KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE; break;
            case "rewind": code = KeyEvent.KEYCODE_MEDIA_REWIND; break;
            case "fast_forward": code = KeyEvent.KEYCODE_MEDIA_FAST_FORWARD; break;
            default: return false;
        }
        AudioManager am = (AudioManager) c.getSystemService(Context.AUDIO_SERVICE);
        long t = SystemClock.uptimeMillis();
        am.dispatchMediaKeyEvent(new KeyEvent(t, t, KeyEvent.ACTION_DOWN, code, 0));
        am.dispatchMediaKeyEvent(new KeyEvent(t, t, KeyEvent.ACTION_UP, code, 0));
        return true;
    }

    /** Playback words the phone server handles itself, so they work over any app. */
    static String mediaWord(String text) {
        String t = text == null ? "" : text.toLowerCase(Locale.ROOT).replaceAll("[^a-z ]", " ").trim()
                .replaceAll("\\s+", " ").replaceFirst("^(jarvis |hey jarvis |please )+", "");
        switch (t) {
            case "pause": case "pause it": case "pause the tv": case "pause this": case "stop": return "pause";
            case "play": case "play it": case "resume": case "continue": case "unpause": return "play";
            case "next": case "skip": case "next episode": case "next song": return "next";
            case "previous": case "go back": case "previous song": return "previous";
            default: return null;
        }
    }

    /** "ready" when Glass Home's accessibility service (which presses for the remote) is switched on. */
    private String remoteState() {
        String on = android.provider.Settings.Secure.getString(getContentResolver(), android.provider.Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES);
        return on != null && on.contains(getPackageName() + "/") ? "ready" : "home";
    }

    @Override
    public void onCreate() {
        super.onCreate();
        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        nm.createNotificationChannel(new NotificationChannel(CHANNEL, "Jarvis phone link", NotificationManager.IMPORTANCE_MIN));
        Notification n = new Notification.Builder(this, CHANNEL)
                .setSmallIcon(android.R.drawable.stat_notify_sync_noanim)
                .setContentTitle("Glass Home")
                .setContentText("Jarvis phone link is ready")
                .build();
        startForeground(1, n);
        thread = new Thread(this::serve, "phone-server");
        thread.start();
        new Thread(this::serveTls, "phone-tls").start();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        return START_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        try {
            if (server != null) server.close();
            if (tlsServer != null) tlsServer.close();
        } catch (IOException ignored) {
            // closing anyway
        }
        pool.shutdownNow();
        super.onDestroy();
    }

    private void serve() {
        try {
            server = new ServerSocket();
            server.setReuseAddress(true);
            server.bind(new InetSocketAddress(PORT));
            while (!server.isClosed()) {
                Socket s = server.accept();
                s.setSoTimeout(8000);
                pool.execute(() -> handle(s));
            }
        } catch (IOException ignored) {
            // port busy or closed: the next start tries again
        }
    }

    private void serveTls() {
        char[] pw = "glasshome".toCharArray();
        try (InputStream in = getAssets().open("tls/phone.p12")) {
            java.security.KeyStore ks = java.security.KeyStore.getInstance("PKCS12");
            ks.load(in, pw);
            javax.net.ssl.KeyManagerFactory kmf = javax.net.ssl.KeyManagerFactory.getInstance(javax.net.ssl.KeyManagerFactory.getDefaultAlgorithm());
            kmf.init(ks, pw);
            javax.net.ssl.SSLContext ctx = javax.net.ssl.SSLContext.getInstance("TLS");
            ctx.init(kmf.getKeyManagers(), null, null);
            tlsServer = ctx.getServerSocketFactory().createServerSocket();
            tlsServer.setReuseAddress(true);
            tlsServer.bind(new InetSocketAddress(TLS_PORT));
            while (!tlsServer.isClosed()) {
                Socket s = tlsServer.accept();
                s.setSoTimeout(8000);
                pool.execute(() -> handle(s));
            }
        } catch (IOException | java.security.GeneralSecurityException e) {
            android.util.Log.w("GlassHome", "phone https off: " + e);
        }
    }

    private void handle(Socket s) {
        try (Socket sock = s; InputStream in = sock.getInputStream(); OutputStream out = sock.getOutputStream()) {
            String head = readHead(in);
            if (head == null) return;
            String[] first = head.split("\r\n", 2)[0].split(" ");
            if (first.length < 2) return;
            String method = first[0], target = first[1];
            int len = 0;
            for (String line : head.split("\r\n")) {
                if (line.toLowerCase(Locale.ROOT).startsWith("content-length:")) {
                    try {
                        len = Integer.parseInt(line.substring(15).trim());
                    } catch (NumberFormatException e) {
                        len = 0;
                    }
                }
            }
            String path = target.split("\\?", 2)[0];
            Map<String, String> q = form(target.contains("?") ? target.split("\\?", 2)[1] : "");
            // An APK from the phone: streamed to a file (it can be large), then handed to Android's installer.
            if ("/api/apk".equals(path) && "POST".equals(method)) {
                if (!pinOk(q.get("pin"))) {
                    send(out, 403, "application/json", "{\"ok\":false,\"error\":\"pin\"}".getBytes(StandardCharsets.UTF_8));
                    return;
                }
                if (len <= 0 || len > 400 * 1024 * 1024) {
                    send(out, 400, "application/json", "{\"ok\":false,\"error\":\"size\"}".getBytes(StandardCharsets.UTF_8));
                    return;
                }
                String name = q.getOrDefault("name", "app.apk").replaceAll("[^A-Za-z0-9 ._()-]", "").trim();
                File apk = new File(getCacheDir(), "incoming.apk");
                sock.setSoTimeout(60_000);
                try (java.io.FileOutputStream f = new java.io.FileOutputStream(apk)) {
                    byte[] buf = new byte[65536];
                    for (int left = len, n; left > 0 && (n = in.read(buf, 0, Math.min(buf.length, left))) > 0; left -= n) f.write(buf, 0, n);
                }
                boolean ok = apk.length() == len;
                String err = ok ? "" : "upload cut short";
                if (ok) {
                    try {
                        ApkInstaller.install(this, apk, name.isEmpty() ? "app.apk" : name);
                    } catch (IOException e) {
                        ok = false;
                        err = String.valueOf(e.getMessage());
                        ApkInstaller.note(this, "failed", name, "Not installed: " + err);
                    }
                }
                send(out, ok ? 200 : 500, "application/json", new JSONObject().put("ok", ok).put("error", err)
                        .toString().getBytes(StandardCharsets.UTF_8));
                return;
            }
            String body = len > 0 && len <= 8192 ? new String(readN(in, len), StandardCharsets.UTF_8) : "";
            if (!body.isEmpty()) q.putAll(form(body));

            if ("GET".equals(method) && ("/".equals(path) || "/index.html".equals(path))) {
                send(out, 200, "text/html; charset=utf-8", asset("ui/phone.html"));
                return;
            }
            if (!path.startsWith("/api/")) {
                send(out, 404, "text/plain", "not found".getBytes(StandardCharsets.UTF_8));
                return;
            }
            if (!pinOk(q.get("pin"))) {
                send(out, 403, "application/json", "{\"ok\":false,\"error\":\"pin\"}".getBytes(StandardCharsets.UTF_8));
                return;
            }
            if ("/api/log".equals(path)) {
                File f = new File(getFilesDir(), LOG_FILE);
                byte[] data = f.exists() ? readFile(f) : "[]".getBytes(StandardCharsets.UTF_8);
                send(out, 200, "application/json", data);
                return;
            }
            if ("/api/say".equals(path) && "POST".equals(method)) {
                String text = q.getOrDefault("text", "").trim();
                if (text.isEmpty() || text.length() > 500) {
                    send(out, 400, "application/json", "{\"ok\":false}".getBytes(StandardCharsets.UTF_8));
                    return;
                }
                String media = mediaWord(text);
                if (media != null) {
                    mediaKey(this, media);
                } else {
                    // to Glass Home's process: Jarvis answers in the side panel over whatever is on screen
                    sendBroadcast(new Intent(this, RemoteReceiver.class).putExtra(RemoteReceiver.KEY, "say")
                            .putExtra(RemoteReceiver.TEXT, text));
                }
                send(out, 200, "application/json", new JSONObject().put("ok", true)
                        .put("done", media == null ? "sent" : media).toString().getBytes(StandardCharsets.UTF_8));
                return;
            }
            if ("/api/setting".equals(path) && "POST".equals(method)) {
                String k = q.getOrDefault("key", ""), v = q.getOrDefault("value", "").trim();
                boolean ok = settingAllowed(k, v);
                if (ok) Prefs.get(this).set(k, v.isEmpty() ? null : v);
                send(out, ok ? 200 : 400, "application/json", ("{\"ok\":" + ok + "}").getBytes(StandardCharsets.UTF_8));
                return;
            }
            if (("/api/key".equals(path) || "/api/type".equals(path)) && "POST".equals(method)) {
                String k = "/api/type".equals(path) ? "type" : q.getOrDefault("k", "");
                String media = "play".equals(k) ? "play_pause" : "rew".equals(k) ? "rewind" : "ffwd".equals(k) ? "fast_forward" : null;
                if (media != null) mediaKey(this, media);
                else sendBroadcast(new Intent(this, RemoteReceiver.class).putExtra(RemoteReceiver.KEY, k)
                        .putExtra(RemoteReceiver.TEXT, q.getOrDefault("text", "").trim()));
                send(out, 200, "application/json", new JSONObject().put("ok", true).put("state", remoteState())
                        .toString().getBytes(StandardCharsets.UTF_8));
                return;
            }
            if ("/api/tvstate".equals(path)) {
                send(out, 200, "application/json", new JSONObject().put("state", Prefs.get(this).get(TvControl.STATE, ""))
                        .toString().getBytes(StandardCharsets.UTF_8));
                return;
            }
            if ("/api/apk/status".equals(path)) {
                send(out, 200, "application/json", Prefs.get(this).get(ApkInstaller.LAST, "{}").getBytes(StandardCharsets.UTF_8));
                return;
            }
            if ("/api/installed".equals(path)) {
                send(out, 200, "application/json", ApkInstaller.installed(this).getBytes(StandardCharsets.UTF_8));
                return;
            }
            if ("/api/uninstall".equals(path) && "POST".equals(method)) {
                boolean ok = ApkInstaller.uninstall(this, q.getOrDefault("id", ""));
                send(out, 200, "application/json", ("{\"ok\":" + ok + "}").getBytes(StandardCharsets.UTF_8));
                return;
            }
            if ("/api/apps".equals(path)) {
                send(out, 200, "application/json", Bridge.appList(this).getBytes(StandardCharsets.UTF_8));
                return;
            }
            if ("/api/launch".equals(path) && "POST".equals(method)) {
                String id = q.getOrDefault("id", "");
                Intent li = id.matches("[A-Za-z0-9._]{1,120}") && Bridge.appList(this).contains("\"" + id + "\"") ? Bridge.launchIntent(this, id) : null;
                boolean ok = false;
                if (li != null) {
                    try {
                        startActivity(li.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED));
                        ok = true;
                    } catch (RuntimeException ignored) {
                        // not openable right now
                    }
                }
                send(out, ok ? 200 : 400, "application/json", ("{\"ok\":" + ok + "}").getBytes(StandardCharsets.UTF_8));
                return;
            }
            if ("/api/remote".equals(path)) {
                send(out, 200, "application/json", new JSONObject().put("state", remoteState())
                        .toString().getBytes(StandardCharsets.UTF_8));
                return;
            }
            if ("/api/settings".equals(path)) {
                Prefs p = Prefs.get(this);
                send(out, 200, "application/json", new JSONObject().put("anilist.user", p.get("anilist.user", ""))
                        .put("ascend.url", p.get("ascend.url", "")).put("ascend.key", p.get("ascend.key", "").isEmpty() ? "" : "set")
                        .toString().getBytes(StandardCharsets.UTF_8));
                return;
            }
            send(out, 404, "application/json", "{\"ok\":false}".getBytes(StandardCharsets.UTF_8));
        } catch (IOException | org.json.JSONException | RuntimeException ignored) {
            // one bad request never stops the server
        }
    }

    /** Only these settings can be changed from the phone page. */
    static boolean settingAllowed(String key, String value) {
        if (value == null || value.length() > 300 || value.indexOf('\n') >= 0) return false;
        switch (key == null ? "" : key) {
            case "anilist.user": return value.matches("[A-Za-z0-9_-]{0,40}");
            case "ascend.url": return value.isEmpty() || value.matches("https://[A-Za-z0-9.-]+(:\\d+)?(/[A-Za-z0-9._~/-]*)?");
            case "ascend.key": return value.matches("[A-Za-z0-9._~+/=-]{0,200}");
            default: return false;
        }
    }

    private synchronized boolean pinOk(String given) {
        long now = SystemClock.elapsedRealtime();
        if (now < lockedUntil) return false;
        String want = pin(this);
        boolean ok = given != null && given.length() == want.length();
        int diff = 0;
        for (int i = 0; ok && i < want.length(); i++) diff |= want.charAt(i) ^ given.charAt(i);
        ok = ok && diff == 0;
        if (ok) {
            fails = 0;
        } else if (++fails >= MAX_FAILS) {
            // 1, 2, 4, ... minutes, up to 12 hours: guessing all 10,000 PINs takes weeks.
            fails = 0;
            lockouts = Math.min(lockouts + 1, 10);
            lockedUntil = now + Math.min(12 * 3_600_000L, 60_000L << (lockouts - 1));
        }
        return ok;
    }

    private byte[] asset(String name) throws IOException {
        try (InputStream in = getAssets().open(name)) {
            return Net.readAll(in);
        }
    }

    private static byte[] readFile(File f) throws IOException {
        try (InputStream in = new FileInputStream(f)) {
            return Net.readAll(in);
        }
    }

    static Map<String, String> form(String s) {
        Map<String, String> out = new LinkedHashMap<>();
        if (s == null || s.isEmpty()) return out;
        for (String part : s.split("&")) {
            int eq = part.indexOf('=');
            if (eq <= 0) continue;
            try {
                out.put(URLDecoder.decode(part.substring(0, eq), "UTF-8"), URLDecoder.decode(part.substring(eq + 1), "UTF-8"));
            } catch (IllegalArgumentException | java.io.UnsupportedEncodingException ignored) {
                // skip malformed pairs
            }
        }
        return out;
    }

    private static String readHead(InputStream in) throws IOException {
        ByteArrayOutputStream b = new ByteArrayOutputStream();
        int c, state = 0;
        while ((c = in.read()) != -1) {
            b.write(c);
            if (b.size() > 16384) return null;
            state = (c == '\r' && (state == 0 || state == 2)) || (c == '\n' && (state == 1 || state == 3)) ? state + 1 : 0;
            if (state == 4) return b.toString("UTF-8");
        }
        return null;
    }

    private static byte[] readN(InputStream in, int n) throws IOException {
        byte[] buf = new byte[n];
        int got = 0, r;
        while (got < n && (r = in.read(buf, got, n - got)) > 0) got += r;
        return buf;
    }

    private static void send(OutputStream out, int code, String type, byte[] body) throws IOException {
        String head = "HTTP/1.1 " + code + " OK\r\nContent-Type: " + type + "\r\nContent-Length: " + body.length
                + "\r\nCache-Control: no-store\r\nX-Content-Type-Options: nosniff\r\nConnection: close\r\n\r\n";
        out.write(head.getBytes(StandardCharsets.UTF_8));
        out.write(body);
        out.flush();
    }
}
