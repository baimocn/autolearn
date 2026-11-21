#!/bin/bash
cd "C:/Users/35955/.zcode/skills/autolearn/platforms/unipus/scripts" || exit 1
for U in 1 2 3 4 5 6 7 8; do
  echo "=== oralSAPI u$U start $(date +%T) ==="
  timeout 2400 node oral-unit.mjs "$U" > "oralS-u$U.log" 2>&1
  echo "=== oralSAPI u$U end $(date +%T) exit=$? ==="
  sleep 6
done
echo "CHAIN8 DONE $(date +%T)"
