
import { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../services/firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import {
    fetchEnvironmentalData,
    fetchEnvironmentalCacheSnapshot,
    EnvironmentalData,
} from '../services/environmentalService';
import {
    buildActiveMonitorPayload,
    buildShieldAwaitingDestinationPayload,
    deactivateEnvironmentalShield,
    isShieldExpired,
} from '../services/environmentalShield';
import { Destination } from '../types/content';
import { Language } from '../types/core';

const REFRESH_MS = 15 * 60 * 1000;
const CACHE_TTL_MS = REFRESH_MS;

function isEnvironmentalCacheFresh(data: EnvironmentalData): boolean {
    const lastUpdate =
        data.lastUpdate instanceof Date ? data.lastUpdate : new Date(data.lastUpdate as string | number);
    const adviceAt = data.adviceUpdatedAt
        ? data.adviceUpdatedAt instanceof Date
            ? data.adviceUpdatedAt
            : new Date(data.adviceUpdatedAt as string | number)
        : lastUpdate;
    const ageMs = Date.now() - lastUpdate.getTime();
    const adviceAgeMs = Date.now() - adviceAt.getTime();
    return ageMs < CACHE_TTL_MS && adviceAgeMs < CACHE_TTL_MS;
}

export const useEnvironmentalMonitor = (
    userId: string | undefined,
    selectedDestination: Destination | null,
    language: Language = Language.Spanish
) => {
    const apiLanguage: 'es' | 'en' = language === Language.English ? 'en' : 'es';
    const [activeDestinationId, setActiveDestinationId] = useState<string | null>(null);
    const [isMonitoring, setIsMonitoring] = useState(false);
    const [shieldExpiresAt, setShieldExpiresAt] = useState<Date | null>(null);
    const [data, setData] = useState<EnvironmentalData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const userActionRef = useRef(0);

    useEffect(() => {
        const onOnline = () => setIsOffline(false);
        const onOffline = () => setIsOffline(true);
        window.addEventListener('online', onOnline);
        window.addEventListener('offline', onOffline);
        return () => {
            window.removeEventListener('online', onOnline);
            window.removeEventListener('offline', onOffline);
        };
    }, []);

    useEffect(() => {
        if (!userId) return;

        const userRef = doc(db, 'users', userId);
        const unsubscribe = onSnapshot(userRef, async (snap) => {
            if (!snap.exists()) return;
            if (Date.now() - userActionRef.current < 800) return;

            const userData = snap.data();
            const monitor = userData.activeMonitor;
            let active = monitor?.isActive || false;

            if (active && isShieldExpired(monitor?.expiresAt)) {
                active = false;
                void deactivateEnvironmentalShield(userId);
            }

            const expiresAt = monitor?.expiresAt
                ? typeof monitor.expiresAt.toDate === 'function'
                    ? monitor.expiresAt.toDate()
                    : new Date(monitor.expiresAt)
                : null;

            setShieldExpiresAt(expiresAt);
            setIsMonitoring(active);
            setActiveDestinationId(active ? monitor?.destinationId || null : null);
        });

        return () => unsubscribe();
    }, [userId]);

    const loadTelemetry = useCallback(
        async (forceRangerRefresh = false) => {
            if (!isMonitoring || !selectedDestination?.coordinates || !userId) {
                if (!isMonitoring || !selectedDestination?.id) {
                    setData(null);
                }
                return;
            }

            if (isOffline) {
                const cached = await fetchEnvironmentalCacheSnapshot(selectedDestination.id);
                if (cached) setData(cached);
                return;
            }

            const cached = await fetchEnvironmentalCacheSnapshot(selectedDestination.id);
            const cacheFresh = Boolean(cached && isEnvironmentalCacheFresh(cached));

            if (!forceRangerRefresh && cacheFresh && cached) {
                setData(cached);
                setLoading(false);
                return;
            }

            // Caché expirado o refresco forzado: no mostrar datos viejos mientras llega lo nuevo
            setData(null);
            setLoading(true);
            setError(null);
            try {
                const result = await fetchEnvironmentalData(
                    userId,
                    selectedDestination.id,
                    selectedDestination.title.split(':')[0].trim(),
                    selectedDestination.departmentId,
                    selectedDestination.coordinates as { lat: number; lng: number },
                    undefined,
                    { forceRangerRefresh, language: apiLanguage }
                );
                setData(result);
            } catch {
                setError('FALLO_SENSORES_TELEMETRICOS');
            } finally {
                setLoading(false);
            }
        },
        [isMonitoring, selectedDestination, userId, apiLanguage, isOffline]
    );

    useEffect(() => {
        if (!isMonitoring) {
            setData(null);
            setLoading(false);
            return;
        }
        if (!selectedDestination?.id) {
            setData(null);
            setLoading(false);
            return;
        }

        setData(null);
        setLoading(true);
        void loadTelemetry(false);

        const interval = setInterval(() => {
            void loadTelemetry(true);
        }, REFRESH_MS);

        return () => clearInterval(interval);
    }, [isMonitoring, selectedDestination?.id, loadTelemetry]);

    useEffect(() => {
        if (!userId || !isMonitoring || !selectedDestination?.id) return;
        if (selectedDestination.id === activeDestinationId) return;

        userActionRef.current = Date.now();
        const payload = buildActiveMonitorPayload(
            selectedDestination.id,
            true,
            shieldExpiresAt
        );
        setActiveDestinationId(selectedDestination.id);
        void updateDoc(doc(db, 'users', userId), {
            activeMonitor: payload,
            earlyAlert: true,
            activeDestinationId: selectedDestination.id,
        });
    }, [userId, isMonitoring, selectedDestination?.id, activeDestinationId, shieldExpiresAt]);

    const toggleMonitoring = async (destinationId: string): Promise<string | null> => {
        if (!userId) return 'NO_USER';

        const coords = selectedDestination?.coordinates as { lat?: number; lng?: number } | undefined;
        const newState = !isMonitoring;

        if (newState) {
            if (!destinationId) return 'NO_DESTINATION';
            if (!coords?.lat || !coords?.lng) {
                return 'NO_COORDINATES';
            }
        }

        userActionRef.current = Date.now();
        setIsMonitoring(newState);
        if (newState) {
            setActiveDestinationId(destinationId);
        } else {
            setActiveDestinationId(null);
            setData(null);
            setLoading(false);
        }

        const payload = buildActiveMonitorPayload(
            newState ? destinationId : null,
            newState,
            shieldExpiresAt
        );
        const userRef = doc(db, 'users', userId);

        try {
            await updateDoc(userRef, {
                activeMonitor: payload,
                earlyAlert: newState,
                activeDestinationId: newState ? destinationId : null,
            });
        } catch {
            setIsMonitoring(!newState);
            if (newState) setActiveDestinationId(null);
            return 'UPDATE_FAILED';
        }

        return null;
    };

    const clearDestinationKeepShield = async (): Promise<void> => {
        if (!userId || !isMonitoring) return;

        userActionRef.current = Date.now();
        setData(null);
        setLoading(false);
        setActiveDestinationId(null);

        const payload = buildShieldAwaitingDestinationPayload(shieldExpiresAt);
        try {
            await updateDoc(doc(db, 'users', userId), {
                activeMonitor: payload,
                earlyAlert: true,
                activeDestinationId: null,
            });
        } catch {
            console.error('[EnvironmentalMonitor] Failed to clear destination while keeping shield');
        }
    };

    const askIntelligence = async (query: string): Promise<string | null> => {
        if (!userId || !selectedDestination?.coordinates || !isMonitoring || isOffline) return null;

        try {
            const result = await fetchEnvironmentalData(
                userId,
                selectedDestination.id,
                selectedDestination.title.split(':')[0].trim(),
                selectedDestination.departmentId,
                selectedDestination.coordinates as { lat: number; lng: number },
                query,
                { language: apiLanguage }
            );

            if (result.tacticalAnswer) {
                setData((prev) =>
                    prev
                        ? {
                              ...prev,
                              ...mergeTelemetry(prev, result),
                          }
                        : result
                );
                return result.tacticalAnswer;
            }
            return result.advice;
        } catch {
            return null;
        }
    };

    return {
        isMonitoring,
        activeDestinationId,
        data,
        loading,
        error,
        isOffline,
        toggleMonitoring,
        clearDestinationKeepShield,
        askIntelligence,
        refreshNow: () => loadTelemetry(true),
    };
};

function mergeTelemetry(prev: EnvironmentalData, next: EnvironmentalData): Partial<EnvironmentalData> {
    return {
        temp: next.temp ?? prev.temp,
        condition: next.condition ?? prev.condition,
        rainProb: next.rainProb ?? prev.rainProb,
        uvIndex: next.uvIndex ?? prev.uvIndex,
        aqi: next.aqi ?? prev.aqi,
        humidity: next.humidity ?? prev.humidity,
        windSpeed: next.windSpeed ?? prev.windSpeed,
        marine: next.marine ?? prev.marine,
        hourly: next.hourly ?? prev.hourly,
        forecast: next.forecast ?? prev.forecast,
    };
}
