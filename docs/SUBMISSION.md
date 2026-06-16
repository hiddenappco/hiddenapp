# Google for Startups AI Agents Challenge — Submission snapshot

**Track:** Optimize  
**Challenge:** [Google for Startups AI Agents Challenge](https://googleforstartups.devpost.com/)  
**Submission deadline:** June 11, 2026, 7:00 PM (local)  
**Official code freeze:** commit [`709f760`](https://github.com/hiddenappco/hiddenapp/commit/709f760efa90751731232a2555eea17c9cb46ff4) — June 11, 2026, 3:35 PM (-0500)

---

## How this repository is organized

| Reference | Purpose | Who should use it |
|-----------|---------|-------------------|
| **Git tag** [`v1.0-challenge-submission`](https://github.com/hiddenappco/hiddenapp/tree/v1.0-challenge-submission) | Immutable snapshot of the code at challenge close | Judges auditing the formal submission |
| **Branch** [`submission`](https://github.com/hiddenappco/hiddenapp/tree/submission) | Same commit as the tag (easier `git checkout`) | Judges preferring a branch name |
| **Branch** [`main`](https://github.com/hiddenappco/hiddenapp/tree/main) | Active product development after submission | Contributors, post-challenge reviewers |
| **[GitHub Release](https://github.com/hiddenappco/hiddenapp/releases/tag/v1.0-challenge-submission)** | Human-readable release notes for the snapshot | Quick overview without cloning |
| **[Release draft text](./RELEASE_v1.0-challenge-submission.md)** | Copy/paste body for the Releases UI if not yet published | Maintainers |

**Rule of thumb:** evaluate the **tag / `submission` branch** for the challenge deliverable; use **`main`** for the latest Hidden App codebase.

---

## Checkout the submission snapshot

```bash
git clone https://github.com/hiddenappco/hiddenapp.git
cd hiddenapp

# Option A — tag (recommended)
git checkout v1.0-challenge-submission

# Option B — branch
git checkout submission
```

Install and run (submission snapshot):

```bash
npm install
cd functions && npm install && cd ..
cd agent-worker && npm install && cd ..

# Configure env files — see README § Environment (never commit secrets)
npm run dev
```

Open the [live app](https://gen-lang-client-0040858908.web.app) and tap **Explore as guest** for full access without sign-up.

**Demo video (Devpost):** https://www.youtube.com/watch?v=cTfFi36K3qI

---

## What the submission snapshot includes

Core deliverable at `709f760`:

- **Hyperlocal chat** — `chatAgent` on Google ADK with Agentic RAG, MCP catalog tools, persistent Firestore sessions
- **Environmental Ranger** — `environmentalAgent` with structured telemetry JSON; callable as `getLiveConditions` from chat
- **Off-Grid Vault** — department SQLite packs, local RAG, bilingual catalog columns
- **Modo Live** — LiveKit + Gemini Multimodal Live on Cloud Run (`hidden-agent-worker`)
- **Guest mode** — explore without sign-up; Firebase ID token on cloud agent endpoints
- **i18n** — ES/EN UI and bilingual Firestore fields
- **Security** — agent endpoints verify Firebase ID tokens; refugio rich text sanitization

**Architecture:** [docs/ARCHITECTURE.md](./ARCHITECTURE.md) (as of submission commit) · [architecture.html](https://gen-lang-client-0040858908.web.app/architecture.html)

---

## Post-submission development on `main`

After the tag was created, the team continued shipping on `main`. Examples (not exhaustive):

| Area | Post-submission work |
|------|----------------------|
| **Expedition Planner** | Hub `/expedition/plan`, 5-step wizard, multi-agent pipeline (`createExpedition`), coupon widgets, expedition PDF |
| **Trip ledger (Bitácora v2)** | Solo/group trips, TRM rates, offline outbox, group splits, bilingual trip PDF |
| **Thumb navigation** | Glass `BottomNav` on five hub routes, safe-area tokens, Android back behavior |
| **UX / QA** | `docs/UI_FIELD_CONSTRAINTS.md`, connectivity copy, vault data transparency |
| **Premium** | `docs/PREMIUM_ENTITLEMENTS.md`, `docs/PREMIUM_PRICING.md` |

To see only post-submission commits:

```bash
git log v1.0-challenge-submission..main --oneline
```

---

## GCP stack (Track 2: Optimize)

| Component | Service |
|-----------|---------|
| PWA + Android shell | React 19, Vite, Capacitor 8 → **Firebase Hosting** |
| API + agents | **Cloud Functions Gen 2** (Node 22) — ADK, MCP, expedition pipeline |
| Live voice | **Cloud Run** — `hidden-agent-worker` |
| Data | **Firestore**, Cloud Storage, Firebase Auth, FCM |
| AI | **Google ADK**, Gemini 2.5 Flash/Pro, MCP stdio catalog server |

**Optimize highlights:** on-demand RAG (no full KB per turn), persistent ADK sessions, department-scoped MCP, deterministic expedition validation, offline SQLite packs, legacy SDK fallback if ADK fails.

---

## Secrets and deployment

API keys are **not** in this repository. Configure locally:

| File | Purpose |
|------|---------|
| `.env.local` | Firebase web client config |
| `functions/.env` | Gemini, Maps, weather provider keys |
| `agent-worker/.env` | LiveKit, Google API key |

Production secrets live in **Firebase Secrets** / GCP. See [README.md](../README.md) § Deploy.

---

## Questions for judges

1. **Which version should I run?** → Tag `v1.0-challenge-submission` or branch `submission`.
2. **Is `main` ahead of the submission?** → Yes, by design — active startup development after June 11.
3. **Where is the demo?** → Live URL + guest mode + YouTube link above (Devpost submission).

---

*Hidden App · Expedition-tech for remote tourism in Colombia.*
