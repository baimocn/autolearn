#!/bin/bash
cd "C:/Users/35955/.zcode/skills/autolearn/platforms/unipus/scripts" || exit 1
for U in 6 3 4 5 1 2; do
  echo "=== p2c u$U start $(date +%T) ==="
  BLOCK_WAIT_MS=30000 SCROLL=1 SCREENS=40 SEC=6 timeout 3600 node patient2.mjs "$U" > "p2c-u$U.log" 2>&1
  echo "=== p2c u$U end $(date +%T) exit=$? ==="
  sleep 8
done
echo "CHAIN16C DONE $(date +%T)"
