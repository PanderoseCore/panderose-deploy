#!/usr/bin/env bash
# Fails the build if ANY content from content/internal/ ends up reachable
# in the built output. This exists because of a real incident: internal
# docs were fully readable, unauthenticated, via the shared public JS
# bundle for as long as the internal Docusaurus instance was compiled
# into the same build as the public one — neither Cloudflare Access nor
# Azure's role gate protected the JS chunks that actually rendered the
# content, only the HTML route. See ADR 0006 for the full incident
# writeup. This check is the mechanical guarantee that doesn't rely on
# anyone remembering to test by hand next time.
#
# How it works: every internal page's title (frontmatter `title:` or its
# first H1) is treated as a marker string that must never appear ANYWHERE
# in the built docs/ directory, full stop. New internal content needs no
# manual registration here — its title is picked up automatically. Run
# after `npm run build:ci`, from the repo root.
set -euo pipefail

cd "$(dirname "$0")/../.."   # repo root

INTERNAL_SRC="docs-src/content/internal"
BUILD_OUT="docs"

if [ ! -d "$INTERNAL_SRC" ]; then
  echo "No $INTERNAL_SRC directory -- nothing to check, skipping."
  exit 0
fi

if [ ! -d "$BUILD_OUT" ]; then
  echo "ERROR: $BUILD_OUT doesn't exist -- did the build actually run?"
  exit 1
fi

echo "==> Extracting marker strings from every internal page's title..."
MARKERS_FILE="$(mktemp)"
trap 'rm -f "$MARKERS_FILE"' EXIT

# Frontmatter `title:` lines, and top-level H1s as a fallback for pages
# without one, across every markdown file under content/internal/.
grep -rhoE '^title:\s*"?([^"]+)"?\s*$' "$INTERNAL_SRC" 2>/dev/null \
  | sed -E 's/^title:\s*"?//; s/"?\s*$//' >> "$MARKERS_FILE" || true
grep -rhoE '^# .+' "$INTERNAL_SRC" 2>/dev/null \
  | sed -E 's/^# //' >> "$MARKERS_FILE" || true

# Drop anything too short/generic to be a meaningful marker (avoids noise
# like a bare "Overview" false-positiving against unrelated public text).
sort -u "$MARKERS_FILE" | awk 'length($0) >= 8' > "${MARKERS_FILE}.clean"
mv "${MARKERS_FILE}.clean" "$MARKERS_FILE"

MARKER_COUNT=$(wc -l < "$MARKERS_FILE")
echo "    Found $MARKER_COUNT marker strings to check against."

if [ "$MARKER_COUNT" -eq 0 ]; then
  echo "    No markers extracted -- nothing to verify against."
  exit 0
fi

echo "==> Scanning $BUILD_OUT/ for any of them..."
FOUND=0
while IFS= read -r marker; do
  [ -z "$marker" ] && continue
  matches=$(grep -rl -F -- "$marker" "$BUILD_OUT" 2>/dev/null || true)
  if [ -n "$matches" ]; then
    echo ""
    echo "LEAK DETECTED: internal marker \"$marker\" found in:"
    echo "$matches" | sed 's/^/  - /'
    FOUND=1
  fi
done < "$MARKERS_FILE"

if [ "$FOUND" -eq 1 ]; then
  echo ""
  echo "FAILED: internal content is reachable in the public build output."
  echo "This is exactly the incident ADR 0006 describes. Do not deploy."
  echo "If internal docs are meant to be enabled, they must be built as a"
  echo "physically isolated deployment (separate asset namespace, gated"
  echo "in its entirety) -- not compiled into this shared build."
  exit 1
fi

echo "    Clean -- no internal content found in $BUILD_OUT/."
