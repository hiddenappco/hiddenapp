import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';

interface PactGateProps {
    pactAccepted?: boolean;
    profileLoaded?: boolean;
    children: React.ReactNode;
}

/**
 * Blocks the app until `pactAccepted === true` (guests and registered users).
 * Only `/pact` is reachable while pending.
 */
export const PactGate: React.FC<PactGateProps> = ({
    pactAccepted,
    profileLoaded = true,
    children,
}) => {
    const location = useLocation();
    const { t } = useTranslation();

    if (!profileLoaded) {
        return (
            <div className="h-screen w-full bg-background-dark text-content flex items-center justify-center font-display font-medium">
                {t('common.loading')}
            </div>
        );
    }

    if (pactAccepted !== true && location.pathname !== '/pact') {
        return <Navigate to="/pact" replace state={{ from: location }} />;
    }

    return <>{children}</>;
};
