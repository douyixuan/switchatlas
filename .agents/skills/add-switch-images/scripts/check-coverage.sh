#!/usr/bin/env bash
# check-coverage.sh — Report image coverage for SwitchAtlas switches
#
# Usage:
#   bash <skill-dir>/scripts/check-coverage.sh [data/vendors]
#
# Prints per-vendor and total coverage. Exit code 0 always.

set -euo pipefail

DATA_DIR="${1:-data/vendors}"

if [[ ! -d "$DATA_DIR" ]]; then
  echo "Error: $DATA_DIR not found. Run from the project root." >&2
  exit 1
fi

total=0
with_img=0

echo "=== Image Coverage by Vendor ==="
echo ""
printf "%-16s %6s %6s %8s\n" "Vendor" "Images" "Total" "Coverage"
printf "%-16s %6s %6s %8s\n" "------" "------" "-----" "--------"

for vendor_dir in "$DATA_DIR"/*/; do
  [[ -d "$vendor_dir" ]] || continue
  vname=$(basename "$vendor_dir")
  vt=0
  vi=0

  while IFS= read -r readme; do
    dir=$(dirname "$readme")
    vt=$((vt + 1))
    # Check for any image file that isn't force-curve
    if find "$dir" -maxdepth 1 -type f \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' -o -iname '*.webp' \) \
       ! -iname 'force-curve.*' -print -quit 2>/dev/null | grep -q .; then
      vi=$((vi + 1))
    fi
  done < <(find "$vendor_dir" -name README.md -type f)

  total=$((total + vt))
  with_img=$((with_img + vi))

  if [[ $vt -gt 0 ]]; then
    pct=$(echo "scale=1; $vi * 100 / $vt" | bc)
    printf "%-16s %6d %6d %7s%%\n" "$vname" "$vi" "$vt" "$pct"
  fi
done

echo ""
if [[ $total -gt 0 ]]; then
  pct=$(echo "scale=1; $with_img * 100 / $total" | bc)
  printf "%-16s %6d %6d %7s%%\n" "TOTAL" "$with_img" "$total" "$pct"
else
  echo "No switches found in $DATA_DIR"
fi
