# Hidden App — Expedition Tech Platform

> **Hackathon judges:** Open the [live app](https://gen-lang-client-0040858908.web.app) or install the APK, then tap **Explore as guest** on the login screen for full access without sign-up. Demo video: https://www.youtube.com/watch?v=cTfFi36K3qI

**Hidden App** is an expedition-tech platform for explorers and travelers in Colombia. It combines hyperlocal AI guides, live environmental monitoring, off-grid tools, and community-first tourism — built as a React PWA with a Capacitor Android shell and a Firebase / Google Cloud backend.

**Live app:** https://gen-lang-client-0040858908.web.app

---

## Mission

Hidden App connects adventurers with remote destinations that mainstream platforms often overlook. Through the **Hidden Pact** (*Pacto Hidden*), the platform aims to keep economic value with local guides and communities rather than extractive intermediaries.

---

## What the app does

| Area | Description |
|------|-------------|
| **Hyperlocal chat** | Department-scoped text agent with persistent memory and rich widgets (destinations, coupons, refugios, events, news) |
| **Environmental Ranger** | Live weather, AQI, elevation, and marine telemetry with tactical safety analysis — also callable as a chat tool |
| **Expedition Planner** | Multi-agent pipeline (curator → logistics → writer) that builds day-by-day itineraries from verified catalog data with real Google Routes legs |
| **Modo Live** | Full-duplex voice via LiveKit + Gemini Multimodal Live |
| **Off-Grid Vault** | Downloadable department packs (SQLite) for offline search and chat |
| **Trips & PDF** | Expense log and expedition summary export |
| **i18n** | Spanish / English UI and bilingual Firestore content (`*_en` fields) |

---

## Architecture

- **Architecture diagrams (dedicated web):** https://gen-lang-client-0040858908.web.app/architecture.html  
- **Demo video:** https://www.youtube.com/watch?v=cTfFi36K3qI  
- **System architecture:** [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)  
- **Technical dossier (ES):** [TECHNICAL_DOCUMENTATION.md](./TECHNICAL_DOCUMENTATION.md)  
- **Integration roadmap (ES):** [roadmap_integraciones.md](./roadmap_integraciones.md)

```mermaid
flowchart LR
    subgraph Client["Client — React PWA · Capacitor"]
        UI[UI + hooks]
        EXPW[Live expedition widget]
        OFF[Offline packs sql.js]
    end

    subgraph GCP["Firebase / GCP us-central1"]
        HOST[Hosting]
        FS[(Firestore)]
        CFN[Cloud Functions Node 22]
        ADK[ADK · persistent sessions]
        EXP[onExpeditionCreate trigger]
        RUN[Cloud Run agent-worker]
    end

    subgraph Agents["AI agents by departmentId"]
        A1[Text chat · ADK RAG]
        A2[Voice Live · LiveKit]
        A3[Ranger · telemetry + chat tool]
        A5[Expedition pipeline · 3 LlmAgents]
        A4[Off-Grid local RAG]
    end

    UI --> HOST
    UI --> CFN
    UI --> RUN
    CFN --> ADK
    ADK --> FS
    FS --> EXP
    EXP -.-> A5
    FS -.->|onSnapshot| EXPW
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
- **Multi-agent expedition planner** — `planExpedition` enqueues a background pipeline (curator → logistics → writer) grounded in verified catalog data with real Google Routes legs, streamed live to a chat widget
- **Structured JSON** — Stable `message`, `widgets`, and `telemetry` responses
- **Resilience** — Legacy Gemini SDK fallback if ADK fails; PWA contract unchanged

Live voice uses **Cloud Run** (`hidden-agent-worker`) with LiveKit — separate from the text ADK stack.

---

## Tech stack

| Layer | Technologies |
|-------|----------------|
| **Frontend** | React 19, Vite, TypeScript, Tailwind CSS, Framer Motion, Capacitor 8 |
| **Backend** | Firebase (Auth, Firestore, Hosting, Functions Gen 2, FCM, Storage) |
| **AI (cloud text)** | Google ADK, Gemini 2.5 Flash, MCP |
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
- **RevenueCat** — Premium membership (native); web uses test flow for development  

API keys are stored in **Firebase Secrets** and local `.env` files (not committed to the repository).

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
# Cloud Functions (chatAgent, environmentalAgent, packs, cron, etc.)
cd functions && npm run build && cd ..
firebase deploy --only functions

# Static PWA
firebase deploy --only hosting

# Live voice worker
cd agent-worker
gcloud run deploy hidden-agent-worker --source . --region us-central1
```

---

## Documentation map

| Document | Content |
|----------|---------|
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Diagrams, ADK orchestration, deployment |
| [TECHNICAL_DOCUMENTATION.md](./TECHNICAL_DOCUMENTATION.md) | Full engineering dossier (Spanish) |
| [docs/TAREA_2_ARQUITECTURA_BILINGUE.md](./docs/TAREA_2_ARQUITECTURA_BILINGUE.md) | Bilingual architecture guide |
| [TAREA_4_ARQUITECTURA_OFFLINE_DUAL.md](./TAREA_4_ARQUITECTURA_OFFLINE_DUAL.md) | Off-Grid dual-mode architecture |
| [roadmap_integraciones.md](./roadmap_integraciones.md) | Product integration roadmap |

---

## License

See [LICENSE](./LICENSE) and [COPYRIGHT.txt](./COPYRIGHT.txt).

---

*Hidden App · Expedition-tech for remote tourism in Colombia.*
