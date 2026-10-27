#!/bin/bash
set -u
cd /workspace/huxing-skill
LOG=freeze.log
PROMPT='IMPORTANT: Read /workspace/huxing-skill/TASK_FREEZE.md completely and follow it. Work only under /workspace/huxing-skill. Deliver render/, schema/project.schema.json, assets/, shots/, qa/, SKILL.md, examples/this_plan/project.json, and run sample via ./run_all.sh. Update STATUS.md. When fully done print DONE_FREEZE on its own line. Do NOT start WorkBuddy. Do NOT modify /workspace/huxing-workbuddy.'
for i in $(seq 1 20); do
  echo "=== attempt $i $(date)" | tee -a "$LOG"
  claude -p --model claude-opus-4-5 --dangerously-skip-permissions "$PROMPT" 2>&1 | tee -a "$LOG"
  if grep -q DONE_FREEZE "$LOG" STATUS.md 2>/dev/null; then
    echo "DONE_FREEZE seen $(date)" | tee -a "$LOG"
    exit 0
  fi
  echo "retry in 5m $(date)" | tee -a "$LOG"
  sleep 300
done
echo "gave up $(date)" | tee -a "$LOG"
