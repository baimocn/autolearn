#!/bin/bash
cd "C:/Users/35955/.zcode/skills/autolearn/platforms/unipus/scripts" || exit 1
for U in 1 2 3 4 5 6 7 8; do
  echo "=== slow unitfull u$U start $(date +%T) ==="
  timeout 4800 node unitfull.mjs "$U" > "unitfullS-u$U.log" 2>&1
  echo "=== slow unitfull u$U end $(date +%T) exit=$? ==="
  sleep 10
done
echo "CHAIN11 DONE $(date +%T)"
