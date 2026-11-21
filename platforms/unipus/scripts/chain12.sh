#!/bin/bash
cd "C:/Users/35955/.zcode/skills/autolearn/platforms/unipus/scripts" || exit 1
for U in 2 3 4 5 6 7 8 1; do
  echo "=== slow2 unitfull u$U start $(date +%T) ==="
  timeout 4800 node unitfull.mjs "$U" > "unitfullT-u$U.log" 2>&1
  echo "=== slow2 unitfull u$U end $(date +%T) exit=$? ==="
  sleep 10
done
echo "CHAIN12 DONE $(date +%T)"
