import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';

interface TripSyncBannerProps {
    pendingCount: number;
    syncing: boolean;
    isOnline: boolean;
}

export const TripSyncBanner: React.FC<TripSyncBannerProps> = ({ pendingCount, syncing, isOnline }) => {
    const { t } = useTranslation();

    if (isOnline && pendingCount === 0 && !syncing) return null;

    return (
        <div
            className={`mx-4 mt-2 px-4 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                isOnline
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                    : 'bg-blue-500/10 border-blue-500/20 text-blue-300'
            }`}
        >
            <span className="material-symbols-outlined text-base">
                {syncing ? 'sync' : isOnline ? 'cloud_upload' : 'cloud_off'}
            </span>
            <span>
                {!isOnline
                    ? t('trips.offlineMode')
                    : syncing
                      ? t('trips.syncing')
                      : t('trips.pendingSync', { count: pendingCount })}
            </span>
        </div>
    );
};
