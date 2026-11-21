#!/bin/bash
cd "C:/Users/35955/.zcode/skills/autolearn/platforms/unipus/scripts" || exit 1
for U in 3 4 5 6 1 2; do
  echo "=== p2f u$U start $(date +%T) ==="
  BLOCK_WAIT_MS=25000 SCROLL=1 SCREENS=40 SEC=6 timeout 3600 node patient2.mjs "$U" > "p2f-u$U.log" 2>&1
  echo "=== p2f u$U end $(date +%T) exit=$? ==="
  sleep 6
done
echo "CHAIN16 DONE $(date +%T)"
