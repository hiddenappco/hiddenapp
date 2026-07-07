# Hidden App — Business Model & Unit Economics (Jun 2026)

Public overview of how Hidden App creates and captures value. Investor- and partner-facing
summary of our business model and unit-economics philosophy. All figures in **USD**.

> **Status (Jun 2026):** B2C pricing and product limits are **finalized and implemented in code**.
> **B2B partner pricing** updated to **$15/mo** and **$150/yr** (policy Jun 2026; billing onboarding pending).
> Store billing (App Store / Play Store / RevenueCat) is the remaining operational step for B2C.

---

## 1. Executive summary

Hidden App is a hyperlocal travel companion for Colombia's hidden, nature-first destinations
(hostels, glampings, coffee farms, eco-lodges, camping, and verified commercial allies). We pair an
AI hyperlocal agent with verified local catalog data, offline survival tooling, and a multi-agent trip
planner.

We monetize through **two complementary revenue lines**:

1. **B2C Premium (subscriptions)** — four plans on top of a generous Free tier.
2. **B2B SaaS (Verified Refuge & commercial allies)** — monthly or annual membership for hosts,
   hotels, hostels, and local partners who want verified status, priority in AI recommendations, and
   the right to publish VIP coupons to travelers.

| Pillar | What it is | Headline |
|--------|-----------|----------|
| **B2C Premium** | Traveler subscriptions | Blended ARPU **~$7.33/mo** |
| **B2B Verified Refuge** | Host / ally SaaS | **$15/mo** or **$150/yr** · billed direct (web) |
| **Market (B2B, Colombia)** | Nature lodging + allies | TAM **~5,000** properties |
| **Gross margin target** | Software product | **≥70%** at store rates · higher via direct/web |

**Strategic edge — the "B2B shield":** B2B host revenue is structurally **decoupled** from traveler
acquisition cost. As host density grows territory by territory, B2B income offsets the cost of serving
free travelers, so Premium subscriptions increasingly flow to net profit rather than to covering
infrastructure.

---

## 2. The problem & opportunity

- Colombia's best nature destinations are **fragmented and poorly digitized** — travelers lack
  reliable, real-time, hyperlocal information (logistics, safety, weather, coupons, lodging).
- Local hosts (small eco-lodges, glampings, family farms, hostels) and **commercial allies** have
  **little affordable digital reach**.
- Generic AI assistants **hallucinate** local details; Hidden grounds every answer in a **verified
  catalog** maintained per territory.

Hidden sits at the intersection: a trusted hyperlocal layer travelers pay for, and a distribution
channel hosts and allies pay to be discovered in.

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

## 4. B2B — Verified Refuge & commercial allies (host SaaS)

A second, higher-margin revenue line aimed at **eco-rural hospitality and verified commercial allies**
in Colombia and Latin America — explicitly **not** large corporate city-hotel chains.

### Pricing (Jun 2026)

| Plan | Price (USD) | Effective / mo | Notes |
|------|-------------|----------------|-------|
| **Monthly** | **$15/mo** | $15.00 | Default; cancel anytime. |
| **Annual** | **$150/yr** | $12.50 | **2 months free** vs. 12× monthly ($180 → $150). |

Billed directly (web / transfer / local payment rails) — no app-store fee on the B2B line.

### Why $15/mo is “one night pays for the month” (Colombia / LATAM)

In Colombia — and broadly across our first expansion markets in Latin America — even a **basic hostel
bed** typically starts around **~COP 50,000/night** (~$14 USD at TRM ~3,500; official ~3,460 COP/USD
as of Jun 2026). A single guest night
at a partner property **covers the monthly membership**. The fee is designed to feel like an
**invisible cost**: less than one booking, not a marketing budget line item.

This framing holds for small hotels, hostels, glampings, and local allies whose average nightly rate
sits in the same order of magnitude.

### Why we added annual ($150/yr)

- **Partner savings:** 2 months free encourages commitment and reduces churn friction.
- **Hidden cash flow:** upfront annual payment improves **immediate cash** and **LTV predictability**
  without discounting below a sustainable monthly anchor.
- **Unit economics:** annual mix raises **cash collected per signup** even when recognized MRR is
  slightly lower on a per-seat basis ($12.50/mo effective).

### What the partner gets

- A **Verified Refuge** badge (trust signal) and/or **commercial ally** placement in catalog.
- **Algorithmic priority** when the hyperlocal AI agent recommends lodging or local services.
- The right to publish **VIP coupons** into travelers' in-app ledger.

### Market sizing (Colombia)

| Segment | Estimate |
|---------|----------|
| Registered lodging providers (Colombia) | **35,000+** |
| Nature / rural niche + allied local businesses (our target) | **~15%** |
| **Serviceable target (TAM)** | **~5,000 properties** |

### Territorial go-to-market (monthly list-price MRR)

Illustrative model at **$15/mo** per paying partner (annual plans improve cash but reduce steady-state
MRR per seat — see §5).

| Phase | Territory | Target market | Capture | Paying hosts | Recurring revenue (MRR) | Annual (ARR) |
|-------|-----------|--------------:|--------:|-------------:|------------------------:|-------------:|
| 1 | Valle del Cauca | 350 | 20% | 70 | **$1,050/mo** | **$12,600** |
| 2 | + Amazonas | 450 | 25% | 112 | **$1,680/mo** | **$20,160** |
| 3 | + Antioquia | 1,200 | 30% | 360 | **$5,400/mo** | **$64,800** |
| 4 | + Cundinamarca | 1,800 | 35% | 630 | **$9,450/mo** | **$113,400** |
| 5 | National (32 depts.) | 5,000 | 40% | 2,000 | **$30,000/mo** | **$360,000** |

At national scale, the B2B line alone reaches **~$360K ARR** at list monthly pricing — a high-margin,
defensible base that is independent of consumer subscription conversion.

**Annual upside (illustrative):** if 30% of partners choose annual at Phase 5, upfront cash per cohort
wave includes **~600 × $150 = $90K** collected immediately per renewal cycle, on top of monthly seats.

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
- **B2B pricing anchored to local economics.** $15/mo is justified by **one guest-night revenue** in
  Colombia/LATAM, not by abstract SaaS comparables — improving conversion and reducing price objections.
- **Annual B2B for cash velocity.** The $150/yr tier trades **~17% effective discount** (2 free months)
  for **upfront liquidity** and lower annual churn — a favorable trade for a capital-efficient rollout.

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
- **Auditable direct economic injection** (P2-ESG-01) — monthly COP totals from verified coupon redemptions in the trip ledger, reproducible via Firestore aggregates and `report:direct-injection` (investor / B2G storytelling).

---

## 8. Monetization status

| Area | Status |
|------|--------|
| B2C pricing & entitlements in product/code | ✅ Live |
| B2B partner pricing policy ($15/mo · $150/yr) | ✅ Documented Jun 2026 |
| Quota & gating (planner, voice, ranger, PDFs, group ledger) | ✅ Live |
| Premium UI & paywall | ✅ Live (`/premium` Baymard matrix, paywall ROI, USD reference) |
| ESG direct injection metric (P2-ESG-01) | ✅ Live — server aggregates + profile card + monthly script |
| App Store / Play Store / RevenueCat billing (B2C) | ⏳ Pending — `PREMIUM_CHECKOUT_ENABLED = false` |
| B2B Verified Refuge billing & partner onboarding | ⏳ Planned |

---

*Public business-model overview. Detailed internal cost modeling is maintained privately.*
*Last updated: June 2026 — B2B pricing revision ($15/mo, $150/yr).*
