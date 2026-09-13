#!/usr/bin/env bash
# Non-interactive path to stand up (or verify) the Azure Static Web App
# resource for panderose.com, and wire its deployment token into GitHub as
# a repo secret — so this is a couple of commands once you have `az` and
# `gh` logged in again, instead of a portal wizard.
#
# Requires: az CLI (logged in: `az login`), gh CLI (logged in: `gh auth login`).
# This script was written without a live Azure session to test against —
# review it and/or run `az deployment group what-if` before applying in a
# real subscription.
set -euo pipefail

RESOURCE_GROUP="${RESOURCE_GROUP:-rg-panderose}"
APP_NAME="${APP_NAME:-panderose}"
LOCATION="${LOCATION:-westus2}"
REPO="${REPO:-PanderoseCore/panderose-deploy}"

echo "==> Resource group: $RESOURCE_GROUP"
az group show --name "$RESOURCE_GROUP" >/dev/null 2>&1 || \
  az group create --name "$RESOURCE_GROUP" --location "$LOCATION"

echo "==> Deploying Static Web App '$APP_NAME' (Free tier, no GitHub auto-integration)"
az deployment group create \
  --resource-group "$RESOURCE_GROUP" \
  --template-file "$(dirname "$0")/static-web-app.bicep" \
  --parameters appName="$APP_NAME" location="$LOCATION"

HOSTNAME=$(az staticwebapp show --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" \
  --query "defaultHostname" -o tsv)
echo "==> Default hostname: https://${HOSTNAME}"

echo "==> Fetching deployment token"
TOKEN=$(az staticwebapp secrets list --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" \
  --query "properties.apiKey" -o tsv)

echo "==> Setting GitHub repo secret AZURE_STATIC_WEB_APPS_API_TOKEN on $REPO"
gh secret set AZURE_STATIC_WEB_APPS_API_TOKEN --repo "$REPO" --body "$TOKEN"

cat <<EOF

Done.

Next (manual, portal — custom domains aren't az CLI one-liners you'd want
scripted blind):
  1. Static Web App "$APP_NAME" -> Custom domains -> add panderose.com and
     www.panderose.com (if not already there from the original migration).
  2. Point their DNS at: ${HOSTNAME}
  3. Push to main (or merge a PR) to trigger azure-deploy.yml and confirm
     /docs/ and /docs/internal/ both come up correctly.

EOF
