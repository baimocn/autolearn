#!/bin/bash
cd "C:/Users/35955/.zcode/skills/autolearn/platforms/unipus/scripts" || exit 1
for U in 2 3 4 5 6 7 8; do
  echo "=== utscore u$U start $(date +%T) ==="
  timeout 900 node ut-score-submit.mjs "$U" > "utscore-u$U.log" 2>&1
  echo "=== utscore u$U end $(date +%T) exit=$? ==="
  sleep 5
done
echo "CHAIN9 DONE $(date +%T)"
