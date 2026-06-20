# Hidden App — Business Model & Unit Economics (Jun 2026)

Public overview of how Hidden App creates and captures value. This is the judge / investor facing
summary of our business model and unit-economics philosophy. All figures in **USD**.

> **Status (Jun 2026):** pricing and product limits are **finalized and implemented in code**.
> Store billing (App Store / Play Store / RevenueCat) is the remaining operational step.

---

## 1. Executive summary

Hidden App is a hyperlocal travel companion for Colombia's hidden, nature-first destinations
(hostels, glampings, coffee farms, eco-lodges, camping). We pair an AI hyperlocal agent with verified
local catalog data, offline survival tooling, and a multi-agent trip planner.

We monetize through **two complementary revenue lines**:

1. **B2C Premium (subscriptions)** — four plans on top of a generous Free tier.
2. **B2B SaaS (Verified Refuge)** — a monthly fee for eco-lodging hosts who want verified status,
   priority in AI recommendations, and the right to publish VIP coupons to travelers.

| Pillar | What it is | Headline |
|--------|-----------|----------|
| **B2C Premium** | Traveler subscriptions | Blended ARPU **~$7.33/mo** |
| **B2B Verified Refuge** | Host SaaS subscription | **$10/mo** per host · billed direct (web) |
| **Market (B2B, Colombia)** | Eco / nature lodging | TAM **~5,000** properties |
| **Gross margin target** | Software product | **≥70%** at store rates · higher via direct/web |

**Strategic edge — the "B2B shield":** B2B host revenue is structurally **decoupled** from traveler
acquisition cost. As host density grows territory by territory, B2B income offsets the cost of serving
free travelers, so Premium subscriptions increasingly flow to net profit rather than to covering
infrastructure.

---

## 2. The problem & opportunity

- Colombia's best nature destinations are **fragmented and poorly digitized** — travelers lack
  reliable, real-time, hyperlocal information (logistics, safety, weather, coupons, lodging).
- Local hosts (small eco-lodges, glampings, family farms) have **little affordable digital reach**.
- Generic AI assistants **hallucinate** local details; Hidden grounds every answer in a **verified
  catalog** maintained per territory.

Hidden sits at the intersection: a trusted hyperlocal layer travelers pay for, and a distribution
channel hosts pay to be discovered in.

---

## 3. B2C — Premium subscriptions

Same Premium feature set across all paid plans; only **duration** and the **AI planner quota** vary.

| Plan | Price (USD) | Notes |
|------|-------------|-------|
| **Trip Pass** | **$4.99** / 10 days | One-off, no renewal — built for a single trip. |
| **Monthly** | **$7.99** / mo | Full flexibility. |
| **Annual** | **$79.99** / yr | ~$6.67/mo effective — **2 months free** vs. monthly. |
| **Lifetime** | **$149.99** once | Founders edition, limited seats. |

**Value ladder (per day):** Trip Pass ~$0.50/day · Monthly ~$0.27/day · Annual ~$0.22/day. The short
pass is intentionally pricier per day, nudging users toward recurring plans while still removing the
friction of committing to a subscription for a one-week trip.

**Free vs. Premium (high level):**

| Capability | Free | Premium |
|-----------|------|---------|
| Hyperlocal text chat | Daily limit | Unlimited |
| AI environmental ranger | 5 queries / day | Unlimited |
| Live voice agent | Short one-time trial | Monthly voice allowance |
| AI Expedition Planner (hub) | Not included | Included (quota by plan) |
| Offline PDFs, group ledger, Premium coupons | No | Yes |
| Off-Grid Vault, refuges directory | Free for everyone | Free for everyone |

**Distribution / pricing channels:** direct/web (no marketplace fee) is prioritized for annual and
lifetime; app stores are supported with standard marketplace fees.

---

## 4. B2B — Verified Refuge (host SaaS)

A second, higher-margin revenue line aimed at the eco-rural hospitality niche — explicitly **not**
corporate city hotels.

**Price:** **$10/mo** per host, billed directly (web/transfer) — designed to be an "invisible cost"
for the host (less than the revenue from selling a single bed for one night).

**What the host gets:**

- A **Verified Refuge** badge (trust signal).
- **Algorithmic priority** when the hyperlocal AI agent recommends lodging.
- The right to publish **VIP coupons** into travelers' in-app ledger.

### Market sizing (Colombia)

| Segment | Estimate |
|---------|----------|
| Registered lodging providers (Colombia) | **35,000+** |
| Nature / rural niche (our target) | **~15%** |
| **Serviceable target (TAM)** | **~5,000 properties** |

### Territorial go-to-market

We expand region by region, growing the verified host base as our catalog deepens:

| Phase | Territory | Target market | Capture | Paying hosts | Recurring revenue (MRR) | Annual (ARR) |
|-------|-----------|--------------:|--------:|-------------:|------------------------:|-------------:|
| 1 | Valle del Cauca | 350 | 20% | 70 | **$700/mo** | **$8,400** |
| 2 | + Amazonas | 450 | 25% | 112 | **$1,120/mo** | **$13,440** |
| 3 | + Antioquia | 1,200 | 30% | 360 | **$3,600/mo** | **$43,200** |
| 4 | + Cundinamarca | 1,800 | 35% | 630 | **$6,300/mo** | **$75,600** |
| 5 | National (32 depts.) | 5,000 | 40% | 2,000 | **$20,000/mo** | **$240,000** |

At national scale, the B2B line alone reaches **~$240K ARR** — a high-margin, defensible base that is
independent of consumer subscription conversion.

---

## 5. Unit-economics philosophy

- **Software-grade margins.** Our gross-margin target is **≥70%** at standard store rates, and higher
  through direct/web billing. We protect this with hard usage quotas (planner, voice) so power users
  cannot erode margin, and with aggressive caching of AI and weather data.
- **Cost scales with destinations, not users.** Hyperlocal weather/telemetry is cached per
  destination, so a thousand travelers looking at the same place cost roughly one lookup — costs grow
  with catalog breadth, not raw traffic.
- **Infra leverage.** The compute backbone runs on cloud credits during the 0→scale phase, and the
  most expensive real-time feature (voice) is quota-bounded and can be self-hosted at large scale to
  cut per-minute costs.
- **The B2B shield.** Host revenue subsidizes the cost of serving free travelers. As host density
  rises, a growing share of Premium subscription revenue converts directly into net profit instead of
  paying for infrastructure.

---

## 6. Revenue model at scale (illustrative)

Combined potential as the user base and host network grow (consumer + host lines). Figures are
illustrative model outputs, not guarantees.

| Stage | Active travelers | Premium mix | B2B phase | Recurring revenue signal |
|-------|------------------|-------------|-----------|--------------------------|
| Launch | Hundreds | ~5% | Phase 1 | Early validation, B2B covers regional serving cost |
| Regional | Tens of thousands | ~8–10% | Phase 2–3 | Crosses into sustainable operation |
| National | Hundreds of thousands | ~10% | Phase 5 | Strong combined profitability |
| Hyperscale | ~1M | 10%+ | Phase 5 | Seven-figure annual profit potential |

**Why it compounds:** B2C and B2B reinforce each other. More verified hosts → richer catalog → better
traveler experience → more Premium conversions and more travelers → more demand for hosts to be
verified.

---

## 7. Defensibility (moat)

- **Verified hyperlocal data** built territory by territory — hard to replicate, improves with scale.
- **Two-sided network effect** between travelers and hosts.
- **Offline-first survival tooling** (Off-Grid Vault) that generic competitors don't offer.
- **Trust** — grounded, no-hallucination answers from a curated catalog.

---

## 8. Monetization status

| Area | Status |
|------|--------|
| Pricing & entitlements in product/code | ✅ Live |
| Quota & gating (planner, voice, ranger, PDFs, group ledger) | ✅ Live |
| Premium UI & paywall | ✅ Live (`/premium`, USD reference, tooltips) |
| App Store / Play Store / RevenueCat billing | ⏳ Pending — `PREMIUM_CHECKOUT_ENABLED = false` |
| B2B Verified Refuge billing & host onboarding | ⏳ Planned |

---

*Public business-model overview. Detailed internal cost modeling is maintained privately.*
*Last updated: June 2026.*
