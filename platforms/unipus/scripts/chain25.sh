#!/bin/bash
cd "C:/Users/35955/.zcode/skills/autolearn/platforms/unipus/scripts" || exit 1
for U in 1 4 6 7 2 3 5 8; do
  case $U in
    1) FN=u1g1;; 2) FN=u2g236;; 3) FN=u3g349;; 4) FN=u4g499;; 5) FN=u5g602;; 6) FN=u6g707;; 7) FN=u7g881;; 8) FN=u8g983;;
  esac
  echo "=== dual u$U start $(date +%T) ==="
  timeout 130 node _deepnode.mjs "$U" "$FN" > /dev/null 2>&1
  BLOCK_WAIT_MS=30000 SCROLL=1 SCREENS=28 SEC=6 timeout 2400 node patient2.mjs > "d1-u$U.log" 2>&1
  echo "=== pass1 done $(date +%T) ==="
  BLOCK_WAIT_MS=25000 SCROLL=0 timeout 1800 node patient2.mjs > "d2-u$U.log" 2>&1
  echo "=== pass2 done $(date +%T) ==="
  timeout 1500 node oral-unit.mjs "$U" > "oralF-u$U.log" 2>&1
  echo "=== oral u$U end exit=$? ==="
  sleep 8
done
echo "CHAIN25 DONE $(date +%T)"
