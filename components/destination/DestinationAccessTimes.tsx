import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import type { AccessTimes } from '../../utils/planningNotesAccess';

interface DestinationAccessTimesProps {
    accessTimes: AccessTimes;
}

export const DestinationAccessTimes: React.FC<DestinationAccessTimesProps> = ({ accessTimes }) => {
    const { t } = useTranslation();

    return (
        <div className="px-5 mt-6">
            <div className="bg-surface-dark border border-overlay/5 rounded-2xl p-5 shadow-sm">
                <h3 className="font-bold text-xl text-content mb-3">{t('destination.accessTimesTitle')}</h3>
                <p className="text-xs text-content-muted mb-4 leading-relaxed">{t('destination.accessTimesHint')}</p>
                <div className="flex flex-wrap gap-2">
                    {accessTimes.driveMinutes != null && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-bold text-content">
                            <span className="material-symbols-outlined text-primary text-sm">directions_car</span>
                            {t('destination.accessDriveMinutes', { min: accessTimes.driveMinutes })}
                        </span>
                    )}
                    {accessTimes.walkMinutes != null && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-content">
                            <span className="material-symbols-outlined text-emerald-400 text-sm">directions_walk</span>
                            {t('destination.accessWalkMinutes', { min: accessTimes.walkMinutes })}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};
