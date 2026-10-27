#!/usr/bin/env bash
# 户型成片自检脚本
# Usage: ./qa/check.sh path/to/project.json [output/huxing_final.mp4]
set -u

PROJECT="${1:-examples/this_plan/project.json}"
VIDEO="${2:-output/huxing_final.mp4}"

echo "=========================================="
echo "户型成片 QA 检查"
echo "=========================================="
echo "project.json: $PROJECT"
echo "video: $VIDEO"
echo ""

PASS=0
FAIL=0

check() {
  local name="$1"
  local result="$2"
  if [[ "$result" == "pass" ]]; then
    echo "✓ $name"
    ((PASS++))
  else
    echo "✗ $name: $result"
    ((FAIL++))
  fi
}

# 1. Schema validation
echo "=== 几何校验 ==="
if command -v ajv &>/dev/null; then
  if ajv validate -s schema/project.schema.json -d "$PROJECT" 2>/dev/null; then
    check "Schema 校验" "pass"
  else
    check "Schema 校验" "schema 不符合要求"
  fi
else
  echo "⚠ Schema 校验: skipped (ajv not installed)"
fi

# 2. JSON structure checks
if command -v jq &>/dev/null; then
  # Check rooms exist
  ROOMS=$(jq '.rooms | length' "$PROJECT")
  if [[ "$ROOMS" -gt 0 ]]; then
    check "房间数量 ($ROOMS)" "pass"
  else
    check "房间数量" "无房间定义"
  fi

  # Check walls exist
  WALLS=$(jq '.walls | length' "$PROJECT" 2>/dev/null || echo 0)
  if [[ "$WALLS" -gt 0 ]]; then
    check "墙体数量 ($WALLS)" "pass"
  else
    check "墙体数量" "无墙体定义"
  fi

  # Check furniture exists
  FURN=$(jq '.furniture | length' "$PROJECT" 2>/dev/null || echo 0)
  if [[ "$FURN" -gt 0 ]]; then
    check "家具数量 ($FURN)" "pass"
  else
    check "家具数量" "警告: 无家具定义"
  fi

  # Check area table
  AREAS=$(jq '.area_table | length' "$PROJECT" 2>/dev/null || echo 0)
  if [[ "$AREAS" -gt 0 ]]; then
    check "面积明细 ($AREAS 项)" "pass"
  else
    check "面积明细" "无面积明细"
  fi
else
  echo "⚠ jq not installed, skipping JSON checks"
fi

# 3. Video checks
echo ""
echo "=== 输出校验 ==="
if [[ -f "$VIDEO" ]]; then
  check "视频文件存在" "pass"

  # Check video properties
  if command -v ffprobe &>/dev/null; then
    WIDTH=$(ffprobe -v error -select_streams v:0 -show_entries stream=width -of csv=p=0 "$VIDEO" | tr -d ',\n')
    HEIGHT=$(ffprobe -v error -select_streams v:0 -show_entries stream=height -of csv=p=0 "$VIDEO" | tr -d ',\n')
    if [[ "$WIDTH" == "1280" && "$HEIGHT" == "720" ]]; then
      check "分辨率 1280x720" "pass"
    else
      check "分辨率" "实际 ${WIDTH}x${HEIGHT}"
    fi

    FPS=$(ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate -of csv=p=0 "$VIDEO" | awk -F/ '{print int($1/$2)}')
    if [[ "$FPS" == "30" ]]; then
      check "帧率 30fps" "pass"
    else
      check "帧率" "实际 ${FPS}fps"
    fi

    DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$VIDEO" | awk '{printf "%.0f", $1}')
    if [[ "$DUR" -ge 45 && "$DUR" -le 70 ]]; then
      check "时长 ${DUR}s (45-70s)" "pass"
    else
      check "时长" "${DUR}s 不在 45-70s 范围"
    fi
  fi
else
  check "视频文件存在" "文件不存在: $VIDEO"
fi

# Contact sheet
if [[ -f "output/contact.jpg" ]]; then
  check "contact.jpg 存在" "pass"
else
  check "contact.jpg 存在" "文件不存在"
fi

echo ""
echo "=========================================="
echo "检查完成: $PASS 通过, $FAIL 失败"
echo "=========================================="

if [[ "$FAIL" -gt 0 ]]; then
  exit 1
fi
