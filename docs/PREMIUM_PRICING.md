# Hidden App — Planes Premium (Jun 2026)

Documento de referencia para producto, UI y modelo financiero. **Aún sin App Store / Play Store ni RevenueCat en producción** — precios definidos para copy, diseño y `unit-economics.html`.

> **Estado: cerrado jun 2026** — precios, cuotas hub (1/2/3), modelo probabilístico y margen ≥70% documentados en
> `ANALISIS_FINANCIERO.md`, canvas y `unit-economics.html`. Pendiente: implementación en código/backend (§ abajo).

## Objetivo de producto

Reducir la **fricción de la suscripción mensual** en viajes cortos: muchos usuarios no quieren un compromiso recurrente para una semana de viaje. El **Pase Viaje (10 días)** actúa como puerta de entrada; el mensual se vende como upgrade natural (“por poco más, todo el mes”).

## Planes vigentes (USD · referencia COP @ 3.600)

| Plan | USD | COP orientativo | Equivalente / mes | Notas |
|------|-----|-----------------|---------------------|--------|
| **Pase Viaje** | $4.99 | ~$17.900 | — (10 días) | Sin renovación automática. Ideal para un viaje puntual. |
| **Mensual** | $7.99 | ~$28.900 | $7.99 | Flexibilidad total; mismo feature set Premium. |
| **Anual** | $79.99 | ~$287.900 | ~$6.67 | **2 meses gratis** vs 12× mensual ($95.88). |
| **Vitalicio** | $149.99 | ~$539.900 | ~2 años de anual | Edición limitada (cupos). Uso justo de Live. |

FX de referencia: **$3.500 – $3.700 COP/USD** (Colombia, 2026). En UI mostrar **pesos redondeados** para comparación con cupones y gastos locales.

### Escalera de valor (por día)

| Plan | USD/día aprox. |
|------|----------------|
| Pase 10 días | ~$0.50 |
| Mensual | ~$0.27 |
| Anual | ~$0.22 |

El pase corto es **más caro por día** que el mensual → incentiva el upgrade sin canibalizar del todo el plan recurrente.

## Contraste con el modelo anterior (`unit-economics.html`, mayo 2026)

| Plan | Modelo mayo 2026 | Modelo jun 2026 | Cambio |
|------|------------------|-----------------|--------|
| Entrada | *(no existía)* | **$4.99 / 10 días** | Nuevo — antifrcción |
| Mensual | $5.99 | **$7.99** | +33% bruto; mejor ancla vs pase |
| Anual | $53.99 (~$4.50/mes, ~25% off) | **$79.99** (~$6.67/mes, **2 meses gratis**) | Más caja por usuario; mensaje más claro |
| Vitalicio | $178.99 (~COP 715k, “5+ años costo”) | **$149.99** (~COP 540k, **~2× anual**) | Más alineado a “dos años de membresía”; menos dilución a largo plazo |

### UI legacy (fallbacks viejos en app)

| Plan | Antes (COP fallback) | Ahora (COP orientativo) |
|------|----------------------|-------------------------|
| Mensual | $19.900 | ~$28.900 |
| Anual | $139.900 | ~$287.900 |
| Vitalicio | $249.900 | ~$539.900 |

Los precios legacy estaban **por debajo** del modelo USD y mezclaban señales distintas; la nueva tabla unifica USD interno + COP en pantalla.

## Beneficios Premium (todos los planes pagos)

Misma capacidad funcional en pase, mensual, anual y vitalicio; solo cambia la **duración** (salvo vitalicio = permanente con cupos).

**Matriz completa** (Invitado · Free · Pase · Premium, límites numéricos y estado en código): **[`docs/PREMIUM_ENTITLEMENTS.md`](./PREMIUM_ENTITLEMENTS.md)**.

Resumen:

| Beneficio | Free / Invitado | Premium |
|-----------|-----------------|---------|
| Monitor ambiental táctico | 5 consultas/día (objetivo) | Ilimitado |
| Chat / agentes texto (catálogo) | 10 mensajes/día | Ilimitado |
| Agente Live (voz) | No | 30 min/mes (ventana 30 d) |
| Planificador hub IA | **1/mes** (registro req.) | **2/pase** · **3/mes** · ≤30 d/consulta |
| Cupones verificados Premium | Bloqueados | Acceso completo |
| PDF offline (destino, expedición, bitácora) | No | Sí |
| Bitácora grupal (`HIDDEN-XXXX`) | No | Sí |
| Bitácora solo | Solo registrado | Sí |
| Soporte | Estándar | Prioridad |

**Argumento comercial Colombia:** un solo cupón de hospedaje o comida puede superar **$17.900** — el pase de 10 días se “paga solo” en el primer uso real.

## Planificador de expedición — probabilidades, cuotas y norte (Jun 2026)

El hub `/expedition/plan` ejecuta el pipeline multi-agente (curador → logístico → presupuesto → redactor).
Es la experiencia **más profunda**; el chat texto y Live pueden orientar viajes tácticos sin consumir esta cuota.

> **Norte (Jun 2026):** cuota por **número de consultas**, sin tope artificial de días en producto (hasta
> `MAX_DAYS = 30` del sistema). La viabilidad se sostiene con **probabilidades**: el viaje típico nacional es
> corto/medio; el extranjero de 20–25 días es posible pero **minoritario**. Objetivo de margen: **≥70%** (80% en web).

### Cuotas por tier (producto)

| Tier | Consultas / periodo | Días máx. por consulta | Copy |
|------|----------------------:|------------------------|------|
| **Free** | **1** / mes | **30** (límite técnico) | “1 expedición IA al mes” |
| **Pase Viaje 10 días** | **2** / pase | 30 | “2 itinerarios en tu viaje” |
| **Mensual / Anual / Vitalicio** | **3** / mes | 30 | “Hasta 3 expedición IA al mes” |

No hay cap de 5–15 días en UI: un viajero internacional puede planear 20–25 días **si le queda cupo**.
El chat/Live cubren dudas puntuales sin gastar el hub.

### Costo por consulta (modelo financiero)

```
costo_plan(días) ≈ $0.12 + días × $0.09
```

| Días (percentil uso) | Costo / consulta |
|---------------------:|-----------------:|
| 5 (corto) | ~$0.57 |
| **10 (promedio modelo)** | **~$1.02** |
| 15 | ~$1.47 |
| 25 (extranjero largo) | ~$2.37 |
| 30 (techo sistema) | ~$2.82 |

### Distribución probabilística (Premium, cupo 3/mes)

Hipótesis: vacaciones, uso esporádico; **promedio real ~5–15 días** por consulta cuando se usa.

| Perfil | % Premium | Patrón | Costo / mes |
|--------|----------:|--------|------------:|
| No usa el hub | 45% | — | $0 |
| 1 consulta ~8 días | 30% | fin de semana largo | ~$0.84 |
| 2 consultas ~9 días | 15% | iterar itinerario | ~$1.86 |
| 3 consultas ~10 días | 7% | power user | ~$3.06 |
| 1–2 consultas 20–25 días | 3% | extranjero / roadtrip | ~$2.50–$4.70 |
| **Promedio ponderado** | | **~0.8 consultas · ~9 días** | **~$0.65** |

Free (25% genera su 1 consulta/mes, ~7 días media): +**~$0.19** → `FREE_VAR` **~$0.30/mes**.

Pase (2 consultas en ventana, ~9 días c/u si se usan ambas): costo máx. ~**$2.04** vs ingreso **$4.99** ✅.

### Peor caso vs. probable

| Escenario | Probabilidad | Costo expedición | ¿Viable? |
|-----------|-------------|-----------------:|----------|
| Promedio modelo | Alta | **~$0.65/mes** | ✅ margen ~72% (stores 30%) |
| 3×10 días/mes | Baja | ~$3.06 | ⚠️ ~40% margen si fuera todos |
| 3×25 días/mes | Muy baja | ~$7.11 | ❌ si escala — monitorear P99 |
| 1×30 días Free/mes | Baja | ~$0.84 blended | ✅ adquisición |

**Palanca:** chat/Live para replanificar sin hub; deflación IA ~10–20%/año; cupo duro de **3 consultas** acota el daño.

### Sensibilidad margen Premium (30 min Live, comisión 30%, ARPU neto $5.13)

| `EXPEDITION_VAR` | Costo var. total | Margen unitario |
|-----------------:|-----------------:|----------------:|
| **$0.65 (promedio)** | ~$1.43 | **~72%** ✅ |
| $1.00 | ~$1.78 | **~65%** ✅ |
| $1.50 | ~$2.28 | **~55%** |
| $3.06 (3×10d) | ~$3.84 | **~25%** (cola improbable) |

Con **web 0%**: promedio → **~78–80%** margen. Meta **≥70%** cumplida en escenario base.

## ARPU para el simulador financiero

- **ARPU bruto blended ≈ $7.33/mes** (50% mensual + 50% anual).
- **Expedición Premium:** default **~$0.65/mes** (probabilístico, cupo 3, ~9 días/consulta).
- **Free:** `FREE_VAR` **~$0.30** (25% × 1 consulta ~7 días).

Con comisión 30%: Premium ~**$1.43** variable → margen **~72%**.

## Reglas de canal (sin cambio)

1. **Web 0%** — priorizar anual/vitalicio (empuja margen hacia 80%).
2. **Stores 15–30%** al publicar.
3. Vitalicio: cupos limitados; **3 consultas hub/mes** (uso justo).
4. Planificador: contador **`expeditionPlansUsed`** por ventana (Free 1 · Pase 2 · Premium 3); sin cap de días en producto.
5. **Telemetría:** alerta si usuario >2 consultas/mes con **>20 días** cada una (cola de costo, no bloqueo automático en v1).
6. Revisión anual tarifas Gemini (deflación).

## Implementación pendiente (no bloquea definición de precios)

- [ ] Productos en App Store Connect / Play Console (`trip_10d`, `monthly`, `annual`, `lifetime`)
- [ ] RevenueCat offerings (cuando haya stores)
- [ ] Pantalla `/premium` — **precios y beneficios actualizados en código** (Jun 2026)
- [ ] Backend: duración del pase 10 días en `users.isPremium` + `premiumExpiresAt`
- [ ] **Cuotas expedición:** `expeditionPlansUsed` por ventana (Free **1** · Pase **2** · Premium **3**/mes); días hasta `MAX_DAYS` sin cap comercial
- [ ] UI: mensaje amigable al agotar cuota + upsell anual/web

## Referencias en repo

- **Capacidades por tier (matriz técnica):** [`docs/PREMIUM_ENTITLEMENTS.md`](./PREMIUM_ENTITLEMENTS.md)
- **Canvas interactivo:** `hidden-app-unit-economics.canvas.tsx` (Cursor → Canvases)
- **Simulador HTML:** [`public/unit-economics.html`](../public/unit-economics.html)
- **Análisis narrativo completo:** [`ANALISIS_FINANCIERO.md`](../ANALISIS_FINANCIERO.md) (local, gitignored)
- **UI:** [`components/Premium.tsx`](../components/Premium.tsx), [`locales/es.ts`](../locales/es.ts)
- **Arquitectura:** [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md)
