import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import {
    type DirectCommunityAmount,
    formatDirectCommunityRange,
} from '../../utils/directCommunity';

interface DirectCommunityBadgeProps {
    amount: DirectCommunityAmount;
    className?: string;
}

export const DirectCommunityBadge: React.FC<DirectCommunityBadgeProps> = ({
    amount,
    className = '',
}) => {
    const { t } = useTranslation();
    const range = formatDirectCommunityRange(amount);

    return (
        <div
            className={`rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 ${className}`}
        >
            <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-emerald-400 text-xl shrink-0">
                    volunteer_activism
                </span>
                <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300/90 mb-1">
                        {t('esg.directTitle')}
                    </p>
                    <p className="text-sm font-bold text-content leading-snug">
                        {t('esg.directAmount', { range })}
                    </p>
                    <p className="text-xs text-content-muted mt-2 leading-relaxed">
                        {t('esg.directNote', { percent: amount.hostSharePercent })}
                    </p>
                    <p className="text-[10px] text-content-subtle mt-2 leading-relaxed">
                        {t('esg.zeroCommission')}
                    </p>
                </div>
            </div>
        </div>
    );
};
