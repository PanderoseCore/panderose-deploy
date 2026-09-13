#!/usr/bin/env bash
# Assembles the Azure Static Web Apps deployment package for the dev docs
# site. Docusaurus is configured with baseUrl: /docs/, which means every
# asset URL it emits assumes it's physically served from /docs/* — so the
# built site has to live under a literal `docs/` folder in the deployed
# package, not at the package root. This script builds that layout:
#
#   dist/
#     staticwebapp.config.json   (routing/auth rules — see docs/staticwebapp.config.json)
#     docs/                      (the actual built site, matches baseUrl)
#
# Run from the docs/ directory after `npm run build:ci`.
set -euo pipefail

cd "$(dirname "$0")/.."   # docs/

rm -rf dist
mkdir -p dist/docs
cp -r build/. dist/docs/
cp staticwebapp.config.json dist/staticwebapp.config.json

echo "Packaged for deployment at docs/dist/ (site root -> dist/docs/*)"
