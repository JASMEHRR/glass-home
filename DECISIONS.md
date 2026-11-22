# Decisions made without asking

- 2026-11-23: UI is HTML/CSS/JS inside a WebView, not native views. Why: it is the same code as the approved mockups (looks identical), and every screen can be checked in the laptop browser tonight while the TV is asleep. Undo: rewrite screens natively later; the bridge stays.
- 2026-11-23: New package `local.glasshome`, installed next to dumbtv (not replacing it). HOME stays with dumbtv until you approve the switch. Undo: uninstall Glass Home.
- 2026-11-23: HOME takeover reuses dumbtv's Guard approach (MIT licence, credited). Undo: disable Glass Home in Accessibility settings.
- 2026-11-23: Local git only (no GitHub remote: gh is not signed in on this laptop). Undo: add a remote and push.
- 2026-11-23: Background photos: tvOS Launcher's Night scene (Apache-2.0) for Home, Wikimedia Commons Suzuka 2019 Red Bull photo (Takayuki Suzuki, CC BY-SA 2.0, credited on screen) for the screensaver.
- 2026-11-23: Voice comes from the phone page using the phone keyboard's mic (plain http pages cannot use the browser's speech API). Undo: host the phone page on Ascend (https) later.
- 2026-11-23: Settings file moved to the app's private storage (it holds the Stremio and Ascend keys). Edit it through Home settings or the phone page, not adb.
- 2026-11-23: "Everything" on the For You wheel renamed "Featured" (it is Stremio's Featured list).
- 2026-11-23: Installed on the TV next to dumbtv at 01:58. HOME not switched. App not opened because SmartTube was playing.
