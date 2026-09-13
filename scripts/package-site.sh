#!/usr/bin/env bash
# Builds docs/ and assembles the same dist/ package
# .github/workflows/azure-deploy.yml deploys — the marketing site at the
# repo root plus the Docusaurus docs build physically under dist/docs/
# (matching docs/docusaurus.config.js's baseUrl: '/docs/'). Useful for
# testing the merged site locally before pushing.
#
# Run from the repo root.
set -euo pipefail

cd "$(dirname "$0")/.."   # repo root

if [[ "${1:-}" == "--skip-docs-build" ]]; then
  echo "==> Skipping docs build (--skip-docs-build: reusing existing docs/build)"
else
  echo "==> Building docs/"
  ( cd docs && npm run build:ci )
fi

echo "==> Assembling dist/"
rm -rf dist
mkdir -p dist
TARFILE="$(mktemp -t panderose-site-XXXXXX.tar)"
# tar with excludes, not rsync — no extra dependency, works the same on
# GitHub-hosted runners and locally. Written outside the tree (mktemp) so
# tar doesn't see (and warn about) itself.
tar --exclude='./.git' --exclude='./.github' --exclude='./docs' \
    --exclude='./infra' --exclude='./scripts' --exclude='./dist' \
    --exclude='./.gitignore' --exclude='*.md' \
    -cf "$TARFILE" .
tar -xf "$TARFILE" -C dist
rm -f "$TARFILE"
mkdir -p dist/docs
cp -r docs/build/. dist/docs/

echo "==> Packaged at dist/ (marketing site at dist/, docs at dist/docs/)"
echo "    Try: cd dist && python3 -m http.server 8080"
