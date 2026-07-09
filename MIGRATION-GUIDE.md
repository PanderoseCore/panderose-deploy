# Panderose.com — Migration to Azure Static Web Apps

Moving `panderose.com` from your **Proxmox server + Cloudflare Tunnel** to **Azure Static Web Apps**, with DNS staying on **Cloudflare** and deployment driven by **GitHub CI/CD**.

## Why this target

Your site is fully static (HTML/CSS, ~440 KB, no backend, no database, no build step). Azure Static Web Apps is the best fit:

- **Free tier ($0)** — covered even without touching your student credit. Free tier includes custom domains and managed SSL certificates.
- **Global distribution + free auto-renewing HTTPS** — replaces what your Cloudflare Tunnel was doing.
- **GitHub CI/CD built in** — every `git push` redeploys automatically.
- **Clean URLs handled** — your site links to `/about`, `/contact`, etc. (no `.html`). The `staticwebapp.config.json` I added maps those to the real files. Azure does **not** do this automatically, so that file is required.

## What I already prepared in this folder

- `staticwebapp.config.json` — routes `/about` → `about.html` (all 8 pages), a custom 404, security headers (HSTS, nosniff, frame options), MIME types, and asset caching.
- `404.html` — styled to match the site.
- `.gitignore` — keeps OS cruft and any secrets out of the repo.

Nothing about your page content was changed.

---

## Prerequisites

- **Azure for Students** account (your Embry-Riddle account) — sign in at https://portal.azure.com. Static Web Apps Free tier needs no credit card and no credit spend.
- **GitHub account** with a new (private is fine) repository.
- **Cloudflare access** to the `panderose.com` zone.
- **Git** installed locally.

---

## Step 1 — Put the site in a GitHub repo

From this folder (`E:\DoD\05_admin\panderose-deploy`) in a terminal:

```bash
cd E:\DoD\05_admin\panderose-deploy
git init
git add .
git commit -m "Panderose static site — initial import for Azure migration"
git branch -M main
```

Create an empty repo on GitHub (e.g. `panderose-site`, no README/license so it stays empty), then:

```bash
git remote add origin https://github.com/<your-username>/panderose-site.git
git push -u origin main
```

---

## Step 2 — Create the Azure Static Web App

1. Go to https://portal.azure.com → search **Static Web Apps** → **Create**.
2. **Basics:**
   - **Subscription:** Azure for Students.
   - **Resource group:** create one, e.g. `rg-panderose`.
   - **Name:** `panderose`.
   - **Plan type:** **Free**.
   - **Region:** pick the closest (e.g. *West US 2*). (Region only affects the managed functions backend, which you aren't using.)
3. **Deployment:** choose **GitHub**, authorize, then select:
   - **Organization:** your GitHub account.
   - **Repository:** `panderose-site`.
   - **Branch:** `main`.
4. **Build details** — this is the important part for a no-build static site:
   - **Build Presets:** **Custom**.
   - **App location:** `/`
   - **Api location:** *(leave blank)*
   - **Output location:** *(leave blank)*
5. **Review + create** → **Create**.

Azure commits a workflow file (`.github/workflows/azure-static-web-apps-*.yml`) to your repo and stores the deploy token as a repo secret automatically. The first deploy runs immediately.

## Step 3 — Confirm the first deploy

1. In the Static Web App resource, open the **URL** at the top (looks like `https://<random-name>.azurestaticapps.net`). Your site should load.
2. Test clean URLs directly: `.../about`, `.../contact`, and a bogus path like `.../nope` (should show your styled 404).
3. If the GitHub Action failed, open the repo's **Actions** tab — 99% of the time it's a wrong App/Output location from Step 2.4. Fix and re-run.

**Do not touch DNS until the `.azurestaticapps.net` URL works correctly**, including the clean URLs.

---

## Step 4 — Add the custom domain in Azure

In the Static Web App → **Custom domains** → **+ Add**.

Add **two** domains (do `www` first — it's simpler):

**A. `www.panderose.com`**
- Choose domain type **CNAME**.
- Azure shows a target hostname: `<your-default-hostname>.azurestaticapps.net`. Copy it.

**B. `panderose.com` (apex/root)**
- Choose **TXT** validation.
- Azure shows a **TXT record name and value** — copy both. Keep this page open; you'll paste the Cloudflare records next, then click **Validate**.

---

## Step 5 — Cloudflare DNS cutover

This is where you leave the tunnel behind. In the Cloudflare dashboard → `panderose.com` → **DNS → Records**.

**5a. Remove the tunnel records.** Delete the existing record(s) that point the site at your server — typically a proxied `CNAME` for `@` (and/or `www`) targeting something like `<uuid>.cfargotunnel.com`. These are what routed traffic to Proxmox.

**5b. Add the Azure records:**

| Type  | Name              | Target / Value                                   | Proxy status      |
|-------|-------------------|--------------------------------------------------|-------------------|
| CNAME | `www`             | `<default-hostname>.azurestaticapps.net`         | **DNS only** (grey) |
| CNAME | `@` (panderose.com) | `<default-hostname>.azurestaticapps.net`       | **DNS only** (grey) |
| TXT   | *(name from Azure)* | *(value from Azure)*                           | n/a               |

Notes:
- Cloudflare **flattens the apex CNAME** automatically, so a `CNAME` at `@` is valid here.
- Set the CNAME records to **DNS only (grey cloud)** for validation and to let Azure issue its own SSL certificate. Azure Static Web Apps already gives you global distribution + auto-renewing HTTPS, so leaving Cloudflare's proxy off is the clean, reliable choice. (If you later want Cloudflare's proxy/WAF in front, turn the cloud orange **and** set **SSL/TLS → Overview → Full (strict)**. Do *not* use "Flexible" — it causes redirect loops.)

**5c. Validate in Azure.** Back on the Azure custom-domain page, click **Validate** for `panderose.com`. It checks the TXT record (DNS can take a few minutes to propagate). Once validated, Azure provisions the certificate — allow a few minutes to some hours for the cert to go live.

**5d. Redirect www → apex (optional but recommended).** Your canonical tags use the bare `panderose.com`. To force `www` to the apex, add a Cloudflare **Redirect Rule**: *If hostname equals `www.panderose.com` → 301 to `https://panderose.com/${path}`*. (Or the reverse if you'd rather standardize on `www`.)

---

## Step 6 — Verify

- `https://panderose.com` and `https://www.panderose.com` both load over HTTPS with a valid cert.
- Clean URLs work: `/about`, `/capabilities`, `/compliance`, `/contact`, `/news`, `/privacy`, `/security`, `/terms`.
- 404 page shows on a bad path.
- Check headers: `curl -sI https://panderose.com | grep -i strict-transport` should show HSTS.
- `https://panderose.com/sitemap.xml` and `/robots.txt` resolve.

---

## Step 7 — Decommission the old setup

Only after the site is confirmed live on Azure:

1. **Cloudflare Zero Trust** → **Networks → Tunnels** → delete (or disable) the `panderose` tunnel.
2. On the **Proxmox** host, stop and remove the `cloudflared` service and the web server container/VM that served the site.
3. Keep a copy of the site files (this repo already is your backup).

---

## Updating the site from now on

Edit files locally, then:

```bash
git add .
git commit -m "Describe your change"
git push
```

The GitHub Action redeploys automatically in ~1–2 minutes. There's also a **staging environment per pull request** — open a PR and Azure gives you a temporary preview URL before you merge.

---

## Troubleshooting

- **Clean URLs 404 on Azure but pages exist:** `staticwebapp.config.json` wasn't at the app root, or App location in Step 2.4 wasn't `/`. It must sit next to `index.html`.
- **Apex domain won't validate:** the TXT record name/value must match Azure exactly; wait for propagation (`nslookup -type=TXT <name>`). Make sure the apex CNAME is **DNS only**.
- **Redirect loop / "too many redirects":** Cloudflare SSL/TLS mode is "Flexible". Set it to **Full (strict)** or keep the records **DNS only**.
- **Cert stuck "provisioning":** proxied (orange) records block Azure's issuance — set them to DNS only until the cert is issued.
- **Build fails in Actions:** confirm Output location is **blank** (not `dist`/`build`) — there's no build step here.

---

## Cost summary

Static Web Apps **Free** tier: **$0/month** — includes the custom domain, managed TLS, and 100 GB bandwidth/month, which is far more than a static brochure site uses. Your Azure for Students credit stays untouched.
