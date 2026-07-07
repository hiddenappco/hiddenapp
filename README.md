# Hidden App — Expedition Tech Platform

**Hidden App** is an expedition-tech platform for explorers and travelers in Colombia. It combines hyperlocal AI guides, live environmental monitoring, off-grid tools, and community-first tourism — built as a React PWA with a Capacitor Android shell and a Firebase / Google Cloud backend.

**Live app:** https://gen-lang-client-0040858908.web.app  
**Product overview video:** https://www.youtube.com/watch?v=cTfFi36K3qI

**Session log (internal, ES):** [`docs/SESION_TRABAJO.md`](./docs/SESION_TRABAJO.md)

---

## Mission

Hidden App connects adventurers with remote destinations that mainstream platforms often overlook. Through the **Hidden Pact** (*Pacto Hidden*), the platform aims to keep economic value with local guides and communities rather than extractive intermediaries.

---

## What the app does

| Area | Description |
|------|-------------|
| **Hidden Pact (onboarding)** | Mandatory first-session gate (`PactGate` → `/pact`); `users.pactAccepted` in Firestore; decline → logout only; re-readable from Settings → Legal |
| **Settings hub (T22)** | `/settings` hub with role-based rows (`useSettingsAccess`); `/settings/app` (theme, language, coach marks, legal, FAQ); `/settings/profile` (account only); `appPrefs` synced to Firestore |
| **Legal & FAQ v4.0** | `locales/legalContent.ts`; `/terms`, `/privacy`, `/faq`; accordion shell (`LegalPageShell`) |
| **Product manuals** | In-screen guides (vault-style): trip ledger (`TripLedgerManual`), environmental monitor (`EnvironmentalManual`), expedition planner (`ExpeditionPlannerManual`) — bilingual ES/EN, no extra routes |
| **Destination access times** | Editorial `TIEMPOS DE ACCESO` / `ACCESS TIMES` in `planningNotes`; chips in destination detail (`DestinationAccessTimes`) |
| **Packing checklist** | Interactive per-item toggles on destination ficha (`DestinationPacking`); `localStorage` per `destinationId` (`utils/packingChecklist.ts`) |
| **ESG / direct community** | `DirectCommunityBadge` on destination/refugio when `porcentaje_anfitrion` verified; agents via `directCommunity`; block in expedition PDF for refugio nights. **P2-ESG-01 (Jul 2026):** bitácora tags coupon redemptions at verified refugios (`Expense.directCommunity`); Cloud Function `onTripExpenseWritten` → `esg_direct_injections` + `esg_monthly_totals`; profile card `DirectCommunityImpact`; Analytics `direct_economic_injection`; monthly script `npm run report:direct-injection` |
| **Refugio notifications** | Cloud Function `onNewRefugio`; pref `refugios` in notification settings (default ON) |
| **Guest retention** | `scheduledGuestCleanup` (daily 05:00 Bogotá) — deletes inactive anonymous guests ≥30 days; `lastActiveAt` on session |
| **Hyperlocal chat** | Department-scoped text agent; catalog tools return **`planningNotes`** when present; multi-day trips → expedition hub |
| **Environmental Ranger** | Live weather, AQI, elevation, marine telemetry + localized destination ficha (**`planningNotes`**) — also callable as a chat tool |
| **Expedition Planner** | Dedicated hub (`/expedition/plan`) with department picker + **5-step wizard**; **«Mis planes anteriores»** (20 plans, real-time list); multi-agent pipeline grounded in catalog fichas including **`planningNotes`**, `groundMobility`, Google Routes legs (up to 45), coupon widgets, COP budget, mobility badge in result + expedition PDF |
| **Modo Live** | Full-duplex voice via LiveKit + Gemini Multimodal Live; token and usage quota via authenticated Cloud Functions (`generateLiveKitToken`, `recordLiveCallSeconds`) |
| **Off-Grid Vault** | Downloadable department packs (SQLite) for offline search and chat; optional **MediaPipe Gemma 2B IT GPU** (~1.29 GB, Wi‑Fi) for on-device conversational chat (WebGPU). Install: streamed download+save with overall progress bar, **format validation** (`assertLooksLikeGemmaModel` — corrupt installs auto-invalidated). Uninstall: confirmation modal + verified progress bar |
| **Trip ledger (Bitácora v2)** | Solo trips free; group trips Premium (`tripCode`, roles owner/editor/observer). COP canonical ledger with multi-currency entry (COP/USD/EUR), TRM-backed rates, Tricount-style splits and balances, offline outbox (IndexedDB **v4**, stores `documents` + expenses) + sync on reconnect, **completed-trip history offline** (mirror up to 10), **group activity feed** (`trips/{id}/activity`), **offline conflict hint** on group trips (`TripConflictHint`), lazy **`memberIds` backfill** for legacy docs, bilingual trip PDF, **trip documents** (rename + upload; Premium), **ESG coupon redemption tagging** on lodging expenses (Jul 2026) |
| **Catalog search** | Relevance-ranked picker search (`rankLocalizedSearch`) on Monitor, Destinations, Refugios, Coupons, News, and expedition must-visit — title/name/location only; accent-insensitive multi-word queries |
| **Guest upgrade** | Anonymous guest links Google or email/password in Profile Settings without changing UID (`linkWithCredential`); `isGuest: false`; tier follows Free/Premium rules |
| **Premium** | `/premium` — **Baymard-style 3-column matrix** (Free · Pase Viaje · VIP): sticky headers/CTAs, per-row `?` tooltips + demo deep-links; prices in `config/premiumPricing.ts` ($4.99 / $7.99 / $79.99 / $149.99). **Paywall ROI** (`utils/paywallRoi.ts`, `PaywallRoiBanner`) in trip ledger, destination PDF gate, and `/premium` (last-visited department). Store checkout disabled until Play/App Store (`PREMIUM_CHECKOUT_ENABLED`) |
| **Exchange rates** | Daily official TRM (datos.gov.co) + EUR cross-rate; `getExchangeRates` + `scheduledExchangeRates` cache in `config/exchangeRates` |
| **i18n** | Spanish / English UI, bilingual Firestore content (`*_en` fields), and bilingual trip PDF export |
| **Thumb navigation** | Floating glass bottom bar on 5 hub routes (Destinations · Monitor · Departments · Ledger · Refuges); full catalog in the lateral drawer; safe-area spacing on iOS/Android |

---

## Repository layout

| Path | Description |
|------|-------------|
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
        OFF[Offline packs sql.js<br/>MediaPipe Gemma optional]
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
        A4[Off-Grid local RAG + Gemma]
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
| **AI (offline)** | sql.js packs, local RAG; **MediaPipe Gemma 2B IT GPU int4** (`@mediapipe/tasks-genai`, WebGPU) — optional ~1.29 GB install via streaming to Capacitor filesystem (`gemmaModelStore.ts`); guided-search fallback without model |
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
| `.env.local` (root) | Firebase web client config; optional `VITE_GEMMA_MODEL_URL` |
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
# Prefer targeted deploys (Jun 2026 — avoid full `functions` batch if Cloud Run CPU quota errors)
npm run build
cd functions && npm run build && cd ..
firebase deploy --only hosting,firestore:rules,firestore:indexes,storage
firebase deploy --only functions:scheduledGuestCleanup   # guest TTL cron
firebase deploy --only functions:onNewRefugio            # lodging (refugio) notifications
firebase deploy --only functions:createExpedition        # expedition quota / premium plan
# …or one function at a time for anything else touched

# Expedition planner iteration
firebase deploy --only functions:createExpedition,functions:onExpeditionCreate

# ESG direct economic injection (Jul 2026)
firebase deploy --only functions:onTripExpenseWritten
cd functions && npm run report:direct-injection -- --month YYYY-MM --verify

# Trip ledger — TRM + bilingual trip PDF
firebase deploy --only functions:getExchangeRates,functions:scheduledExchangeRates,functions:generateTripPdf

# Live voice worker
cd agent-worker && gcloud run deploy hidden-agent-worker --source . --region us-central1
```

**Production:** https://gen-lang-client-0040858908.web.app — deploy Cloud Functions **one at a time** if you hit `Quota exceeded for total allowable CPU per project per region` on Cloud Run (Jun 2026 lesson).

---

## Documentation in this repository

| Document | Content |
|----------|---------|
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | System diagrams, ADK orchestration, agents, client navigation, deployment |
| [docs/UI_FIELD_CONSTRAINTS.md](./docs/UI_FIELD_CONSTRAINTS.md) | Touch targets, thumb-zone bar, safe-area tokens, tooltips P0 (P0 QA checklist) |
| [docs/UNIT_ECONOMICS_EN.md](./docs/UNIT_ECONOMICS_EN.md) | **Business model & unit economics** — pricing, B2B ($15/mo · $150/yr), market, projections (EN) |
| [docs/UNIT_ECONOMICS_ES.md](./docs/UNIT_ECONOMICS_ES.md) | **Modelo de negocio y unit economics** — misma política B2B, mercado Colombia/LATAM (ES) |
| [docs/PREMIUM_ENTITLEMENTS.md](./docs/PREMIUM_ENTITLEMENTS.md) | Feature matrix by tier — Guest · Free · Premium; Baymard `/premium` UX; paywall ROI; ESG profile metric |
| [docs/AUDITORIA_28-06_ANALISIS_Y_BACKLOG.md](./docs/AUDITORIA_28-06_ANALISIS_Y_BACKLOG.md) | Product audit & prioritized backlog (ES) |
| [docs/SESION_TRABAJO.md](./docs/SESION_TRABAJO.md) | Session log — latest product work (Spanish, internal); **synced to official docs Jul 6, 2026** |
| [roadmap_integraciones.md](./roadmap_integraciones.md) | Integration roadmap — tasks & completion status |
| [public/architecture.html](./public/architecture.html) | Standalone architecture page (also deployed on Hosting) |
| [LICENSE](./LICENSE) | License terms |
| [COPYRIGHT.txt](./COPYRIGHT.txt) | Copyright notice |

Internal roadmaps and financial dossiers may exist locally but are not required to run or evaluate the app.

---

## License

See [LICENSE](./LICENSE) and [COPYRIGHT.txt](./COPYRIGHT.txt).

---

*Hidden App · Expedition-tech for remote tourism in Colombia.*
