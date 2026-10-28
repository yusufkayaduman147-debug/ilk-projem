#!/usr/bin/env bash
# Tüm videoyu üretir: ses -> zaman çizelgesi -> müzik/miks -> kareler (paralel) -> birleştirme.
# Ön koşullar: python3 (numpy, scipy, soundfile, piper-tts, sherpa-onnx, tinysoundfont, shapely, pyloudnorm),
# node + playwright (Chromium), ffmpeg. Ağır veriler $WORK altında tutulur (bkz. README).
set -euo pipefail
cd "$(dirname "$0")"
export WORK=${WORK:-/tmp/claude-0/work}
JOBS=${JOBS:-3}
CHUNKS=${CHUNKS:-9}
OUT=${OUT:-$WORK/out}
mkdir -p "$OUT" "$WORK/seg"

if [[ "${SKIP_AUDIO:-0}" != 1 ]]; then
  python3 src/timeline.py
  python3 src/music.py
  python3 src/mix.py
fi
python3 src/timeline.py
python3 src/subs.py "$OUT"

# yerel sunucu (render sayfası, haritalar, yazı tipleri)
SITE=$WORK/site; mkdir -p "$SITE"
ln -sfn "$PWD/render" "$SITE/render"; ln -sfn "$WORK/build" "$SITE/assets"; ln -sfn "$WORK/fonts" "$SITE/fonts"
if ! curl -s -o /dev/null http://127.0.0.1:8765/render/index.html; then
  (cd "$SITE" && nohup python3 -m http.server 8765 --bind 127.0.0.1 >/dev/null 2>&1 &)
  sleep 1
fi

FRAMES=$(python3 -c "import json,math;t=json.load(open('$WORK/build/timeline.json'));print(math.ceil(t['duration']*t['fps']))")
STEP=$(( (FRAMES + CHUNKS - 1) / CHUNKS ))
rm -f "$WORK/seg/list.txt"
for ((i = 0; i < CHUNKS; i++)); do
  a=$(( i * STEP )); b=$(( (i + 1) * STEP )); (( b > FRAMES )) && b=$FRAMES
  printf "%d %d %s\n" "$a" "$b" "$WORK/seg/part$(printf %02d $i).mkv"
  echo "file '$WORK/seg/part$(printf %02d $i).mkv'" >> "$WORK/seg/list.txt"
done | xargs -P "$JOBS" -L 1 sh -c 'node render/render.cjs --from "$0" --to "$1" --out "$2" > "$2.log" 2>&1'

./encode.sh "$WORK/seg/list.txt"
