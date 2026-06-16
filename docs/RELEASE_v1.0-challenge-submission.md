# GitHub Release notes — copy/paste into Releases UI

**Tag:** `v1.0-challenge-submission`  
**Title:** `Challenge submission — Track 2: Optimize (June 11, 2026)`

Create at: https://github.com/hiddenappco/hiddenapp/releases/new?tag=v1.0-challenge-submission

---

## Official submission snapshot

**Google for Startups AI Agents Challenge — Track 2: Optimize**

| | |
|---|---|
| **Commit** | `709f760` (June 11, 2026, 3:35 PM -0500) |
| **Branch** | [`submission`](https://github.com/hiddenappco/hiddenapp/tree/submission) |
| **Live app** | https://gen-lang-client-0040858908.web.app — tap **Explore as guest** |
| **Demo video** | https://www.youtube.com/watch?v=cTfFi36K3qI |
| **Full guide** | [docs/SUBMISSION.md](https://github.com/hiddenappco/hiddenapp/blob/v1.0-challenge-submission/docs/SUBMISSION.md) |

### Checkout

```bash
git clone https://github.com/hiddenappco/hiddenapp.git
cd hiddenapp
git checkout v1.0-challenge-submission
npm install && cd functions && npm install && cd .. && cd agent-worker && npm install && cd ..
```

Configure `.env` files per README (secrets are not in the repo).

### What this snapshot includes

- **Hyperlocal chat** — Google ADK, Agentic RAG, MCP catalog tools, persistent Firestore sessions
- **Environmental Ranger** — structured telemetry; `getLiveConditions` agent-as-a-tool from chat
- **Off-Grid Vault** — department SQLite packs, local RAG, bilingual catalog
- **Modo Live** — LiveKit + Gemini Multimodal Live on Cloud Run
- **Guest mode** + Firebase ID token verification on cloud agents
- **i18n** — ES/EN UI and bilingual Firestore fields

### Track 2: Optimize highlights

- On-demand RAG (no full knowledge-base dump per turn)
- Persistent ADK sessions (`FirestoreSessionService`)
- Department-scoped MCP toolset
- Legacy Gemini SDK fallback if ADK fails
- Offline SQLite packs for edge use

### Post-submission development

Active product work continues on [`main`](https://github.com/hiddenappco/hiddenapp/tree/main) (expedition hub, Bitácora v2, thumb navigation, and more). Compare:

```bash
git log v1.0-challenge-submission..main --oneline
```
