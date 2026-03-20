#!/bin/bash
# Remove orphaned character images that are no longer in characters.ts
# Run from the project root: bash scripts/cleanup-images.sh

DIR="public/characters"
DATA="src/data/characters.ts"
removed=0
kept=0

for f in "$DIR"/*.jpg; do
  [ -f "$f" ] || continue
  id=$(basename "$f" .jpg)
  if ! grep -q "\"$id\"" "$DATA"; then
    rm "$f"
    echo "  Removed: $id"
    ((removed++))
  else
    ((kept++))
  fi
done

echo ""
echo "Done! Removed $removed orphaned images, kept $kept."
