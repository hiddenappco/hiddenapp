import React from 'react';

interface FeatureCoachmarkProps {
    title: string;
    body: string;
    dismissLabel: string;
    onDismiss: () => void;
    className?: string;
}

export const FeatureCoachmark: React.FC<FeatureCoachmarkProps> = ({
    title,
    body,
    dismissLabel,
    onDismiss,
    className = '',
}) => (
    <div
        role="status"
        className={`rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 to-surface-dark/80 p-4 flex gap-3 items-start ${className}`}
    >
        <span className="material-symbols-outlined text-primary text-[22px] shrink-0 mt-0.5">
            tips_and_updates
        </span>
        <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-content leading-snug">{title}</p>
            <p className="text-[12px] text-content-muted leading-relaxed mt-1">{body}</p>
            <button
                type="button"
                onClick={onDismiss}
                className="touch-target mt-3 text-[11px] font-black uppercase tracking-wider text-primary hover:text-primary/80 transition-colors"
            >
                {dismissLabel}
            </button>
        </div>
        <button
            type="button"
            onClick={onDismiss}
            className="touch-target shrink-0 size-8 rounded-full flex items-center justify-center text-content-muted hover:bg-overlay/10 transition-colors"
            aria-label={dismissLabel}
        >
            <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
    </div>
);
