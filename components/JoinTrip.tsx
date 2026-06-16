import React, { useState } from 'react';
import { Language } from '../types/core';
import { useTranslation } from '../hooks/useTranslation';
import { useRevenueCat } from './layout/RevenueCatProvider';
import { joinTripByCode, joinTripById } from '../hooks/useTrips';
import { normalizeTripCodeInput } from '../utils/tripCode';
import { useAuth } from './layout/AuthProvider';

interface JoinTripProps {
    language: Language;
    onBack: () => void;
    onJoined: (tripId: string) => void;
    displayName?: string;
}

export const JoinTrip: React.FC<JoinTripProps> = ({ onBack, onJoined, displayName }) => {
    const { t } = useTranslation();
    const traveler = t('trips.traveler');
    const resolvedName = displayName || traveler;
    const { user } = useAuth();
    const { isPremium } = useRevenueCat();
    const [code, setCode] = useState('');
    const [tripIdInput, setTripIdInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mode, setMode] = useState<'code' | 'id'>('code');

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !isPremium) return;
        setLoading(true);
        setError(null);
        try {
            const tripId =
                mode === 'code'
                    ? await joinTripByCode(user.uid, resolvedName, normalizeTripCodeInput(code))
                    : await joinTripById(user.uid, resolvedName, tripIdInput);
            onJoined(tripId);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : '';
            setError(msg === 'TRIP_NOT_FOUND' ? t('trips.tripNotFoundJoin') : t('trips.joinError'));
        } finally {
            setLoading(false);
        }
    };

    if (!isPremium) {
        return (
            <div className="bg-background-dark h-screen flex flex-col text-content">
                <header className="flex items-center px-4 pt-safe pb-2 border-b border-overlay/5">
                    <button onClick={onBack} className="size-10 flex items-center justify-center">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <h1 className="flex-1 text-center font-bold pr-10">{t('trips.joinTrip')}</h1>
                </header>
                <main className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-4">
                    <span className="material-symbols-outlined text-5xl text-budget-primary">workspace_premium</span>
                    <h2 className="text-xl font-bold">{t('trips.joinPremiumTitle')}</h2>
                    <p className="text-content-muted text-sm">{t('trips.joinPremiumDesc')}</p>
                    <button
                        onClick={onBack}
                        className="mt-4 h-12 px-8 rounded-xl bg-budget-primary text-white font-bold"
                    >
                        {t('trips.backToLedger')}
                    </button>
                </main>
            </div>
        );
    }

    return (
        <div className="bg-background-dark h-screen flex flex-col text-content">
            <header className="flex items-center px-4 pt-safe pb-2 border-b border-overlay/5">
                <button onClick={onBack} className="size-10 flex items-center justify-center">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h1 className="flex-1 text-center font-bold pr-10">{t('trips.joinTrip')}</h1>
            </header>

            <main className="flex-1 p-6 flex flex-col gap-6">
                <p className="text-content-muted text-sm">{t('trips.joinSubtitle')}</p>

                <div className="flex gap-2 p-1 bg-overlay/5 rounded-xl">
                    <button
                        type="button"
                        onClick={() => setMode('code')}
                        className={`flex-1 h-10 rounded-lg text-xs font-bold ${mode === 'code' ? 'bg-budget-primary text-white' : 'text-content-muted'}`}
                    >
                        {t('trips.joinByCode')}
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode('id')}
                        className={`flex-1 h-10 rounded-lg text-xs font-bold ${mode === 'id' ? 'bg-budget-primary text-white' : 'text-content-muted'}`}
                    >
                        {t('trips.joinById')}
                    </button>
                </div>

                <form onSubmit={handleJoin} className="flex flex-col gap-4">
                    {mode === 'code' ? (
                        <input
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                            placeholder={t('trips.joinCodeExample')}
                            className="h-14 rounded-xl bg-overlay/5 border border-overlay/10 px-4 text-lg font-black tracking-widest text-center uppercase"
                            required
                        />
                    ) : (
                        <input
                            value={tripIdInput}
                            onChange={(e) => setTripIdInput(e.target.value)}
                            placeholder={t('trips.tripIdPlaceholder')}
                            className="h-14 rounded-xl bg-overlay/5 border border-overlay/10 px-4 text-sm font-mono"
                            required
                        />
                    )}

                    {error && <p className="text-red-400 text-sm text-center">{error}</p>}

                    <button
                        type="submit"
                        disabled={loading}
                        className="h-14 rounded-xl bg-budget-primary text-white font-bold disabled:opacity-50"
                    >
                        {loading ? t('common.loading') : t('trips.joinTrip')}
                    </button>
                </form>
            </main>
        </div>
    );
};
