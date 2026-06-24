import React from 'react';
import type { NetworkDetails } from '../../hooks/useNetworkDetails';
import { useTranslation } from '../../hooks/useTranslation';

export type ConnectivityBannerVariant = 'offline' | 'server' | 'cellular' | 'wifi';

interface ConnectivityBannerProps {
    variant: ConnectivityBannerVariant;
    className?: string;
    compact?: boolean;
}

export const ConnectivityBanner: React.FC<ConnectivityBannerProps> = ({
    variant,
    className = '',
    compact = false,
}) => {
    const { t } = useTranslation();

    const config = {
        offline: {
            icon: 'signal_wifi_off',
            border: 'border-red-500/25',
            bg: 'bg-red-500/10',
            text: 'text-red-300',
            title: t('connectivity.offline.bannerTitle'),
            body: t('connectivity.offline.bannerBody'),
        },
        server: {
            icon: 'cloud_off',
            border: 'border-amber-500/25',
            bg: 'bg-amber-500/10',
            text: 'text-amber-200',
            title: t('connectivity.server.bannerTitle'),
            body: t('connectivity.server.bannerBody'),
        },
        cellular: {
            icon: 'network_cell',
            border: 'border-amber-500/25',
            bg: 'bg-amber-500/10',
            text: 'text-amber-200',
            title: t('connectivity.cellular.title'),
            body: t('connectivity.cellular.body'),
        },
        wifi: {
            icon: 'wifi',
            border: 'border-emerald-500/25',
            bg: 'bg-emerald-500/10',
            text: 'text-emerald-300',
            title: t('connectivity.wifi.title'),
            body: t('connectivity.wifi.body'),
        },
    }[variant];

    return (
        <div
            role="status"
            className={`glass-surface rounded-2xl border ${config.border} ${config.bg} p-3 flex gap-3 ${className}`}
        >
            <span className={`material-symbols-outlined text-[20px] shrink-0 mt-0.5 ${config.text}`}>
                {config.icon}
            </span>
            <div className="min-w-0 flex-1">
                <p className={`text-xs font-bold leading-snug ${config.text}`}>{config.title}</p>
                {!compact && (
                    <p className="text-[11px] text-content-muted mt-1 leading-relaxed">{config.body}</p>
                )}
            </div>
        </div>
    );
};

export function networkBannerVariant(network: NetworkDetails): ConnectivityBannerVariant | null {
    if (!network.isOnline) return 'offline';
    if (network.isCellular) return 'cellular';
    return null;
}

export function networkStatusLabel(
    t: (key: string) => string,
    network: NetworkDetails
): { icon: string; label: string; tone: 'ok' | 'warn' | 'off' } {
    if (!network.isOnline) {
        return { icon: 'cloud_off', label: t('connectivity.status.offline'), tone: 'off' };
    }
    if (network.isCellular) {
        return { icon: 'network_cell', label: t('connectivity.status.cellular'), tone: 'warn' };
    }
    if (network.connectionType === 'wifi') {
        return { icon: 'wifi', label: t('connectivity.status.wifi'), tone: 'ok' };
    }
    return { icon: 'cloud_done', label: t('connectivity.status.online'), tone: 'ok' };
}
