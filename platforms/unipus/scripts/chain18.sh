#!/bin/bash
cd "C:/Users/35955/.zcode/skills/autolearn/platforms/unipus/scripts" || exit 1
for U in 1 2 3 4 6; do
  echo "=== expand-run u$U start $(date +%T) ==="
  # 深路由进单元
  timeout 120 node _deepnode.mjs "$U" "$(case $U in 1)echo u1g1;;2)echo u2g236;;3)echo u3g349;;4)echo u4g499;;6)echo u6g707;;esac)" > /dev/null 2>&1
  BLOCK_WAIT_MS=25000 SCROLL=1 SCREENS=35 SEC=6 timeout 1800 node patient2.mjs > "p2e-u$U.log" 2>&1
  echo "=== expand-run u$U end $(date +%T) exit=$? ==="
  sleep 6
done
echo "CHAIN18 DONE $(date +%T)"
