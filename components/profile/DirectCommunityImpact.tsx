import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { formatCop } from '../../utils/currency';

interface DirectCommunityImpactProps {
    totalCop: number;
}

export const DirectCommunityImpact: React.FC<DirectCommunityImpactProps> = ({ totalCop }) => {
    const { t } = useTranslation();
    if (!totalCop || totalCop <= 0) return null;

    return (
        <div className="rounded-3xl border border-emerald-500/25 bg-emerald-500/10 p-5">
            <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-emerald-400 text-2xl shrink-0">
                    volunteer_activism
                </span>
                <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300/90 mb-1">
                        {t('esg.profileImpactTitle')}
                    </p>
                    <p className="text-base font-bold text-content leading-snug">
                        {t('esg.profileContribution', { amount: formatCop(totalCop) })}
                    </p>
                    <p className="text-xs text-content-muted mt-2 leading-relaxed">
                        {t('esg.profileContributionNote')}
                    </p>
                </div>
            </div>
        </div>
    );
};
