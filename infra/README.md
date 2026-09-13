# infra — Azure Static Web App provisioning

Infrastructure-as-code for the **single** Azure Static Web Apps resource
that serves both panderose.com (marketing site) and panderose.com/docs
(developer docs) — see
[ADR 0002](../docs/content/internal/standards/adrs/0002-single-swa-resource.md)
for why it's one resource, not two.

Written without a live Azure session to validate against (no Azure
control-plane access from this environment) — review before running, and
consider `az deployment group what-if` first in a real subscription.

## If the resource doesn't exist yet

```bash
az login
gh auth login
./deploy.sh
```

Env vars you can override: `RESOURCE_GROUP` (default `rg-panderose`),
`APP_NAME` (default `panderose`), `LOCATION` (default `westus2`),
`REPO` (default `PanderoseCore/panderose-deploy`).

This creates the resource **without** Azure's built-in GitHub integration
(`skipGithubActionWorkflowGeneration: true` in `static-web-app.bicep`) —
on purpose, so Azure doesn't auto-commit a second, competing workflow file
on top of `.github/workflows/azure-deploy.yml`. It then reads the
resource's deployment token and sets it as the
`AZURE_STATIC_WEB_APPS_API_TOKEN` GitHub secret via `gh secret set`.

## If the resource already exists (likely, per MIGRATION-GUIDE.md)

Skip `static-web-app.bicep` — just get the existing resource's deployment
token and set the same secret:

```bash
az staticwebapp secrets list --name panderose --resource-group rg-panderose \
  --query "properties.apiKey" -o tsv

gh secret set AZURE_STATIC_WEB_APPS_API_TOKEN --repo PanderoseCore/panderose-deploy
# (paste the token when prompted)
```

Then confirm the resource has **no** existing Azure-managed workflow file
committed anywhere in this repo that would conflict with
`azure-deploy.yml` (there wasn't one as of this writing — `gh api
repos/PanderoseCore/panderose-deploy/actions/workflows` returned zero
workflows).

## After the token is set

Push to `main` (or merge a PR into it). `azure-deploy.yml` builds and
deploys automatically. Verify:

```bash
curl -sI https://panderose.com/           | head -1   # marketing site
curl -sI https://panderose.com/docs/      | head -1   # public docs
curl -sI https://panderose.com/docs/internal/ | head -1   # should require auth once configured
```

## Gating `/docs/internal/*` for real

Right now `allowedRoles: ["authenticated"]` in `staticwebapp.config.json`
only does something once an identity provider is configured on the SWA
resource (Azure portal -> the resource -> Authentication, or via
`az staticwebapp identity-provider` commands). Until then that route is
effectively open — don't put anything there you wouldn't want public in
the meantime.
