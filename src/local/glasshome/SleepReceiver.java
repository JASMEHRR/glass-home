package local.glasshome;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** The sleep timer's alarm. Not exported, so only Glass Home's own alarm can fire it. */
public final class SleepReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent i) {
        Prefs.get(c).set("sleep.at", null);
        Guard.sleep();
    }
}
