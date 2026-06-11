import React, { useState, useEffect, useRef } from 'react';
import { useDestinations, useDestination } from '../hooks/useFirestore';
import { useAuth } from './layout/AuthProvider';
import { useEnvironmentalMonitor } from '../hooks/useEnvironmentalMonitor';
import { Language } from '../types/core';
import { useTranslation } from '../hooks/useTranslation';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { matchesLocalizedSearch } from '../utils/localizedContent';
import { DESTINATION_SEARCH_FIELDS } from '../utils/localizeCatalog';

import { EnvironmentalHeader } from './environmental/EnvironmentalHeader';
import { IntelligenceAdvice } from './environmental/IntelligenceAdvice';
import { TacticalQuery } from './environmental/TacticalQuery';
import { TacticalThread, type TacticalMessage } from './environmental/TacticalThread';
import { TelemetryGrid } from './environmental/TelemetryGrid';
import { SatelliteRadar } from './environmental/SatelliteRadar';
import { EnvironmentalThinkingBanner } from './environmental/EnvironmentalThinkingBanner';

interface EnvironmentalMonitorProps {
    language: Language;
    onMenuClick: () => void;
}

export const EnvironmentalMonitor: React.FC<EnvironmentalMonitorProps> = ({ language, onMenuClick }) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { data: destinations, loading: loadingDests } = useDestinations();

    const [selectedId, setSelectedId] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [showResults, setShowResults] = useState(false);
    const [query, setQuery] = useState('');
    const [tacticalMessages, setTacticalMessages] = useState<TacticalMessage[]>([]);
    const [tacticalLoading, setTacticalLoading] = useState(false);
    const [shieldError, setShieldError] = useState<string | null>(null);
    const { data: selectedDestination } = useDestination(selectedId || undefined);

    const filteredDestinations = destinations.filter((d) =>
        matchesLocalizedSearch(d as Record<string, unknown>, searchTerm, [...DESTINATION_SEARCH_FIELDS])
    );

    useEffect(() => {
        if (selectedDestination) {
            setSearchTerm(selectedDestination.title.split(':')[0].trim().toUpperCase());
        }
    }, [selectedDestination]);

    const {
        isMonitoring,
        activeDestinationId,
        data: envData,
        loading: loadingEnv,
        isOffline,
        toggleMonitoring,
        clearDestinationKeepShield,
        askIntelligence,
    } = useEnvironmentalMonitor(user?.uid, selectedDestination, language);

    const isAnalyzing = loadingEnv && !!selectedId && isMonitoring;

    // Restaura el destino monitoreado solo al abrir la pantalla con el escudo ya ON.
    // No debe re-seleccionar tras un borrado manual (X).
    const didAutoSelectRef = useRef(false);
    useEffect(() => {
        if (selectedId) {
            didAutoSelectRef.current = true;
            return;
        }
        if (activeDestinationId && isMonitoring && !didAutoSelectRef.current) {
            setSelectedId(activeDestinationId);
        }
    }, [activeDestinationId, isMonitoring, selectedId]);

    useEffect(() => {
        setTacticalMessages([]);
    }, [selectedId]);

    const handleQuerySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim() || tacticalLoading || !isMonitoring) return;

        const userText = query.trim();
        const userMsgId = `u-${Date.now()}`;
        setTacticalMessages((prev) => [
            ...prev,
            { id: userMsgId, role: 'user', text: userText },
        ]);
        setQuery('');
        setTacticalLoading(true);
        try {
            const answer = await askIntelligence(userText);
            if (answer) {
                setTacticalMessages((prev) => [
                    ...prev,
                    { id: `a-${Date.now()}`, role: 'assistant', text: answer },
                ]);
            }
            if (Capacitor.isNativePlatform()) {
                await Haptics.impact({ style: ImpactStyle.Medium });
            }
        } finally {
            setTacticalLoading(false);
        }
    };

    const handleToggle = () => {
        if (!isMonitoring && !selectedId) return;
        setShieldError(null);

        if (isMonitoring) {
            setSearchTerm('');
            setSelectedId('');
            didAutoSelectRef.current = false;
        }

        void toggleMonitoring(selectedId || activeDestinationId || '').then((err) => {
            if (err === 'NO_COORDINATES') {
                setShieldError(t('environmental.noCoordinates'));
            }
            if (Capacitor.isNativePlatform()) {
                void Haptics.impact({
                    style: !isMonitoring ? ImpactStyle.Heavy : ImpactStyle.Light,
                });
            }
        });
    };

    // X con escudo ON: limpia destino pero el escudo sigue activo para el siguiente destino.
    const handleClear = () => {
        setShowResults(false);
        setShieldError(null);
        didAutoSelectRef.current = true;
        setSearchTerm('');
        setSelectedId('');

        if (isMonitoring) {
            void clearDestinationKeepShield();
        }
    };

    const adviceUpdatedAt =
        envData?.adviceUpdatedAt instanceof Date
            ? envData.adviceUpdatedAt
            : envData?.lastUpdate instanceof Date
              ? envData.lastUpdate
              : null;

    if (loadingDests) {
        return (
            <div className="h-screen w-full bg-background-dark flex items-center justify-center text-primary font-bold">
                {t('environmental.initializing')}
            </div>
        );
    }

    return (
        <div className="bg-background-dark text-content-secondary font-display antialiased overflow-x-hidden h-screen overflow-y-auto pb-[calc(7rem+env(safe-area-inset-bottom,1.5rem))] flex flex-col">
            <EnvironmentalHeader
                isMonitoring={isMonitoring}
                envData={envData}
                onMenuClick={onMenuClick}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                showResults={showResults}
                setShowResults={setShowResults}
                filteredDestinations={filteredDestinations}
                setSelectedId={setSelectedId}
                handleToggle={handleToggle}
                onClear={handleClear}
                selectedId={selectedId}
            />

            {shieldError && (
                <p className="px-4 -mt-2 mb-1 text-[10px] font-bold text-amber-500 uppercase tracking-wide">
                    {shieldError}
                </p>
            )}

            <EnvironmentalThinkingBanner visible={isAnalyzing} />

            <div className={`p-4 flex flex-col gap-4 transition-opacity duration-300 ${isAnalyzing ? 'opacity-75' : 'opacity-100'}`}>
                <IntelligenceAdvice
                    isMonitoring={isMonitoring}
                    loadingEnv={loadingEnv && !tacticalLoading}
                    selectedId={selectedId}
                    advice={envData?.advice || ''}
                    adviceUpdatedAt={adviceUpdatedAt}
                    isOffline={isOffline}
                    fromCache={envData?.fromCache}
                />

                <TacticalQuery
                    isMonitoring={isMonitoring}
                    loadingEnv={loadingEnv}
                    query={query}
                    setQuery={setQuery}
                    handleQuerySubmit={handleQuerySubmit}
                />

                <TacticalThread messages={tacticalMessages} loading={tacticalLoading} />

                <TelemetryGrid selectedId={selectedId} envData={envData} loadingEnv={loadingEnv} />

                <SatelliteRadar selectedDestination={selectedDestination} isMonitoring={isMonitoring} />
            </div>
        </div>
    );
};
