#!/bin/bash
# chain.sh — 等待 u2 结束 → 依次 unitfull(1,3..8) → utfull(1..8)
cd "C:/Users/35955/.zcode/skills/autolearn/platforms/unipus/scripts" || exit 1
# 等 u2 结束（最多 40 分钟）
for i in $(seq 1 80); do
  pgrep -f "unitfull.mjs 2" >/dev/null 2>&1 || break
  sleep 30
done
for U in 3 4 5 6 7 8 1; do
  echo "=== unitfull u$U start $(date +%T) ==="
  timeout 2700 node unitfull.mjs "$U" > "unitfull-u$U.log" 2>&1
  echo "=== unitfull u$U end $(date +%T) exit=$? ==="
  sleep 8
done
for U in 1 2 3 4 5 6 7 8; do
  echo "=== utfull u$U start $(date +%T) ==="
  timeout 1500 node utfull.mjs "$U" > "utfull-u$U.log" 2>&1
  echo "=== utfull u$U end $(date +%T) exit=$? ==="
  sleep 8
done
echo "ALL DONE $(date +%T)"
