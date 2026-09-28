#!/usr/bin/env bash
# Full pipeline:  ./render.sh stills   → out/beats.png (review one frame per beat first)
#                 ./render.sh          → out/huda-promo.mp4 (video + UI sound bed)
set -euo pipefail
cd "$(dirname "$0")"

if [ -z "${FFMPEG:-}" ]; then
  if command -v ffmpeg >/dev/null; then FFMPEG=ffmpeg
  else FFMPEG=$(python3 -c "import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())"); fi
fi
export FFMPEG

./fetch-fonts.sh

if [ "${1:-full}" = "stills" ]; then
  node render.mjs stills
  exit 0
fi

node render.mjs full
python3 sounds.py
"$FFMPEG" -y -loglevel error -i out/video.mp4 -i out/sfx.wav \
  -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart out/huda-promo.mp4
echo "wrote out/huda-promo.mp4"
