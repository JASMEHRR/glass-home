package local.glasshome;

import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageInstaller;
import android.content.pm.PackageManager;
import android.net.Uri;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.List;

/**
 * Installs APKs sent from the phone and uninstalls apps, through Android's own installer. Fire OS
 * always shows its "Install?" / "Uninstall?" screen on the TV; confirm it with either remote.
 * Needs "Install unknown apps" allowed for Glass Home (Settings > My Fire TV > Developer options).
 */
public final class ApkInstaller extends BroadcastReceiver {
    static final String LAST = "apk.last";

    /** Starts installing apk; the result lands in Prefs "apk.last" (read by the phone page). */
    static void install(Context c, File apk, String name) throws IOException {
        PackageInstaller pi = c.getPackageManager().getPackageInstaller();
        PackageInstaller.SessionParams params = new PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL);
        params.setSize(apk.length());
        int id = pi.createSession(params);
        PackageInstaller.Session s = pi.openSession(id);
        try {
            try (InputStream in = new FileInputStream(apk); OutputStream out = s.openWrite("app.apk", 0, apk.length())) {
                byte[] buf = new byte[65536];
                for (int n; (n = in.read(buf)) > 0; ) out.write(buf, 0, n);
                s.fsync(out);
            }
            // noted before commit: Android can answer (e.g. a broken file) before commit() returns
            note(c, "waiting", name, "Confirm the install on the TV");
            Intent done = new Intent(c, ApkInstaller.class).putExtra("name", name);
            s.commit(PendingIntent.getBroadcast(c, id, done, PendingIntent.FLAG_UPDATE_CURRENT).getIntentSender());
        } catch (IOException | RuntimeException e) {
            s.abandon();
            throw e instanceof IOException ? (IOException) e : new IOException(e.getMessage());
        } finally {
            s.close();
        }
    }

    /** Asks Android to uninstall pkg (Fire OS shows its own confirmation on the TV). */
    static boolean uninstall(Context c, String pkg) {
        if (pkg == null || !pkg.matches("[A-Za-z0-9._]{1,120}") || pkg.equals(c.getPackageName())) return false;
        try {
            c.startActivity(new Intent(Intent.ACTION_DELETE, Uri.parse("package:" + pkg)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
            return true;
        } catch (RuntimeException e) {
            return false;
        }
    }

    /** Apps the user installed (not part of Fire OS), as JSON [{id,label}], for the uninstall list. */
    static String installed(Context c) {
        PackageManager pm = c.getPackageManager();
        List<ApplicationInfo> apps = new ArrayList<>(pm.getInstalledApplications(0));
        apps.sort((x, y) -> String.valueOf(x.loadLabel(pm)).compareToIgnoreCase(String.valueOf(y.loadLabel(pm))));
        JSONArray out = new JSONArray();
        try {
            for (ApplicationInfo ai : apps) {
                if ((ai.flags & (ApplicationInfo.FLAG_SYSTEM | ApplicationInfo.FLAG_UPDATED_SYSTEM_APP)) != 0) continue;
                if (ai.packageName.equals(c.getPackageName())) continue;
                // only real apps (Fire OS also installs overlays and helpers this way)
                if (pm.getLeanbackLaunchIntentForPackage(ai.packageName) == null && pm.getLaunchIntentForPackage(ai.packageName) == null) continue;
                out.put(new JSONObject().put("id", ai.packageName).put("label", String.valueOf(ai.loadLabel(pm))));
            }
        } catch (JSONException ignored) {
            // plain strings
        }
        return out.toString();
    }

    /** The new app's own name, else the file name. */
    private static String appName(Context c, Intent i) {
        String pkg = i.getStringExtra(PackageInstaller.EXTRA_PACKAGE_NAME), file = i.getStringExtra("name");
        try {
            if (pkg != null) return String.valueOf(c.getPackageManager().getApplicationLabel(c.getPackageManager().getApplicationInfo(pkg, 0)));
        } catch (PackageManager.NameNotFoundException ignored) {
            // fall back to the file name
        }
        return file == null ? "the app" : file;
    }

    static void note(Context c, String state, String name, String message) {
        try {
            Prefs.get(c).set(LAST, new JSONObject().put("state", state).put("name", name == null ? "" : name)
                    .put("message", message).put("at", System.currentTimeMillis()).toString());
        } catch (JSONException ignored) {
            // plain strings
        }
    }

    @Override
    public void onReceive(Context c, Intent i) {
        int status = i.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE);
        String name = i.getStringExtra("name");
        if (status == PackageInstaller.STATUS_PENDING_USER_ACTION) {
            Intent confirm = i.getParcelableExtra(Intent.EXTRA_INTENT);
            if (confirm != null) c.startActivity(confirm.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
            note(c, "waiting", name, "Confirm the install on the TV");
        } else if (status == PackageInstaller.STATUS_SUCCESS) {
            note(c, "done", name, "Installed");
            MainActivity m = MainActivity.current;
            if (m != null) m.js("window.UI&&UI.installed(" + org.json.JSONObject.quote("Installed: " + appName(c, i)) + ")");
        } else {
            String why = i.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE);
            note(c, "failed", name, status == PackageInstaller.STATUS_FAILURE_ABORTED ? "Cancelled on the TV"
                    : "Not installed" + (why == null ? "" : ": " + why));
        }
    }
}
