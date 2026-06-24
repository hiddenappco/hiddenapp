# Hidden App — UI field constraints (piloto / P0)

Checklist heurístico para uso a una mano, zonas sin señal y pantallas OLED prolongadas.  
Referencia producto: `roadmap_producto_voz_usuario.md` → `P0-SYSTEM-CONSTRAINTS` · `P0-THUMB-NAV` ✅ Jun 2026.

## Reglas obligatorias

| Regla | Especificación | Utilidad CSS |
|-------|----------------|--------------|
| **Área táctil** | Controles críticos ≥ **44×44 px** | `.touch-target` en `index.css` |
| **Zona inferior (pulgar)** | Hubs principales accesibles desde **barra inferior** | `BottomNav` + `utils/bottomNav.ts` |
| **Zona inferior (CTAs)** | Acciones primarias de pantalla en el **tercio inferior** del scroll o barra superior cuando el FAB choca con nav | `fixed bottom-*`, `pb-safe`, `.bottom-nav-scroll-pad` |
| **Dark OLED-friendly** | Fondos profundos en expedición prolongada | `--color-bg-dark: #0D1B2A` (no `#000` global) |
| **Glass surfaces** | Barras flotantes, modales, badges offline | `.glass-surface`, `.glass-pill`, `.bottom-nav-glass` |
| **Carga coherente** | Sin flash blanco; skeleton o spinner sobre `bg-background-dark` | `RouteLoadingFallback`, `ContentSkeleton` |
| **Code splitting** | Pantallas secundarias en chunks lazy | `components/layout/lazyPages.ts` + `Suspense` en `AnimatedLayoutOutlet` |

## BottomNav (P0-THUMB-NAV) ✅

| Aspecto | Valor |
|---------|-------|
| **Tabs** | Destinos · Monitor · Deptos · Bitácora · Refugios |
| **Rutas** | `/home`, `/environmental-monitor`, `/search`, `/budget`, `/refugios` (match exacto) |
| **Oculto en** | Detalles, chat, Live, expedición, login, drawer abierto |
| **Safe area** | `.bottom-nav-host` = `0.875rem` + `env(safe-area-inset-bottom)` |
| **Scroll pad** | `.bottom-nav-scroll-pad` — padding inferior para listas/CTAs |
| **Tokens** | `--bottom-nav-edge-gap`, `--bottom-nav-bar-height`, `--bottom-nav-content-gap` |
| **Activo** | Icono + etiqueta naranja + subrayado (sin glow de fondo en iconos) |
| **Android back** | Tab hub ≠ `/home` → `/home`; en `/home` → minimizar app |

**Archivos:** `components/BottomNav.tsx`, `components/layout/Layout.tsx`, `utils/bottomNav.ts`, `hooks/useCapacitorHardware.ts`, `index.css`.

## Rendimiento y carga (T18 / T29-A5) ✅ Jun 2026

| Patrón | Implementación |
|--------|----------------|
| **Lazy routes** | ~40 pantallas en `lazyPages.ts`; hubs `/home` y `/budget` eager |
| **Suspense** | `AnimatedLayoutOutlet` → `RouteLoadingFallback` (fondo oscuro) |
| **Transiciones** | `PageTransition` / `AnimatedLayoutOutlet` con `bg-background-dark` |
| **Skeletons listas** | `ContentSkeleton.tsx` — Home, búsqueda, refugios, noticias, cupones, ferias, expedición picker |
| **Skeletons detalle** | `PageDetailSkeleton` — destino, departamento, cupón, refugio, feria, noticia, monitor, historial viaje |

**Archivos:** `components/layout/RouteLoadingFallback.tsx`, `components/layout/lazyPages.ts`, `components/ui/ContentSkeleton.tsx`.

## Pantallas auditadas (Jun 2026)

| Pantalla | Estado | Notas |
|----------|--------|-------|
| `SignalLostFallback` | ✅ | CTAs `touch-target` h-12, copy unificado `connectivity.*` |
| `OffGridVault` | ✅ | Banner conectividad, modales descarga, badge Wi‑Fi/celular/offline |
| `BottomNav` | ✅ | 5 tabs; glass + safe-area; rutas en `bottomNav.ts` |
| `Budget` (Bitácora) | ✅ | Sin FAB; fila superior Conversor TRM · Unirse · Crear viaje |
| `CreateTrip` | ✅ | Toggle viaje grupal (`w-11 h-6`, thumb `size-5`, `overflow-hidden`) |
| `ExpeditionWizard` | ✅ | 5 pasos; paso 2 transporte terrestre obligatorio; `touch-target` en opciones de movilidad |
| `ExpeditionDepartmentPicker` | ✅ | Skeleton departamentos; back `touch-target` |
| `DepartmentBriefing` | ✅ | Barra dual CTA + glass; CTA «Planificar aquí» → hub con dept preseleccionado; skeleton detalle |
| `NavigationMenu` | ✅ | Departamentos · Destinos; Perfil en sección inferior |
| `TripExpenses` | ✅ | `touch-target` en back, conversor, categorías, split, modal CTAs |
| `JoinTrip` | ✅ | `touch-target` en back, toggles modo, CTA unirse |
| `CurrencyConverter` | ✅ | `touch-target` en back y swap |
| `LiveAgent` | ✅ | `touch-target` en back, iniciar llamada, colgar; `ControlBar` mute/hangup/record |
| `Premium` | ✅ | Tooltips `?` (portal viewport-safe); light + desktop layout; CTAs tienda deshabilitados hasta stores |
| `Profile` | ✅ | Badge ID copiable (`ProfileUserIdBadge`) |
| `Budget` / `TripHistoryDetail` | ✅ | Modo claro; hint historial offline |
| `Home` / `ManualSearch` / `Refugios` / `NewsFeed` / `Coupons` | ✅ | `bottom-nav-scroll-pad`; ranking búsqueda (`rankLocalizedSearch`); skeletons en carga |
| `DestinationDetail` | ✅ | Access-time chips; packing checklist toggles; hooks before early returns |
| `HiddenPact` / `PactGate` | ✅ | Gate mode sin menú; spinner mientras carga perfil; redirect si ya aceptó |
| `SettingsHub` / `AppSettings` | ✅ | Hub condicional; segment controls tema/idioma; enlaces legal + FAQ |
| `TripExpenses` (grupo) | ✅ | `TripSyncBanner` + `TripConflictHint` dismissible |

## Conectividad (P0-OFFLINE-COPY)

- **`connectivity.offline.*`** — sin señal; bóveda + bitácora activas.
- **`connectivity.server.*`** — dispositivo online pero servidores Hidden no alcanzables.
- **`ConnectivityBanner`** — bóveda y futuras pantallas.
- **`OfflineGuardian`** — `offline` vs `server` vía `useServerReachability`.
- **Desktop Wi‑Fi (Jun 2026):** `useNetworkDetails` usa solo `connection.type` — no confundir `effectiveType: 4g` (throughput) con datos móviles.

## Transparencia de datos (P0-DATA-TRANSPARENCY)

- Tamaño pack antes de descargar (`formatPackSize` + modal).
- Advertencia en **datos móviles** (`useNetworkDetails().isCellular`).
- **Gemma 4**: solo Wi‑Fi + modal de confirmación (~**1.29 GB** `.bin`); botón **Liberar** desinstala modelo.
- Estado «compilando pack» cuando no hay `sizeBytes`.

## Tooltips y onboarding (P0) ✅ Jun 2026

| ID | Componente | Pantallas |
|----|------------|-----------|
| `P0-PREMIUM-TOOLTIPS` | `HelpTooltip.tsx` | `/premium` — tipos de cuenta, comparativa, planes; **portal** + clamp al viewport (no recorte lateral) |
| `P0-TOOLTIP-ONCE` | `FeatureCoachmark.tsx` + `useFeatureTooltip.ts` | Bóveda, Monitor Ranger, Live, hub planificador (una vez; `localStorage`) |

**Archivos:** `components/ui/HelpTooltip.tsx`, `components/ui/FeatureCoachmark.tsx`, `hooks/useFeatureTooltip.ts`.

## Cómo extender

1. Usar `touch-target` en botones/iconos nuevos.
2. Preferir `glass-surface` para barras flotantes (ver `DepartmentBriefing`, `DataConfirmModal`).
3. Mensajes de red siempre desde `locales` → namespace `connectivity`.
4. Descargas grandes → `DataConfirmModal` + chequeo `useNetworkDetails`.
5. Pantallas nuevas → registrar en `lazyPages.ts` (no import eager en `AppRoutes`).
6. Listas Firestore → skeleton de `ContentSkeleton`, nunca pantalla vacía ni texto suelto «Cargando…» en hubs.
