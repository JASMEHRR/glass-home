package local.glasshome;

import android.content.Context;
import android.os.PowerManager;
import android.util.Base64;
import android.util.Log;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.DataInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.HttpURLConnection;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.security.cert.X509Certificate;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLSocket;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;

/**
 * The TV itself, from the phone: volume through the Samsung TV's own network remote (Fire OS cannot
 * change an HDMI TV's volume), and on/off through the Fire TV (sleeping it turns the TV off over
 * HDMI-CEC, waking it turns the TV on), plus Wake-on-LAN to the Samsung TV when it is known.
 *
 * The first volume press shows "Allow Glass Home?" on the Samsung TV; once allowed, its token is kept.
 * The TV is found on the Wi-Fi by itself, so it also works on another network (another Samsung TV).
 */
final class TvControl {
    static final String STATE = "tv.state";
    private static final String TAG = "GlassHome";
    private static final ExecutorService io = Executors.newSingleThreadExecutor();
    private static final SecureRandom rnd = new SecureRandom();

    private static Socket sock;
    private static DataInputStream in;
    private static OutputStream out;
    private static long lastUse;

    private TvControl() {
    }

    static boolean handles(String k) {
        return k != null && k.matches("volup|voldown|mute|power_on|power_off");
    }

    static void handle(Context c, String k) {
        Context app = c.getApplicationContext();
        io.execute(() -> run(app, k));
    }

    private static void run(Context c, String k) {
        try {
            switch (k) {
                case "power_on":
                    wake(c);
                    wol(c);
                    break;
                case "power_off":
                    if (!Guard.sleep()) samsung(c, "KEY_POWER");
                    break;
                case "volup": samsung(c, "KEY_VOLUP"); break;
                case "voldown": samsung(c, "KEY_VOLDOWN"); break;
                case "mute": samsung(c, "KEY_MUTE"); break;
                default: break;
            }
        } catch (IOException | RuntimeException e) {
            Log.w(TAG, "tv " + k + ": " + e);
            close();
        }
    }

    // ---- on / off ----

    @SuppressWarnings("deprecation")
    private static void wake(Context c) {
        PowerManager pm = (PowerManager) c.getSystemService(Context.POWER_SERVICE);
        PowerManager.WakeLock wl = pm.newWakeLock(PowerManager.FULL_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP
                | PowerManager.ON_AFTER_RELEASE, "glasshome:wake");
        wl.acquire(3000);
    }

    /** Wake-on-LAN to the Samsung TV (if its address was seen before), for when it was turned off by its own remote. */
    private static void wol(Context c) {
        String mac = Prefs.get(c).get("samsung.mac", "");
        if (!mac.matches("([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}")) return;
        byte[] m = new byte[6];
        String[] parts = mac.split("[:-]");
        for (int i = 0; i < 6; i++) m[i] = (byte) Integer.parseInt(parts[i], 16);
        byte[] p = new byte[6 + 16 * 6];
        for (int i = 0; i < 6; i++) p[i] = (byte) 0xff;
        for (int i = 6; i < p.length; i++) p[i] = m[(i - 6) % 6];
        try (DatagramSocket s = new DatagramSocket()) {
            s.setBroadcast(true);
            s.send(new DatagramPacket(p, p.length, InetAddress.getByName("255.255.255.255"), 9));
        } catch (IOException e) {
            Log.w(TAG, "wol: " + e);
        }
    }

    // ---- Samsung TV network remote ----

    private static void samsung(Context c, String key) throws IOException {
        long now = System.currentTimeMillis();
        if (sock == null || now - lastUse > 25_000) {
            close();
            connect(c);
        }
        String msg;
        try {
            msg = new JSONObject().put("method", "ms.remote.control").put("params", new JSONObject().put("Cmd", "Click")
                    .put("DataOfCmd", key).put("Option", "false").put("TypeOfRemote", "SendRemoteKey")).toString();
        } catch (org.json.JSONException e) {
            throw new IOException(e.getMessage());
        }
        try {
            writeText(out, msg);
        } catch (IOException e) { // the TV dropped the connection: once more on a new one
            close();
            connect(c);
            writeText(out, msg);
        }
        lastUse = System.currentTimeMillis();
    }

    private static void connect(Context c) throws IOException {
        Prefs p = Prefs.get(c);
        String ip = p.get("samsung.ip", "");
        if (ip.isEmpty() || !isSamsung(c, ip)) {
            note(c, "Looking for the Samsung TV on this Wi-Fi");
            ip = find(c);
            if (ip == null) {
                note(c, "No Samsung TV found on this Wi-Fi. Is it on?");
                throw new IOException("no samsung tv");
            }
            p.set("samsung.ip", ip);
        }
        String tokenKey = "samsung.token." + ip.replace('.', '_'), token = p.get(tokenKey, "");
        SSLSocket s;
        try {
            SSLContext ctx = SSLContext.getInstance("TLS");
            // The TV's own self-signed certificate, on this Wi-Fi only: nothing secret is sent to it.
            ctx.init(null, new TrustManager[]{new X509TrustManager() {
                @Override public void checkClientTrusted(X509Certificate[] chain, String type) { }
                @Override public void checkServerTrusted(X509Certificate[] chain, String type) { }
                @Override public X509Certificate[] getAcceptedIssuers() { return new X509Certificate[0]; }
            }}, rnd);
            s = (SSLSocket) ctx.getSocketFactory().createSocket();
        } catch (java.security.GeneralSecurityException e) {
            throw new IOException(e.getMessage());
        }
        s.connect(new InetSocketAddress(ip, 8002), 3000);
        s.setSoTimeout(token.isEmpty() ? 40_000 : 6_000);
        s.startHandshake();
        String name = Base64.encodeToString("Glass Home".getBytes(StandardCharsets.UTF_8), Base64.NO_WRAP);
        byte[] nonce = new byte[16];
        rnd.nextBytes(nonce);
        String req = "GET /api/v2/channels/samsung.remote.control?name=" + URLEncoder.encode(name, "UTF-8")
                + (token.isEmpty() ? "" : "&token=" + URLEncoder.encode(token, "UTF-8")) + " HTTP/1.1\r\n"
                + "Host: " + ip + ":8002\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n"
                + "Sec-WebSocket-Key: " + Base64.encodeToString(nonce, Base64.NO_WRAP) + "\r\nSec-WebSocket-Version: 13\r\n\r\n";
        OutputStream o = s.getOutputStream();
        o.write(req.getBytes(StandardCharsets.UTF_8));
        o.flush();
        DataInputStream i = new DataInputStream(s.getInputStream());
        String status = readLine(i);
        while (!readLine(i).isEmpty()) { /* headers */ }
        if (!status.contains(" 101")) {
            s.close();
            throw new IOException("samsung handshake: " + status);
        }
        if (token.isEmpty()) note(c, "On the TV, choose Allow for Glass Home");
        while (true) {
            String m;
            try {
                m = readText(i, o);
            } catch (java.net.SocketTimeoutException e) {
                s.close();
                note(c, "The TV did not allow Glass Home. Press a volume button again and choose Allow");
                throw e;
            }
            String ev;
            JSONObject j;
            try {
                j = new JSONObject(m);
                ev = j.optString("event");
            } catch (org.json.JSONException e) {
                continue;
            }
            if ("ms.channel.connect".equals(ev)) {
                JSONObject d = j.optJSONObject("data");
                String t = d == null ? "" : d.optString("token", "");
                if (!t.isEmpty() && !t.equals(token)) p.set(tokenKey, t);
                if (token.isEmpty()) note(c, "Volume works now");
                break;
            }
            if (ev.contains("unauthorized") || ev.contains("timeOut")) {
                s.close();
                note(c, ev.contains("timeOut") ? "Nobody answered the TV's Allow pop-up. Press a volume button again and choose Allow on the TV"
                        : "The TV blocked Glass Home. Allow it in the TV's Settings > Connection > Device Manager");
                throw new IOException(ev);
            }
        }
        s.setSoTimeout(6_000);
        sock = s;
        in = i;
        out = o;
        lastUse = System.currentTimeMillis();
    }

    /** True when ip answers like a Samsung TV; keeps its Wi-Fi address for Wake-on-LAN. */
    private static boolean isSamsung(Context c, String ip) {
        HttpURLConnection h = null;
        try {
            h = (HttpURLConnection) new URL("http://" + ip + ":8001/api/v2/").openConnection();
            h.setConnectTimeout(700);
            h.setReadTimeout(1500);
            if (h.getResponseCode() != 200) return false;
            ByteArrayOutputStream b = new ByteArrayOutputStream();
            try (InputStream s = h.getInputStream()) {
                byte[] buf = new byte[4096];
                for (int n; (n = s.read(buf)) > 0 && b.size() < 65536; ) b.write(buf, 0, n);
            }
            JSONObject d = new JSONObject(b.toString("UTF-8")).optJSONObject("device");
            if (d == null || !d.optString("type").toLowerCase(java.util.Locale.ROOT).contains("samsung")) return false;
            String mac = d.optString("wifiMac", "");
            if (!mac.isEmpty()) Prefs.get(c).set("samsung.mac", mac);
            return true;
        } catch (IOException | org.json.JSONException e) {
            return false;
        } finally {
            if (h != null) h.disconnect();
        }
    }

    /** Looks through this Wi-Fi (the Fire TV's /24) for a Samsung TV. */
    private static String find(Context c) {
        String me = PhoneService.lanAddress();
        int dot = me.lastIndexOf('.');
        if (dot < 0 || me.startsWith("0.")) return null;
        String base = me.substring(0, dot + 1);
        ExecutorService pool = Executors.newFixedThreadPool(32);
        List<Callable<String>> tasks = new ArrayList<>();
        for (int n = 1; n < 255; n++) {
            String ip = base + n;
            if (ip.equals(me)) continue;
            tasks.add(() -> {
                try (Socket t = new Socket()) {
                    t.connect(new InetSocketAddress(ip, 8001), 400);
                }
                if (!isSamsung(c, ip)) throw new IOException("not a samsung tv");
                return ip;
            });
        }
        try {
            return pool.invokeAny(tasks, 20, TimeUnit.SECONDS);
        } catch (Exception e) {
            return null;
        } finally {
            pool.shutdownNow();
        }
    }

    private static void close() {
        try {
            if (sock != null) sock.close();
        } catch (IOException ignored) {
            // already gone
        }
        sock = null;
        in = null;
        out = null;
    }

    private static void note(Context c, String msg) {
        Prefs.get(c).set(STATE, msg);
        Log.i(TAG, "tv: " + msg);
        MainActivity m = MainActivity.current;
        if (m != null) m.js("window.UI&&UI.tvNote(" + JSONObject.quote(msg) + ")");
    }

    // ---- WebSocket frames (client side: masked text, as RFC 6455 asks) ----

    private static void writeText(OutputStream o, String text) throws IOException {
        byte[] d = text.getBytes(StandardCharsets.UTF_8);
        ByteArrayOutputStream b = new ByteArrayOutputStream(d.length + 8);
        b.write(0x81);
        if (d.length < 126) b.write(0x80 | d.length);
        else if (d.length < 65536) { b.write(0x80 | 126); b.write(d.length >> 8); b.write(d.length & 0xff); }
        else throw new IOException("frame too big");
        byte[] mask = new byte[4];
        rnd.nextBytes(mask);
        b.write(mask, 0, 4);
        for (int i = 0; i < d.length; i++) b.write(d[i] ^ mask[i & 3]);
        o.write(b.toByteArray());
        o.flush();
    }

    private static String readText(DataInputStream i, OutputStream o) throws IOException {
        while (true) {
            int b0 = i.readUnsignedByte(), b1 = i.readUnsignedByte(), op = b0 & 0x0f;
            long len = b1 & 0x7f;
            if (len == 126) len = i.readUnsignedShort();
            else if (len == 127) len = i.readLong();
            if (len < 0 || len > (1 << 20)) throw new IOException("frame too big");
            byte[] mask = null;
            if ((b1 & 0x80) != 0) { mask = new byte[4]; i.readFully(mask); }
            byte[] d = new byte[(int) len];
            i.readFully(d);
            if (mask != null) for (int k = 0; k < d.length; k++) d[k] ^= mask[k & 3];
            if (op == 0x8) throw new IOException("closed by the TV");
            if (op == 0x9) { // ping: answer with a masked pong
                ByteArrayOutputStream b = new ByteArrayOutputStream();
                b.write(0x8a);
                b.write(0x80 | Math.min(d.length, 125));
                byte[] m = new byte[4];
                rnd.nextBytes(m);
                b.write(m, 0, 4);
                for (int k = 0; k < Math.min(d.length, 125); k++) b.write(d[k] ^ m[k & 3]);
                o.write(b.toByteArray());
                o.flush();
                continue;
            }
            if (op == 0x1) return new String(d, StandardCharsets.UTF_8);
        }
    }

    private static String readLine(DataInputStream i) throws IOException {
        StringBuilder b = new StringBuilder();
        for (int ch; (ch = i.read()) >= 0; ) {
            if (ch == '\n') break;
            if (ch != '\r') b.append((char) ch);
            if (b.length() > 4096) throw new IOException("header too long");
        }
        return b.toString();
    }
}
