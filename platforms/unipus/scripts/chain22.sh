#!/bin/bash
cd "C:/Users/35955/.zcode/skills/autolearn/platforms/unipus/scripts" || exit 1
for i in 1 2 3 4 5 6 7 8 9 10 11 12; do
  echo "=== loop$i reenter $(date +%T) ==="
  timeout 200 node _reenter.mjs > "rn-$i.log" 2>&1
  CUR=$(grep -o "reader hash: .*" "rn-$i.log" 2>/dev/null | grep -oE "u[0-9]g?" | head -1 | tr -d 'u g')
  echo "loop$i landed: unit=$CUR"
  echo "=== loop$i p2 start $(date +%T) ==="
  BLOCK_WAIT_MS=25000 SCROLL=1 SCREENS=30 SEC=6 timeout 2400 node patient2.mjs > "nacct-$i.log" 2>&1
  echo "=== loop$i p2 end $(date +%T) exit=$? ==="
  sleep 5
done
echo "CHAIN22 DONE $(date +%T)"
