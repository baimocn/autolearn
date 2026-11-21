#!/bin/bash
cd "C:/Users/35955/.zcode/skills/autolearn/platforms/unipus/scripts" || exit 1
for U in 5 7 8 2 6 4 3 1; do
  echo "=== sweep3 unitfull u$U start $(date +%T) ==="
  timeout 2400 node unitfull.mjs "$U" > "unitfull3-u$U.log" 2>&1
  echo "=== sweep3 unitfull u$U end $(date +%T) exit=$? ==="
  sleep 8
done
echo "SWEEP3 DONE $(date +%T)"
