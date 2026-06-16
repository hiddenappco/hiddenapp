import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import {
    isGroundMobility,
    mobilityLocaleKey,
    mobilityMaterialIcon,
    type GroundMobility,
} from '../../utils/expeditionMobility';

interface ExpeditionMobilityBadgeProps {
    mode: GroundMobility | string | undefined | null;
    className?: string;
}

export const ExpeditionMobilityBadge: React.FC<ExpeditionMobilityBadgeProps> = ({ mode, className = '' }) => {
    const { t } = useTranslation();
    if (!isGroundMobility(mode)) return null;

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full border border-primary/35 bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-primary ${className}`}
        >
            <span className="material-symbols-outlined text-[15px]">{mobilityMaterialIcon(mode)}</span>
            {t(mobilityLocaleKey(mode))}
        </span>
    );
};
