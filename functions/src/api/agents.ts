import { onRequest } from "firebase-functions/v2/https";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { db, admin } from "../config/firebase";
import { ENV } from "../config/env";
import {
    getWeatherData,
    getOpenMeteoAirQuality,
    getOpenMeteoCloudCover,
    getElevationData,
    getGoogleAirQuality,
    getMarineData
} from "./weather";
import { getRouteAnalysis } from "./routes";
import { expandDepartmentKbIds, resolveDepartmentContext } from "../lib/departmentProfile";
import { findDestinationCoords, mapDestinationForAgent } from "../lib/geo";
import {
    buildWidgetCatalog,
    sanitizeChatWidgets,
    enrichChatWidgets,
} from "../lib/chatWidgets";
import { runRangerAdk } from "../adk/ranger/run";
import { runChatAdk } from "../adk/chat/run";
import { buildChatSessionBriefing, buildChatAgentInstruction, buildLanguageDirective } from "../adk/chat/briefing";
import { parseAgentJsonResponse } from "../adk/parseJson";
import {
    localizeCoupon,
    localizeDepartment,
    localizeDestination,
    localizeEvent,
    localizeNewsArticle,
    localizeRefugio,
} from "../lib/localizeCatalog";
import { AuthError, requireAuthUid } from "../lib/verifyAuth";

let genAIInstance: GoogleGenerativeAI | null = null;
const getGenAI = () => {
    if (!genAIInstance) {
        const apiKey = process.env.GEMINI_API_KEY || ENV.GEMINI_API_KEY;
        genAIInstance = new GoogleGenerativeAI(apiKey);
    }
    return genAIInstance;
};

function normalizeDestinationActivities(raw: unknown): string[] {
    if (!raw) return [];
    if (Array.isArray(raw)) {
        return raw.map((item, index) => {
            if (typeof item === 'string') return item.trim() || `Actividad ${index + 1}`;
            if (item && typeof item === 'object') {
                const o = item as Record<string, unknown>;
                const label = o.label ?? o.name ?? o.title ?? o.activity;
                return typeof label === 'string' && label.trim() ? label.trim() : `Actividad ${index + 1}`;
            }
            return `Actividad ${index + 1}`;
        });
    }
    if (typeof raw === 'string') {
        try {
            const parsed = JSON.parse(raw);
            return normalizeDestinationActivities(parsed);
        } catch {
            return raw.trim() ? [raw.trim()] : [];
        }
    }
    return [];
}

export const environmentalAgent = onRequest({
    cors: true,
    timeoutSeconds: 120,
    memory: "1GiB",
    secrets: ["GOOGLE_MAPS_API_KEY", "GEMINI_API_KEY", "ACCUWEATHER_API_KEY", "STORMGLASS_API_KEY"]
}, async (req, res) => {
    try {
        res.set('Access-Control-Allow-Origin', '*');

        let userId: string;
        try {
            userId = await requireAuthUid(req);
        } catch (err) {
            if (err instanceof AuthError) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }
            throw err;
        }

        const { destinationId, destinationName, coordinates, userQuery, cachedTelemetry, language: uiLanguage } = req.body;
        const outputLang = uiLanguage === 'en' ? 'en' : 'es';
        console.log(`[environmentalAgent] Incoming request for: ${destinationName || destinationId} | Query: ${userQuery ? 'YES' : 'NO'}`);

        if (!coordinates?.lat || !coordinates?.lng) {
            res.status(400).json({ error: "Missing coordinates" });
            return;
        }

        let destinationData = null;
        if (destinationId) {
            const destDoc = await db.collection('destinations').doc(destinationId).get();
            if (destDoc.exists) {
                destinationData = destDoc.data();
            }
        }

        let firstName = "Aventurero";
        let explorerProgressBlock = "Sin datos de progreso del explorador en este destino.";
        if (userId) {
            const userDoc = await db.collection('users').doc(userId).get();
            if (userDoc.exists) {
                const uData = userDoc.data();
                const uName = uData?.name || uData?.displayName || "Aventurero";
                firstName = uName.split(' ')[0];

                if (destinationId) {
                    const completed: number[] = Array.isArray(uData?.completedActivities?.[destinationId])
                        ? uData.completedActivities[destinationId]
                        : [];
                    const activityLabels = normalizeDestinationActivities(destinationData?.activities);
                    const items = activityLabels.map((label, index) => ({
                        index,
                        label,
                        done: completed.includes(index),
                    }));
                    const pending = items.filter((a) => !a.done).map((a) => a.label);
                    const done = items.filter((a) => a.done).map((a) => a.label);
                    explorerProgressBlock = JSON.stringify(
                        {
                            total: activityLabels.length,
                            completedCount: done.length,
                            completed: done,
                            pending,
                            items,
                        },
                        null,
                        2
                    );
                }
            }
        }

        let telemetry = cachedTelemetry;

        if (!telemetry) {
            const [weather, openMeteoAqi, openMeteoCloud, elevation] = await Promise.all([
                getWeatherData(coordinates.lat, coordinates.lng),
                getOpenMeteoAirQuality(coordinates.lat, coordinates.lng),
                getOpenMeteoCloudCover(coordinates.lat, coordinates.lng),
                getElevationData(coordinates.lat, coordinates.lng)
            ]);

            let aqiValue = openMeteoAqi;
            if (aqiValue === null || aqiValue === undefined || aqiValue === 0) {
                aqiValue = await getGoogleAirQuality(coordinates.lat, coordinates.lng);
            }
            if (aqiValue === null || aqiValue === undefined || aqiValue === 0) {
                aqiValue = weather?.aqi ?? 0;
            }

            telemetry = {
                temp: weather?.temperature?.value ?? null,
                condition: weather?.conditionText ?? "Estable",
                rainProb: weather?.precipitation?.probability ?? 0,
                rainVol: weather?.precipitation?.amount ?? 0,
                uvIndex: weather?.uvIndex ?? 0,
                aqi: aqiValue,
                humidity: weather?.humidity ?? null,
                feelsLike: weather?.feelsLike?.value ?? null,
                windSpeed: weather?.wind?.speed?.value ?? null,
                windGust: weather?.wind?.gust ?? null,
                visibility: weather?.visibility ?? null,
                pressure: weather?.pressure ?? null,
                cloudCover: openMeteoCloud ?? weather?.cloudCover ?? 0,
                cloudCeiling: weather?.cloudCeiling ?? null,
                dewPoint: weather?.dewPoint ?? null,
                weatherCode: weather?.weatherCode ?? null,
                elevation: elevation ?? null,
                daily: weather?.daily ?? null,
                forecast24h: {
                    rain: weather?.precipitation?.hourly || [],
                    temp: weather?.hourly?.temp || [],
                    wind: weather?.hourly?.wind || []
                }
            };

            console.log(`[environmentalAgent] Destination Data for ${destinationId}:`, JSON.stringify(destinationData));
            
            const coastalVal = String(destinationData?.isCoastal || "").trim().toLowerCase();
            const isCoastal = coastalVal === "sí" || coastalVal === "si";

            if (isCoastal) {
                console.log(`[environmentalAgent] Coastal flag "Sí" confirmed for ${destinationName || destinationId}. Fetching Stormglass...`);
                const marineData = await getMarineData(coordinates.lat, coordinates.lng);
                if (marineData) {
                    telemetry.marine = marineData;
                } else {
                    console.warn(`[environmentalAgent] Stormglass returned null for ${destinationName}`);
                }
            } else {
                console.log(`[environmentalAgent] Destination ${destinationName} is NOT marked as coastal (Found: "${destinationData?.isCoastal}")`);
            }
        } else {
            console.log(`[environmentalAgent] Using cached telemetry for ${destinationName || destinationId}`);
            if (telemetry && (telemetry.elevation === undefined || telemetry.elevation === null)) {
                console.log("[environmentalAgent] Cached telemetry missing elevation. Fetching fresh elevation data...");
                telemetry.elevation = await getElevationData(coordinates.lat, coordinates.lng);
            }
            const coastalVal = String(destinationData?.isCoastal || "").trim().toLowerCase();
            const isCoastal = coastalVal === "sí" || coastalVal === "si";

            if (telemetry && !telemetry.marine && isCoastal) {
                console.log("[environmentalAgent] Cached telemetry missing marine data. Fetching Stormglass...");
                const marineData = await getMarineData(coordinates.lat, coordinates.lng);
                if (marineData) telemetry.marine = marineData;
            }
        }

        console.log(`[environmentalAgent] Telemetry ready, fetching assistant config...`);

        const assistantDoc = await db.collection('assistants').doc('environmental-monitor').get();
        const assistantData = assistantDoc.exists ? assistantDoc.data() : null;

        const basePrompt = assistantData?.systemPrompt || `
        ESTÁS MONITOREANDO: {{DESTINATION}}
        FECHA/HORA LOCAL: {{CURRENT_DATE_TIME}}
        DÍA DE LA SEMANA: {{CURRENT_DAY}}
        TELEMETRÍA ACTUAL: {{TELEMETRY}}
        DATOS DEL DESTINO: {{DESTINATION_DATA}}
        CONSULTA: {{USER_QUERY}}
        
        INSTRUCCIONES: Responde basándote en los datos anteriores. Dirígete directamente al usuario por su nombre ({{USER_NAME}}). No uses palabras genéricas como "aventurero" o "viajero". Usa **negritas** para resaltar datos críticos (temperatura, riesgo de lluvia, etc.). Sé táctico y profesional. No utilices la palabra "Pro-tip".
        `;

        const languageBlock = outputLang === 'en'
            ? `\n\n### IDIOMA DE SALIDA (ESPEJO DE LA APP) ###\nGenera el campo "message" EXCLUSIVAMENTE en inglés (English). La consulta del usuario puede llegar en otro idioma; responde igual en el idioma configurado en la app.`
            : `\n\n### IDIOMA DE SALIDA (ESPEJO DE LA APP) ###\nGenera el campo "message" EXCLUSIVAMENTE en español. La consulta del usuario puede llegar en otro idioma; responde igual en el idioma configurado en la app.`;

        const localTimeStr = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota', hour12: true });
        const now = new Date();
        const options: Intl.DateTimeFormatOptions = {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: true,
            timeZone: 'America/Bogota'
        };
        const currentDateTime = now.toLocaleDateString('es-ES', options);
        const currentDay = now.toLocaleDateString('es-ES', { weekday: 'long', timeZone: 'America/Bogota' });

        let marineContext = "";
        if (telemetry.marine) {
            marineContext = `
            \n--- CONTEXTO OCEANOGRÁFICO (HOY Y MAÑANA) ---
            Usa estos datos para dar consejos de seguridad marítima actuales y preventivos:
            - Estado Actual: ${telemetry.marine.currentStatus} (hacia ${telemetry.marine.nextEvent?.type === 'high' ? 'Pleamar' : 'Bajamar'}).
            - Próximo Extremo: ${telemetry.marine.nextEvent?.type === 'high' ? 'Pleamar' : 'Bajamar'} a las ${telemetry.marine.nextEvent?.time}.
            - Mañana: Pleamar a las ${telemetry.marine.tomorrow?.nextHighTide || 'N/A'}, Bajamar a las ${telemetry.marine.tomorrow?.nextLowTide || 'N/A'}.
            
            Interpretación Táctica:
            - Oleaje: >1.2m es precaución, >2.0m es peligro para lanchas pequeñas.
            - Periodo de Ola: <6s es mar picado, >9s es mar cómodo (ondas largas).
            - Temperatura del Agua: Informa si está agradable para bañistas (24-28°C es ideal).
            - Corriente: >3km/h es fuerte para nadadores promedio.
            - COMBINA DATOS: Si hoy hay buen tiempo pero mañana la marea alta es muy temprano, avisa al usuario para que planifique su salida.
            `;
        }

        const explorerContext = `\n\n### PROGRESO DEL EXPLORADOR EN ESTE DESTINO ###\n${explorerProgressBlock}\nUsa las actividades pendientes para recomendar qué hacer según el clima actual. No inventes actividades que no estén en la lista.`;

        const finalPrompt = (buildLanguageDirective(outputLang) + '\n\n' + basePrompt + marineContext + languageBlock + explorerContext)
            .replace('{{DESTINATION}}', destinationName || destinationId || 'esta área')
            .replace('{{TELEMETRY}}', JSON.stringify(telemetry))
            .replace('{{DESTINATION_DATA}}', destinationData ? JSON.stringify(destinationData) : 'No hay datos adicionales del destino.')
            .replace('{{LOCAL_TIME}}', localTimeStr)
            .replace('{{CURRENT_DATE_TIME}}', currentDateTime)
            .replace('{{CURRENT_DAY}}', currentDay)
            .replace('{{USER_NAME}}', firstName)
            .replace('{{USER_QUERY}}', userQuery ? `"${userQuery}"` : "Ninguna");

        const responseSchema: any = {
            type: SchemaType.OBJECT,
            properties: {
                message: { type: SchemaType.STRING, description: "The tactical advice text" },
                telemetry: {
                    type: SchemaType.OBJECT,
                    properties: {
                        temp: { type: SchemaType.NUMBER },
                        condition: { type: SchemaType.STRING },
                        rainProb: { type: SchemaType.NUMBER },
                        uvIndex: { type: SchemaType.NUMBER },
                        aqi: { type: SchemaType.NUMBER },
                        humidity: { type: SchemaType.NUMBER },
                        feelsLike: { type: SchemaType.NUMBER },
                        windSpeed: { type: SchemaType.NUMBER },
                        visibility: { type: SchemaType.NUMBER },
                        pressure: { type: SchemaType.NUMBER },
                        cloudCover: { type: SchemaType.NUMBER },
                        elevation: { type: SchemaType.NUMBER }
                    }
                }
            },
            required: ["message"]
        };

        let parsedResponse: Record<string, unknown>;

        try {
            const adkResult = await runRangerAdk(finalPrompt, userId || 'hidden-ranger');
            parsedResponse = { message: adkResult.message, ...adkResult.raw };
            console.log(`[environmentalAgent] ADK Ranger ok for ${destinationName || destinationId}`);
        } catch (adkError) {
            console.warn('[environmentalAgent] ADK fallback to legacy SDK:', adkError);

            const model = getGenAI().getGenerativeModel({
                model: "gemini-2.5-flash",
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema: responseSchema
                }
            });

            const result = await model.generateContent([{ text: finalPrompt }]);
            let textResponse = result.response.text().replace(/```json/g, "").replace(/```/g, "").trim();
            parsedResponse = parseAgentJsonResponse(textResponse);
        }

        try {
            if (parsedResponse.message && typeof parsedResponse.message === 'string') {
                if (parsedResponse.message.trim().startsWith('{')) {
                    try {
                        const inner = JSON.parse(parsedResponse.message);
                        if (inner.message) parsedResponse.message = inner.message;
                    } catch (e) { /* ignore */ }
                }
            }

            console.log(`[environmentalAgent] Response sent for ${destinationName || destinationId}`);

            const finalTelemetry = {
                ...telemetry,
                elevation: telemetry.elevation ?? null,
                marine: telemetry.marine || null
            };

            console.log(`[environmentalAgent] Integrity Check - Marine Data present: ${!!finalTelemetry.marine}`);
            console.log(`[environmentalAgent] Final Telemetry for ${destinationName}:`, JSON.stringify(finalTelemetry));
            
            res.json({
                ...parsedResponse,
                telemetry: finalTelemetry
            });
        } catch (parseError) {
            console.error("JSON Parse Error from agent response:", parseError);
            res.json({
                message: "⚠️ Error de análisis táctico. Consulta los widgets de telemetría para más seguridad.",
                telemetry: {
                    ...telemetry,
                    marine: telemetry.marine || null
                }
            });
        }

    } catch (error) {
        console.error("Error in environmentalAgent:", error);
        res.status(500).json({ error: "Internal Error" });
    }
});

export const chatAgent = onRequest({
    cors: true,
    secrets: ["GOOGLE_MAPS_API_KEY", "GEMINI_API_KEY", "ACCUWEATHER_API_KEY", "STORMGLASS_API_KEY"]
}, async (req, res) => {
    try {
        let userId: string;
        try {
            userId = await requireAuthUid(req);
        } catch (err) {
            if (err instanceof AuthError) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }
            throw err;
        }

        const { message, departmentId, chatId: reqChatId, coordinates, language: uiLanguage } = req.body as any;
        const appLanguage: 'es' | 'en' = uiLanguage === 'en' ? 'en' : 'es';

        if (!message || !departmentId) {
            res.status(400).json({ error: "Missing message or departmentId" });
            return;
        }

        const incomingDepartmentId = departmentId;
        const { canonicalId, profile: departmentProfile, assistantDocId, kbIds: resolvedKbIds } =
            await resolveDepartmentContext(db, incomingDepartmentId);

        console.log(
            `[chatAgent] Incoming for user ${userId} | raw: ${incomingDepartmentId} | canonical: ${canonicalId} | lang: ${appLanguage}`
        );

        // Preserve chat thread key (legacy doc ids in URLs keep the same history path)
        const chatId = reqChatId || incomingDepartmentId;

        const assistantDoc = await db.collection('assistants').doc(assistantDocId).get();
        let assistantData = assistantDoc.exists ? assistantDoc.data() : null;

        if (!assistantData) {
            assistantData = {
                name: "Guía Hidden",
                tone: "Amable, práctico y entusiasta",
                systemPrompt: "Eres un guía de expedición experto en los paraísos escondidos de Colombia. Tu tono es cercano, aventurero y muy práctico. No hables como un sistema de seguridad formal, sino como un amigo experto que cuida al viajero.",
                knowledgeBaseIds: [canonicalId]
            };
        }

        const systemPrompt = assistantData?.systemPrompt || "Eres un experto en viajes.";
        const assistantName = assistantData?.name || "Hidden Agent";
        const assistantTone = assistantData?.tone || "Profesional y amable";

        const kbIds = [...new Set([
            ...resolvedKbIds,
            ...(Array.isArray(assistantData?.knowledgeBaseIds) ? assistantData.knowledgeBaseIds : [canonicalId]),
            ...expandDepartmentKbIds(canonicalId),
        ])];

        const [destSnap, newsSnap, couponSnap, eventSnap, refugiosSnap, historySnap, userSnap] = await Promise.all([
            db.collection('destinations').where('departmentId', 'in', kbIds).limit(500).get(),
            db.collection('News').where('departmentId', 'in', kbIds).limit(500).get(),
            db.collection('Coupons').where('departmentId', 'in', kbIds).limit(500).get(),
            db.collection('Events').where('departmentId', 'in', kbIds).limit(500).get(),
            db.collection('refugios').where('departmentId', 'in', kbIds).limit(500).get(),
            db.collection('users').doc(userId).collection('chats').doc(chatId).collection('messages')
                .orderBy('createdAt', 'desc').limit(50).get(),
            db.collection('users').doc(userId).get(),
        ]);

        let firstName = "Aventurero";
        if (userSnap.exists) {
            const uData = userSnap.data();
            const uName = uData?.name || uData?.displayName || "Aventurero";
            firstName = uName.split(' ')[0];
        }

        const localizedDepartmentProfile = departmentProfile
            ? localizeDepartment(departmentProfile as Record<string, unknown>, appLanguage)
            : null;

        if (localizedDepartmentProfile) {
            console.log(`[chatAgent] Department profile loaded: ${(localizedDepartmentProfile as { name?: string }).name || canonicalId}`);
        } else {
            console.warn(`[chatAgent] No department profile found for: ${incomingDepartmentId} (canonical: ${canonicalId})`);
        }

        const destinationsForAgent = destSnap.docs.map((doc) => {
            const raw = mapDestinationForAgent(doc.id, doc.data() as Record<string, unknown>);
            return localizeDestination(raw, appLanguage) as typeof raw;
        });

        const context = {
            department: localizedDepartmentProfile,
            destinations: destinationsForAgent,
            refugios: refugiosSnap.docs.map(doc => {
                const data = doc.data();
                delete data.gallery;
                delete data.galleryImages;
                delete data.images;
                delete data.heroImage;
                const raw = { id: doc.id, ...data };
                return localizeRefugio(raw, appLanguage);
            }).filter((r: any) => r.status === 'Activo' || r.status === true),
            news: newsSnap.docs.map(doc =>
                localizeNewsArticle({ id: doc.id, ...(doc.data() as Record<string, unknown>) }, appLanguage)
            ),
            coupons: couponSnap.docs.map(doc =>
                localizeCoupon({ id: doc.id, ...(doc.data() as Record<string, unknown>) }, appLanguage)
            ),
            events: eventSnap.docs.map(doc =>
                localizeEvent({ id: doc.id, ...(doc.data() as Record<string, unknown>) }, appLanguage)
            )
        };

        const historyRows = historySnap.docs.map(doc => doc.data()).reverse();
        const historyContext = historyRows.map(row => `${row.role === 'user' ? 'User' : 'Assistant'}: ${row.content}`).join('\n');

        const tools: any = [{
            functionDeclarations: [{
                name: "checkRouteStatus",
                description: "Utiliza esta herramienta SIEMPRE que el usuario pregunte por rutas, tráfico, tiempos de viaje o peajes hacia un destino del catálogo. NUNCA inventes distancias ni tiempos.",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                        destinationName: { type: SchemaType.STRING, description: "Nombre del destino tal como aparece en la base de conocimiento (destinations)." },
                        destinationId: { type: SchemaType.STRING, description: "ID del destino en Hidden App (opcional, más preciso)." },
                        destinationLat: { type: SchemaType.NUMBER, description: "Opcional: coordinates.lat del destino si ya lo tienes." },
                        destinationLng: { type: SchemaType.NUMBER, description: "Opcional: coordinates.lng del destino si ya lo tienes." }
                    },
                    required: ["destinationName"]
                }
            }]
        }];

        const model = getGenAI().getGenerativeModel({
            model: "gemini-2.5-flash",
            tools: tools
        });

        const now = new Date();
        const options: Intl.DateTimeFormatOptions = {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: true,
            timeZone: 'America/Bogota'
        };
        const dateLocale = appLanguage === 'en' ? 'en-US' : 'es-ES';
        const currentDateTime = now.toLocaleDateString(dateLocale, options);
        const currentDay = now.toLocaleDateString(dateLocale, { weekday: 'long', timeZone: 'America/Bogota' });

        const briefingBase = {
            assistantName,
            assistantTone,
            systemPrompt,
            canonicalId,
            kbIds,
            currentDateTime,
            currentDay,
            firstName,
            historyContext,
            message: String(message),
            appLanguage,
            coordinates,
        };

        const adkInstruction = buildChatAgentInstruction(briefingBase);
        const legacyPrompt = buildChatSessionBriefing({
            ...briefingBase,
            mode: 'legacy',
            legacyContext: context,
        });

        let parsedResponse: Record<string, unknown>;

        try {
            const adkChat = await runChatAdk({
                userMessage: String(message),
                userId,
                departmentId: canonicalId,
                sessionId: chatId,
                buildContext: {
                    instruction: adkInstruction,
                    route: {
                        destinations: destinationsForAgent,
                        userCoordinates: coordinates,
                        fallbackMessage: String(message),
                    },
                    catalog: {
                        departmentId: canonicalId,
                        kbIds,
                        appLanguage,
                    },
                    liveConditions: {
                        destinations: destinationsForAgent,
                        appLanguage,
                    },
                    expedition: {
                        userId,
                        departmentId: canonicalId,
                        appLanguage,
                        userCoordinates: coordinates,
                    },
                },
            });
            parsedResponse = {
                message: adkChat.message,
                widgets: adkChat.widgets,
                telemetry: adkChat.telemetry,
            };
            console.log(`[chatAgent] ADK hyperlocal ok | dept: ${canonicalId}`);
        } catch (adkError) {
            console.warn('[chatAgent] ADK fallback to legacy SDK:', adkError);

            const userParts: any[] = [{ text: legacyPrompt }];
            const chatHistory: any[] = [{ role: "user", parts: userParts }];

            let result = await model.generateContent({ contents: chatHistory });
            const functionCalls =
                result.response.functionCalls && typeof result.response.functionCalls === 'function'
                    ? result.response.functionCalls()
                    : result.response.functionCalls;

            if (functionCalls && functionCalls.length > 0) {
                console.log("[chatAgent] Gemini activated Tool: checkRouteStatus");
                const call = functionCalls[0];
                if (call.name === 'checkRouteStatus') {
                    const {
                        destinationName,
                        destinationId: destIdArg,
                        destinationLat,
                        destinationLng
                    } = call.args as {
                        destinationName?: string;
                        destinationId?: string;
                        destinationLat?: number;
                        destinationLng?: number;
                    };

                    let routeInfo: Record<string, unknown> = {};
                    if (!coordinates?.lat || !coordinates?.lng) {
                        routeInfo = {
                            error:
                                "GPS DENEGADO o NULO. Dile amablemente al usuario: 'Necesito saber desde dónde arrancas tu viaje para calcular la ruta exacta. ¿Cuál es tu punto de partida?'"
                        };
                    } else {
                        const destCoords = findDestinationCoords(destinationsForAgent, {
                            destinationId: destIdArg,
                            destinationName: destinationName || message,
                            destinationLat,
                            destinationLng
                        });

                        if (!destCoords) {
                            routeInfo = {
                                error:
                                    "No encontré coordenadas del destino en el catálogo. Pide al usuario que aclare el lugar exacto al que desea ir."
                            };
                        } else {
                            console.log(
                                `[chatAgent] Route: ${coordinates.lat},${coordinates.lng} → ${destCoords.lat},${destCoords.lng}` +
                                (destCoords.matchedName ? ` (${destCoords.matchedName})` : "")
                            );
                            const analysis = await getRouteAnalysis(
                                coordinates.lat,
                                coordinates.lng,
                                destCoords.lat,
                                destCoords.lng
                            );
                            routeInfo = analysis
                                ? { ...analysis, matchedDestination: destCoords.matchedName || destCoords.matchedId }
                                : { error: "No se pudo trazar la ruta con Google Maps en este momento." };
                        }
                    }

                    if (result.response.candidates && result.response.candidates[0].content) {
                        chatHistory.push(result.response.candidates[0].content);
                    }

                    chatHistory.push({
                        role: "function",
                        parts: [{
                            functionResponse: {
                                name: "checkRouteStatus",
                                response: routeInfo
                            }
                        }]
                    });

                    console.log("[chatAgent] Retrying with Tool Response...");
                    result = await model.generateContent({ contents: chatHistory });
                }
            }

            const aiResponseText = result.response.text();
            let cleanedText = aiResponseText.replace(/```json/gi, "").replace(/```/g, "");
            cleanedText = cleanedText.replace(/\\n\\n\*\*¡Pro-tip[^*]*\*\*/gi, "").trim();

            try {
                parsedResponse = parseAgentJsonResponse(cleanedText);
            } catch (e) {
                console.error("JSON Parse Error. Raw text:", aiResponseText);
                let safeMessage = "Lo siento, tuve un problema procesando la información. ¿Puedes repetir la pregunta?";
                if (cleanedText.includes('"message":')) {
                    const msgMatch = cleanedText.match(/"message"\s*:\s*"([^"]+)"/);
                    if (msgMatch && msgMatch[1]) safeMessage = msgMatch[1];
                }
                parsedResponse = { message: safeMessage, widgets: [] };
            }
        }

        if (parsedResponse.message && typeof parsedResponse.message === 'string') {
            if (parsedResponse.message.trim().startsWith('{')) {
                try {
                    const inner = JSON.parse(parsedResponse.message);
                    if (inner.message) parsedResponse.message = inner.message;
                } catch (e) { /* ignore */ }
            }
        }

        const widgetCatalog = buildWidgetCatalog({
            destinations: destSnap.docs.map(d => ({ id: d.id, data: () => d.data() })),
            coupons: couponSnap.docs.map(d => ({ id: d.id, data: () => d.data() })),
            refugios: refugiosSnap.docs.map(d => ({ id: d.id, data: () => d.data() })),
            events: eventSnap.docs.map(d => ({ id: d.id, data: () => d.data() })),
            news: newsSnap.docs.map(d => ({ id: d.id, data: () => d.data() })),
        });
        const sanitized = sanitizeChatWidgets(parsedResponse.widgets, widgetCatalog);
        const safeWidgets = enrichChatWidgets(
            sanitized,
            String(message),
            String(parsedResponse.message || ''),
            widgetCatalog
        );
        if (sanitized.length !== safeWidgets.length) {
            console.log(
                `[chatAgent] widgets: raw=${JSON.stringify(parsedResponse.widgets)} sanitized=${sanitized.length} final=${safeWidgets.length}`
            );
        }
        parsedResponse.widgets = safeWidgets;

        const chatRef = db.collection('users').doc(userId).collection('chats').doc(chatId);
        await Promise.all([
            chatRef.collection('messages').add({
                role: 'assistant',
                content: parsedResponse.message || "Lo siento, no pude procesar tu solicitud en este momento.",
                widgets: safeWidgets,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            }),
            chatRef.set({
                lastMessage: parsedResponse.message || "Respuesta automática",
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                departmentId: canonicalId
            }, { merge: true })
        ]);

        res.json(parsedResponse);

    } catch (error) {
        console.error("Error in chatAgent:", error);
        res.status(500).json({ error: "Internal Error" });
    }
});
