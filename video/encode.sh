#!/usr/bin/env bash
# Render parçalarını birleştirir; ana MP4 (yumuşak altyazılı) ve altyazısı gömülü sürümü kodlar.
# Kullanım: ./encode.sh <ffmpeg-concat-listesi>
set -euo pipefail
export WORK=${WORK:-/tmp/claude-0/work}
OUT=${OUT:-$WORK/out}
LIST=${1:-$WORK/seg/list.txt}
mkdir -p "$OUT"
ffmpeg -y -loglevel error -f concat -safe 0 -i "$LIST" -c copy "$WORK/seg/video_master.mkv"
COMMON=(-c:v libx264 -preset slow -profile:v high -pix_fmt yuv420p -tune film -x264-params "aq-mode=3:deblock=-1,-1"
        -c:a aac -b:a 256k -movflags +faststart -shortest)
ffmpeg -y -loglevel error -i "$WORK/seg/video_master.mkv" -i "$WORK/build/mix.wav" -i "$OUT/islamin_dogusu_ve_yayilisi.tr.srt" \
  -map 0:v -map 1:a -map 2:s "${COMMON[@]}" -crf 19 -c:s mov_text -metadata:s:s:0 language=tur -metadata:s:a:0 language=tur \
  -metadata title="İslam'ın Doğuşu ve Yayılışı" "$OUT/islamin_dogusu_ve_yayilisi.mp4"
ffmpeg -y -loglevel error -i "$WORK/seg/video_master.mkv" -i "$WORK/build/mix.wav" -vf "ass=$WORK/build/subs.ass" \
  -map 0:v -map 1:a "${COMMON[@]}" -crf 20 -metadata:s:a:0 language=tur \
  -metadata title="İslam'ın Doğuşu ve Yayılışı (altyazılı)" "$OUT/islamin_dogusu_ve_yayilisi_altyazili.mp4"
ls -la "$OUT"
