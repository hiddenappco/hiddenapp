import React from 'react';

interface DataConfirmModalProps {
    open: boolean;
    title: string;
    body: string;
    warning?: string;
    confirmLabel: string;
    cancelLabel: string;
    onConfirm: () => void;
    onCancel: () => void;
    destructive?: boolean;
}

export const DataConfirmModal: React.FC<DataConfirmModalProps> = ({
    open,
    title,
    body,
    warning,
    confirmLabel,
    cancelLabel,
    onConfirm,
    onCancel,
    destructive = false,
}) => {
    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 pb-safe bg-black/60 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="data-confirm-title"
            onClick={onCancel}
        >
            <div
                className="glass-surface w-full max-w-md rounded-2xl p-5 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start gap-3 mb-4">
                    <div className="size-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-primary text-[22px]">
                            {destructive ? 'warning' : 'download'}
                        </span>
                    </div>
                    <div className="min-w-0 flex-1">
                        <h2 id="data-confirm-title" className="font-bold text-base text-content leading-snug">
                            {title}
                        </h2>
                        <p className="text-sm text-content-muted mt-2 leading-relaxed">{body}</p>
                        {warning && (
                            <p className="text-xs text-amber-300/90 mt-3 flex items-start gap-1.5 leading-relaxed">
                                <span className="material-symbols-outlined text-[16px] shrink-0 mt-0.5">info</span>
                                {warning}
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex flex-col-reverse sm:flex-row gap-2 pt-1">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="touch-target flex-1 rounded-xl border border-overlay/15 px-4 py-2.5 text-sm font-semibold text-content-muted hover:bg-overlay/5 transition-colors"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className={`touch-target flex-1 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-colors ${
                            destructive
                                ? 'bg-red-600 hover:bg-red-700'
                                : 'bg-primary hover:bg-primary/90'
                        }`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};
