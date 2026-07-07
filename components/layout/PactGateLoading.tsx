import React from 'react';
import { PageLoadingScreen } from '../ui/PageLoadingScreen';

/** Loading state while Firestore profile resolves (slow 3G / cold start). */
export const PactGateLoading: React.FC = () => (
    <PageLoadingScreen titleKey="pactGate.loadingProfile" hintKey="pactGate.loadingHint" />
);
