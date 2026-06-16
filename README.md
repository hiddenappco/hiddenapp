# Hidden App — Expedition Tech Platform

## Challenge submission status

**Google for Startups AI Agents Challenge — Track 2: Optimize**

| | |
|---|---|
| **Official submission snapshot** | Git tag [`v1.0-challenge-submission`](https://github.com/hiddenappco/hiddenapp/tree/v1.0-challenge-submission) · commit [`709f760`](https://github.com/hiddenappco/hiddenapp/commit/709f760efa90751731232a2555eea17c9cb46ff4) · June 11, 2026 |
| **Same snapshot (branch)** | [`submission`](https://github.com/hiddenappco/hiddenapp/tree/submission) |
| **Release notes** | [GitHub Release — v1.0-challenge-submission](https://github.com/hiddenappco/hiddenapp/releases/tag/v1.0-challenge-submission) |
| **Full guide for judges** | [docs/SUBMISSION.md](./docs/SUBMISSION.md) |
| **Active development** | Branch [`main`](https://github.com/hiddenappco/hiddenapp/tree/main) — post-submission product work (expedition hub, Bitácora v2, thumb navigation, docs) |

### Quick start for judges

1. **Try the app (no install):** [Live PWA](https://gen-lang-client-0040858908.web.app) → tap **Explore as guest** on the login screen.  
2. **Demo video (Devpost):** https://www.youtube.com/watch?v=cTfFi36K3qI  
3. **Audit submission code:**

```bash
git clone https://github.com/hiddenappco/hiddenapp.git
cd hiddenapp
git checkout v1.0-challenge-submission   # or: git checkout submission
npm install && cd functions && npm install && cd .. && cd agent-worker && npm install && cd ..
# Configure .env files — see § Environment below (keys are not in the repo)
npm run dev
```

4. **See what shipped after the challenge:**

```bash
git checkout main
git log v1.0-challenge-submission..main --oneline
```

> **Note:** `main` is intentionally ahead of the submission tag. The tag preserves the exact codebase at challenge close; `main` reflects ongoing startup development toward commercial launch.

---

**Hidden App** is an expedition-tech platform for explorers and travelers in Colombia. It combines hyperlocal AI guides, live environmental monitoring, off-grid tools, and community-first tourism — built as a React PWA with a Capacitor Android shell and a Firebase / Google Cloud backend.

**Live app:** https://gen-lang-client-0040858908.web.app

---

## Mission

Hidden App connects adventurers with remote destinations that mainstream platforms often overlook. Through the **Hidden Pact** (*Pacto Hidden*), the platform aims to keep economic value with local guides and communities rather than extractive intermediaries.

---

## What the app does

| Area | Description |
|------|-------------|
| **Hyperlocal chat** | Department-scoped text agent; catalog tools return **`planningNotes`** when present; multi-day trips → expedition hub |
| **Environmental Ranger** | Live weather, AQI, elevation, marine telemetry + localized destination ficha (**`planningNotes`**) — also callable as a chat tool |
| **Expedition Planner** | Dedicated hub (`/expedition/plan`) with department picker + **5-step wizard** (dedicated ground-transport step); multi-agent pipeline grounded in catalog fichas including **`planningNotes`**, `groundMobility`, Google Routes legs (up to 45), coupon widgets, COP budget, mobility badge in result + expedition PDF |
| **Modo Live** | Full-duplex voice via LiveKit + Gemini Multimodal Live |
| **Off-Grid Vault** | Downloadable department packs (SQLite) for offline search and chat |
| **Trip ledger (Bitácora v2)** | Solo trips free; group trips Premium (`tripCode`, roles owner/editor/observer). COP canonical ledger with multi-currency entry (COP/USD/EUR), TRM-backed rates, Tricount-style splits and balances, offline outbox (IndexedDB) + sync on reconnect, bilingual trip PDF |
| **Exchange rates** | Daily official TRM (datos.gov.co) + EUR cross-rate; `getExchangeRates` + `scheduledExchangeRates` cache in `config/exchangeRates` |
| **i18n** | Spanish / English UI, bilingual Firestore content (`*_en` fields), and bilingual trip PDF export |
| **Thumb navigation** | Floating glass bottom bar on 5 hub routes (Destinations · Monitor · Departments · Ledger · Refuges); full catalog in the lateral drawer; safe-area spacing on iOS/Android |

---

## Repository layout (Git)

```
main                          ← latest product code (default branch)
submission                    ← frozen at challenge close (same as tag)
v1.0-challenge-submission     ← immutable tag on 709f760 (Jun 11, 2026)
```

| Path | Description |
|------|-------------|
| [`docs/SUBMISSION.md`](./docs/SUBMISSION.md) | Challenge snapshot vs `main`, checkout commands, GCP stack summary |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | System diagrams, ADK, agents, client navigation, deployment |
| [`docs/UI_FIELD_CONSTRAINTS.md`](./docs/UI_FIELD_CONSTRAINTS.md) | Touch targets, thumb-zone bar, safe-area tokens |
| `components/` | React UI (PWA + Capacitor) |
| `functions/src/` | Cloud Functions source (ADK, APIs) — build output `functions/lib/` is gitignored |
| `agent-worker/` | Cloud Run Live voice worker |

---

## Architecture

Public documentation in this repository and on Hosting:

| Resource | Link |
|----------|------|
| **Architecture diagrams (web)** | https://gen-lang-client-0040858908.web.app/architecture.html |
| **Architecture diagrams (source)** | [public/architecture.html](./public/architecture.html) |
| **Demo video** | https://www.youtube.com/watch?v=cTfFi36K3qI |
| **System architecture (markdown)** | [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) |

```mermaid
flowchart LR
    subgraph Client["Client — React PWA · Capacitor"]
        UI[UI + hooks]
        EXPH[Expedition hub · wizard · result]
        OFF[Offline packs sql.js]
    end

    subgraph GCP["Firebase / GCP us-central1"]
        HOST[Hosting]
        FS[(Firestore)]
        CFN[Cloud Functions Node 22]
        ADK[ADK · persistent sessions]
        EXP[createExpedition + onExpeditionCreate]
        RUN[Cloud Run agent-worker]
    end

    subgraph Agents["AI agents by departmentId"]
        A1[Text chat · ADK RAG]
        A2[Voice Live · LiveKit]
        A3[Ranger · telemetry + chat tool]
        A5[Expedition pipeline · 4 LlmAgents]
        A4[Off-Grid local RAG]
    end

    UI --> HOST
    UI --> CFN
    UI --> RUN
    EXPH --> CFN
    CFN --> ADK
    ADK --> FS
    CFN --> EXP
    EXP -.-> A5
    FS -.->|onSnapshot| EXPH
    RUN --> FS
    OFF -.-> A4
    CFN -.-> A1
    RUN -.-> A2
    CFN -.-> A3
```

### Text agents (Google ADK)

`chatAgent`, `environmentalAgent`, and the expedition planner run on the [Agent Development Kit](https://adk.dev/) (`@google/adk`):

- **Agentic RAG** — Firestore catalog via `FunctionTool` on demand (not a full KB dump per message)
- **MCP** — Stdio server exposing `hidden_get_*` catalog tools; `MCPToolset` cached per department and clamped server-side
- **Persistent sessions** — `FirestoreSessionService` gives the chat native multi-turn memory across function invocations
- **Agent-as-a-tool** — `getLiveConditions` runs the Ranger as a sub-agent inside a chat turn (live telemetry + tactical analysis)
- **Multi-agent expedition planner** — Trip Planner hub (`/expedition/plan` → 5-step wizard with **`groundMobility`** → `createExpedition`); background pipeline (curator → logistics → budget → writer) uses full catalog fichas + **`planningNotes`**; validated ids, Google Routes legs, coupon widgets, mobility badge + PDF, live progress via `onSnapshot` on `expeditions/{id}`. Chat redirects multi-day trips to the hub; `planExpedition` requires mobility when used from chat
- **Structured JSON** — Stable `message`, `widgets`, and `telemetry` responses
- **Resilience** — Legacy Gemini SDK fallback if ADK fails; PWA contract unchanged

Live voice uses **Cloud Run** (`hidden-agent-worker`) with LiveKit — separate from the text ADK stack.

---

## Tech stack

| Layer | Technologies |
|-------|----------------|
| **Frontend** | React 19, Vite, TypeScript, Tailwind CSS, Framer Motion, Capacitor 8 |
| **Backend** | Firebase (Auth, Firestore, Hosting, Functions Gen 2, FCM, Storage) |
| **AI (cloud text)** | Google ADK, Gemini 2.5 Flash + Pro (expedition curator/logistics/budget), MCP |
| **AI (voice)** | LiveKit, Gemini Multimodal Live, `@livekit/agents` |
| **AI (offline)** | sql.js packs, local RAG; optional Gemma on-device (roadmap) |
| **Telemetry** | AccuWeather, Open-Meteo, Google AQI, Stormglass (coastal), Google Routes |

---

## Key integrations

- **AccuWeather** — Primary weather telemetry  
- **Open-Meteo** — AQI, cloud cover, elevation  
- **Stormglass** — Marine data for coastal destinations (`isCoastal`)  
- **Google Routes API** — `checkRouteStatus` for traffic, tolls, and ETAs  
- **Rowy CMS** — Editorial content into Firestore  
- **datos.gov.co TRM** — Official COP/USD rate for trip ledger and currency converter  
- **Frankfurter** — USD→EUR cross-rate for multi-currency expenses  
- **RevenueCat** — Premium membership (native); web uses test flow for development — required for **group** trip create/join  

API keys are stored in **Firebase Secrets** and local `.env` files (not committed to the repository).

`chatAgent` and `environmentalAgent` require a valid **Firebase ID token** (`Authorization: Bearer …`); the client never trusts a spoofed `userId` in the request body.

---

## Getting started

### Prerequisites

- Node.js 18+ (Functions target Node 22)
- Firebase CLI (`npm install -g firebase-tools`)
- Google Cloud SDK (`gcloud`) for Cloud Run worker deploys

### Install

```bash
git clone https://github.com/hiddenappco/hiddenapp.git
cd hiddenapp

npm install

cd functions && npm install && cd ..
cd agent-worker && npm install && cd ..
```

### Environment

Copy templates and configure secrets locally:

| Location | Purpose |
|----------|---------|
| `.env.local` (root) | Firebase web client config |
| `functions/.env` | `GEMINI_API_KEY`, `GOOGLE_MAPS_API_KEY`, `ACCUWEATHER_API_KEY`, `STORMGLASS_API_KEY` |
| `agent-worker/.env` | `LIVEKIT_*`, `GOOGLE_API_KEY` |

See `functions/.env.example` where available. Never commit real keys.

### Development

```bash
# Frontend dev server
npm run dev

# Build PWA
npm run build

# Build Cloud Functions
cd functions && npm run build
```

### Deploy

```bash
# Cloud Functions (chatAgent, environmentalAgent, createExpedition, onExpeditionCreate, packs, cron, etc.)
cd functions && npm run build && cd ..
firebase deploy --only functions

# Expedition planner only (faster iteration)
firebase deploy --only functions:createExpedition,functions:onExpeditionCreate

# Trip ledger — TRM cache + bilingual trip PDF
firebase deploy --only functions:getExchangeRates,functions:scheduledExchangeRates,functions:generateTripPdf

# Firestore rules + indexes (group trips: memberIds array-contains)
firebase deploy --only firestore:indexes,firestore:rules

# Static PWA
firebase deploy --only hosting

# Live voice worker
cd agent-worker
gcloud run deploy hidden-agent-worker --source . --region us-central1
```

---

## Documentation in this repository

| Document | Content |
|----------|---------|
| [docs/SUBMISSION.md](./docs/SUBMISSION.md) | **Challenge snapshot** — tag, branch, checkout, post-submission changelog |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | System diagrams, ADK orchestration, agents, client navigation, deployment |
| [docs/UI_FIELD_CONSTRAINTS.md](./docs/UI_FIELD_CONSTRAINTS.md) | Touch targets, thumb-zone bar, safe-area tokens (P0 QA checklist) |
| [docs/PREMIUM_PRICING.md](./docs/PREMIUM_PRICING.md) | Premium plans, pricing ladder (Jun 2026) |
| [docs/PREMIUM_ENTITLEMENTS.md](./docs/PREMIUM_ENTITLEMENTS.md) | Feature matrix by tier — Guest · Free · Premium (Jun 2026) |
| [public/architecture.html](./public/architecture.html) | Standalone architecture page (also deployed on Hosting) |
| [LICENSE](./LICENSE) | License terms |
| [COPYRIGHT.txt](./COPYRIGHT.txt) | Copyright notice |

Internal roadmaps and financial dossiers may exist locally but are not required to run or evaluate the app.

---

## License

See [LICENSE](./LICENSE) and [COPYRIGHT.txt](./COPYRIGHT.txt).

---

*Hidden App · Expedition-tech for remote tourism in Colombia.*
