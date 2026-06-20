import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface HelpTooltipProps {
    /** Accessible name for the ? control */
    label: string;
    content: string;
    className?: string;
    /** Popover alignment when space is tight (e.g. table cells) */
    align?: 'start' | 'end';
}

const VIEWPORT_PAD = 12;
const GAP = 6;
const MAX_WIDTH = 280;

export const HelpTooltip: React.FC<HelpTooltipProps> = ({
    label,
    content,
    className = '',
    align = 'start',
}) => {
    const [open, setOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

    const reposition = useCallback(() => {
        const trigger = triggerRef.current;
        const tooltip = tooltipRef.current;
        if (!trigger || !tooltip) return;

        const tr = trigger.getBoundingClientRect();
        const width = Math.min(MAX_WIDTH, window.innerWidth - VIEWPORT_PAD * 2);
        const height = tooltip.offsetHeight;

        let top = tr.bottom + GAP;
        if (top + height > window.innerHeight - VIEWPORT_PAD) {
            const above = tr.top - GAP - height;
            top = above >= VIEWPORT_PAD
                ? above
                : Math.max(VIEWPORT_PAD, window.innerHeight - VIEWPORT_PAD - height);
        }

        let left = align === 'end' ? tr.right - width : tr.left;
        if (left + width > window.innerWidth - VIEWPORT_PAD) {
            left = window.innerWidth - VIEWPORT_PAD - width;
        }
        left = Math.max(VIEWPORT_PAD, left);

        setPos({ top, left, width });
    }, [align]);

    useLayoutEffect(() => {
        if (!open) {
            setPos(null);
            return;
        }
        reposition();
        window.addEventListener('resize', reposition);
        window.addEventListener('scroll', reposition, true);
        return () => {
            window.removeEventListener('resize', reposition);
            window.removeEventListener('scroll', reposition, true);
        };
    }, [open, reposition, content]);

    useEffect(() => {
        if (!open) return;

        const onPointerDown = (event: PointerEvent) => {
            const target = event.target as Node;
            if (
                triggerRef.current?.contains(target) ||
                tooltipRef.current?.contains(target)
            ) {
                return;
            }
            setOpen(false);
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

    return (
        <span
            className={`relative inline-flex shrink-0 align-middle ${className}`}
            onClick={(e) => e.stopPropagation()}
        >
            <button
                ref={triggerRef}
                type="button"
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setOpen((prev) => !prev);
                }}
                className="relative z-[1] flex size-[18px] shrink-0 items-center justify-center rounded-full bg-overlay/10 border border-overlay/15 text-content-muted hover:text-primary hover:border-primary/30 transition-colors before:absolute before:-inset-2 before:content-['']"
                aria-label={label}
                aria-expanded={open}
            >
                <span className="text-[10px] font-black leading-none select-none pointer-events-none">?</span>
            </button>
            {open &&
                createPortal(
                    <div
                        ref={tooltipRef}
                        role="tooltip"
                        style={{
                            position: 'fixed',
                            top: pos?.top ?? -9999,
                            left: pos?.left ?? VIEWPORT_PAD,
                            width: pos?.width ?? Math.min(MAX_WIDTH, window.innerWidth - VIEWPORT_PAD * 2),
                            visibility: pos ? 'visible' : 'hidden',
                            zIndex: 10000,
                        }}
                        className="rounded-xl border border-overlay/15 bg-surface-dark shadow-xl shadow-black/30 p-3 text-[11px] leading-relaxed text-content-muted"
                    >
                        {content}
                    </div>,
                    document.body
                )}
        </span>
    );
};
