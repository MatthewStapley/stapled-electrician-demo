#!/bin/sh
# Final render of every pass for both cameras. Safe to stop and re-run: a pass
# only saves when complete, and finished passes are skipped by checking size.
cd "$(dirname "$0")/../.."
for cam in "wide 1600 1000" "tall 864 1400"; do
  set -- $cam
  node scripts/render/trace.mjs kitchen $1 gbuffer 1 $2 $3 | tail -1
  node scripts/render/lines.mjs kitchen $1 $2 $3
  want=$(( $2 * $3 * 12 ))
  for pass in pendants joinery downlights dusk; do
    f=scripts/render/out/kitchen-$1-$pass.f32
    if [ -f "$f" ] && [ "$(wc -c < "$f" | tr -d ' ')" = "$want" ]; then echo "skip $1 $pass"; continue; fi
    node scripts/render/trace.mjs kitchen $1 $pass 90 $2 $3 | tail -1
  done
done
echo ALL DONE
