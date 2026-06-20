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
| **Trip ledger (Bitácora v2)** | Solo/group trips, TRM rates, offline outbox, group splits, **activity feed**, bilingual trip PDF |
| **Catalog search** | Relevance-ranked picker search across Monitor, Destinations, Refugios, Coupons, News |
| **Guest upgrade** | Link anonymous guest to Google/email without UID change (`ProfileSettings`) |
| **Thumb navigation** | Glass `BottomNav` on five hub routes, safe-area tokens, Android back behavior |
| **UX / QA** | `docs/UI_FIELD_CONSTRAINTS.md`, connectivity copy, vault data transparency |
| **Premium** | `docs/PREMIUM_ENTITLEMENTS.md`, `docs/UNIT_ECONOMICS_EN.md` (public business model for judges) |
| **Hardening (Jun 18)** | Premium quotas server-side, expedition revisions, trip history cap, lazy routes, i18n EN parity |
| **Product sprint (Jun 18–20)** | Premium page USD + tooltips; coach marks; bitácora historial offline; Gemma MediaPipe; Ranger ∞ Premium; group activity feed; catalog search ranking; guest account upgrade; deploy full stack |

### Changelog (post-tag, `main`)

| Date | Commit | Summary |
|------|--------|---------|
| 2026-06-20 | `main` | **Sprint cierre 20 jun:** feed actividad viajes grupales (`trips/{id}/activity`, `TripActivityFeed`, mirror offline). Ranking búsqueda catálogo (`rankLocalizedSearch` — Monitor, Destinos, Refugios, Cupones, Noticias, picker expedición). Upgrade invitado→cuenta oficial sin cambiar UID. ID copiable en perfil. CTA «Planificar aquí» en briefing departamento (planificador 2 toques). Política B2B USD 15/mo · 150/yr (`UNIT_ECONOMICS_ES`). Deploy hosting + Firestore rules. |
| 2026-06-18 | [`6be25ec`…`main`](https://github.com/hiddenappco/hiddenapp/compare/6be25ec...main) | **Pre-judging hardening:** Premium gates & quotas (Live trial 5 min, expedition hub 1/3, Ranger 5/10 daily) enforced in Cloud Functions + Firestore rules; expedition revision pipeline with included revision + quota consume; fix cascading free revisions; trip history capped at 10; PDF/LiveKit premium checks; lazy-loaded routes + Suspense; EN locale parity; public `UNIT_ECONOMICS_EN.md`; sensitive financial docs gitignored |
| 2026-06-11 | [`cb77f91`](https://github.com/hiddenappco/hiddenapp/commit/cb77f91) | Expedition hub, Bitácora v2, thumb nav, submission docs |
| 2026-06-11 | [`1cc398c`](https://github.com/hiddenappco/hiddenapp/commit/1cc398c) | GitHub Release draft notes for `v1.0-challenge-submission` |
| 2026-06-16 | [`6c85652`](https://github.com/hiddenappco/hiddenapp/commit/6c85652) | **Live security:** Firebase token on `generateLiveKitToken`; `recordLiveCallSeconds` server-side; Firestore blocks client `liveCallUsage` writes |
| 2026-06-16 | [`ef710b5`](https://github.com/hiddenappco/hiddenapp/commit/ef710b5) | **Expedition:** must-visit by doc id, writer guards, travel-leg chaining, MIN_DAYS fix, coupon/PDF hardening |
| 2026-06-16 | [`6a6aa34`](https://github.com/hiddenappco/hiddenapp/commit/6a6aa34) | **Bitácora:** join-by-code data read, offline outbox after id remap, expense mirror deletes |
| 2026-06-16 | [`fed6187`](https://github.com/hiddenappco/hiddenapp/commit/fed6187) | **Off-Grid:** reconnect pack listener on connectivity change; close sql.js on errors |
| 2026-06-16 | [`7650843`](https://github.com/hiddenappco/hiddenapp/commit/7650843) | **Environmental:** valid lat/lng `0`; no native shield auto-deactivate on background |
| 2026-06-16 | [`96136b5`](https://github.com/hiddenappco/hiddenapp/commit/96136b5) | **Client:** BottomNav types, `useCoupon` loading, PDF export error body |
| 2026-06-16 | [`5e0e70c`](https://github.com/hiddenappco/hiddenapp/commit/5e0e70c) | **MCP:** do not clear global availability on transient catalog toolset failure |
| 2026-06-16 | [`1c238c4`](https://github.com/hiddenappco/hiddenapp/commit/1c238c4) | **Live worker:** news title `title` with legacy `tittle` fallback |
| 2026-06-17 | [`6be25ec`](https://github.com/hiddenappco/hiddenapp/commit/6be25ec) | Post-submission changelog; Live quota architecture docs |

Deployed to production (Jun 16–20): Cloud Functions (full stack), Hosting, `firestore.rules` + indexes, Storage rules, and `hidden-agent-worker`.

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
