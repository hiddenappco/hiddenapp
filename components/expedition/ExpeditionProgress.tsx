import React from 'react';
import { ExpeditionSkeleton } from './ExpeditionSkeleton';
import type { ExpeditionStatus } from '../../hooks/useExpedition';

/** @deprecated Prefer `ExpeditionSkeleton` — kept for chat widget imports. */
interface ExpeditionProgressProps {
    status: ExpeditionStatus;
    fullScreen?: boolean;
    days?: number;
}

export const ExpeditionProgress: React.FC<ExpeditionProgressProps> = (props) => (
    <ExpeditionSkeleton {...props} />
);
