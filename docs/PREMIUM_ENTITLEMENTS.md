# Hidden App — Capacidades por tipo de usuario (Jun 2026)

Matriz de referencia para producto, ingeniería y copy. Complementa [`PREMIUM_PRICING.md`](./PREMIUM_PRICING.md) (precios y unit economics) y [`ARCHITECTURE.md`](./ARCHITECTURE.md) (implementación técnica).

> **Estado:** política de producto **cerrada jun 2026**; varias reglas aún **no están aplicadas en código** (ver § Implementación). La columna **Objetivo** es la fuente de verdad para lanzamiento.

---

## 1. Tipos de identidad

| Tipo | Cómo se reconoce | Duración | Notas |
|------|------------------|----------|--------|
| **Invitado (Guest)** | Firebase Auth anónimo · `users.isGuest === true` | Sesión / dispositivo | Modo “Explorar como invitado” en login. Sin email ni perfil persistente entre dispositivos. |
| **Free (registrado)** | Cuenta Google/email · `isPremium === false` | Permanente | Usuario base tras registro. Mismos límites de uso que invitado en casi todo; gana persistencia, bitácora solo y sync. |
| **Premium — Pase Viaje** | `isPremium === true` + `premiumExpiresAt` (~10 días) | 10 días | Mismo feature set que mensual; cupo hub **2 consultas** en la ventana del pase. |
| **Premium — Mensual / Anual / Vitalicio** | `isPremium === true` (vitalicio sin expiración) | Según plan | Misma capacidad funcional; solo cambia duración y facturación. Cupo hub **3 consultas / mes**. |

**Principio:** todos los planes de pago comparten el **mismo set de beneficios**; solo varían **duración** y **cuota del planificador hub** (2 vs 3). Ver precios en [`PREMIUM_PRICING.md`](./PREMIUM_PRICING.md).

### Fuente de verdad técnica

| Campo Firestore | Uso |
|-----------------|-----|
| `users.isGuest` | Marca sesión anónima de evaluación / demo |
| `users.isPremium` | Acceso Premium (manual Rowy, cupón admin o futuro RevenueCat) |
| `users.premiumExpiresAt` | Fin del Pase Viaje 10 días *(pendiente backend)* |
| `users.liveCallUsage` | Ventana rodante 30 d · segundos consumidos Live |
| `users.expeditionPlansUsed` | Contador por ventana Free / Pase / Premium *(pendiente)* |

Cliente: `RevenueCatProvider` lee `isPremium` desde el perfil Firestore (`utils/userIdentity.ts`).

---

## 2. Matriz resumida (objetivo de producto)

Leyenda: **✓** incluido · **◐** parcial / con límite · **✗** no incluido · **—** no aplica

| Capacidad | Invitado | Free | Pase 10d | Premium |
|-----------|:--------:|:----:|:--------:|:-------:|
| Catálogo (departamentos, destinos, fichas) | ✓ | ✓ | ✓ | ✓ |
| Búsqueda manual / mapa | ✓ | ✓ | ✓ | ✓ |
| Chat hiperlocal (texto, catálogo) | ◐ 10/día | ◐ 10/día | ✓ ilimitado | ✓ ilimitado |
| Environmental Ranger (monitor + consejos IA) | ◐ 5/día | ◐ 5/día | ✓ ilimitado | ✓ ilimitado |
| Modo Live (voz, LiveKit) | ✗ | ✗ | ✓ 30 min/mes | ✓ 30 min/mes |
| Planificador hub (`/expedition/plan`) | ✗¹ | ◐ 1/mes · ≤30 d | ◐ 2/pase · ≤30 d | ◐ 3/mes · ≤30 d |
| Chat/Live para dudas tácticas (sin hub) | ◐ | ◐ | ✓ | ✓ |
| Cupones catálogo estándar | ✓ | ✓ | ✓ | ✓ |
| Cupones catálogo Premium | ✗ | ✗ | ✓ | ✓ |
| PDF destino | ✗ | ✗ | ✓ | ✓ |
| PDF expedición | ✗ | ✗ | ✓ | ✓ |
| PDF bitácora (viaje) | ✗ | ✗ | ✓ | ✓ |
| Bitácora **solo** (gastos personales) | ✗² | ✓ | ✓ | ✓ |
| Bitácora **grupal** (`HIDDEN-XXXX`) | ✗ | ✗ | ✓ | ✓ |
| Off-Grid Vault (packs offline) | ✓³ | ✓ | ✓ | ✓ |
| Tasas de cambio / conversor COP | ✓ | ✓ | ✓ | ✓ |
| Soporte | estándar | estándar | prioridad | prioridad |

¹ Invitado debe **registrarse** para usar el hub (aunque sea 1 consulta/mes en Free).  
² Bitácora requiere cuenta (no anónima).  
³ Requiere usuario autenticado (invitado o registrado).

### Departamentos bloqueados en planificador

Independiente del tier: **`amazonas`** no está disponible en el wizard (`EXPEDITION_PLANNER_LOCKED_SLUGS` en `utils/expeditionPlanner.ts`). El catálogo y el chat sí pueden mencionar el departamento.

---

## 3. Detalle por área

### 3.1 Chat hiperlocal

| | Invitado / Free | Premium |
|--|-----------------|---------|
| Límite | **10 mensajes de usuario / día** (reset medianoche local) | Ilimitado |
| Alcance | Agente por departamento, herramientas de catálogo, deep link a hub expedición | Igual |
| Constante | `CHAT_LIMITS.FREE_DAILY_MESSAGES = 10` (`config/constants.ts`) | — |
| UI al límite | Upsell `/premium` (`components/Chat.tsx`) | — |

El chat **no sustituye** al hub multi-agente para itinerarios día a día; sirve para preguntas puntuales y orientación.

### 3.2 Environmental Ranger

| | Invitado / Free | Premium |
|--|-----------------|---------|
| Telemetría (clima, AQI, UV, etc.) | Acceso con **5 consultas / día** (objetivo producto) | Ilimitado |
| Escudo activo | TTL 12 h por sesión (`SHIELD_DURATION_MS`) | Igual |
| Consejos IA (Ranger) | Cuenta dentro del límite diario Free | Sin tope diario |

**Nota:** el límite **5/día** está en el modelo financiero y copy Premium; **aún no se aplica en cliente ni backend** (hoy todos los usuarios autenticados tienen uso sin tope).

### 3.3 Modo Live (voz)

| | Invitado / Free | Premium (todos los pagos) |
|--|-----------------|---------------------------|
| Acceso | **No** — requiere Premium + cuenta registrada | Sí |
| Cuota | — | **30 minutos / ventana de 30 días** |
| Backend | — | `assertLiveCallQuota` · `LIVE_CALL_MONTHLY_LIMIT_SECONDS` |
| Comportamiento al agotar | — | HTTP 403 `LIVE_QUOTA_EXCEEDED`; barra en UI (`LiveCallQuotaBar`) |

**Uso justo vitalicio:** misma cuota base 30 min/mes (sin “ilimitado” en v1).

### 3.4 Planificador de expedición (hub)

Pipeline costoso: multi-agente (curador → logístico → presupuesto → redactor), hasta `MAX_DAYS = 30`, hasta 45 tramos Routes.

| Tier | Consultas / periodo | Días máx. por consulta | Ventana del contador |
|------|--------------------:|------------------------|----------------------|
| Free | 1 | 30 (techo técnico) | Mes calendario o 30 d rodantes |
| Pase 10 días | 2 | 30 | Duración del pase (`premiumExpiresAt`) |
| Mensual / Anual / Vitalicio | 3 | 30 | Mes rodante |

- Sin cap comercial de 5–15 días: un viaje largo (20–25 días) es posible si queda cupo.
- Replanificación ligera: **chat o Live** sin consumir cupo hub.
- Telemetría P99: alerta si >2 consultas/mes con >20 días cada una (no bloqueo automático v1).

Ver probabilidades y costos en [`PREMIUM_PRICING.md`](./PREMIUM_PRICING.md).

### 3.5 Cupones verificados

| Tipo en catálogo (`coupons.isPremium`) | Invitado / Free | Premium |
|----------------------------------------|-----------------|---------|
| Estándar (`isPremium: false`) | Ver y canjear | Ver y canjear |
| Premium (`isPremium: true`) | Bloqueados en UI → `/premium` | Acceso completo |

Aplica en listado (`components/Coupons.tsx`), ficha destino y widgets en resultado de expedición (`ExpeditionCouponWidget`).

### 3.6 PDFs offline

| PDF | Invitado / Free | Premium | Backend hoy |
|-----|-----------------|---------|-------------|
| Destino | ✗ | ✓ | `generateDestinationPdf` exige `isPremium` |
| Expedición | ✗ | ✓ | Auth + ownership; **sin check Premium aún** |
| Bitácora viaje | ✗ | ✓ | **Sin check Premium aún** |

Cliente: `DestinationDetail` redirige a `/premium` si no es Premium antes de exportar.

### 3.7 Bitácora (trip ledger)

| Modo | Invitado | Free | Premium |
|------|:--------:|:----:|:-------:|
| Crear viaje **solo** | ✗ | ✓ | ✓ |
| Crear viaje **grupal** (`isGroup`) | ✗ | ✗ | ✓ |
| Unirse por código `HIDDEN-XXXX` | ✗ | ✗ | ✓ |
| Gastos multi-moneda, offline outbox | — | ✓ (solo) | ✓ |
| PDF bilingüe del viaje | ✗ | ✗ (objetivo) | ✓ |

Implementación: `CreateTrip.tsx` solo permite `isGroup` si `isPremium`. Ver [`ARCHITECTURE.md`](./ARCHITECTURE.md) § Trip ledger.

### 3.8 Off-Grid Vault

Disponible para **cualquier usuario autenticado** (invitado o registrado, Free o Premium): descarga de packs SQLite, búsqueda offline, chat basado en pack. Gemma on-device opcional (~1,5 GB) — no es exclusivo Premium.

### 3.9 Contenido y comunidad

| | Todos |
|--|-------|
| Pacto Hidden, eventos, feed social | Sí (según reglas Firestore) |
| Badge Premium en perfil | Solo `isPremium` |

---

## 4. Excepción hackathon / demo

Para evaluadores (README, demo video), el login **“Explorar como invitado”** aplica temporalmente:

```ts
// utils/userIdentity.ts — GUEST_USER_PROFILE_FIELDS
{ isPremium: true, isGuest: true, ... }
```

Efectos actuales en demo:

- Invitado se comporta como **Premium en UI** (cupones, PDF destino, bitácora grupal, etc.).
- Backend Live **no descuenta cuota** a invitados (`liveCallQuota.ts` → `allowed: true` fijo).

**Antes de producción:** desactivar o reemplazar con política de §2 (`VITE_ENABLE_GUEST_LOGIN=false` o guest = Free sin `isPremium`). Documentar en release notes.

---

## 5. Estado de implementación

| Regla | Objetivo | Código hoy | Prioridad |
|-------|----------|------------|-----------|
| Chat 10 msg/día Free | ✓ | ✓ `Chat.tsx` | — |
| Ranger 5/día Free | ✓ | ✗ sin enforcement | P1 |
| Live solo Premium | ✓ | ✗ abierto a todos autenticados (MVP) | P0 |
| Live cuota 30 min/mes | ✓ | ✓ backend; guests bypass | P0 guest |
| Hub cuota 1/2/3 | ✓ | ✗ sin `expeditionPlansUsed` | P0 |
| Pase `premiumExpiresAt` | ✓ | ✗ | P0 |
| PDF destino Premium | ✓ | ✓ | — |
| PDF expedición / viaje Premium | ✓ | ✗ parcial | P1 |
| Bitácora grupal Premium | ✓ | ✓ `CreateTrip.tsx` | — |
| Cupones Premium bloqueados | ✓ | ✓ | — |
| Guest = Free (sin Premium hack) | ✓ prod | ✗ demo `isPremium: true` | P0 launch |

---

## 6. Copy comercial (alineado con UI)

Beneficios en `/premium` (`locales/es.ts` · `components/Premium.tsx`):

1. Monitor ambiental ilimitado  
2. Agentes IA sin límite (chat)  
3. Agente Live por voz (cuota mensual)  
4. Planificador de expedición IA  
5. Cupones verificados  
6. PDFs offline  
7. Bitácora grupal  

Actualizar precios y cuotas numéricas en UI cuando cierren stores (ver checklist en [`PREMIUM_PRICING.md`](./PREMIUM_PRICING.md)).

---

## 7. Referencias en repo

| Recurso | Ruta |
|---------|------|
| Precios y unit economics | [`docs/PREMIUM_PRICING.md`](./PREMIUM_PRICING.md) |
| Arquitectura (bitácora, expedición, Live) | [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md) |
| Simulador financiero | [`public/unit-economics.html`](../public/unit-economics.html) |
| Límites chat / Live (constantes) | [`config/constants.ts`](../config/constants.ts) |
| Identidad usuario | [`utils/userIdentity.ts`](../utils/userIdentity.ts) |
| Cuota Live backend | [`functions/src/lib/liveCallQuota.ts`](../functions/src/lib/liveCallQuota.ts) |
| Pantalla Premium | [`components/Premium.tsx`](../components/Premium.tsx) |
