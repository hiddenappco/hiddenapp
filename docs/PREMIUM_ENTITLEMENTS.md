# Hidden App — Capacidades por tipo de usuario (Jun 2026)

Matriz de referencia para producto, ingeniería y copy. Complementa [`UNIT_ECONOMICS_EN.md`](./UNIT_ECONOMICS_EN.md) / [`UNIT_ECONOMICS_ES.md`](./UNIT_ECONOMICS_ES.md) (modelo de negocio y unit economics) y [`ARCHITECTURE.md`](./ARCHITECTURE.md) (implementación técnica).

> **Estado:** política **cerrada jun 2026** · **implementada en código** (jun 2026) salvo RevenueCat stores y `premiumExpiresAt` automático en compra.

---

## 1. Tipos de identidad

| Tipo | Cómo se reconoce | Duración | Notas |
|------|------------------|----------|--------|
| **Invitado (Guest)** | Firebase Auth anónimo · `users.isGuest === true` | Sesión / dispositivo | Mismos poderes que **Free**; CTA vincular cuenta en Ajustes; TTL **30 días** sin actividad (`scheduledGuestCleanup` + `lastActiveAt`). |
| **Free (registrado)** | Cuenta Google/email · `isPremium === false` | Permanente | Chat, monitor, bóveda, bitácora solo. **Sin hub planificador.** |
| **Premium — Pase Viaje** | `isPremium === true` · `premiumPlan === 'trip_pass'` (+ `premiumExpiresAt` ~10 días) | 10 días | Hub **1 consulta** en la ventana del pase. |
| **Premium — Mensual / Anual / Vitalicio** | `isPremium === true` · `premiumPlan` monthly/annual/lifetime (vitalicio sin expiración) | Según plan | Hub **3 consultas / mes** rodante. |

**Principio:** todos los planes de pago comparten el **mismo set de beneficios**; solo varían **duración** y **cuota del planificador hub** (1 vs 3).

### Fuente de verdad técnica

| Campo Firestore | Uso |
|-----------------|-----|
| `users.isGuest` | Sesión anónima / exploración sin registro |
| `users.isPremium` | Acceso Premium (Rowy, cupón admin o RevenueCat) |
| `users.premiumPlan` | `trip_pass` · `monthly` · `annual` · `lifetime` — distingue cuota hub (1 vs 3) |
| `users.premiumExpiresAt` | Fin del Pase Viaje 10 días (Rowy Duration o Timestamp) |
| `users.pactAccepted` | Gate obligatorio primera sesión (`PactGate`) |
| `users.lastActiveAt` | Actividad guest para cron de retención |
| `users.liveCallUsage` | Premium: 30 min / 30 d rodantes — **solo server** |
| `users.liveTrialUsedSeconds` | Free: prueba Live **5 min lifetime** — **solo server** |
| `users.expeditionPlansUsed` | Contador hub (1 pase · 3/mes) — **solo server** |
| `users.rangerUsage` | Consultas Ranger IA / día — **solo server** |
| `users.directInjectionTotalCop` | Total COP inyectado a anfitriones vía cupones en bitácora — **solo server** (P2-ESG-01) |

Constantes: [`config/premiumLimits.ts`](../config/premiumLimits.ts) · server: [`functions/src/lib/premiumLimits.ts`](../functions/src/lib/premiumLimits.ts)

---

## 2. Matriz resumida (producto)

Leyenda: **✓** incluido · **◐** parcial / con límite · **✗** no incluido

| Capacidad | Invitado | Free | Pase 10d | Premium |
|-----------|:--------:|:----:|:--------:|:-------:|
| Catálogo, refugios, contacto anfitrión | ✓ | ✓ | ✓ | ✓ |
| Bóveda Off-Grid | ✓ | ✓ | ✓ | ✓ |
| Chat hiperlocal (texto) | ◐ 10/día | ◐ 10/día | ✓ ∞ | ✓ ∞ |
| Environmental Ranger (consultas IA) | ◐ 5/día | ◐ 5/día | ✓ ∞ | ✓ ∞ |
| Telemetría monitor (sin IA nueva) | ✓ | ✓ | ✓ | ✓ |
| Modo Live (voz) | ◐ 5 min prueba⁴ | ◐ 5 min prueba⁴ | ✓ 30 min/30d | ✓ 30 min/30d |
| **Planificador hub** | **✗** | **✗** | ◐ **1/pase** | ◐ **3/mes** |
| Revisión itinerario (1 incluida/consulta) | ✗ | ✗ | ✓ | ✓ |
| Cupones catálogo Premium | ✗ | ✗ | ✓ | ✓ |
| PDF destino / expedición / bitácora | ✗ | ✗ | ✓ | ✓ |
| Bitácora **solo** | ✗ | ✓ | ✓ | ✓ |
| Bitácora **grupal** | ✗ | ✗ | ✓ | ✓ |
| Soporte | estándar | estándar | **prioridad**⁵ | **prioridad**⁵ |

² Cuenta cada llamada Ranger con IA (análisis automático o pregunta táctica).  
⁴ Prueba **única** de 5 min (`liveTrialUsedSeconds`), no renovable.  
⁵ Prioridad = SLA humano en chat interno de soporte (sin gate técnico).

---

## 3. Detalle por área

### 3.1 Chat hiperlocal

| | Invitado / Free | Premium |
|--|-----------------|---------|
| Límite | **10 mensajes usuario / día** | Ilimitado |
| Constante | `CHAT_FREE_DAILY_MESSAGES = 10` | — |
| UI | Upsell `/premium` (`Chat.tsx`) | — |

### 3.2 Environmental Ranger

| | Free | Premium |
|--|------|---------|
| Consultas Ranger IA / día | **5** | **Ilimitadas** (`RANGER_PREMIUM_DAILY = null`) |
| Telemetría cruda (clima, AQI, UV) | Sin límite de lectura en caché | Igual |

Backend: `assertAndConsumeRangerQuota` en `environmentalAgent` (`functions/src/api/agents.ts`). Hint de cuota en `EnvironmentalMonitor` para usuarios free.

Invitado y Free comparten límites de chat, Ranger y Live (prueba única de 5 min).

### 3.3 Modo Live (voz)

| | Free registrado | Premium |
|--|-----------------|---------|
| Acceso | **5 min prueba (1× en la vida)** | **30 min / 30 días** |
| Campos | `liveTrialUsedSeconds` | `liveCallUsage` |
| Agotado | → `/premium` | HTTP 403 `LIVE_QUOTA_EXCEEDED` |

### 3.4 Planificador de expedición (hub)

**Solo usuarios con Premium activo.** Free no accede al hub (`PREMIUM_REQUIRED`).

| Tier | Consultas / periodo | Días máx. / consulta |
|------|--------------------:|----------------------|
| Pase 10 días | **1** | 30 |
| Mensual / Anual / Vitalicio | **3** / mes rodante | 30 |

**Revisión:** 1 ajuste incluido por consulta (`revisionsUsed === 0` en padre); ajustes adicionales consumen cupo.

Backend: `createExpedition` · `expeditionQuota.ts` · UI: `ExpeditionPremiumGate`, `ExpeditionResultPage` (textarea revisión).

**Historial:** sección «Mis planes anteriores» en el hub (`useUserExpeditions`) — visible para todos los autenticados; límite **20 planes**; borrado manual. Índice Firestore `userId + createdAt`.

### 3.5 Cupones, PDFs, bitácora

Sin cambio respecto a política jun 2026: cupones premium bloqueados en Free; PDFs solo Premium; grupal solo Premium; bóveda **gratis** para todos autenticados.

### 3.6 Off-Grid Vault

**No es Premium** — gancho gratuito y diferenciador para cualquier usuario autenticado. Gemma 4 (inferencia MediaPipe, ~1.29 GB) es **opcional** y no bloquea búsqueda local ni chat con datos del pack.

**Instalación Gemma (Jun 30, 2026):** Wi‑Fi obligatorio; modal `DataConfirmModal` antes de descargar; descarga en **streaming a disco** (RAM acotada); barra de progreso con fases, MB guardados, tiempo transcurrido; verificación `isGemmaModelReady()` antes del banner verde; requisitos mínimos en UI (~1.29 GB almacenamiento, 4 GB RAM).

**Desinstalación Gemma (Jun 30, 2026):** modal destructivo de confirmación; barra de progreso (liberar motor → borrar archivos → verificar tamaño 0); estado «Desinstalado por completo» antes de volver al botón Instalar.

### 3.7 Página `/premium` (Jul 2026 — P1-MON-01)

- Matriz comparativa **3 columnas** estilo Baymard: **Free · Pase Viaje · VIP** (no tabla 2 columnas).
- Headers de plan y CTAs **sticky** al hacer scroll en móvil.
- Cada fila de feature: icono `?` → tooltip ES/EN (viewport-safe) + enlace a demo (bóveda, planificador, bitácora).
- Precios referencia **USD** en `config/premiumPricing.ts` ($4.99 / $7.99 / $79.99 / $149.99); `SettingsPremium` alinea copy.
- `PREMIUM_CHECKOUT_ENABLED = false` — CTA «Disponible pronto en tiendas» hasta Play/App Store + RevenueCat.

### 3.8 Paywall ROI (Jul 2026 — P1-MON-02)

| | |
|--|--|
| **Utilidad** | `utils/paywallRoi.ts` · hook `usePaywallRoiContext()` |
| **Fórmula** | Ahorro cupón COP − precio Pase Viaje (~$4.99 USD) cuando el neto es positivo |
| **Dónde** | Bitácora (`PaywallRoiCard`), ficha destino al bloquear feature premium (`PaywallRoiBanner`), `/premium` (cupón del departamento del último destino visitado) |
| **Regla** | Sin cupón activo → ejemplo genérico con disclaimer; no inventar cifras |

### 3.9 Inyección económica directa — perfil (Jul 2026 — P2-ESG-01)

| | |
|--|--|
| **Dónde** | `Profile` → `DirectCommunityImpact` |
| **Fuente** | `users.directInjectionTotalCop` (solo escritura servidor vía `onTripExpenseWritten`) |
| **Origen** | Gastos de alojamiento en bitácora etiquetados `directCommunity` (refugio verificado + cupón) |

### 3.10 Upgrade invitado → cuenta oficial (Jun 2026)

| | |
|--|--|
| **Dónde** | `ProfileSettings` → `GuestAccountUpgrade` |
| **Métodos** | Google (`linkWithPopup`) o email + contraseña (`linkWithCredential`) |
| **UID** | **No cambia** — viajes, favoritos e historial de expediciones se conservan |
| **Firestore** | `isGuest: false`; email y displayName actualizados |
| **Tier tras vincular** | Free salvo compra Premium activa (`isPremium` / RevenueCat) |
| **Retención** | `scheduledGuestCleanup` — borra guests anónimos inactivos ≥30 días (`isGuest` + sin providers tras upgrade) |

### 3.11 Pacto Hidden (onboarding)

| | |
|--|--|
| **Cuándo** | Primera sesión autenticada (guest o registrado) |
| **Gate** | `PactGate` → `/pact` hasta `pactAccepted === true` |
| **Declinar** | `PactDeclined` — única salida cerrar sesión |
| **Relectura** | Ajustes → App → Legal → Pacto |

---

## 4. Estado de implementación

| Regla | Código |
|-------|--------|
| Chat 10 msg/día Free | ✅ `Chat.tsx` |
| Ranger 5/día Free · ∞ Premium | ✅ `environmentalAgent` + UI |
| Live prueba 5 min Free | ✅ `liveCallQuota.ts` + `livekit.ts` |
| Live 30 min/mes Premium | ✅ |
| Hub solo Premium | ✅ `createExpedition` + rutas UI |
| Hub cuota 1/3 | ✅ `expeditionQuota.ts` — `isTripPassPlan` usa `premiumPlan === 'trip_pass'` |
| Revisión 1 incluida | ✅ `createExpedition` + `ExpeditionResultPage` |
| Pacto primera sesión | ✅ `PactGate` + `pactAccepted` |
| Guest retención 30d | ✅ `scheduledGuestCleanup` + `lastActiveAt` |
| Settings hub T22 | ✅ `useSettingsAccess` + `/settings/app` · `/settings/profile` |
| Manuales producto | ✅ bitácora · monitor · planificador |
| Packing checklist destino | ✅ `DestinationPacking` + `packingChecklist.ts` |
| ESG badge + PDF expedición | ✅ `directCommunity` + `enrichItineraryRefugioEsg` |
| Bitácora conflict hint grupo | ✅ `TripConflictHint` |
| Backfill lazy `memberIds` | ✅ `tripMemberBackfill.ts` |
| PDFs Premium (todos) | ✅ `pdf.ts` |
| Bitácora grupal Premium | ✅ `CreateTrip` + rules |
| Guest tier Free (sin bypass Premium) | ✅ `GUEST_HACKATHON_PREMIUM = false` |
| Premium page Baymard 3-col + ROI | ✅ `Premium.tsx` · `config/premiumPricing.ts` · `paywallRoi.ts` (Jul 2026) |
| Paywall ROI embudo | ✅ `PaywallRoiBanner` · `PaywallRoiCard` · `DestinationDetail` (Jul 2026) |
| Métrica ESG inyección directa | ✅ `onTripExpenseWritten` · `DirectCommunityImpact` · script mensual (Jul 2026) |
| Premium page USD + tooltips | ✅ `HelpTooltip` legacy + matriz Baymard (Jul 2026) |
| Coach marks primera visita | ✅ `FeatureCoachmark` + `useFeatureTooltip` |
| Bitácora historial offline | ✅ `tripLedgerStore` mirror (10 viajes) |
| Feed actividad viajes grupales | ✅ `trips/{id}/activity` + `TripActivityFeed` |
| Upgrade invitado → cuenta oficial | ✅ `GuestAccountUpgrade` + `AuthProvider` link |
| ID usuario copiable en perfil | ✅ `ProfileUserIdBadge` |
| Gemma inferencia MediaPipe | ✅ `gemmaEngine.ts` (opcional, WebGPU) |
| Gemma install streaming + progress UX | ✅ `gemmaModelStore.ts`, `gemmaInstallProgress.ts`, `useOffGrid.ts` (Jun 30, 2026) |
| Gemma uninstall confirm + verified progress | ✅ `OffGridVault.tsx`, `removeGemmaModel(onProgress)` (Jun 30, 2026) |
| Store checkout RevenueCat | ⏳ `PREMIUM_CHECKOUT_ENABLED = false` |
| `premiumExpiresAt` en compra store | ⏳ RevenueCat pendiente |

---

## 5. Referencias

| Recurso | Ruta |
|---------|------|
| Modelo de negocio y unit economics | **[`UNIT_ECONOMICS_EN.md`](./UNIT_ECONOMICS_EN.md)** · **[`UNIT_ECONOMICS_ES.md`](./UNIT_ECONOMICS_ES.md)** |
| Límites | [`config/premiumLimits.ts`](../config/premiumLimits.ts) |
