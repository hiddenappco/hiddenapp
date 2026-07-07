import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useDestinations, useDestination } from '../hooks/useFirestore';
import { useAuth } from './layout/AuthProvider';
import { useRevenueCat } from './layout/RevenueCatProvider';
import { useUserProfile } from '../hooks/useSocial';
import { computeRangerQuota } from '../utils/rangerQuota';
import { useEnvironmentalMonitor } from '../hooks/useEnvironmentalMonitor';
import { Language } from '../types/core';
import { useTranslation } from '../hooks/useTranslation';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { useLocalizedSearch } from '../hooks/useLocalizedSearch';
import { DESTINATION_PICKER_SEARCH_FIELDS } from '../utils/localizeCatalog';
import { BOTTOM_NAV_SCROLL_PADDING, BOTTOM_NAV_SCROLL_SPACER } from '../utils/bottomNav';
import { PageLoadingScreen } from './ui/PageLoadingScreen';

import { EnvironmentalHeader } from './environmental/EnvironmentalHeader';
import { IntelligenceAdvice } from './environmental/IntelligenceAdvice';
import { TacticalQuery } from './environmental/TacticalQuery';
import { TacticalThread, type TacticalMessage } from './environmental/TacticalThread';
import { TelemetryGrid } from './environmental/TelemetryGrid';
import { SatelliteRadar } from './environmental/SatelliteRadar';
import { EnvironmentalThinkingBanner } from './environmental/EnvironmentalThinkingBanner';
import { EnvironmentalManual } from './environmental/EnvironmentalManual';
import { FeatureCoachmark } from './ui/FeatureCoachmark';
import { useFeatureTooltip } from '../hooks/useFeatureTooltip';
import { useHardwareBackHandler } from '../hooks/useHardwareBackHandler';

interface EnvironmentalMonitorProps {
    language: Language;
    onMenuClick: () => void;
}

export const EnvironmentalMonitor: React.FC<EnvironmentalMonitorProps> = ({ language, onMenuClick }) => {
    const { t } = useTranslation();
    const rangerCoachmark = useFeatureTooltip('ranger');
    const { user } = useAuth();
    const { isPremium } = useRevenueCat();
    const { data: profile } = useUserProfile(user?.uid);
    const rangerQuota = computeRangerQuota(profile);
    const { data: destinations, loading: loadingDests } = useDestinations();

    const [selectedId, setSelectedId] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [showResults, setShowResults] = useState(false);
    const [query, setQuery] = useState('');
    const [tacticalMessages, setTacticalMessages] = useState<TacticalMessage[]>([]);
    const [tacticalLoading, setTacticalLoading] = useState(false);
    const [showManual, setShowManual] = useState(false);
    const [shieldError, setShieldError] = useState<string | null>(null);
    const { data: selectedDestination } = useDestination(selectedId || undefined);

    const filteredDestinations = useLocalizedSearch(
        destinations as Record<string, unknown>[],
        searchTerm,
        DESTINATION_PICKER_SEARCH_FIELDS,
        { limit: 20 }
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

    useHardwareBackHandler(() => {
        if (showManual) {
            setShowManual(false);
            return true;
        }
        return false;
    }, [showManual]);

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
        if (!rangerQuota.allowed) {
            setTacticalMessages((prev) => [
                ...prev,
                {
                    id: `sys-${Date.now()}`,
                    role: 'assistant',
                    text: t('environmental.rangerQuotaExceeded'),
                },
            ]);
            return;
        }

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
        return <PageLoadingScreen titleKey="explore.loading" />;
    }

    if (showManual) {
        return <EnvironmentalManual onBack={() => setShowManual(false)} />;
    }

    return (
        <div className={`bg-background-dark text-content-secondary font-display antialiased overflow-x-hidden h-screen overflow-y-auto flex flex-col ${BOTTOM_NAV_SCROLL_PADDING}`}>
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

            {rangerCoachmark.visible && (
                <div className="px-4 pb-2">
                    <FeatureCoachmark
                        title={t('coachmark.rangerTitle')}
                        body={t('coachmark.rangerBody')}
                        dismissLabel={t('coachmark.dismiss')}
                        onDismiss={rangerCoachmark.dismiss}
                    />
                </div>
            )}

            <div className="px-4 pb-2">
                <section
                    onClick={() => setShowManual(true)}
                    className="relative overflow-hidden rounded-[20px] bg-surface-dark dark:bg-gradient-to-r dark:from-[#0a1f35] dark:to-[#12385c] p-3 px-4 border border-overlay/10 hover:border-green-500/30 shadow-md dark:shadow-black/20 transition-all duration-300 group cursor-pointer"
                >
                    <div
                        className="absolute inset-0 opacity-[0.02] pointer-events-none"
                        style={{
                            backgroundImage: 'radial-gradient(circle, rgba(34,197,94,0.5) 1px, transparent 1px)',
                            backgroundSize: '16px 16px',
                        }}
                    />
                    <div className="flex items-center justify-between gap-3 relative z-10">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="size-9 shrink-0 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center group-hover:bg-green-500/20 group-hover:border-green-500/40 transition-all duration-300">
                                <span className="material-symbols-outlined text-green-400 text-lg group-hover:scale-110 transition-transform duration-300">
                                    menu_book
                                </span>
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-xs sm:text-sm font-black text-content group-hover:text-green-400 transition-colors duration-300 flex items-center gap-2 truncate">
                                    {t('environmental.manualTitle')}
                                    <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-green-500/10 text-green-400 border border-green-500/20 uppercase tracking-wider shrink-0">
                                        {t('environmental.guide')}
                                    </span>
                                </h3>
                                <p className="text-[10px] text-content/50 hidden sm:block mt-0.5 line-clamp-2">
                                    {t('environmental.manualDesc')}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-2.5 py-1.5 group-hover:bg-green-500 group-hover:text-white group-hover:border-green-500/40 transition-all duration-300 shrink-0">
                            <span>{t('environmental.read')}</span>
                            <span className="material-symbols-outlined text-[10px] group-hover:translate-x-0.5 transition-transform duration-300">
                                arrow_forward
                            </span>
                        </div>
                    </div>
                </section>
            </div>

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

                {isMonitoring && (
                    <p
                        className={`text-[10px] font-medium tracking-wide px-1 ${
                            rangerQuota.unlimited ? 'text-primary/80' : 'text-content-muted'
                        }`}
                    >
                        {rangerQuota.unlimited
                            ? t('environmental.rangerQuotaUnlimited')
                            : t('environmental.rangerQuotaHint', {
                                  remaining: rangerQuota.remaining,
                                  limit: rangerQuota.limit,
                              })}
                    </p>
                )}

                <TacticalThread messages={tacticalMessages} loading={tacticalLoading} />

                <TelemetryGrid selectedId={selectedId} envData={envData} loadingEnv={loadingEnv} />

                <SatelliteRadar selectedDestination={selectedDestination} isMonitoring={isMonitoring} />
            </div>
            <div className={`${BOTTOM_NAV_SCROLL_SPACER} w-full shrink-0`} aria-hidden="true" />
        </div>
    );
};
