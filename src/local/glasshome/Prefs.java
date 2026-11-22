package local.glasshome;

import android.content.Context;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Settings as plain key=value lines in glass.conf. Pure Java apart from {@link #get(Context)}.
 */
final class Prefs {
    static final String FILE = "glass.conf";
    private static Prefs instance;

    private final File file;
    private final Map<String, String> values = new LinkedHashMap<>();
    private long loadedAt = -1;

    Prefs(File file) {
        this.file = file;
    }

    /** Kept in the app's private storage: it holds the Ascend and Stremio keys. */
    static synchronized Prefs get(Context c) {
        if (instance == null) instance = new Prefs(new File(c.getFilesDir(), FILE));
        return instance;
    }

    /** Parses key=value lines; blank lines and lines starting with # are skipped. */
    static Map<String, String> parse(String text) {
        Map<String, String> out = new LinkedHashMap<>();
        for (String line : text.split("\n")) {
            String l = line.trim();
            if (l.isEmpty() || l.startsWith("#")) continue;
            int eq = l.indexOf('=');
            if (eq <= 0) continue;
            out.put(l.substring(0, eq).trim(), l.substring(eq + 1).trim());
        }
        return out;
    }

    static String format(Map<String, String> values) {
        StringBuilder b = new StringBuilder("# Glass Home settings. Edit here or in Home settings.\n");
        for (Map.Entry<String, String> e : values.entrySet()) {
            b.append(e.getKey()).append('=').append(e.getValue().replace('\n', ' ')).append('\n');
        }
        return b.toString();
    }

    private void reloadIfChanged() {
        long m = file.exists() ? file.lastModified() : 0;
        if (m == loadedAt) return;
        loadedAt = m;
        values.clear();
        if (m == 0) return;
        try (InputStream in = new FileInputStream(file)) {
            byte[] buf = new byte[(int) Math.min(file.length(), 256 * 1024)];
            int n = 0, r;
            while (n < buf.length && (r = in.read(buf, n, buf.length - n)) > 0) n += r;
            values.putAll(parse(new String(buf, 0, n, StandardCharsets.UTF_8)));
        } catch (IOException ignored) {
            // unreadable: start from defaults
        }
    }

    synchronized String get(String key, String fallback) {
        reloadIfChanged();
        String v = values.get(key);
        return v == null || v.isEmpty() ? fallback : v;
    }

    synchronized Map<String, String> all() {
        reloadIfChanged();
        return new LinkedHashMap<>(values);
    }

    /** Sets or (with null) removes a key and writes the file. */
    synchronized void set(String key, String value) {
        reloadIfChanged();
        if (key == null || key.isEmpty() || key.indexOf('=') >= 0 || key.indexOf('\n') >= 0) return;
        if (value == null) values.remove(key);
        else values.put(key, value);
        File parent = file.getParentFile();
        if (parent != null && !parent.exists() && !parent.mkdirs()) return;
        File tmp = new File(file.getPath() + ".tmp");
        try (OutputStream out = new FileOutputStream(tmp)) {
            out.write(format(values).getBytes(StandardCharsets.UTF_8));
        } catch (IOException e) {
            return;
        }
        if (tmp.renameTo(file)) loadedAt = file.lastModified();
    }
}
