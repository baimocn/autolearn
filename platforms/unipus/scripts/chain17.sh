#!/bin/bash
# chain17 — 重进（加载最新版，平台自动续到下一未完成节点）+ 处理当前单元
cd "C:/Users/35955/.zcode/skills/autolearn/platforms/unipus/scripts" || exit 1
for i in 1 2 3 4 5 6 7 8 9 10 11 12; do
  echo "=== loop$i reenter $(date +%T) ==="
  timeout 200 node _reenter.mjs > "reenter-$i.log" 2>&1
  CUR=$(grep -o "reader hash: .*" "reenter-$i.log" 2>/dev/null | grep -o "u[0-9]/u[0-9]g" | head -1 | cut -c2)
  echo "loop$i current unit: $CUR"
  if [ -z "$CUR" ]; then sleep 10; continue; fi
  echo "=== loop$i p2 u$CUR start $(date +%T) ==="
  BLOCK_WAIT_MS=30000 SCROLL=1 SCREENS=35 SEC=6 timeout 2400 node patient2.mjs > "loop-$i-u$CUR.log" 2>&1
  echo "=== loop$i p2 u$CUR end $(date +%T) exit=$? ==="
  sleep 5
done
echo "CHAIN17 DONE $(date +%T)"
