import React from 'react';

/**
 * Full-screen fallback while a lazy route chunk loads.
 * Uses bg-background-dark to avoid white flashes between navigations.
 */
export const RouteLoadingFallback: React.FC = () => (
    <div
        className="w-full h-full min-h-screen bg-background-dark flex flex-col items-center justify-center gap-3"
        role="status"
        aria-live="polite"
        aria-busy="true"
    >
        <div className="w-9 h-9 rounded-full border-[3px] border-primary/25 border-t-primary animate-spin" />
        <span className="sr-only">Loading</span>
    </div>
);
