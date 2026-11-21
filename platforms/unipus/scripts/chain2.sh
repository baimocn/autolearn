#!/bin/bash
# chain2.sh — 第二轮：u2 补全 + 全单元二扫 + UT×8
cd "C:/Users/35955/.zcode/skills/autolearn/platforms/unipus/scripts" || exit 1
for U in 2 3 4 5 6 7 8 1; do
  echo "=== sweep2 unitfull u$U start $(date +%T) ==="
  timeout 2400 node unitfull.mjs "$U" > "unitfull2-u$U.log" 2>&1
  echo "=== sweep2 unitfull u$U end $(date +%T) exit=$? ==="
  sleep 8
done
for U in 1 2 3 4 5 6 7 8; do
  echo "=== utfull u$U start $(date +%T) ==="
  timeout 1500 node utfull.mjs "$U" > "utfull2-u$U.log" 2>&1
  echo "=== utfull u$U end $(date +%T) exit=$? ==="
  sleep 8
done
echo "SWEEP2 DONE $(date +%T)"
