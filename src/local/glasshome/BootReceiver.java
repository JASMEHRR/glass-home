package local.glasshome;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Starts the phone page after boot or an update, and fires the sleep timer. */
public final class BootReceiver extends BroadcastReceiver {
    static final String SLEEP_TIMER = "local.glasshome.SLEEP_TIMER";

    @Override
    public void onReceive(Context c, Intent i) {
        if (SLEEP_TIMER.equals(i.getAction())) {
            Prefs.get(c).set("sleep.at", null);
            Guard.sleep();
            return;
        }
        PhoneService.start(c);
    }
}
