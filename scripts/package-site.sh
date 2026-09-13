#!/usr/bin/env bash
# Builds docs-src/ and replaces the committed docs/ output with it — the
# same thing .github/workflows/build-docs.yml does on merge to main.
# Useful for previewing docs changes locally before pushing, or for
# regenerating docs/ by hand if you'd rather not wait for CI.
#
# After running this, the repo root itself (marketing pages + docs/) is
# the whole deployable static site — no separate assembly/dist step.
# Try: python3 -m http.server 8080  (from the repo root)
set -euo pipefail

cd "$(dirname "$0")/.."   # repo root

echo "==> Building docs-src/"
( cd docs-src && npm run build:ci )

echo "==> Replacing docs/ with the fresh build"
rm -rf docs
mkdir -p docs
cp -r docs-src/build/. docs/

echo "==> Done. docs/ now matches docs-src/. Diff it before committing:"
echo "    git status docs"
echo "    git diff --stat docs"
