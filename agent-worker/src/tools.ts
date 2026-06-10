import { llm } from '@livekit/agents';
import type { Room } from '@livekit/rtc-node';
import { z } from 'zod';
import { db } from './firebase.js';
import { expandDepartmentKbIds, fetchDepartmentProfile } from './departmentProfile.js';
import { findDestinationInDocs, normalizeCoordinates } from './geo.js';
import { computeDrivingRoute } from './routes.js';

/** Contexto de sesión para rutas (GPS vive en metadata del participante, no en RunContext). */
export type RouteSessionContext = {
    getUserCoordinates: () => { lat: number; lng: number } | null;
};

/**
 * Factory that creates department-scoped tools.
 * 
 * WHY A FACTORY: The llm.tool() execute callback receives a ToolContext, NOT
 * the JobContext from index.ts.  That means ctx.room is undefined inside tool
 * execution, so dynamically reading the room name at call-time silently fails
 * and returns departmentId = 'general' — which matches zero Firestore docs.
 *
 * By creating tools inside a factory that closes over the already-extracted
 * departmentId, every Firestore query is guaranteed to target the correct
 * department for the entire lifetime of the session.
 */
export function createRouteSessionContext(room: Room): RouteSessionContext {
    return {
        getUserCoordinates: () => {
            for (const p of room.remoteParticipants.values()) {
                if (!p.metadata) continue;
                try {
                    const meta = JSON.parse(p.metadata);
                    const coords = normalizeCoordinates(meta.userCoordinates);
                    if (coords) return coords;
                } catch {
                    /* ignore malformed metadata */
                }
            }
            return null;
        },
    };
}

export function createDepartmentTools(departmentId: string, routeCtx?: RouteSessionContext) {
    const kbIds = expandDepartmentKbIds(departmentId);

    console.log(`[Tools] 🔧 Creating department-scoped tools for: "${departmentId}" (query variants: ${kbIds.join(', ')})`);

    // ─── getDepartmentInfo ───────────────────────────────────────────────
    const getDepartmentInfo = llm.tool({
        description:
            'Obtiene la ficha oficial del departamento en Hidden App: descripción general, logística, temporada ideal, nota de seguridad, ecosistemas, gastronomía típica y tips de exploración. Úsala cuando el usuario pregunte sobre el departamento en general (cultura, clima típico, cómo moverse, qué comer, consejos globales) y no sobre un destino específico.',
        parameters: z.object({}),
        execute: async () => {
            try {
                console.log(`[Tools] 🔎 Fetching department profile for: "${departmentId}"`);
                const department = await fetchDepartmentProfile(db, departmentId);
                if (!department) {
                    return { error: 'No se encontró la ficha del departamento en el catálogo.' };
                }
                console.log(`[Tools] ✅ Department profile loaded: "${department.name || departmentId}"`);
                return { department };
            } catch (error: any) {
                console.error(`[Tools] Error fetching department profile:`, error);
                return { error: 'Error interno al consultar la ficha del departamento.' };
            }
        },
    });

    // ─── getDestinations ─────────────────────────────────────────────────
    const getDestinations = llm.tool({
        description: 'Obtiene la lista completa de destinos registrados para el departamento de la sesión actual de Colombia en Hidden App. Devuelve información crítica como nombre, descripción, actividades, precio, y telemetría. Úsalo SIEMPRE que el usuario pregunte por lugares, atractivos, o a dónde ir.',
        parameters: z.object({}),
        execute: async () => {
            try {
                console.log(`[Tools] 🔎 Fetching destinations for department: "${departmentId}"`);

                const snapshot = await db.collection('destinations')
                    .where('departmentId', 'in', kbIds)
                    .limit(100)
                    .get();

                if (snapshot.empty) {
                    return { error: 'No se encontraron destinos registrados para este departamento.' };
                }

                const destinations = snapshot.docs
                    .map(doc => {
                        const data = doc.data();
                        // Excluir arrays multimedia pesados para ahorrar tokens y mantener la latencia baja
                        delete data.gallery;
                        delete data.galleryImages;
                        delete data.images;
                        delete data.heroImage;
                        delete data.pdf;
                        delete data.pdfFile;
                        return { id: doc.id, ...data } as any;
                    })
                    .filter(dest => dest.status === 'Abierto' || dest.status === true);

                if (destinations.length === 0) {
                    return { error: 'No se encontraron destinos abiertos registrados para este departamento en este momento.' };
                }

                console.log(`[Tools] ✅ Found ${destinations.length} destinations for "${departmentId}"`);
                return { destinations };
            } catch (error: any) {
                console.error(`[Tools] Error fetching destinations:`, error);
                return { error: 'Error interno al consultar la base de datos de destinos.' };
            }
        }
    });

    // ─── getCoupons ──────────────────────────────────────────────────────
    const getCoupons = llm.tool({
        description: 'Obtiene todos los cupones de descuento y promociones activas para el departamento de la sesión actual en Hidden App. Devuelve el código del cupón, porcentaje de descuento y condiciones.',
        parameters: z.object({}),
        execute: async () => {
            try {
                console.log(`[Tools] 🔎 Fetching coupons for department: "${departmentId}"`);

                const snapshot = await db.collection('Coupons')
                    .where('departmentId', 'in', kbIds)
                    .limit(100)
                    .get();

                if (snapshot.empty) return { error: 'No hay cupones activos en este momento.' };
                console.log(`[Tools] ✅ Found ${snapshot.size} coupons for "${departmentId}"`);
                return { coupons: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) };
            } catch (error: any) {
                console.error(`[Tools] Error fetching coupons:`, error);
                return { error: 'Error consultando cupones.' };
            }
        }
    });

    // ─── getEvents ───────────────────────────────────────────────────────
    const getEvents = llm.tool({
        description: 'Obtiene la lista de festivales, ferias y eventos especiales programados para el departamento de la sesión actual. Devuelve fechas, nombres y ubicaciones.',
        parameters: z.object({}),
        execute: async () => {
            try {
                console.log(`[Tools] 🔎 Fetching events for department: "${departmentId}"`);

                const snapshot = await db.collection('Events')
                    .where('departmentId', 'in', kbIds)
                    .limit(100)
                    .get();

                if (snapshot.empty) return { error: 'No hay eventos o ferias registradas actualmente.' };
                console.log(`[Tools] ✅ Found ${snapshot.size} events for "${departmentId}"`);
                return { events: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) };
            } catch (error: any) {
                console.error(`[Tools] Error fetching events:`, error);
                return { error: 'Error consultando eventos.' };
            }
        }
    });

    // ─── checkRouteStatus ────────────────────────────────────────────────
    const checkRouteStatus = llm.tool({
        description:
            'Calcula la ruta de conducción terrestre, duración estimada en tráfico actual, distancia y costo de peajes entre un origen y un destino del catálogo del departamento. Si el usuario dice "desde aquí" o "desde mi ubicación", deja origin vacío para usar su GPS en tiempo real.',
        parameters: z.object({
            origin: z
                .string()
                .optional()
                .describe('Ciudad o lugar de origen. Opcional: si se omite, se usa el GPS del explorador en la sala.'),
            destination: z.string().describe('Nombre del destino de llegada (ej: "San Cipriano", "Lago Calima").'),
            destinationId: z
                .string()
                .optional()
                .describe('ID del destino en Hidden App (ej: "san-cipriano-01") si lo conoces tras getDestinations.'),
        }),
        execute: async ({ origin, destination, destinationId }) => {
            try {
                console.log(
                    `[Tools] 🚗 checkRouteStatus | dept: ${departmentId} | origin: ${origin || 'USER_GPS'} | dest: ${destination}${destinationId ? ` | id: ${destinationId}` : ''}`
                );

                let originLat: number | null = null;
                let originLng: number | null = null;

                if (!origin || origin.trim() === '') {
                    const userCoords = routeCtx?.getUserCoordinates() ?? null;
                    if (userCoords) {
                        originLat = userCoords.lat;
                        originLng = userCoords.lng;
                        console.log(`[Tools] Origin from participant GPS: ${originLat}, ${originLng}`);
                    } else {
                        return {
                            error:
                                'No tengo acceso a tu ubicación GPS en esta llamada. Indícame desde qué ciudad o lugar sales.',
                        };
                    }
                }

                const destSnap = await db
                    .collection('destinations')
                    .where('departmentId', 'in', kbIds)
                    .limit(100)
                    .get();

                const destMatch = findDestinationInDocs(
                    destSnap.docs.map((d) => ({ id: d.id, data: () => d.data() })),
                    destination,
                    destinationId
                );

                let destLat: number | null = destMatch?.lat ?? null;
                let destLng: number | null = destMatch?.lng ?? null;

                if (destMatch) {
                    console.log(
                        `[Tools] Destination resolved: "${destMatch.name}" (${destMatch.docId}) → ${destLat}, ${destLng}`
                    );
                }

                const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_API_KEY;
                if (!apiKey) {
                    return { error: 'La API de rutas está temporalmente inactiva por configuración de servidor.' };
                }

                if (originLat != null && originLng != null && destLat != null && destLng != null) {
                    return await computeDrivingRoute(originLat, originLng, destLat, destLng);
                }

                // Fallback: geocodificar por nombre si faltan coordenadas exactas
                const buildAddressPayload = (label: string) => ({ address: label });

                const requestBody: Record<string, unknown> = {
                    origin:
                        originLat != null && originLng != null
                            ? { location: { latLng: { latitude: originLat, longitude: originLng } } }
                            : buildAddressPayload(origin!.trim()),
                    destination:
                        destLat != null && destLng != null
                            ? { location: { latLng: { latitude: destLat, longitude: destLng } } }
                            : buildAddressPayload(destination),
                    travelMode: 'DRIVE',
                    routingPreference: 'TRAFFIC_AWARE',
                    computeAlternativeRoutes: false,
                    languageCode: 'es-CO',
                    units: 'METRIC',
                    extraComputations: ['TOLLS'],
                };

                const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Goog-Api-Key': apiKey.trim(),
                        'X-Goog-FieldMask':
                            'routes.duration,routes.distanceMeters,routes.travelAdvisory.tollInfo,routes.routeLabels',
                    },
                    body: JSON.stringify(requestBody),
                });

                if (!response.ok) {
                    const text = await response.text();
                    console.error('[Tools] Google Routes API Error:', text);
                    return {
                        error: 'No se pudo trazar la ruta. Verifica el nombre del destino o activa tu ubicación.',
                    };
                }

                const data = (await response.json()) as { routes?: unknown[] };
                return { routes: data.routes ?? { message: 'No routes found' } };
            } catch (error: any) {
                console.error(`[Tools] Error calculating routes:`, error);
                return { error: 'Error interno al calcular la ruta terrestre.' };
            }
        },
    });

    // ─── getNews ──────────────────────────────────────────────────────────
    const getNews = llm.tool({
        description: 'Obtiene las noticias y artículos informativos más recientes publicados para el departamento de la sesión actual. Devuelve títulos, resúmenes, categorías y contenido editorial. Úsalo cuando el usuario pregunte por noticias, novedades, artículos o información de interés sobre la región.',
        parameters: z.object({}),
        execute: async () => {
            try {
                console.log(`[Tools] 🔎 Fetching news for department: "${departmentId}"`);

                const snapshot = await db.collection('News')
                    .where('departmentId', 'in', kbIds)
                    .limit(50)
                    .get();

                if (snapshot.empty) return { error: 'No hay noticias publicadas actualmente para este departamento.' };

                const news = snapshot.docs.map(doc => {
                    const data = doc.data();
                    // Excluir arrays multimedia pesados para ahorrar tokens
                    delete data.image;
                    delete data.authorAvatar;
                    return { id: doc.id, title: data.tittle, summary: data.summary, content: data.content, category: data.category, badge: data.badge, author: data.author };
                });

                console.log(`[Tools] ✅ Found ${news.length} news articles for "${departmentId}"`);
                return { news };
            } catch (error: any) {
                console.error(`[Tools] Error fetching news:`, error);
                return { error: 'Error consultando noticias.' };
            }
        }
    });

    // ─── getRefugios ──────────────────────────────────────────────────────
    const getRefugios = llm.tool({
        description: 'Obtiene la lista de alojamientos y hospedajes (glampings, hostales, camping, cabañas, eco-lodges, hoteles) registrados y verificados para el departamento de la sesión actual en Hidden App. Devuelve el nombre, ubicación, descripción, comodidades, tarifas y formas de reserva. Úsalo cuando el usuario pregunte por dónde dormir, hospedaje, hoteles o alojamiento.',
        parameters: z.object({
            destinationId: z.string().optional().describe('El ID único del destino (ej: "san-cipriano-01") para filtrar los hospedajes. Si se omite, se devuelven todos los del departamento.')
        }),
        execute: async ({ destinationId }) => {
            try {
                console.log(`[Tools] 🔎 Fetching refugios for department: "${departmentId}"${destinationId ? `, destinationId filter: "${destinationId}"` : ''}`);

                const snapshot = await db.collection('refugios')
                    .where('departmentId', 'in', kbIds)
                    .limit(100)
                    .get();

                if (snapshot.empty) return { error: 'No hay hospedajes o refugios registrados actualmente para este departamento.' };

                let refugios = snapshot.docs.map(doc => {
                    const data = doc.data();
                    // Excluir arrays multimedia pesados para ahorrar tokens y mantener la latencia baja
                    delete data.gallery;
                    delete data.galleryImages;
                    delete data.images;
                    delete data.heroImage;
                    return { id: doc.id, ...data } as any;
                }).filter(r => r.status === 'Activo' || r.status === true);

                if (destinationId) {
                    const normalizedQuery = destinationId.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                    refugios = refugios.filter((r: any) => {
                        const dests = Array.isArray(r.destinationId) ? r.destinationId : [r.destinationId];
                        return dests.some((d: any) => {
                            if (!d) return false;
                            const normalizedDest = d.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                            return normalizedDest.includes(normalizedQuery) || normalizedQuery.includes(normalizedDest);
                        });
                    });

                    if (refugios.length === 0) {
                        return { error: `No se encontraron hospedajes abiertos y activos vinculados al destino "${destinationId}" en este momento.` };
                    }
                }

                console.log(`[Tools] ✅ Found ${refugios.length} refugios for "${departmentId}"`);
                return { refugios };
            } catch (error: any) {
                console.error(`[Tools] Error fetching refugios:`, error);
                return { error: 'Error consultando hospedajes.' };
            }
        }
    });

    return { getDepartmentInfo, getDestinations, getCoupons, getEvents, getNews, checkRouteStatus, getRefugios };
}
