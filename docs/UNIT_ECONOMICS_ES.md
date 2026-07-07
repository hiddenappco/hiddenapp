# Hidden App — Modelo de negocio y unit economics (Jun 2026)

Resumen interno en español del modelo económico. Las cifras están en **USD** salvo donde se indique COP.
Complemento de [`UNIT_ECONOMICS_EN.md`](./UNIT_ECONOMICS_EN.md) (versión pública / inversores).

> **Estado (Jun 2026):** precios B2C cerrados en código. **Precios B2B actualizados** a **USD 15/mes**
> y **USD 150/año** (política jun 2026; facturación y onboarding aliados pendiente).

---

## 1. Resumen ejecutivo

Hidden monetiza por dos vías complementarias:

| Línea | Qué es | Precio referencia |
|-------|--------|-------------------|
| **B2C Premium** | Suscripciones viajero | Pase $4.99 · Mensual $7.99 · Anual $79.99 · Vitalicio $149.99 |
| **B2B Refugio verificado / aliado** | Membresía hoteles, hostales, refugios y aliados | **$15/mes** o **$150/año** |

**Escudo B2B:** los ingresos de aliados **no dependen** del costo de adquirir viajeros. A medida que
crece la densidad de anfitriones verificados por territorio, el B2B subsidia servir usuarios Free y el
Premium B2C se convierte en margen neto.

---

## 2. B2B — Nueva política de precios (Jun 2026)

### Planes

| Plan | Precio | Efectivo / mes | Notas |
|------|--------|----------------|-------|
| **Mensual** | **USD 15/mes** | USD 15 | Flexibilidad; cancelación cuando quiera. |
| **Anual** | **USD 150/año** | USD 12,50 | **2 meses gratis** vs. 12× mensual (USD 180 → USD 150). |

Facturación directa (web, transferencia, pasarelas locales) — sin comisión de tiendas de apps.

### Lógica de mercado — Colombia y Latinoamérica

En Colombia, y en promedio en nuestros primeros mercados de expansión en LATAM, **una noche mínima en
un hostal sencillo ronda los COP 50.000** (~USD 14 según TRM ~3.500; oficial ~3.460 jun 2026). Con **un solo huésped que pernocte
una noche**, el aliado ya cubre la membresía mensual de **USD 15**.

Por eso el precio es:

- **Perfectamente pagable** para hostales, hoteles pequeños, glampings y aliados comerciales locales.
- **Psicológicamente invisible**: no es un gasto de marketing, es menos que una reserva.

### Por qué añadimos el plan anual (USD 150)

| Beneficio | Para el aliado | Para Hidden |
|-----------|----------------|-------------|
| Ahorro | 2 meses gratis vs. pagar mes a mes | — |
| Compromiso | Menor fricción de renovación anual | Menor churn |
| Caja | Pago único anual | **Cash inmediato** y LTV más predecible |
| Unit economics | ~17% de descuento efectivo | Mejor velocidad de caja en despliegue territorial |

---

## 3. Qué recibe el aliado B2B

- Badge **Refugio verificado** y/o presencia como **aliado comercial** en catálogo.
- **Prioridad algorítmica** en recomendaciones del agente hiperlocal.
- Derecho a publicar **cupones VIP** en la billetera del viajero.

**Alcance:** eco-alojamientos rurales, hostales, hoteles boutique de naturaleza y aliados comerciales
locales — **no** cadenas hoteleras corporativas de ciudad.

---

## 4. Tamaño de mercado y proyección territorial (Colombia)

| Segmento | Estimación |
|----------|------------|
| Prestadores de alojamiento registrados | **35.000+** |
| Nicho naturaleza / rural + aliados locales | **~15%** |
| **TAM** | **~5.000 establecimientos** |

Proyección a **USD 15/mes** por aliado pagador (MRR a precio de lista):

| Fase | Territorio | Mercado | Captura | Aliados | MRR | ARR |
|------|------------|--------:|--------:|--------:|----:|----:|
| 1 | Valle del Cauca | 350 | 20% | 70 | **USD 1.050** | **USD 12.600** |
| 2 | + Amazonas | 450 | 25% | 112 | **USD 1.680** | **USD 20.160** |
| 3 | + Antioquia | 1.200 | 30% | 360 | **USD 5.400** | **USD 64.800** |
| 4 | + Cundinamarca | 1.800 | 35% | 630 | **USD 9.450** | **USD 113.400** |
| 5 | Nacional (32 dptos.) | 5.000 | 40% | 2.000 | **USD 30.000** | **USD 360.000** |

**Nota:** el plan anual mejora la caja (ej. 30% anual en fase 5 ≈ **USD 90.000** cobrados de golpe por
ciclo de renovación de ~600 aliados) aunque el MRR reconocido por asiento baje a USD 12,50 efectivos.

---

## 5. Filosofía de unit economics (ambas líneas)

- **Margen bruto objetivo ≥70%** (mayor en facturación directa).
- **Costos escalan por destinos en catálogo**, no por número de usuarios (caché de clima/telemetría).
- **Cuotas duras** en planificador, voz y Ranger protegen margen B2C.
- **B2B anclado a economía local** (una noche = una membresía) mejora conversión en ventas de campo.
- **B2C y B2B se refuerzan:** más aliados verificados → mejor catálogo → más Premium viajero → más
  demanda de verificación.
- **Métrica ESG auditable (P2-ESG-01):** inyección económica directa en COP desde canjes de cupón
  en refugios verificados (bitácora) — agregados mensuales en Firestore + script `report:direct-injection`
  para pitch B2G / inversión.

---

## 6. Estado de implementación

| Área | Estado |
|------|--------|
| Política B2B USD 15 / USD 150 | ✅ Documentada jun 2026 |
| B2C precios y límites en código | ✅ Live |
| Facturación B2B + onboarding aliados | ⏳ Planeado |
| RevenueCat / tiendas (B2C) | ⏳ Pendiente |
| Métrica ESG inyección directa (P2-ESG-01) | ✅ Live (jul 2026) |

---

## 7. Referencias cruzadas

| Documento | Contenido |
|-----------|-----------|
| [`UNIT_ECONOMICS_EN.md`](./UNIT_ECONOMICS_EN.md) | Versión pública EN (inversores / partners) |
| [`PREMIUM_ENTITLEMENTS.md`](./PREMIUM_ENTITLEMENTS.md) | Matriz B2C por tier |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Implementación técnica y monetización |

---

*Última actualización: 20 de junio de 2026 — revisión B2B (USD 15/mes, USD 150/año).*
