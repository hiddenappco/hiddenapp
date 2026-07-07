import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import type { AccessTimes } from '../../utils/planningNotesAccess';
import { accessLegIcon, formatAccessLegDuration } from '../../utils/planningNotesAccess';

interface DestinationAccessTimesProps {
    accessTimes: AccessTimes;
}

export const DestinationAccessTimes: React.FC<DestinationAccessTimesProps> = ({ accessTimes }) => {
    const { t } = useTranslation();

    const durationLabels = {
        minutes: (min: number) => t('destination.accessDurationMinutes', { min }),
        minutesRange: (min: number, max: number) =>
            t('destination.accessDurationMinutesRange', { min, max }),
        hours: (hours: string) => t('destination.accessDurationHours', { hours }),
        hoursRange: (minH: string, maxH: string) =>
            t('destination.accessDurationHoursRange', { min: minH, max: maxH }),
    };

    return (
        <div className="px-5 mt-6">
            <div className="bg-surface-dark border border-overlay/5 rounded-2xl p-5 shadow-sm">
                <h3 className="font-bold text-xl text-content mb-3">{t('destination.accessTimesTitle')}</h3>
                <p className="text-xs text-content-muted mb-4 leading-relaxed">{t('destination.accessTimesHint')}</p>
                <div className="flex flex-wrap gap-2">
                    {accessTimes.legs.map((leg, index) => (
                        <span
                            key={`${leg.mode}-${index}`}
                            className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-bold text-content capitalize"
                        >
                            <span className="material-symbols-outlined text-primary text-sm">
                                {accessLegIcon(leg.mode)}
                            </span>
                            <span>
                                {leg.mode}
                                <span className="text-content-muted font-semibold">
                                    {' · '}
                                    {formatAccessLegDuration(leg, durationLabels)}
                                </span>
                            </span>
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};
