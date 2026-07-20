# rirekisho!

Build polished resumes through a **stateful AI chat** — import LinkedIn, fill gaps with guided enrichment, edit inline on a live A4 preview, translate to Japanese & French, then export **PDF** or **Word**.

> 📦 **rirekisho!** — GitHub: [tonystrawberry/rirekisho](https://github.com/tonystrawberry/rirekisho) (repo slug has no `!`)

---

## 🌟 Features

| | Feature | What you get |
|---|---|---|
| 💬 | **Enrichment chat** | Gap-aware conversation that proposes resume patches — you confirm before anything lands in the master profile |
| 🔗 | **LinkedIn import** | Pull profile data via Apify (or a custom connector URL) |
| 🐙 | **GitHub sign-in** | Auth.js + GitHub OAuth (sign-in only in v1) |
| 🖼️ | **Photo & logos** | Profile photo and per-entry logos on experience / education / certifications |
| 📄 | **Live A4 preview** | Classic & Modern templates with block-aware page breaks |
| ✏️ | **Inline editing** | Click-to-edit text on the source locale; × to delete bullets, entries, or whole sections |
| 🌍 | **Locales** | English source + Japanese / French presentations (delta retranslate on save) |
| 📑 | **Exports** | Browser PDF print + classical **Word (.docx)** export |
| 🔗 | **Sharing** | Shareable resume links (optional Vercel Blob for stored PDFs) |

---

## 🧰 Tech stack

### Core

| Layer | Choice |
|---|---|
| 🖥️ Framework | **Next.js 15** (App Router) + **React 19** + **TypeScript** |
| 🎨 UI | **Tailwind CSS 4**, **Radix** dialogs, **lucide-react**, **shadcn-style** components |
| 🗄️ Database | **PostgreSQL 16** via **Prisma 6** |
| 🔐 Auth | **Auth.js v5** (`next-auth`) + **Prisma adapter** + GitHub OAuth |
| ✅ Validation | **Zod** master-resume schema at API / merge boundaries |

### AI & data

| Concern | Choice |
|---|---|
| 🤖 LLM SDK | **Vercel AI SDK** (`ai`, `@ai-sdk/react`, `@ai-sdk/google`) |
| 🧠 Model | **Google Gemini** (default `gemini-flash-latest`, overridable) |
| 📥 LinkedIn | **Apify** LinkedIn Profile Scraper (or generic HTTP connector) |

### Documents & media

| Concern | Choice |
|---|---|
| 📕 PDF preview docs | **@react-pdf/renderer** (structured PDF documents) |
| 🖨️ User PDF | Browser print from the A4 preview (WYSIWYG) |
| 📘 Word | **docx** package → classical one-column layout |
| ☁️ Blob (optional) | **Vercel Blob** for shared PDF storage |

### Tooling

| Tool | Role |
|---|---|
| ⚡ Turbopack | `npm run dev` |
| 🧪 Vitest | Unit tests (`npm test`) |
| 🐳 Docker Compose | Local Postgres on port **5433** |
| 📐 Spec Kit | Product/design docs under `specs/002-ai-resume-builder/` |

---

## 📋 Prerequisites

- 🟢 **Node.js 20+** and **npm**
- 🐳 **Docker** (for Postgres) *or* any Postgres reachable via `DATABASE_URL`
- 🔑 **GitHub OAuth App** — callback: `http://localhost:3000/api/auth/callback/github`
- 🔑 **Google AI Studio** key for Gemini ([aistudio.google.com](https://aistudio.google.com/apikey))
- 🔑 **Apify token** (optional but recommended for LinkedIn import)

---

## 🚀 Quick start

```bash
# 1) Database
docker compose up -d

# 2) Env
cp .env.example .env.local
# Fill AUTH_*, GOOGLE_GENERATIVE_AI_API_KEY, and optionally APIFY_TOKEN / BLOB_READ_WRITE_TOKEN
openssl rand -base64 32   # paste into AUTH_SECRET

# 3) Install & migrate
npm install
npx prisma migrate deploy

# 4) Dev server (Turbopack)
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** → sign in with GitHub → create / open a resume in **Workspace**.

---

## 🔐 Environment variables

Copy from [`.env.example`](./.env.example):

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | ✅ | Postgres connection (Compose default uses port **5433**) |
| `AUTH_SECRET` | ✅ | Auth.js secret (`openssl rand -base64 32`) |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | ✅ | GitHub OAuth app credentials |
| `GOOGLE_GENERATIVE_AI_API_KEY` | ✅ | Gemini for chat, extract, translate |
| `GEMINI_MODEL` | ⚪ | Override model (default `gemini-flash-latest`) |
| `APIFY_TOKEN` | ⚪ | LinkedIn profile scrape via Apify |
| `APIFY_LINKEDIN_ACTOR_ID` | ⚪ | Actor override |
| `LINKEDIN_CONNECTOR_URL` / `LINKEDIN_CONNECTOR_API_KEY` | ⚪ | Non-Apify LinkedIn connector |
| `BLOB_READ_WRITE_TOKEN` | ⚪ | Vercel Blob for shared PDFs |

Without an LLM key, translation falls back to a lightweight demo prefix mode so the UI still works offline.

---

## 📁 Project layout

```text
app/                  # Next.js App Router (marketing, workspace, APIs)
components/           # Chat, preview, export, auth, shadcn UI
lib/
  ai/                 # Models, enrichment prompts, translate (+ delta sync)
  docx/               # Classical Word renderer
  etl/                # GitHub / LinkedIn ingest + extract
  resume/             # Zod schema, merge, completeness, locales, labels
  pdf/                # PDF helpers
prisma/               # Schema + migrations
templates/            # classic/ + modern/ (preview + PDF documents)
specs/002-ai-resume-builder/   # Spec, plan, data model, contracts
tests/unit/           # Vitest
```

---

## 🧭 App flow (mental model)

```text
Sign in (GitHub)
    → Onboarding / import LinkedIn (optional)
    → Workspace chat proposes patches → you Confirm & apply
    → Master resume (source locale, usually EN) updates
    → JA / FR locale presentations sync (full on first create, delta on later edits)
    → Inline edit / delete on the A4 preview
    → Export PDF (print) or Word (.docx)
```

**Important**

- 🧠 The **master profile** is source-locale only — translations never overwrite it.
- ✅ AI suggestions need **Confirm & apply** before they merge.
- ✏️ Preview text editing is enabled on the **source locale** only.
- 🌐 After saves, changed text is retranslated into JA/FR (not the whole resume every time).

---

## 📜 Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Next.js dev server with Turbopack |
| `npm run build` / `npm start` | Production build & serve |
| `npm run lint` | ESLint |
| `npm test` | Vitest once |
| `npm run test:watch` | Vitest watch mode |
| `npx prisma migrate deploy` | Apply migrations |
| `npx prisma studio` | Browse DB in the browser |

---

## 🧪 Smoke checklist

| Step | Expected |
|---|---|
| Sign in with GitHub | Lands in the authenticated app |
| Chat about your background | Assistant asks for name / role / experience |
| Confirm a suggested patch | Preview updates |
| Switch template / primary color | Preview refreshes |
| Switch locale to 日本語 / Français | Localized content + section titles |
| Upload photo / logos | Appear on the canvas |
| Hover × on a bullet or section | Deletes that line / entry / section |
| Export PDF | Print dialog → Save as PDF |
| Export Word | Downloads a classical `.docx` |

---

## 🧩 Third-party services

| Service | Used for | Docs |
|---|---|---|
| 🐙 **GitHub OAuth** | Sign-in | [Developer settings → OAuth Apps](https://github.com/settings/developers) |
| ✨ **Google Gemini** | Chat, extraction, translation | [AI Studio](https://aistudio.google.com/) |
| 🕷️ **Apify** | LinkedIn profile scrape | [Integrations → API token](https://console.apify.com/settings/integrations) |
| ☁️ **Vercel Blob** | Optional shared PDF storage | [Vercel Storage → Blob](https://vercel.com/docs/storage/vercel-blob) |
| 🐘 **PostgreSQL** | All app data | Local via `docker compose` |

---

## 📚 Design docs

Product & engineering artifacts for this feature:

- 📋 [spec.md](./specs/002-ai-resume-builder/spec.md) — requirements
- 🗺️ [plan.md](./specs/002-ai-resume-builder/plan.md) — architecture
- 🧮 [data-model.md](./specs/002-ai-resume-builder/data-model.md) — entities
- ⚡ [quickstart.md](./specs/002-ai-resume-builder/quickstart.md) — feature quickstart
- 📝 [tasks.md](./specs/002-ai-resume-builder/tasks.md) — implementation tasks

---

## 🚢 Deploy notes

See **[deployment.md](./deployment.md)** for full Vercel + Neon setup.

Designed to run on **Vercel** (Node runtime):

1. Provision Postgres (e.g. Neon) and set `DATABASE_URL`
2. Set all required env vars in the project settings
3. Run migrations (`prisma migrate deploy`) in build or a release step
4. Configure the GitHub OAuth callback for your production URL
5. (Optional) attach Vercel Blob and set `BLOB_READ_WRITE_TOKEN`

---

## 📄 License

Private / unpublished unless otherwise stated in the repository settings.
