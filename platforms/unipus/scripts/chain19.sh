#!/bin/bash
cd "C:/Users/35955/.zcode/skills/autolearn/platforms/unipus/scripts" || exit 1
for U in 1 2 3 4 5 6; do
  echo "=== oralE u$U start $(date +%T) ==="
  timeout 1800 node oral-unit.mjs "$U" > "oralE-u$U.log" 2>&1
  echo "=== oralE u$U end exit=$? ==="
  sleep 6
done
echo "CHAIN19 DONE $(date +%T)"
