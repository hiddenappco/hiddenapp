
import { db } from './firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

const MONITOR_AGENT_URL = 'https://environmentalagent-gyrowwrjfq-uc.a.run.app';

const CACHE_TTL_MINUTES = 15;

export interface EnvironmentalData {
    temp: number;
    condition: string;
    rainProb: number;
    rainVol: number;
    uvIndex: number;
    feelsLike: number;
    aqi: number | null;
    humidity: number;
    windSpeed: number;
    windGust: number | null;
    visibility: number;
    pressure: number;
    cloudCover: number;
    cloudCeiling: number | null;
    dewPoint: number | null;
    elevation: number | null;
    weatherCode: number | null;
    advice: string;
    daily?: {
        sunrise: string | null;
        sunset: string | null;
        tomorrow: {
            tempMax: number | null;
            tempMin: number | null;
            rainProb: number;
            weatherCode: number;
            avgCloudCover: number;
        }
    } | null;
    forecast?: number[];
    hourly?: {
        rain: number[];
        temp: number[];
        uv: number[];
    };
    marine?: {
        waveHeight: number | null;
        wavePeriod: number | null;
        waterTemp: number | null;
        currentSpeed: number | null;
        currentStatus: string;
        nextHighTide: string | null;
        nextLowTide: string | null;
        nextEvent?: {
            type: 'low' | 'high';
            time: string;
        };
        tomorrow?: {
            nextHighTide: string | null;
            nextLowTide: string | null;
        };
    } | null;
    lastUpdate: any;
    adviceUpdatedAt?: any;
    /** Respuesta puntual a consulta táctica (no reemplaza advice automático). */
    tacticalAnswer?: string;
    fromCache?: boolean;
}

export interface FetchEnvironmentalOptions {
    /** Escudo ON: fuerza nuevo análisis Ranger aunque la telemetría siga en caché. */
    forceRangerRefresh?: boolean;
    language?: 'es' | 'en';
}

const sanitizeEnvironmentalData = (data: any): EnvironmentalData => {
    const t = data.telemetry || {};

    return {
        temp: t.temp ?? data.temp ?? data.temperature ?? null,
        condition: t.condition ?? data.condition ?? data.weather ?? 'Desconocido',
        rainProb: t.rainProb ?? data.rainProb ?? data.rain_prob ?? data.precipitation ?? null,
        rainVol: t.rainVol ?? data.rainVol ?? data.rain_vol ?? 0,
        uvIndex: t.uvIndex ?? data.uvIndex ?? data.uv_index ?? null,
        feelsLike: t.feelsLike ?? data.feelsLike ?? data.feels_like ?? null,
        aqi: t.aqi !== undefined ? t.aqi : (data.aqi !== undefined ? data.aqi : (data.air_quality !== undefined ? data.air_quality : null)),
        humidity: t.humidity ?? data.humidity ?? null,
        windSpeed: t.windSpeed ?? data.windSpeed ?? null,
        windGust: t.windGust ?? data.windGust ?? null,
        visibility: t.visibility ?? data.visibility ?? null,
        pressure: t.pressure ?? data.pressure ?? null,
        cloudCover: t.cloudCover ?? data.cloudCover ?? null,
        cloudCeiling: t.cloudCeiling ?? data.cloudCeiling ?? null,
        dewPoint: t.dewPoint ?? data.dewPoint ?? null,
        elevation: t.elevation ?? data.elevation ?? null,
        weatherCode: t.weatherCode ?? data.weatherCode ?? null,
        daily: t.daily ?? data.daily ?? null,
        forecast: t.forecast ?? data.forecast ?? null,
        hourly: t.forecast24h ?? data.forecast24h ?? data.hourly ?? null,
        marine: t.marine ?? data.marine ?? null,
        advice: data.advice ?? data.analysis ?? data.message ?? 'Diagnóstico no disponible por el momento.',
        lastUpdate: data.lastUpdate
            ? data.lastUpdate.toDate
                ? data.lastUpdate.toDate()
                : new Date(data.lastUpdate)
            : new Date(),
        adviceUpdatedAt: data.adviceUpdatedAt
            ? data.adviceUpdatedAt.toDate
                ? data.adviceUpdatedAt.toDate()
                : new Date(data.adviceUpdatedAt)
            : undefined,
        fromCache: data.fromCache,
    };
};

function minutesSince(date: Date): number {
    return (Date.now() - date.getTime()) / (1000 * 60);
}

function toFirestoreDate(value: unknown): Date {
    if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
        return (value as { toDate: () => Date }).toDate();
    }
    if (value instanceof Date) return value;
    if (typeof value === 'string' || typeof value === 'number') return new Date(value);
    return new Date(0);
}

/** Solo lectura de caché Firestore (escudo ON sin red). */
export const fetchEnvironmentalCacheSnapshot = async (
    destinationId: string
): Promise<EnvironmentalData | null> => {
    const cacheRef = doc(db, 'environmental_cache', destinationId);
    const cacheSnap = await getDoc(cacheRef);
    if (!cacheSnap.exists()) return null;
    return sanitizeEnvironmentalData({ ...cacheSnap.data(), fromCache: true });
};

export const fetchEnvironmentalData = async (
    userId: string,
    destinationId: string,
    destinationName: string,
    departmentId: string,
    coordinates: { lat: number, lng: number },
    userQuery?: string,
    options: FetchEnvironmentalOptions = {}
): Promise<EnvironmentalData> => {
    const language = options.language ?? 'es';
    const cacheRef = doc(db, 'environmental_cache', destinationId);
    const cacheSnap = await getDoc(cacheRef);
    let cachedTelemetryData: Record<string, unknown> | null = null;
    let telemetryCacheValid = false;
    let preservedAdvice: string | undefined;
    let rawCache: Record<string, unknown> | undefined;

    if (cacheSnap.exists()) {
        rawCache = cacheSnap.data();
        const lastUpdate = toFirestoreDate(rawCache.lastUpdate);
        telemetryCacheValid = minutesSince(lastUpdate) < CACHE_TTL_MINUTES;
        preservedAdvice = rawCache.advice as string | undefined;
        const { advice: _a, lastUpdate: _lu, adviceUpdatedAt: _au, ...telemetryPart } = rawCache;
        cachedTelemetryData = telemetryPart as Record<string, unknown>;

        const adviceDate = rawCache.adviceUpdatedAt ? toFirestoreDate(rawCache.adviceUpdatedAt) : lastUpdate;
        const adviceFresh = minutesSince(adviceDate) < CACHE_TTL_MINUTES;

        if (!userQuery && !options.forceRangerRefresh && telemetryCacheValid && adviceFresh) {
            console.log(`[Hidden Guard] Cache hit (telemetry + Ranger) for ${destinationName}`);
            return sanitizeEnvironmentalData({ ...rawCache, fromCache: true });
        }
    }

    try {
        const useCachedTelemetry = Boolean(
            cachedTelemetryData && telemetryCacheValid && (userQuery || options.forceRangerRefresh)
        );

        console.log(
            `[Hidden Guard] ${userQuery ? 'Tactical query' : 'Ranger refresh'} for ${destinationName}. ` +
                `${useCachedTelemetry ? 'Reusing cached telemetry.' : 'Fetching fresh telemetry.'}`
        );

        const response = await fetch(MONITOR_AGENT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId,
                departmentId,
                language,
                message: userQuery || `ENVIRONMENTAL_TACTICAL_ANALYSIS: ${destinationId}`,
                userQuery: userQuery || null,
                destinationId,
                destinationName,
                coordinates,
                localTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                task: userQuery ? 'USER_ENVIRONMENTAL_QUERY' : 'ENVIRONMENTAL_ANALYSIS',
                cachedTelemetry: useCachedTelemetry ? cachedTelemetryData : null,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Hidden Guard] Cloud Function Error (${response.status}): ${errorText}`);
            throw new Error(`Cloud Function Error: ${response.status}`);
        }

        const freshData = await response.json();
        const normalized = sanitizeEnvironmentalData(freshData);
        const rangerMessage = normalized.advice;

        if (userQuery) {
            const cachePayload = {
                ...(rawCache || {}),
                ...stripAdviceFromPayload(normalized),
                advice: preservedAdvice ?? rangerMessage,
                lastUpdate: rawCache?.lastUpdate ?? serverTimestamp(),
                adviceUpdatedAt: rawCache?.adviceUpdatedAt ?? rawCache?.lastUpdate ?? serverTimestamp(),
            };
            await setDoc(cacheRef, stripUndefined(cachePayload), { merge: true });

            return {
                ...sanitizeEnvironmentalData(cachePayload),
                tacticalAnswer: rangerMessage,
                advice: preservedAdvice ?? rangerMessage,
            };
        }

        await setDoc(cacheRef, stripUndefined({
            ...stripAdviceFromPayload(normalized),
            advice: normalized.advice,
            lastUpdate: serverTimestamp(),
            adviceUpdatedAt: serverTimestamp(),
        }));

        return normalized;
    } catch (error) {
        console.error('Error fetching fresh environmental data:', error);

        if (rawCache) {
            return sanitizeEnvironmentalData({ ...rawCache, fromCache: true });
        }

        return sanitizeEnvironmentalData({
            advice: 'FALLO_CONEXION_SATELITAL: Mostrando última telemetría conocida o simulación de zona activa.',
        });
    }
};

/** Firestore rechaza `undefined`; lo eliminamos antes de escribir. */
function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
    const clean: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) clean[key] = value;
    }
    return clean as T;
}

function stripAdviceFromPayload(data: EnvironmentalData): Record<string, unknown> {
    const { advice, tacticalAnswer, fromCache, lastUpdate, adviceUpdatedAt, ...rest } = data;
    return rest as Record<string, unknown>;
}
