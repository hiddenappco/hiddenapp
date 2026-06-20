import React, { useEffect, useRef, useState } from 'react';

interface HelpTooltipProps {
    /** Accessible name for the ? control */
    label: string;
    content: string;
    className?: string;
    /** Popover alignment when space is tight (e.g. table cells) */
    align?: 'start' | 'end';
}

export const HelpTooltip: React.FC<HelpTooltipProps> = ({
    label,
    content,
    className = '',
    align = 'start',
}) => {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;

        const onPointerDown = (event: PointerEvent) => {
            if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false);
        };

        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);

    const popoverAlign =
        align === 'end' ? 'right-0' : 'left-0';

    return (
        <div
            ref={rootRef}
            className={`relative inline-flex shrink-0 align-middle ${className}`}
            onClick={(e) => e.stopPropagation()}
        >
            <button
                type="button"
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setOpen((prev) => !prev);
                }}
                className="touch-target size-5 min-w-[20px] rounded-full bg-overlay/10 border border-overlay/15 flex items-center justify-center text-content-muted hover:text-primary hover:border-primary/30 transition-colors"
                aria-label={label}
                aria-expanded={open}
            >
                <span className="text-[11px] font-black leading-none select-none">?</span>
            </button>
            {open && (
                <div
                    role="tooltip"
                    className={`absolute z-[60] top-full mt-1.5 ${popoverAlign} w-[min(280px,calc(100vw-2.5rem))] rounded-xl border border-overlay/15 bg-surface-dark shadow-xl shadow-black/30 p-3 text-[11px] leading-relaxed text-content-muted`}
                >
                    {content}
                </div>
            )}
        </div>
    );
};
