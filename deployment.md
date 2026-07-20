# Deploying rirekisho!

This app is designed to run on **Vercel** with **PostgreSQL** (recommended: **Neon**). These steps use the **Vercel dashboard UI** only.

> **Naming:** The product is **rirekisho!** (with bang). GitHub, npm, URLs, and Vercel slugs use **`rirekisho`** without `!` — those systems do not allow `!` in names.

---

## Prerequisites

- Code pushed to GitHub: [tonystrawberry/rirekisho](https://github.com/tonystrawberry/rirekisho)
- A [Vercel](https://vercel.com) account
- A [GitHub OAuth App](https://github.com/settings/developers) (or create one during setup)
- A [Google AI Studio](https://aistudio.google.com/) API key for Gemini

Local `DATABASE_URL` (`127.0.0.1`) **cannot** be used in production.

---

## 1. Create or open the Vercel project

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. **Add New → Project** (or open the **rirekisho!** project — Vercel slug: `rirekisho`)
3. **Import** the GitHub repo `tonystrawberry/rirekisho`
4. **Production branch:** `main`
5. Do **not** deploy yet — set up the database and env vars first

---

## 2. Provision PostgreSQL (Neon)

### Why Neon?

For a personal / low-traffic resume app, **Neon’s free tier** is usually the cheapest sensible option (~512 MB storage, no credit card). **Vercel Postgres** is the same engine (Neon) with Vercel billing — convenient in the UI, often slightly more expensive once you pay.

Supabase is a full backend (Auth, Storage, etc.). This app already uses Auth.js and optional Vercel Blob, so Supabase does not save money here.

### Option A — Neon via Vercel (easiest in UI)

1. In the project → **Storage** → **Create Database**
2. Choose **Neon** (Postgres)
3. Create the database and **connect it to Production** (and Preview if you want preview deploys to work)
4. Vercel adds `DATABASE_URL` automatically

### Option B — Neon directly

1. Create a project at [console.neon.tech](https://console.neon.tech)
2. Open **Connection details** → copy the **pooled** connection string (host often contains `-pooler`)
3. In Vercel → **Settings → Environment Variables** → add `DATABASE_URL` for **Production** (and Preview if needed)

### Scale-to-zero (cold starts)

Neon **free tier** suspends compute after a few minutes of idle time to save cost. This does **not** mean the database is unreachable:

1. While idle, compute sleeps (you are not billed for compute).
2. When you open the app, Vercel sends a query → Neon **wakes** the database.
3. The **first request after sleep** can be slower (often ~300 ms–2 s; sometimes longer on free tier).
4. After wake-up, latency is normal until the next idle period.

Use Neon’s **pooled** `DATABASE_URL` on Vercel (not the direct/non-pooled URL) to avoid connection issues with serverless functions.

If cold starts are unacceptable, upgrade Neon to a paid plan that keeps compute active, or accept occasional slow first loads on the free tier.

---

## 3. Environment variables

**Settings → Environment Variables.** Add for **Production** (and **Preview** if you use preview URLs).

| Variable | Required | Notes |
|----------|----------|--------|
| `DATABASE_URL` | Yes | Hosted Postgres (Neon pooled URL). Not `127.0.0.1`. |
| `AUTH_SECRET` | Yes | `openssl rand -base64 32` — use a **new** secret for production |
| `AUTH_GITHUB_ID` | Yes | GitHub OAuth App Client ID |
| `AUTH_GITHUB_SECRET` | Yes | GitHub OAuth App Client Secret |
| `AUTH_URL` | Yes | Production URL, e.g. `https://rirekisho.vercel.app` (slug has no `!`; no trailing slash). Used for auth and share links. |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Yes | Gemini API key |
| `GEMINI_MODEL` | No | Default in code is `gemini-flash-latest` |
| `BLOB_READ_WRITE_TOKEN` | No | **Storage → Blob** — cached shared PDFs; without it, PDFs render on demand |
| `APIFY_TOKEN` | No | LinkedIn import via Apify only |

Copy values from local `.env.local` where appropriate. **Never** commit secrets or reuse local `DATABASE_URL`.

See [`.env.example`](./.env.example) for the full list.

---

## 4. Build settings

**Settings → General → Build & Development Settings**

| Setting | Value |
|---------|--------|
| Framework Preset | Next.js |
| Build Command | `prisma migrate deploy && next build` |

The repo’s `package.json` `build` script already runs migrations before `next build`. Either set the command explicitly in Vercel or rely on the committed script.

`postinstall` runs `prisma generate` automatically.

---

## 5. GitHub OAuth (production)

1. [GitHub → Developer settings → OAuth Apps](https://github.com/settings/developers)
2. Create or edit your OAuth App:
   - **Homepage URL:** `https://<your-vercel-domain>`
   - **Authorization callback URL:** `https://<your-vercel-domain>/api/auth/callback/github`
3. Copy **Client ID** and **Client Secret** into Vercel env vars (`AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`)

After the first deploy, use the exact production domain (e.g. `rirekisho.vercel.app` or your custom domain).

If you add a **custom domain** later, update GitHub callback URLs and `AUTH_URL`, then redeploy.

---

## 6. Deploy

1. **Deployments** → deploy from the latest `main` commit, or push to `main` (Git integration auto-deploys)
2. Wait until the deployment status is **Ready**
3. Open the production URL

If the build fails on `prisma migrate deploy`, check that `DATABASE_URL` is set, uses the **pooled** Neon URL, and that the database is reachable from Vercel.

---

## 7. Smoke test

- [ ] Landing page loads
- [ ] **Continue with GitHub** sign-in works
- [ ] Create or open a resume in the workspace
- [ ] Chat responds (Gemini key valid)
- [ ] Preview and PDF export work
- [ ] (Optional) Shared link / Blob PDF if configured

---

## 8. Custom domain (optional)

1. **Settings → Domains** → add your domain → follow DNS instructions
2. Update `AUTH_URL` to the new domain
3. Update GitHub OAuth **Homepage** and **Callback** URLs
4. Redeploy

---

## 9. Print / PDF note

The app uses a desktop-only layout below 1280px width. Printing uses the same clipped A4 pages as the in-app preview. In Chrome’s print dialog, **Margins: None** is fine — page padding is handled inside the layout, not via `@page` margins.

---

## Quick checklist

- [ ] Repo on GitHub `main`
- [ ] Vercel project imported and linked
- [ ] Neon (or other hosted Postgres) connected — **pooled** `DATABASE_URL`
- [ ] All required env vars set (`AUTH_URL`, `AUTH_SECRET`, GitHub, Gemini)
- [ ] GitHub OAuth callback matches production URL
- [ ] Build runs `prisma migrate deploy && next build`
- [ ] Production deployment **Ready**
- [ ] Sign-in and core flows tested

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|----------------|-----|
| Build fails at `prisma migrate deploy` | Missing or wrong `DATABASE_URL` | Set pooled Neon URL; ensure DB exists |
| First request very slow after idle | Neon scale-to-zero | Expected on free tier; retry or upgrade Neon |
| `500` on DB routes after deploy | Direct (non-pooled) URL | Switch to Neon **pooled** connection string |
| GitHub sign-in redirect error | Callback URL mismatch | Match `/api/auth/callback/github` to production domain |
| Share links wrong host | `AUTH_URL` unset or stale | Set `AUTH_URL` to production URL, redeploy |
| Blank PDF when printing on narrow viewport | Desktop shell hides content | Already fixed with `print:contents` on desktop shell — ensure latest code is deployed |

---

## Related docs

- [README.md](./README.md) — local setup and stack overview
- [`.env.example`](./.env.example) — environment variable template
- [specs/002-ai-resume-builder/plan.md](./specs/002-ai-resume-builder/plan.md) — architecture
