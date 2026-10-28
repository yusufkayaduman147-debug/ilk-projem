#!/usr/bin/env bash
# Render parçalarını birleştirir; ana MP4 (yumuşak altyazılı) ve altyazısı gömülü sürümü kodlar.
# Kullanım: ./encode.sh <ffmpeg-concat-listesi>
set -euo pipefail
export WORK=${WORK:-/tmp/claude-0/work}
OUT=${OUT:-$WORK/out}
LIST=${1:-$WORK/seg/list.txt}
mkdir -p "$OUT"
[[ "${SKIP_CONCAT:-0}" == 1 ]] || ffmpeg -y -loglevel error -f concat -safe 0 -i "$LIST" -c copy "$WORK/seg/video_master.mkv"
COMMON=(-c:v libx264 -preset slow -profile:v high -pix_fmt yuv420p -tune film -x264-params "aq-mode=3:deblock=-1,-1"
        -c:a aac -b:a 256k -metadata:s:a:0 language=tur)
# Ana dosya: önce görüntü + ses, sonra altyazı akışı kopyalanarak eklenir (-shortest altyazıya göre kesmesin diye)
ffmpeg -y -loglevel error -i "$WORK/seg/video_master.mkv" -i "$WORK/build/mix.wav" -map 0:v -map 1:a "${COMMON[@]}" -crf 20 \
  "$WORK/seg/main_nosub.mp4"
ffmpeg -y -loglevel error -i "$WORK/seg/main_nosub.mp4" -i "$OUT/islamin_dogusu_ve_yayilisi.tr.srt" -map 0:v -map 0:a -map 1:s \
  -c copy -c:s mov_text -metadata:s:s:0 language=tur -metadata title="İslam'ın Doğuşu ve Yayılışı" -movflags +faststart \
  "$OUT/islamin_dogusu_ve_yayilisi.mp4"
# Altyazısı videoya gömülü sürüm
if [[ "${SKIP_BURNED:-0}" != 1 ]]; then
  ffmpeg -y -loglevel error -i "$WORK/seg/video_master.mkv" -i "$WORK/build/mix.wav" -vf "ass=$WORK/build/subs.ass" \
    -map 0:v -map 1:a "${COMMON[@]}" -crf 20 -metadata title="İslam'ın Doğuşu ve Yayılışı (altyazılı)" -movflags +faststart \
    "$OUT/islamin_dogusu_ve_yayilisi_altyazili.mp4"
fi
ls -la "$OUT"
