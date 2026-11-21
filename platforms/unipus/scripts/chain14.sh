#!/bin/bash
cd "C:/Users/35955/.zcode/skills/autolearn/platforms/unipus/scripts" || exit 1
for U in 1 3 4 5 6 7 8 2; do
  echo "=== p2 u$U start $(date +%T) ==="
  BLOCK_WAIT_MS=25000 timeout 3000 node patient2.mjs "$U" > "p2-u$U.log" 2>&1
  echo "=== p2 u$U end $(date +%T) exit=$? ==="
  sleep 6
done
echo "CHAIN14 DONE $(date +%T)"
