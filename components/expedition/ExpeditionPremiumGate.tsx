import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';

interface ExpeditionPremiumGateProps {
    onBack: () => void;
    variant?: 'hub' | 'revision';
}

export const ExpeditionPremiumGate: React.FC<ExpeditionPremiumGateProps> = ({
    onBack,
    variant = 'hub',
}) => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const title =
        variant === 'revision' ? t('expedition.revisionPremiumTitle') : t('expedition.premiumRequiredTitle');
    const desc =
        variant === 'revision' ? t('expedition.revisionQuotaExceeded') : t('expedition.premiumRequiredDesc');

    return (
        <div className="flex flex-col h-screen bg-background-dark text-content overflow-hidden">
            <header className="shrink-0 flex items-center gap-3 px-4 pt-safe-hero pb-3 border-b border-overlay/10">
                <button
                    type="button"
                    onClick={onBack}
                    className="touch-target rounded-full bg-overlay/10 flex items-center justify-center"
                >
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-primary">
                        {t('expedition.hubTitle')}
                    </p>
                    <h1 className="font-bold text-base">{title}</h1>
                </div>
            </header>
            <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
                <div className="glass-surface rounded-2xl p-8 max-w-sm w-full flex flex-col items-center gap-4">
                    <div className="size-14 rounded-full bg-primary/15 flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary text-[32px]">workspace_premium</span>
                    </div>
                    <p className="text-content-muted text-sm leading-relaxed">{desc}</p>
                    <button
                        type="button"
                        onClick={() => navigate('/premium')}
                        className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-white"
                    >
                        {t('common.unlockPremium')}
                    </button>
                    <button type="button" onClick={onBack} className="text-content-subtle text-sm font-medium">
                        {t('common.back')}
                    </button>
                </div>
            </div>
        </div>
    );
};
