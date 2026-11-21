#!/bin/bash
cd "C:/Users/35955/.zcode/skills/autolearn/platforms/unipus/scripts" || exit 1
for U in 1 2 3 4 5 6 7 8; do
  echo "=== p2s u$U start $(date +%T) ==="
  BLOCK_WAIT_MS=25000 SCROLL=1 SCREENS=45 SEC=7 timeout 4200 node patient2.mjs "$U" > "p2s-u$U.log" 2>&1
  echo "=== p2s u$U end $(date +%T) exit=$? ==="
  sleep 6
done
echo "CHAIN15 DONE $(date +%T)"
