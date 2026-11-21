#!/bin/bash
cd "C:/Users/35955/.zcode/skills/autolearn/platforms/unipus/scripts" || exit 1
for U in 4 6 7 1 2 5 8; do
  case $U in
    1) FN=u1g1;; 2) FN=u2g236;; 4) FN=u4g499;; 5) FN=u5g602;; 6) FN=u6g707;; 7) FN=u7g881;; 8) FN=u8g983;;
  esac
  echo "=== dual26 u$U start $(date +%T) ==="
  timeout 130 node _deepnode.mjs "$U" "$FN" > /dev/null 2>&1
  BLOCK_WAIT_MS=30000 SCROLL=1 SCREENS=28 SEC=6 timeout 2400 node patient2.mjs > "e1-u$U.log" 2>&1
  echo "=== pass1 u$U $(date +%T) ==="
  BLOCK_WAIT_MS=25000 SCROLL=0 timeout 1800 node patient2.mjs > "e2-u$U.log" 2>&1
  echo "=== pass2 u$U $(date +%T) ==="
  timeout 1500 node oral-unit.mjs "$U" > "oralE2-u$U.log" 2>&1
  echo "=== oral u$U exit=$? ==="
  timeout 300 node challenge-only.mjs "$U" > "chaE-u$U.log" 2>&1
  echo "=== cha u$U exit=$? ==="
  sleep 8
done
echo "CHAIN26 DONE $(date +%T)"
