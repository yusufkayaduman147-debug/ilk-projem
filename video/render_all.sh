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

ffmpeg -y -loglevel error -f concat -safe 0 -i "$WORK/seg/list.txt" -c copy "$WORK/seg/video_master.mkv"
# Ana dosya: H.264 + AAC + Türkçe yumuşak altyazı
ffmpeg -y -loglevel error -i "$WORK/seg/video_master.mkv" -i "$WORK/build/mix.wav" -i "$OUT/islamin_dogusu_ve_yayilisi.tr.srt" \
  -map 0:v -map 1:a -map 2:s -c:v libx264 -preset slow -crf 19 -profile:v high -pix_fmt yuv420p -tune film \
  -c:a aac -b:a 256k -c:s mov_text -metadata:s:s:0 language=tur -metadata:s:a:0 language=tur \
  -metadata title="İslam'ın Doğuşu ve Yayılışı" -movflags +faststart -shortest "$OUT/islamin_dogusu_ve_yayilisi.mp4"
# Altyazısı videoya gömülü sürüm
ffmpeg -y -loglevel error -i "$WORK/seg/video_master.mkv" -i "$WORK/build/mix.wav" \
  -vf "ass=$WORK/build/subs.ass" -map 0:v -map 1:a -c:v libx264 -preset slow -crf 20 -profile:v high -pix_fmt yuv420p -tune film \
  -c:a aac -b:a 256k -metadata title="İslam'ın Doğuşu ve Yayılışı (altyazılı)" -movflags +faststart -shortest "$OUT/islamin_dogusu_ve_yayilisi_altyazili.mp4"
ls -la "$OUT"
