#!/usr/bin/env bash
# On-TV smoke test for Glass Home. Refuses to run while a video is playing.
# Usage: bash tools/tv-test.sh [outdir]
set -u
A=/c/Users/jasme/platform-tools/adb.exe
D=192.168.100.156:5555
OUT=${1:-/tmp/gh-tv}
mkdir -p "$OUT"
WOUT=$(cygpath -m "$OUT")
sh() { "$A" -s "$D" shell "$@"; }
key() { sh input keyevent "$@"; sleep 0.8; }
shot() { "$A" -s "$D" exec-out screencap -p > "$OUT/$1.png"; echo "shot $1"; }

"$A" connect "$D" >/dev/null 2>&1
if sh dumpsys media_session | grep -q "state=PlaybackState {state=3"; then
  echo "SKIP: something is playing on the TV"; exit 2
fi
echo "focus before: $(sh dumpsys window | grep mCurrentFocus | head -1)"
sh logcat -c
sh am force-stop local.glasshome
sh am start -W -n local.glasshome/.MainActivity | grep -E "TotalTime|WaitTime"
sleep 5; shot 01-home
key KEYCODE_DPAD_RIGHT; key KEYCODE_DPAD_RIGHT; shot 02-dock-right
key KEYCODE_MENU; sleep 1; shot 03-command
key KEYCODE_BACK
for i in 1 2 3 4 5 6 7 8 9 10; do sh input keyevent KEYCODE_DPAD_RIGHT; done; sleep 1; shot 04-dock-jarvis
key KEYCODE_DPAD_CENTER; sleep 2; shot 05-jarvis
key KEYCODE_BACK
key KEYCODE_MENU; key KEYCODE_DPAD_DOWN; key KEYCODE_DPAD_DOWN; key KEYCODE_DPAD_DOWN; key KEYCODE_DPAD_CENTER; sleep 3; shot 06-ambient
key KEYCODE_DPAD_RIGHT; key KEYCODE_DPAD_RIGHT; sleep 1; shot 07-ambient-weather
key KEYCODE_DPAD_CENTER; sleep 1; shot 08-expanded
key KEYCODE_BACK; key KEYCODE_BACK
for i in 1 2 3 4 5 6 7 8 9 10 11 12; do sh input keyevent KEYCODE_DPAD_LEFT; done
key KEYCODE_DPAD_CENTER; sleep 5; shot 09-foryou
key KEYCODE_BACK
sh dumpsys gfxinfo local.glasshome | grep -E "Total frames|Janky frames|50th|90th|99th" | head -6
sh dumpsys meminfo local.glasshome | grep -E "TOTAL PSS|TOTAL:" | head -2
sh logcat -d -s GlassHome:I chromium:E AndroidRuntime:E | grep -vE "^-----" | tail -25
key KEYCODE_HOME
sleep 2
echo "focus after: $(sh dumpsys window | grep mCurrentFocus | head -1)"
echo "done: screenshots in $WOUT"
