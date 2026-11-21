#!/bin/bash
# chain30: 剩余录音单元，冷却后进页面，healthy 才跑修版状态机
cd "C:/Users/35955/.zcode/skills/autolearn/platforms/unipus/scripts" || exit 1
declare -A FIRST=( [4]=u4g500 [6]=u6g708 [7]=u7g882 [8]=u8g984 )
for U in 4 6 7 8; do
  echo "=== c30 cooldown 480s before u$U $(date +%H:%M:%S) ===" >> chain30.log
  sleep 480
  echo "=== c30 u$U enter $(date +%H:%M:%S) ===" >> chain30.log
  timeout 560 node enterunit.mjs "$U" "${FIRST[$U]}" 3 >> chain30.log 2>&1
  if tail -8 chain30.log | grep -q HEALTHY; then
    echo "=== c30 u$U oral2 $(date +%H:%M:%S) ===" >> chain30.log
    timeout 1000 node _steporal2.mjs > "oral7-u$U.log" 2>&1
    echo "--- subs=$(grep -c '提交' oral7-u$U.log) tail:" >> chain30.log
    tail -3 "oral7-u$U.log" >> chain30.log
  else
    echo "=== c30 u$U 空壳，跳过 ===" >> chain30.log
  fi
done
echo "=== c30 ALL DONE $(date +%H:%M:%S) ===" >> chain30.log
