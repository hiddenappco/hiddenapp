import React from 'react';
import { usePaywallRoiContext } from '../../hooks/usePaywallRoiContext';
import { PaywallRoiBanner } from '../paywall/PaywallRoiBanner';
import type { Trip } from '../../types/trips';

interface PaywallRoiCardProps {
    activeTrip?: Trip | null;
}

export const PaywallRoiCard: React.FC<PaywallRoiCardProps> = ({ activeTrip }) => {
    const { estimate, loading, isPremium } = usePaywallRoiContext({
        kind: 'trip',
        locationHint: activeTrip?.location,
    });

    if (isPremium || loading || !estimate) return null;

    return <PaywallRoiBanner estimate={estimate} i18nPrefix="paywallRoi" />;
};
