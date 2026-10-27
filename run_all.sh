#!/usr/bin/env bash
# 户型成片 Skill 主入口: video = render(project.json)
# Usage: ./run_all.sh [path/to/project.json]
#
# 输入: project.json (符合 schema/project.schema.json)
# 输出: output/huxing_final.mp4 + output/contact.jpg
set -euo pipefail
cd "$(dirname "$0")"

PROJECT="${1:-examples/this_plan/project.json}"
if [[ ! -f "$PROJECT" ]]; then
  echo "Error: project.json not found at $PROJECT"
  echo "Usage: ./run_all.sh path/to/project.json"
  exit 1
fi

echo "=========================================="
echo "户型成片渲染: $PROJECT"
echo "=========================================="

# Validate project.json against schema (if ajv is installed)
if command -v ajv &>/dev/null; then
  echo "[1/4] Validating project.json..."
  ajv validate -s schema/project.schema.json -d "$PROJECT" || {
    echo "Schema validation failed. Check your project.json."
    exit 1
  }
else
  echo "[1/4] Skipping schema validation (ajv not installed)"
fi

# Install dependencies if needed
cd render
if [[ ! -d node_modules ]]; then
  echo "[2/4] Installing dependencies..."
  npm install
else
  echo "[2/4] Dependencies already installed"
fi

# Build the video
echo "[3/4] Rendering video..."
chmod +x tools/build.sh
PROJECT_ABS=$(realpath "../$PROJECT")
bash tools/build.sh "$PROJECT_ABS"

cd ..
echo "[4/4] Done!"
echo ""
echo "Output files:"
echo "  - output/huxing_final.mp4"
echo "  - output/contact.jpg"
echo ""
ls -lh output/ 2>/dev/null || true
