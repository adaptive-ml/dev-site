#!/bin/bash
# Detect dead internal links in glossary markdown files.
# Usage: bash scripts/check-links.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONTENT_DIR="$SCRIPT_DIR/../content"

# Build set of valid paths from the filesystem.
declare -A valid_paths
while IFS= read -r file; do
  rel="${file#$CONTENT_DIR/}"
  if [[ "$(basename "$rel")" == "_index.md" ]]; then
    path="/$(dirname "$rel")"
    [[ "$path" == "/." ]] && path="/"
  else
    path="/${rel%.md}"
  fi
  valid_paths["$path"]=1
done < <(find "$CONTENT_DIR" -name '*.md' -type f)

# Build valid anchors from ## headings
declare -A valid_anchors
while IFS= read -r file; do
  rel="${file#$CONTENT_DIR/}"
  if [[ "$(basename "$rel")" == "_index.md" ]]; then
    base_path="/$(dirname "$rel")"
    [[ "$base_path" == "/." ]] && base_path="/"
  else
    base_path="/${rel%.md}"
  fi
  while IFS= read -r heading; do
    slug=$(echo "$heading" | sed 's/^##* //' | tr '[:upper:]' '[:lower:]' | sed 's/ /-/g; s/[^a-z0-9-]//g')
    valid_anchors["${base_path}#${slug}"]=1
  done < <(grep -E '^##+ ' "$file" 2>/dev/null)
done < <(find "$CONTENT_DIR" -name '*.md' -type f)

dead_count=0

# Use grep to extract all internal links: [text](/path) or [text](/path#anchor)
while IFS= read -r file; do
  rel="${file#$CONTENT_DIR/}"
  # grep -noP to get line numbers and all matches
  grep -noP '\[([^\]]*)\]\((/[^)]*)\)' "$file" 2>/dev/null | while IFS= read -r match; do
    lineno="${match%%:*}"
    rest="${match#*:}"
    # Extract link target
    link=$(echo "$rest" | grep -oP '\(/[^)]*\)' | head -1 | tr -d '()')
    text=$(echo "$rest" | grep -oP '\[[^\]]*\]' | head -1 | tr -d '[]')

    [[ -z "$link" ]] && continue

    path="${link%%#*}"
    anchor=""
    [[ "$link" == *#* ]] && anchor="${link#*#}"

    if [[ -z "${valid_paths[$path]+x}" ]]; then
      echo "DEAD LINK: $rel:$lineno → $link (text: \"$text\")"
    elif [[ -n "$anchor" && -z "${valid_anchors[${path}#${anchor}]+x}" ]]; then
      echo "DEAD ANCHOR: $rel:$lineno → $link (text: \"$text\")"
    fi
  done
done < <(find "$CONTENT_DIR" -name '*.md' -type f)

echo ""
echo "Done."
