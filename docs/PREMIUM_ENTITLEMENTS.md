# Hidden App — Capacidades por tipo de usuario (Jun 2026)

Matriz de referencia para producto, ingeniería y copy. Complementa [`UNIT_ECONOMICS_EN.md`](./UNIT_ECONOMICS_EN.md) (modelo de negocio y unit economics) y [`ARCHITECTURE.md`](./ARCHITECTURE.md) (implementación técnica).

> **Estado:** política **cerrada jun 2026** · **implementada en código** (jun 2026) salvo RevenueCat stores y `premiumExpiresAt` automático en compra.

---

## 1. Tipos de identidad

| Tipo | Cómo se reconoce | Duración | Notas |
|------|------------------|----------|--------|
| **Invitado (Guest)** | Firebase Auth anónimo · `users.isGuest === true` | Sesión / dispositivo | **Hackathon:** se comporta como Premium completo (`GUEST_USER_PROFILE_FIELDS`). Post-hackathon → Free. |
| **Free (registrado)** | Cuenta Google/email · `isPremium === false` | Permanente | Chat, monitor, bóveda, bitácora solo. **Sin hub planificador.** |
| **Premium — Pase Viaje** | `isPremium === true` + `premiumExpiresAt` (~10 días) | 10 días | Hub **1 consulta** en la ventana del pase. |
| **Premium — Mensual / Anual / Vitalicio** | `isPremium === true` (vitalicio sin expiración) | Según plan | Hub **3 consultas / mes** rodante. |

**Principio:** todos los planes de pago comparten el **mismo set de beneficios**; solo varían **duración** y **cuota del planificador hub** (1 vs 3).

### Fuente de verdad técnica

| Campo Firestore | Uso |
|-----------------|-----|
| `users.isGuest` | Sesión demo / hackathon |
| `users.isPremium` | Acceso Premium (Rowy, cupón admin o RevenueCat) |
| `users.premiumExpiresAt` | Fin del Pase Viaje 10 días |
| `users.liveCallUsage` | Premium: 30 min / 30 d rodantes — **solo server** |
| `users.liveTrialUsedSeconds` | Free: prueba Live **5 min lifetime** — **solo server** |
| `users.expeditionPlansUsed` | Contador hub (1 pase · 3/mes) — **solo server** |
| `users.rangerUsage` | Consultas Ranger IA / día — **solo server** |

Constantes: [`config/premiumLimits.ts`](../config/premiumLimits.ts) · server: [`functions/src/lib/premiumLimits.ts`](../functions/src/lib/premiumLimits.ts)

---

## 2. Matriz resumida (producto)

Leyenda: **✓** incluido · **◐** parcial / con límite · **✗** no incluido

| Capacidad | Invitado¹ | Free | Pase 10d | Premium |
|-----------|:--------:|:----:|:--------:|:-------:|
| Catálogo, refugios, contacto anfitrión | ✓ | ✓ | ✓ | ✓ |
| Bóveda Off-Grid | ✓ | ✓ | ✓ | ✓ |
| Chat hiperlocal (texto) | ◐ 10/día | ◐ 10/día | ✓ ∞ | ✓ ∞ |
| Environmental Ranger (consultas IA) | ◐ 5/día² | ◐ 5/día | ◐ 10/día | ◐ 10/día |
| Telemetría monitor (sin IA nueva) | ✓ | ✓ | ✓ | ✓ |
| Modo Live (voz) | ✓ 30 min³ | ◐ 5 min prueba⁴ | ✓ 30 min/30d | ✓ 30 min/30d |
| **Planificador hub** | ✓³ | **✗** | ◐ **1/pase** | ◐ **3/mes** |
| Revisión itinerario (1 incluida/consulta) | ✓ | ✗ | ✓ | ✓ |
| Cupones catálogo Premium | ✓³ | ✗ | ✓ | ✓ |
| PDF destino / expedición / bitácora | ✓³ | ✗ | ✓ | ✓ |
| Bitácora **solo** | ✗ | ✓ | ✓ | ✓ |
| Bitácora **grupal** | ✓³ | ✗ | ✓ | ✓ |
| Soporte | estándar | estándar | **prioridad**⁵ | **prioridad**⁵ |

¹ Invitado hackathon = Premium en UI y cuotas (temporal).  
² Cuenta cada llamada Ranger con IA (análisis automático o pregunta táctica).  
³ Solo durante temporada hackathon con `isGuest + isPremium` demo.  
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
| Consultas Ranger IA / día | **5** | **10** |
| Telemetría cruda (clima, AQI, UV) | Sin límite de lectura en caché | Igual |

Backend: `assertAndConsumeRangerQuota` en `environmentalAgent` (`functions/src/api/agents.ts`).

### 3.3 Modo Live (voz)

| | Free registrado | Premium |
|--|-----------------|---------|
| Acceso | **5 min prueba (1× en la vida)** | **30 min / 30 días** |
| Campos | `liveTrialUsedSeconds` | `liveCallUsage` |
| Agotado | → `/premium` | HTTP 403 `LIVE_QUOTA_EXCEEDED` |

Guest hackathon: bypass cuota (comportamiento Premium).

### 3.4 Planificador de expedición (hub)

**Solo usuarios con Premium activo.** Free no accede al hub (`PREMIUM_REQUIRED`).

| Tier | Consultas / periodo | Días máx. / consulta |
|------|--------------------:|----------------------|
| Pase 10 días | **1** | 30 |
| Mensual / Anual / Vitalicio | **3** / mes rodante | 30 |

**Revisión:** 1 ajuste incluido por consulta (`revisionsUsed === 0` en padre); ajustes adicionales consumen cupo.

Backend: `createExpedition` · `expeditionQuota.ts` · UI: `ExpeditionPremiumGate`, `ExpeditionResultPage` (textarea revisión).

### 3.5 Cupones, PDFs, bitácora

Sin cambio respecto a política jun 2026: cupones premium bloqueados en Free; PDFs solo Premium; grupal solo Premium; bóveda **gratis** para todos autenticados.

### 3.6 Off-Grid Vault

**No es Premium** — gancho gratuito y diferenciador para cualquier usuario autenticado.

---

## 4. Excepción hackathon / demo

```ts
// utils/userIdentity.ts — GUEST_USER_PROFILE_FIELDS
{ isPremium: true, isGuest: true, ... }
```

Mantener hasta fin de temporada hackathon. Después: `VITE_ENABLE_GUEST_LOGIN=false` o guest = Free sin `isPremium`.

---

## 5. Estado de implementación

| Regla | Código |
|-------|--------|
| Chat 10 msg/día Free | ✅ `Chat.tsx` |
| Ranger 5/10 día | ✅ `environmentalAgent` + UI |
| Live prueba 5 min Free | ✅ `liveCallQuota.ts` + `livekit.ts` |
| Live 30 min/mes Premium | ✅ |
| Hub solo Premium | ✅ `createExpedition` + rutas UI |
| Hub cuota 1/3 | ✅ `expeditionQuota.ts` |
| Revisión 1 incluida | ✅ `createExpedition` + `ExpeditionResultPage` |
| PDFs Premium (todos) | ✅ `pdf.ts` |
| Bitácora grupal Premium | ✅ `CreateTrip` + rules |
| Guest hackathon Premium | ✅ temporal |
| `premiumExpiresAt` en compra store | ⏳ RevenueCat pendiente |

---

## 6. Referencias

| Recurso | Ruta |
|---------|------|
| Modelo de negocio y unit economics | **[`UNIT_ECONOMICS_EN.md`](./UNIT_ECONOMICS_EN.md)** |
| Límites | [`config/premiumLimits.ts`](../config/premiumLimits.ts) |
