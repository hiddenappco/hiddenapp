import React from 'react';
import { useTranslation } from '../hooks/useTranslation';

interface PactDeclinedProps {
    onLogout: () => void;
}

export const PactDeclined: React.FC<PactDeclinedProps> = ({ onLogout }) => {
    const { t } = useTranslation();

    return (
        <div className="relative bg-[#0c1f17] font-display text-content min-h-screen w-full flex flex-col items-center justify-center px-6 py-safe">
            <div className="max-w-md text-center flex flex-col items-center gap-6">
                <span className="material-symbols-outlined text-5xl text-amber-400/90">shield_locked</span>
                <h1 className="text-2xl font-extrabold text-content leading-tight">
                    {t('pact.declinedTitle')}
                </h1>
                <p className="text-sm text-emerald-100/80 leading-relaxed">
                    {t('pact.declinedBody')}
                </p>
                <button
                    type="button"
                    onClick={onLogout}
                    className="touch-target w-full max-w-xs rounded-xl border border-overlay/20 bg-overlay/10 px-6 py-3.5 text-sm font-bold text-content hover:bg-overlay/15 transition-colors"
                >
                    {t('pact.declinedLogout')}
                </button>
            </div>
        </div>
    );
};
