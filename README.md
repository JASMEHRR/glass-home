# Glass Home

My own home screen for the Amazon Fire TV, with Jarvis (the assistant from [Ascend](https://github.com/JASMEHRR/ASCEND)) built in.

- **Home:** a glass clock behind a mountain photo, an app dock with a liquid-glass slider, and Jarvis at the end of the dock.
- **Screensaver:** F1 countdown, weather, deadlines, music, AniList and continue watching.
- **Jarvis:** opens full screen when nothing is playing, and moves to a corner during a video, pausing and resuming it.
- **Command Center** and **For You** screens, laid out for a TV remote.

## How it is built
- The UI is plain HTML, CSS and JavaScript in `assets/ui/`. Open `assets/ui/index.html` in a browser to preview it on a laptop (`mock.js` fakes the TV side).
- The Java side in `src/local/glasshome/` is a thin bridge: app list and icons, launching, settings, network fetch with cache, and keeping it as the home app.
- No Gradle. `build.ps1` runs a self-test, then aapt2, javac, d8, zipalign and apksigner to produce `dist/GlassHome.apk`.

Credits for borrowed ideas, photos and data sources are in [NOTICE.md](NOTICE.md).
