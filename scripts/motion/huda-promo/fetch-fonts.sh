#!/usr/bin/env bash
# Poppins (OFL) latin subset, cached locally so renders never depend on the network.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p .cache
base=https://fonts.gstatic.com/s/poppins/v24
declare -A files=(
  [400]=pxiEyp8kv8JHgFVrJJfecg.woff2
  [500]=pxiByp8kv8JHgFVrLGT9Z1xlFQ.woff2
  [600]=pxiByp8kv8JHgFVrLEj6Z1xlFQ.woff2
)
for w in "${!files[@]}"; do
  [ -s ".cache/poppins-$w.woff2" ] || curl -sSfL "$base/${files[$w]}" -o ".cache/poppins-$w.woff2"
done
echo "fonts ready"
