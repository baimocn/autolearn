#!/bin/bash
cd "C:/Users/35955/.zcode/skills/autolearn/platforms/unipus/scripts" || exit 1
for U in 1 2 3 4 5 6 7 8; do
  echo "=== final unitfull u$U start $(date +%T) ==="
  timeout 2400 node unitfull.mjs "$U" > "unitfullF-u$U.log" 2>&1
  echo "=== final unitfull u$U end $(date +%T) exit=$? ==="
  sleep 6
done
echo "CHAIN10 DONE $(date +%T)"
