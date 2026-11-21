#!/bin/bash
# chain4.sh — 等 chain3 完 → oral×8 → upload×8
cd "C:/Users/35955/.zcode/skills/autolearn/platforms/unipus/scripts" || exit 1
for i in $(seq 1 100); do
  grep -q "SWEEP3 DONE" chain3.log 2>/dev/null && break
  sleep 30
done
echo "chain3 finished, starting specials $(date +%T)"
for U in 1 2 3 4 5 6 7 8; do
  echo "=== oral u$U start $(date +%T) ==="
  timeout 1800 node oral-unit.mjs "$U" > "oral-u$U.log" 2>&1
  echo "=== oral u$U end exit=$? ==="
  sleep 6
done
for U in 1 2 3 4 5 6 7 8; do
  echo "=== upload u$U start $(date +%T) ==="
  timeout 1200 node upload-unit.mjs "$U" > "upload-u$U.log" 2>&1
  echo "=== upload u$U end exit=$? ==="
  sleep 6
done
echo "SPECIALS DONE $(date +%T)"
