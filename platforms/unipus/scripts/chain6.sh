#!/bin/bash
cd "C:/Users/35955/.zcode/skills/autolearn/platforms/unipus/scripts" || exit 1
for U in 5 2 8 1 3 4 6 7; do
  echo "=== sweep5 unitfull u$U start $(date +%T) ==="
  timeout 2400 node unitfull.mjs "$U" > "unitfull5-u$U.log" 2>&1
  echo "=== sweep5 unitfull u$U end $(date +%T) exit=$? ==="
  sleep 8
done
for U in 1 2 3 4 5 6 7 8; do
  echo "=== oral3 u$U start $(date +%T) ==="
  timeout 1800 node oral-unit.mjs "$U" > "oral3-u$U.log" 2>&1
  echo "=== oral3 u$U end exit=$? ==="
  sleep 6
done
for U in 1 2 3 4 5 6 7 8; do
  echo "=== upload3 u$U start $(date +%T) ==="
  timeout 1200 node upload-unit.mjs "$U" > "upload3-u$U.log" 2>&1
  echo "=== upload3 u$U end exit=$? ==="
  sleep 6
done
echo "CHAIN6 DONE $(date +%T)"
