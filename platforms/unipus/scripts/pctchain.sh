#!/bin/bash
cd "C:/Users/35955/.zcode/skills/autolearn/platforms/unipus/scripts" || exit 1
for U in 2 3 4 5 6 7 8 1; do
  echo "=== pctrun u$U start $(date +%T) ==="
  timeout 3600 node pctrun.mjs "$U" > "pct-u$U.log" 2>&1
  echo "=== pctrun u$U end $(date +%T) exit=$? ==="
  sleep 6
done
echo "PCTCHAIN DONE $(date +%T)"
