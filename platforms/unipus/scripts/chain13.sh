#!/bin/bash
cd "C:/Users/35955/.zcode/skills/autolearn/platforms/unipus/scripts" || exit 1
for U in 1 2 3 4 5 6 7 8; do
  echo "=== patient u$U start $(date +%T) ==="
  BLOCK_WAIT_MS=60000 timeout 4200 node patient.mjs "$U" all > "pat-u$U.log" 2>&1
  echo "=== patient u$U end $(date +%T) exit=$? ==="
  sleep 8
  echo "=== oral u$U start $(date +%T) ==="
  timeout 1800 node oral-unit.mjs "$U" > "oralP-u$U.log" 2>&1
  echo "=== oral u$U end exit=$? ==="
  sleep 6
done
echo "CHAIN13 DONE $(date +%T)"
