package local.glasshome;

import android.content.Intent;
import android.graphics.Color;
import android.os.Handler;
import android.os.Looper;
import android.service.dreams.DreamService;
import android.view.View;

/**
 * Glass Home as the TV's screensaver (Fire OS "daydream"). When the TV has been idle in any app, it
 * opens Glass Home's own screensaver (the F1 photos) instead of Amazon's. Back on it returns to the
 * app that was open.
 *
 * Fire TV has no menu to pick it; select it once from the PC:
 *   adb shell settings put secure screensaver_components local.glasshome/.Dream
 * Undo (Amazon's again):
 *   adb shell settings put secure screensaver_components com.amazon.ftv.screensaver/.app.services.ScreensaverService
 */
public final class Dream extends DreamService {
    static final String EXTRA = "dream";

    @Override
    public void onAttachedToWindow() {
        super.onAttachedToWindow();
        setInteractive(false);
        setFullscreen(true);
        View black = new View(this);
        black.setBackgroundColor(Color.BLACK);
        setContentView(black);
    }

    @Override
    public void onDreamingStarted() {
        super.onDreamingStarted();
        try {
            startActivity(new Intent(this, MainActivity.class).putExtra(EXTRA, true)
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP));
        } catch (RuntimeException e) {
            android.util.Log.w("GlassHome", "dream: could not open Glass Home", e);
        }
        // stays black a moment so the app underneath does not flash before the screensaver is up
        new Handler(Looper.getMainLooper()).postDelayed(this::finish, 700);
    }
}
