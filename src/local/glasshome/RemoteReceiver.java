package local.glasshome;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

import org.json.JSONObject;

/**
 * Remote presses from the phone page (sent by PhoneService from its own process). With Glass Home
 * on screen they go to its page; over any other app, the accessibility service acts for them.
 */
public final class RemoteReceiver extends BroadcastReceiver {
    static final String KEY = "k", TEXT = "text";

    @Override
    public void onReceive(Context c, Intent i) {
        String k = i.getStringExtra(KEY), t = i.getStringExtra(TEXT);
        if ("say".equals(k)) { // words for Jarvis from the phone
            MainActivity m = MainActivity.current;
            if (m != null) m.js("window.UI&&UI.heardSide(" + JSONObject.quote(t == null ? "" : t) + "," + m.resumed + ")");
            else c.startActivity(new Intent(c, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK).putExtra(PhoneService.HEARD, t));
            return;
        }
        if (TvControl.handles(k)) { // the TV itself: volume, on, off
            android.util.Log.i("GlassHome", "phone remote " + k + " for the TV");
            TvControl.handle(c, k);
            return;
        }
        MainActivity m = MainActivity.current;
        if (m != null && m.resumed) {
            android.util.Log.i("GlassHome", "phone remote " + k + " on Glass Home");
            if ("home".equals(k)) m.js("window.UI&&UI.home()");
            else if (k != null && k.matches("up|down|left|right|ok|back|menu")) m.js("window.UI&&UI.key(" + JSONObject.quote(k) + ")");
            return;
        }
        boolean done = Guard.remote(k, t);
        android.util.Log.i("GlassHome", "phone remote " + k + " in another app: " + (done ? "done" : "nothing to act on"));
    }
}
