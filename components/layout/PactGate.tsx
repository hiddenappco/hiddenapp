import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { PactGateLoading } from './PactGateLoading';

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

    if (!profileLoaded) {
        return <PactGateLoading />;
    }

    if (pactAccepted !== true && location.pathname !== '/pact') {
        return <Navigate to="/pact" replace state={{ from: location }} />;
    }

    return <>{children}</>;
};
