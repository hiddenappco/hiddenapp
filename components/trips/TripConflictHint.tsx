import React, { useState } from 'react';
import { useTranslation } from '../../hooks/useTranslation';

interface TripConflictHintProps {
    tripId: string;
    isGroupTrip: boolean;
    visible: boolean;
}

function dismissKey(tripId: string): string {
    return `hidden_trip_conflict_hint_dismissed:${tripId}`;
}

export const TripConflictHint: React.FC<TripConflictHintProps> = ({
    tripId,
    isGroupTrip,
    visible,
}) => {
    const { t } = useTranslation();
    const [dismissed, setDismissed] = useState(() => {
        if (typeof sessionStorage === 'undefined') return false;
        return sessionStorage.getItem(dismissKey(tripId)) === '1';
    });

    if (!isGroupTrip || !visible || dismissed) return null;

    return (
        <div className="mx-4 mt-2 px-4 py-3 rounded-xl border bg-violet-500/10 border-violet-500/25 text-xs text-content-secondary leading-relaxed">
            <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-violet-300 text-base shrink-0 mt-0.5">
                    groups
                </span>
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-violet-200 mb-1">{t('trips.offlineConflictTitle')}</p>
                    <p>{t('trips.offlineConflictBody')}</p>
                </div>
                <button
                    type="button"
                    onClick={() => {
                        sessionStorage.setItem(dismissKey(tripId), '1');
                        setDismissed(true);
                    }}
                    className="shrink-0 text-violet-300/80 hover:text-violet-100 p-1"
                    aria-label="Dismiss"
                >
                    <span className="material-symbols-outlined text-base">close</span>
                </button>
            </div>
        </div>
    );
};
