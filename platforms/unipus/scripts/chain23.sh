#!/bin/bash
cd "C:/Users/35955/.zcode/skills/autolearn/platforms/unipus/scripts" || exit 1
for U in 1 2 3 4 5 6 8; do
  case $U in
    1) FN=u1g1;; 2) FN=u2g236;; 3) FN=u3g349;; 4) FN=u4g499;; 5) FN=u5g602;; 6) FN=u6g707;; 8) FN=u8g983;;
  esac
  echo "=== full u$U start $(date +%T) ==="
  timeout 130 node _deepnode.mjs "$U" "$FN" > /dev/null 2>&1
  sleep 60
  BLOCK_WAIT_MS=30000 SCROLL=1 SCREENS=30 SEC=6 timeout 2700 node patient2.mjs > "f2-u$U.log" 2>&1
  echo "=== full u$U end $(date +%T) exit=$? ==="
  sleep 8
done
echo "CHAIN23 DONE $(date +%T)"
