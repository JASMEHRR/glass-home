# Build state: Glass Home (Fire TV launcher)

Last updated: 2026-11-23 02:05 IST

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
Device stages (need the TV awake, and his OK for HOME): install, test on TV, switch HOME from dumbtv, install FanCode.

## Now
All laptop stages done. Installed on the TV beside dumbtv at 01:58 (HOME untouched). Nothing left that can be done without JasMehr: see Blocked.

## Blocked (needs JasMehr)
- Try it on the TV: open "Glass Home" from dumbtv's app row. Not opened yet because someone was watching SmartTube at 02:00.
- Make it the Home screen: needs your OK. Claude then swaps the accessibility service from tv.dumbtv.home/tv.dumbtv.home.Guard to local.glasshome/local.glasshome.Guard (undo: swap back).
- Music on the screensaver: needs your OK to switch on music access: adb shell cmd notification allow_listener local.glasshome/local.glasshome.MusicListener
- AniList: type your AniList user name on the phone page (Jarvis screen shows the address and PIN). Import your AniWatch list into AniList first.
- Stremio Continue watching: Home settings > Accounts > Stremio > Link now, then approve on your phone (no password on the TV).
- Ascend (deadlines from Muse, Jarvis brain for anything beyond TV control): Ascend needs two small endpoints, POST /api/tv/digest {key} -> {deadlines:[{title,due,course}]} and POST /api/tv/jarvis {key,messages} -> {reply}, plus a TV key. Not built: changes your Ascend backend, needs your go-ahead.
- Muse: the prompt for Muse comes after Ascend's endpoints.
- FanCode: install from the Amazon Appstore when the TV is free.

## Notes
- Approved design decisions live in the artifact above and in DECISIONS.md.
- Name in UI: "JasMehr". No em dashes in any text.
