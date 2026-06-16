import React from 'react';

interface DestinationActionsProps {
    onDownloadPdf: () => void;
    onOpenMap: () => void;
    isPremium: boolean;
    pdfLoading?: boolean;
    texts: {
        downloadPdf: string;
        downloadPremium: string;
        viewMap: string;
        pdfLocked?: string;
        pdfGenerating?: string;
    };
}

export const DestinationActions: React.FC<DestinationActionsProps> = ({
    onDownloadPdf,
    onOpenMap,
    isPremium,
    pdfLoading = false,
    texts,
}) => {
    const pdfLabel = isPremium
        ? pdfLoading
            ? texts.pdfGenerating || texts.downloadPdf
            : texts.downloadPdf
        : texts.downloadPremium;

    const handlePdf = () => {
        if (!isPremium || pdfLoading) return;
        onDownloadPdf();
    };

    return (
        <div className="px-5 py-4 grid grid-cols-2 gap-3">
            <button
                type="button"
                disabled={!isPremium || pdfLoading}
                onClick={handlePdf}
                title={!isPremium ? texts.pdfLocked : undefined}
                aria-disabled={!isPremium || pdfLoading}
                className={`font-bold py-3.5 px-3 rounded-xl flex items-center justify-center gap-2 text-sm truncate transition-all ${
                    isPremium && !pdfLoading
                        ? 'bg-primary hover:bg-orange-600 text-white shadow-lg shadow-orange-900/20 active:scale-[0.98]'
                        : 'bg-overlay/10 text-content/40 border border-overlay/10 cursor-not-allowed opacity-70'
                }`}
            >
                <span className="material-symbols-outlined text-[20px]">
                    {pdfLoading ? 'hourglass_empty' : isPremium ? 'description' : 'lock'}
                </span>
                {pdfLabel}
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
