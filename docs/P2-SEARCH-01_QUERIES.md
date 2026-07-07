# P2-SEARCH-01 — Queries de regresión (búsqueda unificada)

Motor compartido: `rankLocalizedSearch` vía `hooks/useLocalizedSearch.ts`.  
Normalización: acentos (`malaga` → `Málaga`), scoring por prefijo en título > palabra > substring.

Ejecutar cada query en **todas** las pantallas indicadas; el ítem debe **aparecer** y, cuando hay varios hits, el mejor match debe ir **primero**.

| # | Query | Pantallas | Resultado esperado |
|---|--------|-----------|-------------------|
| 1 | `malaga` | ManualSearch, EnvironmentalMonitor | **Bahía Málaga** (o destino con «Málaga» en título/ubicación) en top 3 |
| 2 | `bahia malaga` | ManualSearch | Mismo destino; ambos tokens deben coincidir |
| 3 | `eco` | Refugios | Refugios cuyo **nombre/tipo** empieza por «eco» antes que solo mención en descripción |
| 4 | `glamping` | Refugios (filtro «all») | Tipo glamping priorizado en título/nombre |
| 5 | `cali` | Coupons | Cupones con «Cali» en título o ubicación |
| 6 | `restaurant` | Coupons (categoría all) | Cupones categoría restaurante o título con coincidencia |
| 7 | `turismo` | NewsFeed | Noticias categoría/título turismo |
| 8 | `alerta` | NewsFeed | Noticias alertas (sin acento en query) |
| 9 | `festival` | FairsCalendar | Feria/evento con «festival» en nombre o subtítulo |
| 10 | `pacifico` | FairsCalendar + ManualSearch | Eventos/destinos costa Pacífico en resultados (no «sin resultados» por acento) |

**Pantallas cubiertas:** `ManualSearch`, `Refugios`, `Coupons`, `NewsFeed`, `FairsCalendar`, `EnvironmentalMonitor`, `ExpeditionMustVisitPicker` (mismo motor, límite 8 resultados).

**Fuera de alcance:** `OffGridVault` (SQLite local), chat/knowledge en Cloud Functions (`matchesLocalizedSearch`).
