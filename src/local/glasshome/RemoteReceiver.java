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
        MainActivity m = MainActivity.current;
        if (m != null && m.resumed) {
            if ("home".equals(k)) m.js("window.UI&&UI.home()");
            else if (k != null && k.matches("up|down|left|right|ok|back|menu")) m.js("window.UI&&UI.key(" + JSONObject.quote(k) + ")");
            return;
        }
        Guard.remote(k, t);
    }
}
