import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';
import { StickyGlassHeader } from '../ui/StickyGlassHeader';

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
            <StickyGlassHeader
                onBack={onBack}
                showLogo={false}
                center={
                    <div className="text-left min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-widest text-primary">
                            {t('expedition.hubTitle')}
                        </p>
                        <h1 className="font-bold text-base">{title}</h1>
                    </div>
                }
            />
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
