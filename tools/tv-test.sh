#!/usr/bin/env bash
# On-TV smoke test for Glass Home. Refuses to run while a video is playing.
# Prints frame stats per step (frames drawn, janky, 50th/90th percentile frame time).
# Usage: bash tools/tv-test.sh [outdir]
set -u
A=/c/Users/jasme/platform-tools/adb.exe
D=192.168.100.156:5555
OUT=${1:-/tmp/gh-tv}
mkdir -p "$OUT"
WOUT=$(cygpath -m "$OUT")
sh() { "$A" -s "$D" shell "$@"; }
key() { sh input keyevent "$@"; sleep 0.8; }
shot() { sleep 0.5; "$A" -s "$D" exec-out screencap -p > "$OUT/$1.png"; }
stats() {
  echo "$1: $(sh dumpsys gfxinfo local.glasshome | grep -E 'Total frames|Janky|50th|90th' | sed 's/.*: //' | tr '\n' ' ' | tr -d '\r')"
  sh dumpsys gfxinfo local.glasshome reset >/dev/null
}

"$A" connect "$D" >/dev/null 2>&1
if sh dumpsys media_session | grep -q "state=PlaybackState {state=3"; then
  echo "SKIP: something is playing on the TV"; exit 2
fi
WAKE=$(sh dumpsys power | grep -o "mWakefulness=[A-Za-z]*" | head -1)
case "$WAKE" in
  *Asleep*|*Dozing*) echo "SKIP: the TV is asleep (not waking it)"; exit 3 ;;
  *Dreaming*) echo "SKIP: Fire TV's screensaver is on (press a remote button first)"; exit 3 ;;
esac
echo "focus before: $(sh dumpsys window | grep mCurrentFocus | head -1)"
echo "columns: frames janky% p50 p90"
sh logcat -c
sh am force-stop local.glasshome
sh am start -W -n local.glasshome/.MainActivity | grep -E "TotalTime"
sleep 6; stats "load"
sleep 5; stats "home idle 5s"; shot 01-home
key KEYCODE_DPAD_RIGHT; key KEYCODE_DPAD_RIGHT; shot 02-dock-right; stats "dock moves"
key KEYCODE_MENU; sleep 1; shot 03-command; stats "command center"
key KEYCODE_BACK
for i in 1 2 3 4 5 6 7 8 9 10; do sh input keyevent KEYCODE_DPAD_RIGHT; done; sleep 1; shot 04-dock-end; stats "dock to end"
key KEYCODE_DPAD_CENTER; sleep 2; shot 05-jarvis; stats "jarvis"
key KEYCODE_BACK
key KEYCODE_MENU; key KEYCODE_DPAD_DOWN; key KEYCODE_DPAD_DOWN; key KEYCODE_DPAD_DOWN; key KEYCODE_DPAD_CENTER; sleep 3; shot 06-ambient; stats "ambient open"
sleep 5; stats "ambient idle 5s"
key KEYCODE_DPAD_RIGHT; key KEYCODE_DPAD_RIGHT; sleep 1; shot 07-ambient-weather; stats "ambient moves"
key KEYCODE_DPAD_CENTER; sleep 1; shot 08-expanded; stats "expanded"
key KEYCODE_BACK; key KEYCODE_BACK
for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14; do sh input keyevent KEYCODE_DPAD_LEFT; done; sleep 1
key KEYCODE_DPAD_CENTER; sleep 5; shot 09-foryou; stats "for you"
for i in 1 2 3 4 5 6; do sh input keyevent KEYCODE_DPAD_RIGHT; sleep 0.4; done; sleep 1; shot 10-foryou-row; stats "for you row x6"
key KEYCODE_BACK
sleep 3; stats "home again idle"
echo "memory: $(sh dumpsys meminfo local.glasshome | grep -E 'TOTAL:' | head -1 | tr -s ' ')"
echo "page process: $(sh ps -A -o RSS,NAME | grep sandboxed | tr -s ' ')"
echo "--- log"
sh logcat -d -s GlassHome:* chromium:W AndroidRuntime:E | grep -vE "^-----|variations_seed|library_prefetcher|net_helpers" | tail -25
key KEYCODE_HOME
sleep 2
echo "focus after: $(sh dumpsys window | grep mCurrentFocus | head -1)"
echo "done: screenshots in $WOUT"
