# OpenAPI spec sync contract

This folder holds OpenAPI 3.x specs that `docusaurus-plugin-openapi-docs`
turns into generated API reference pages on every docs build. Nothing in
here should be hand-edited long-term — it should be overwritten by CI from
the source-of-truth service.

- `specs/public/*.json` → rendered into the **public** docs instance
  (`content/public/api`), for anything we publish externally.
- `specs/internal/*.json` → rendered into the **internal** docs instance
  (`content/internal/api`), for internal-only services (e.g. `cambium`).

## What each FastAPI service repo should do

FastAPI serves a live spec at `/openapi.json` for free. Add a small step to
that service's own CI (on merge to its main branch):

```yaml
# example step in the SERVICE repo's own workflow
- name: Export OpenAPI spec
  run: |
    curl -sf https://<service-internal-or-staging-url>/openapi.json \
      -o openapi.json
    # or, without a running instance:
    # python -c "import json; from app.main import app; json.dump(app.openapi(), open('openapi.json','w'))"

- name: Sync spec into docs repo
  uses: peter-evans/repository-dispatch@v3   # or a checkout+push step
  with:
    token: ${{ secrets.DOCS_REPO_PAT }}
    repository: PanderoseCore/panderose-deploy
    event-type: spec-sync
    client-payload: |
      {"service": "<service-name>", "visibility": "public|internal", "spec_b64": "<base64 of openapi.json>"}
```

On this side, a `repository_dispatch` workflow (`spec-sync`, to be added
once the first service wires up its half) decodes the payload and commits
the spec to `specs/<visibility>/<service>.json`, which triggers the normal
docs build/deploy.

Until a service does this, add its spec by hand at
`specs/public/<service>.json` or `specs/internal/<service>.json` as a
stopgap — the plugin picks up anything that's a valid OpenAPI 3.x document
regardless of how it got there.
