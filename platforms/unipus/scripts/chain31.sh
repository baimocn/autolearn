#!/bin/bash
# chain31: 对 u8/u6/u4 冷却→进单元→healthy→跑 _oralall 两遍作答
cd "C:/Users/35955/.zcode/skills/autolearn/platforms/unipus/scripts" || exit 1
declare -A FIRST=( [4]=u4g500 [6]=u6g708 [8]=u8g984 )
for U in 8 6 4; do
  echo "=== c31 cooldown 420s before u$U $(date +%H:%M:%S) ===" >> chain31.log
  sleep 420
  echo "=== c31 u$U enter $(date +%H:%M:%S) ===" >> chain31.log
  timeout 560 node enterunit.mjs "$U" "${FIRST[$U]}" 3 >> chain31.log 2>&1
  if tail -8 chain31.log | grep -q HEALTHY; then
    echo "=== c31 u$U oralall $(date +%H:%M:%S) ===" >> chain31.log
    REC_WAIT=16 timeout 1500 node _oralall.mjs > "all-u$U.log" 2>&1
    echo "--- tail:" >> chain31.log; tail -5 "all-u$U.log" >> chain31.log
    echo "--- FINAL 分数:" >> chain31.log; grep "FINAL" "all-u$U.log" >> chain31.log
  else
    echo "=== c31 u$U 空壳，跳过 ===" >> chain31.log
  fi
done
echo "=== c31 ALL DONE $(date +%H:%M:%S) ===" >> chain31.log
