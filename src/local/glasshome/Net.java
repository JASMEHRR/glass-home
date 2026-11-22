package local.glasshome;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

/**
 * HTTP GET/POST with a small disk cache, for the page's data (weather, F1, AniList, Stremio
 * catalogs). Pure Java so the self-test can run it on the laptop.
 */
final class Net {
    static final int MAX_BYTES = 4 * 1024 * 1024;
    private final File dir;

    Net(File cacheDir) {
        this.dir = new File(cacheDir, "net");
    }

    static final class Result {
        final boolean ok;
        final String body;
        final boolean stale;

        Result(boolean ok, String body, boolean stale) {
            this.ok = ok;
            this.body = body;
            this.stale = stale;
        }
    }

    static String key(String url, String body) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-1");
            md.update(url.getBytes(StandardCharsets.UTF_8));
            if (body != null) md.update(body.getBytes(StandardCharsets.UTF_8));
            StringBuilder b = new StringBuilder();
            for (byte x : md.digest()) b.append(String.format("%02x", x & 0xff));
            return b.toString();
        } catch (NoSuchAlgorithmException e) {
            return Integer.toHexString((url + body).hashCode());
        }
    }

    static boolean allowed(String url) {
        return url != null && (url.startsWith("https://") || url.startsWith("http://")) && url.length() < 4000;
    }

    /** Returns a cached copy younger than maxAgeSec, else fetches; on failure, any cached copy. */
    Result get(String url, String body, int maxAgeSec) {
        if (!allowed(url)) return new Result(false, "bad url", false);
        File f = new File(dir, key(url, body));
        String cached = read(f);
        long age = f.exists() ? (System.currentTimeMillis() - f.lastModified()) / 1000 : Long.MAX_VALUE;
        if (cached != null && age < maxAgeSec) return new Result(true, cached, false);
        try {
            String fresh = fetch(url, body);
            write(f, fresh);
            return new Result(true, fresh, false);
        } catch (IOException e) {
            if (cached != null) return new Result(true, cached, true);
            return new Result(false, String.valueOf(e.getMessage()), false);
        }
    }

    static String fetch(String url, String body) throws IOException {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setConnectTimeout(8000);
        c.setReadTimeout(12000);
        c.setInstanceFollowRedirects(true);
        c.setRequestProperty("User-Agent", "GlassHome/1.0 (Fire TV home screen)");
        c.setRequestProperty("Accept", "application/json, text/xml, */*");
        try {
            if (body != null && !body.isEmpty()) {
                c.setRequestMethod("POST");
                c.setDoOutput(true);
                c.setRequestProperty("Content-Type", "application/json");
                try (OutputStream out = c.getOutputStream()) {
                    out.write(body.getBytes(StandardCharsets.UTF_8));
                }
            }
            int code = c.getResponseCode();
            if (code < 200 || code >= 300) throw new IOException("HTTP " + code);
            try (InputStream in = c.getInputStream()) {
                return new String(readAll(in), StandardCharsets.UTF_8);
            }
        } finally {
            c.disconnect();
        }
    }

    static byte[] readAll(InputStream in) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buf = new byte[16384];
        int r;
        while ((r = in.read(buf)) > 0) {
            out.write(buf, 0, r);
            if (out.size() > MAX_BYTES) throw new IOException("response too large");
        }
        return out.toByteArray();
    }

    private static String read(File f) {
        if (!f.exists()) return null;
        try (InputStream in = new FileInputStream(f)) {
            return new String(readAll(in), StandardCharsets.UTF_8);
        } catch (IOException e) {
            return null;
        }
    }

    private void write(File f, String text) {
        if (!dir.exists() && !dir.mkdirs()) return;
        try (OutputStream out = new FileOutputStream(f)) {
            out.write(text.getBytes(StandardCharsets.UTF_8));
        } catch (IOException ignored) {
            // cache is best effort
        }
    }

    /** Downloads for up to maxMs and returns megabits per second, or -1 on failure. */
    static double speedTest(String url, long maxMs) {
        long start = System.nanoTime(), bytes = 0;
        try {
            HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
            c.setConnectTimeout(8000);
            c.setReadTimeout(8000);
            try (InputStream in = c.getInputStream()) {
                byte[] buf = new byte[65536];
                int r;
                while ((r = in.read(buf)) > 0) {
                    bytes += r;
                    if ((System.nanoTime() - start) / 1_000_000 > maxMs) break;
                }
            } finally {
                c.disconnect();
            }
        } catch (IOException e) {
            if (bytes == 0) return -1;
        }
        double secs = (System.nanoTime() - start) / 1e9;
        return secs <= 0 ? -1 : bytes * 8 / secs / 1e6;
    }
}
