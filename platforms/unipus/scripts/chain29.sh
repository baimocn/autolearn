#!/bin/bash
# chain29: 针对剩余录音单元 u4/u6/u7/u8，冷却后 enterunit→healthy 才扫录音；失败再冷却重试
cd "C:/Users/35955/.zcode/skills/autolearn/platforms/unipus/scripts" || exit 1
declare -A FIRST=( [4]=u4g500 [6]=u6g708 [7]=u7g882 [8]=u8g984 )
for U in 4 6 7 8; do
  for TRY in 1 2; do
    echo "=== c29 u$U try$TRY $(date +%H:%M:%S) ===" >> chain29.log
    timeout 560 node enterunit.mjs "$U" "${FIRST[$U]}" 4 >> chain29.log 2>&1
    if grep -q "HEALTHY" <(tail -12 chain29.log); then
      echo "=== c29 u$U HEALTHY, oral ===" >> chain29.log
      timeout 700 node _opencur.mjs > "oral6-u$U.log" 2>&1
      echo "--- oral tail:" >> chain29.log; tail -4 "oral6-u$U.log" >> chain29.log
      echo "--- submissions: $(grep -c '提交' oral6-u$U.log)" >> chain29.log
      break
    fi
    echo "=== c29 u$U try$TRY 空壳，冷却 600s ===" >> chain29.log
    sleep 600
  done
done
echo "=== c29 ALL DONE $(date +%H:%M:%S) ===" >> chain29.log
