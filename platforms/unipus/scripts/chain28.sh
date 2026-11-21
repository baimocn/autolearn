#!/bin/bash
# chain28: 逐单元 enterunit(到HEALTHY) → _opencur(录音) → _videos(视频)
cd "C:/Users/35955/.zcode/skills/autolearn/platforms/unipus/scripts" || exit 1
declare -A FIRST=( [1]=u1g2 [2]=u2g237 [4]=u4g500 [5]=u5g603 [6]=u6g708 [7]=u7g882 [8]=u8g984 )
for U in 4 6 7 5 8 1 2; do
  if [ "$U" != "4" ]; then echo "=== cooldown 300s before u$U ===" >> chain28.log; sleep 300; fi
  echo "=== c28 u$U enter $(date +%H:%M:%S) ===" >> chain28.log
  timeout 420 node enterunit.mjs "$U" "${FIRST[$U]}" 2 >> chain28.log 2>&1
  echo "=== c28 u$U oral $(date +%H:%M:%S) ===" >> chain28.log
  timeout 600 node _opencur.mjs > "oral5-u$U.log" 2>&1
  echo "--- oral:" >> chain28.log; tail -3 "oral5-u$U.log" >> chain28.log
  echo "=== c28 u$U videos $(date +%H:%M:%S) ===" >> chain28.log
  timeout 200 node _videos.mjs > "vid-u$U.log" 2>&1
  tail -2 "vid-u$U.log" >> chain28.log
  echo "=== c28 u$U done $(date +%H:%M:%S) ===" >> chain28.log
done
echo "=== c28 ALL DONE $(date +%H:%M:%S) ===" >> chain28.log
