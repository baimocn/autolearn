#!/bin/bash
# chain27: 逐单元 深路由+晚到弹窗补点 + patient2(关抽屉/预热) + oral 扫描
cd "C:/Users/35955/.zcode/skills/autolearn/platforms/unipus/scripts" || exit 1
declare -A FIRST=( [1]=u1g2 [2]=u2g237 [3]=u3g350 [4]=u4g500 [5]=u5g603 [6]=u6g708 [7]=u7g882 [8]=u8g984 )
for U in 1 4 6 5 8; do
  echo "=== c27 u$U enter $(date +%H:%M:%S) ===" >> chain27.log
  timeout 420 node enterunit.mjs "$U" "${FIRST[$U]}" 2 >> chain27.log 2>&1
  echo "=== c27 u$U harvest $(date +%H:%M:%S) ===" >> chain27.log
  NORELOAD=1 BLOCK_WAIT_MS=25000 SCROLL=1 SCREENS=24 timeout 1500 node patient2.mjs > "e4-u$U.log" 2>&1
  echo "=== c27 u$U oral $(date +%H:%M:%S) ===" >> chain27.log
  timeout 600 node oral-unit.mjs "$U" > "oral4-u$U.log" 2>&1
  echo "=== c27 u$U done $(date +%H:%M:%S) ===" >> chain27.log
done
echo "=== c27 ALL DONE $(date +%H:%M:%S) ===" >> chain27.log
