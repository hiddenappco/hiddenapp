import React from 'react';

interface DestinationActionsProps {
    onDownloadPdf: () => void;
    onOpenMap: () => void;
    onPremiumClick?: () => void;
    isPremium: boolean;
    pdfLoading?: boolean;
    pdfSizeMb?: string;
    texts: {
        downloadPdf: string;
        downloadPremium: string;
        viewMap: string;
        pdfLocked?: string;
        pdfGenerating?: string;
        pdfPremiumBadge?: string;
    };
}

export const DestinationActions: React.FC<DestinationActionsProps> = ({
    onDownloadPdf,
    onOpenMap,
    onPremiumClick,
    isPremium,
    pdfLoading = false,
    pdfSizeMb,
    texts,
}) => {
    const pdfLabel = isPremium
        ? pdfLoading
            ? texts.pdfGenerating || texts.downloadPdf
            : pdfSizeMb
              ? `${texts.downloadPdf} (~${pdfSizeMb} MB)`
              : texts.downloadPdf
        : texts.downloadPremium;

    const handlePdfClick = () => {
        if (pdfLoading) return;
        if (!isPremium) {
            onPremiumClick?.();
            return;
        }
        onDownloadPdf();
    };

    return (
        <div className="px-5 py-4 grid grid-cols-2 gap-3">
            <button
                type="button"
                disabled={pdfLoading}
                onClick={handlePdfClick}
                title={!isPremium ? texts.pdfLocked : undefined}
                className={`relative font-bold py-3.5 px-3 rounded-xl flex items-center justify-center gap-2 text-sm truncate transition-all active:scale-[0.98] overflow-hidden ${
                    isPremium && !pdfLoading
                        ? 'bg-primary hover:bg-orange-600 text-white shadow-lg shadow-orange-900/20'
                        : 'bg-gradient-to-br from-primary/15 via-surface-dark to-amber-500/10 text-content border border-primary/35 hover:border-primary/55 hover:from-primary/20 shadow-[0_0_20px_rgba(255,108,82,0.12)]'
                } ${pdfLoading ? 'opacity-70 cursor-wait' : ''}`}
            >
                <span className="material-symbols-outlined text-[20px] shrink-0">
                    {pdfLoading ? 'hourglass_empty' : isPremium ? 'description' : 'workspace_premium'}
                </span>
                <span className="truncate">{pdfLabel}</span>
            </button>
            <button
                type="button"
                onClick={onOpenMap}
                className="bg-surface-dark border border-overlay/10 text-content font-bold py-3.5 px-3 rounded-xl flex items-center justify-center gap-2 hover:bg-overlay/5 transition-all active:scale-[0.98] text-sm"
            >
                <span className="material-symbols-outlined text-[20px] text-blue-400">map</span>
                {texts.viewMap}
            </button>
        </div>
    );
};
