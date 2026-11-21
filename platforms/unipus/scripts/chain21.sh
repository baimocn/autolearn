#!/bin/bash
cd "C:/Users/35955/.zcode/skills/autolearn/platforms/unipus/scripts" || exit 1
for round in 1 2; do
  for U in 1 2 3 4 5 6; do
    case $U in
      1) FN=u1g1;; 2) FN=u2g236;; 3) FN=u3g349;; 4) FN=u4g499;; 5) FN=u5g602;; 6) FN=u6g707;;
    esac
    echo "=== ss r$round u$U start $(date +%T) ==="
    timeout 130 node _deepnode.mjs "$U" "$FN" > /dev/null 2>&1
    sleep 20
    SCROLLS_SCREEN=3.5 timeout 900 node scrollsweep.mjs "$U" 50 3.5 > "ss-r$round-u$U.log" 2>&1
    echo "=== ss r$round u$U end exit=$? ==="
    sleep 5
  done
done
echo "CHAIN21 DONE $(date +%T)"
