package local.glasshome;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Starts the phone page after boot or an update. */
public final class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent i) {
        String a = i.getAction();
        if (Intent.ACTION_BOOT_COMPLETED.equals(a) || Intent.ACTION_MY_PACKAGE_REPLACED.equals(a)) PhoneService.start(c);
    }
}
