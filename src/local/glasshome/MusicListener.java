package local.glasshome;

import android.content.ComponentName;
import android.content.Context;
import android.content.pm.PackageManager;
import android.media.MediaMetadata;
import android.media.session.MediaController;
import android.media.session.MediaSessionManager;
import android.media.session.PlaybackState;
import android.service.notification.NotificationListenerService;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.List;

/**
 * Exists only so Android lets Glass Home see what is playing (media sessions need a notification
 * listener that the user switched on). It reads no notifications.
 */
public final class MusicListener extends NotificationListenerService {

    /** What is playing now, as JSON, or "" when nothing plays or access is off. */
    static String nowPlaying(Context c) {
        MediaSessionManager msm = (MediaSessionManager) c.getSystemService(Context.MEDIA_SESSION_SERVICE);
        if (msm == null) return "";
        List<MediaController> list;
        try {
            list = msm.getActiveSessions(new ComponentName(c, MusicListener.class));
        } catch (SecurityException e) {
            return "{\"access\":false}";
        }
        MediaController best = null;
        for (MediaController m : list) {
            PlaybackState s = m.getPlaybackState();
            if (m.getMetadata() == null) continue;
            if (best == null || (s != null && s.getState() == PlaybackState.STATE_PLAYING)) best = m;
        }
        if (best == null) return "{\"access\":true}";
        MediaMetadata md = best.getMetadata();
        PlaybackState s = best.getPlaybackState();
        JSONObject o = new JSONObject();
        try {
            String app = best.getPackageName();
            try {
                PackageManager pm = c.getPackageManager();
                app = String.valueOf(pm.getApplicationLabel(pm.getApplicationInfo(best.getPackageName(), 0)));
            } catch (PackageManager.NameNotFoundException ignored) {
                // keep the package name
            }
            o.put("access", true)
                    .put("title", nz(md.getString(MediaMetadata.METADATA_KEY_TITLE)))
                    .put("artist", nz(md.getString(MediaMetadata.METADATA_KEY_ARTIST)))
                    .put("album", nz(md.getString(MediaMetadata.METADATA_KEY_ALBUM)))
                    .put("app", app)
                    .put("duration", md.getLong(MediaMetadata.METADATA_KEY_DURATION))
                    .put("position", s == null ? 0 : s.getPosition())
                    .put("playing", s != null && s.getState() == PlaybackState.STATE_PLAYING);
        } catch (JSONException ignored) {
            // plain values
        }
        return o.toString();
    }

    private static String nz(String s) {
        return s == null ? "" : s;
    }
}
