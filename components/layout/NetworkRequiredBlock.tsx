import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';
import type { ConnectivityFallbackVariant } from '../SignalLostFallback';
import type { NetworkBlockFeature } from '../../utils/connectivityRoutePolicy';

interface NetworkRequiredBlockProps {
    variant: ConnectivityFallbackVariant;
    feature: NetworkBlockFeature;
    onGoToVault: () => void;
}

export const NetworkRequiredBlock: React.FC<NetworkRequiredBlockProps> = ({
    variant,
    feature,
    onGoToVault,
}) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const isServer = variant === 'server';

    const titleKey = `connectivity.block.${feature}.title` as const;
    const bodyKey = `connectivity.block.${feature}.body` as const;
    const title = t(titleKey);
    const body = t(bodyKey);

    return (
        <div className="min-h-full w-full bg-background-dark font-display text-content flex flex-col items-center justify-center p-6 relative overflow-hidden selection:bg-primary selection:text-white">
            <div
                className="absolute inset-0 opacity-[0.04] pointer-events-none"
                style={{
                    backgroundImage:
                        'radial-gradient(circle, rgba(16,185,129,0.5) 1px, transparent 1px)',
                    backgroundSize: '20px 20px',
                }}
            />
            <div
                className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full blur-[90px] pointer-events-none ${
                    isServer ? 'bg-amber-500/8' : 'bg-red-500/8'
                }`}
            />

            <div className="w-full max-w-[400px] relative z-10 flex flex-col items-center text-center">
                <div
                    className={`mb-5 flex items-center gap-1.5 border rounded-full px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] glass-pill ${
                        isServer
                            ? 'border-amber-500/25 text-amber-300'
                            : 'border-red-500/25 text-red-400'
                    }`}
                >
                    {!isServer && (
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                    )}
                    <span>{isServer ? t('connectivity.server.badge') : t('connectivity.offline.badge')}</span>
                </div>

                <div
                    className={`relative size-20 rounded-[28px] flex items-center justify-center mb-6 shadow-2xl glass-surface ${
                        isServer ? 'border-amber-500/20' : 'border-red-500/20'
                    }`}
                >
                    <span
                        className={`material-symbols-outlined text-[36px] ${
                            isServer ? 'text-amber-400' : 'text-red-400'
                        }`}
                    >
                        {isServer ? 'cloud_off' : 'cloud_lock'}
                    </span>
                </div>

                <h1 className="text-lg sm:text-xl font-black text-content leading-tight tracking-tight mb-2">
                    {title}
                </h1>
                <p className="text-xs sm:text-sm text-content/60 leading-relaxed max-w-[320px] mb-8 font-medium">
                    {body}
                </p>

                <div className="w-full flex flex-col gap-2.5">
                    <button
                        type="button"
                        onClick={onGoToVault}
                        className="touch-target w-full rounded-[18px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider py-3.5 flex items-center justify-center gap-2 border border-emerald-500/30 shadow-lg shadow-emerald-950/20 active:scale-[0.98] transition-all"
                    >
                        <span className="material-symbols-outlined text-[18px]">explore</span>
                        {t('offline.goToVault')}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/budget')}
                        className="touch-target w-full rounded-[18px] bg-budget-primary hover:bg-budget-primary-dark text-white font-bold text-xs uppercase tracking-wider py-3.5 flex items-center justify-center gap-2 border border-budget-primary/30 shadow-lg shadow-budget-primary/20 active:scale-[0.98] transition-all"
                    >
                        <span className="material-symbols-outlined text-[18px]">payments</span>
                        {t('offline.goToLedger')}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/offline')}
                        className="touch-target w-full rounded-[18px] border border-overlay/15 bg-surface-dark/80 text-content/80 hover:text-content font-semibold text-xs py-3 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                    >
                        <span className="material-symbols-outlined text-[18px]">menu_book</span>
                        {t('connectivity.offlineHubCta')}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="mt-1 text-[11px] font-bold text-primary/80 hover:text-primary"
                    >
                        {t('connectivity.block.goBack')}
                    </button>
                </div>
            </div>
        </div>
    );
};
