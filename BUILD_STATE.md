# Build state: Glass Home (Fire TV launcher)

Last updated: 2026-11-23 4:55 PM IST

## Goal
A new Fire TV home app, `local.glasshome`, built from the approved mockups:
https://claude.ai/artifact/1ZF1Ls5b152tUkPD1ZnLf2 (boards 1 to 6 and 2b are approved).
Screens: Home (glass clock behind the mountain, app dock with liquid-glass slider, Jarvis at the end),
Screensaver (F1 photo, glass clock, F1 countdown, expanding buttons: Deadlines, Weather, Music,
AniList, Continue watching, Jarvis), expanded views, Jarvis screen (orb flies to center, live words),
Command Center (tvOS layout, only working actions), For You (halo-tv Tonight layout on Stremio's
Cinemeta catalog), Home settings.

Finish line: `powershell -ExecutionPolicy Bypass -File build.ps1` passes its self-test and produces
`dist\GlassHome.apk`; every screen renders in the laptop browser from `assets\ui\index.html`
(mock bridge) matching the approved mockups; on the TV (once awake) the app opens from the app row
and every dock app and Command Center button works.

## How it is built
- WebView app: the UI is HTML/CSS/JS in `assets/ui/` (same code as the approved mockups), the Java
  side (`src/local/glasshome/`) is a thin native bridge: apps and icons, launching, settings intents,
  Wi-Fi/memory, sleep, network fetch with cache, phone page server, HOME takeover service (Guard).
- No Gradle. `build.ps1`: self-test (pure Java) -> aapt2 -> javac --release 8 -> d8 -> zipalign -> apksigner.
- Laptop preview: open `assets/ui/index.html` in a browser. `assets/ui/mock.js` fakes the bridge.
- Tools: JDK `C:\Users\jasme\dev-tools\jdk17`, SDK `C:\Users\jasme\dev-tools\android-sdk` (android-28, build-tools 34.0.0).
- TV: adb `C:\Users\jasme\platform-tools\adb.exe`, `192.168.100.156:5555`. CEC is on: never wake the TV unasked.

## Stages
1. done (stage 1 commit): skeleton + build pipeline (MainActivity with WebView, Bridge stub, Guard, BootReceiver, build.ps1, keystore). Ends with dist\GlassHome.apk.
2. done, checked in the laptop browser (stage 2-9 commit): UI shell + Home screen in the browser (router, D-pad focus engine, mock bridge, liquid-glass lens slider, glass clock behind mountain, Jarvis orb in dock).
3. done, checked in the laptop browser (stage 2-9 commit): native bridge (apps + icons, launch, settings intents, Wi-Fi, memory, free memory, config file).
4. done, checked in the laptop browser (stage 2-9 commit): data layer (native fetch + cache; Open-Meteo + IP location, Jolpica F1, AniList, Cinemeta), parsed in self-test against live responses.
5. done, checked in the laptop browser (stage 2-9 commit): screensaver (5 min idle, expanding buttons, expanded views, Jarvis wakes on focus).
6. done, checked in the laptop browser (stage 2-9 commit): Jarvis (orb, Jarvis screen, phone hold-to-talk page on port 8766, local command brain, Ascend brain hook stubbed).
7. done, checked in the laptop browser (stage 2-9 commit): Command Center (tvOS layout, working actions: Wi-Fi info, Bluetooth, memory, speed test, Send to TV, sleep timer, Ambient, power off, apps, settings).
8. done, checked in the laptop browser (stage 2-9 commit): For You (halo Tonight layout on Cinemeta, genre wheel, Open in Stremio).
9. done, checked in the laptop browser (stage 2-9 commit): Home settings (scenes, screensaver delay, glass, accounts) with persistence.
10. done (stage 10 commits): polish, performance pass, code review, security review, report.
11. done, tested on the TV: on-TV fixes. Page files were packed as assets/ui\index.html (black "Webpage not available" screen); page now fits the 2x-density screen; speed pass (baked glass instead of live blur, 30 fps orbs, no endless animations, small Cinemeta images); liquid-glass drop on the dock (was 18px off the icon); iOS-style Command Center pop; everything kept 96px inside the TV's cropped edges; For You gets Anime / Shows / Movies and a visible backdrop.
Device stages (need his OK for HOME): switch HOME from dumbtv, install FanCode.

## Now
Installed on the TV and left open for JasMehr to try (Fire TV's screensaver was on top: any remote button shows it).
Frame times on the TV (tools/tv-test.sh): home idle 8-11 ms, dock moves 7-9 ms, screensaver 6-7 ms, Command Center 7 ms.
Since then: drop jitter fixed (dock pieces on their own layers, fixed-step springs; moves 11-12 ms, worst ~30 ms), Appstore opens the store front, Silk and Amazon Kids hidden, For You CONTINUE tab. Earlier: Nothing-style dock icons (no more squashed icons), quicker animations, For You preloads. Next: For You browsing is still about 20 ms a frame while moving along the row (fine when still); find why.
How to test on the TV: `bash tools/tv-test.sh <outdir>` (skips if something is playing, the TV is asleep, or Fire TV's screensaver is on).
Debug the TV page from the laptop: adb forward tcp:9333 localabstract:webview_devtools_remote_<pid>, then chrome://inspect.

## Blocked (needs JasMehr)
- Try it on the TV: it is open now; later, open "Glass Home" from dumbtv's app row.
- Anime "Open in Stremio" needs the Anime Kitsu add-on in Stremio (metadata only) for Stremio to show those titles.
- Home screen: DONE 4:50 PM. Glass Home holds Home; dumbtv uninstalled (backup/dumbtv-1.9.apk).
- Remote mic for Jarvis: only possible through an Alexa skill; needs your go-ahead and your Amazon developer sign-in.
- Music on the screensaver: needs your OK to switch on music access: adb shell cmd notification allow_listener local.glasshome/local.glasshome.MusicListener
- AniList: type your AniList user name on the phone page (Jarvis screen shows the address and PIN). Import your AniWatch list into AniList first.
- Stremio Continue watching: Home settings > Accounts > Stremio > Link now, then approve on your phone (no password on the TV).
- Ascend (deadlines from Muse, Jarvis brain for anything beyond TV control): Ascend needs two small endpoints, POST /api/tv/digest {key} -> {deadlines:[{title,due,course}]} and POST /api/tv/jarvis {key,messages} -> {reply}, plus a TV key. Not built: changes your Ascend backend, needs your go-ahead.
- Muse: the prompt for Muse comes after Ascend's endpoints.
- FanCode: install from the Amazon Appstore when the TV is free.

## Notes
- Approved design decisions live in the artifact above and in DECISIONS.md.
- Name in UI: "JasMehr". No em dashes in any text.
