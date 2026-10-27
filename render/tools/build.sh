#!/usr/bin/env bash
# Full build: soundtrack → frames → MP4 (H.264 + AAC) → contact sheet.
# Usage: ./tools/build.sh [path/to/project.json]
set -euo pipefail
cd "$(dirname "$0")/.."

PROJECT="${1:-../examples/this_plan/project.json}"
if [[ ! -f "$PROJECT" ]]; then
  echo "Error: project.json not found at $PROJECT"
  exit 1
fi
echo "Building video from: $PROJECT"

FR=${FRAMES:-/tmp/huxing_frames}; OUT=../output; mkdir -p "$OUT" "$FR"
node tools/audio.mjs /tmp/huxing_audio.wav
NF=$(ffprobe -v error -show_entries format=duration -of csv=p=0 /tmp/huxing_audio.wav | awk '{printf "%d", $1*30 + 0.5}')
PROJECT_ABS=$(realpath "$PROJECT")
node tools/render.mjs "$FR" "${WORKERS:-3}" 0 "$NF" "$PROJECT_ABS"
ffmpeg -v error -y -framerate 30 -i "$FR/f_%05d.jpg" -i /tmp/huxing_audio.wav \
  -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -movflags +faststart "$OUT/huxing_final.mp4"
# contact sheet: one frame per shot, 3x3
T=(0.9 6.6 11.6 15.0 19.2 24.0 33.0 49.5 54.2); ARGS=(); for t in "${T[@]}"; do ARGS+=(-ss "$t" -i "$OUT/huxing_final.mp4"); done
ffmpeg -v error -y "${ARGS[@]}" -filter_complex "$(for i in $(seq 0 8); do printf "[$i:v]scale=640:360,trim=end_frame=1[s$i];"; done)[s0][s1][s2][s3][s4][s5][s6][s7][s8]xstack=inputs=9:layout=0_0|640_0|1280_0|0_360|640_360|1280_360|0_720|640_720|1280_720" -frames:v 1 -q:v 2 "$OUT/contact.jpg" 2>/dev/null || true
ffprobe -v error -show_entries format=duration:stream=codec_name,width,height,r_frame_rate -of compact "$OUT/huxing_final.mp4"
echo "Done: $OUT/huxing_final.mp4"
