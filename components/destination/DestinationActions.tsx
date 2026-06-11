import React from 'react';

/** Temporary — re-enable when PDF dossier download is ready. */
const PDF_DOWNLOAD_ENABLED = false;

interface DestinationActionsProps {
    onDownloadPdf: () => void;
    onOpenMap: () => void;
    pdfFile?: string;
    texts: {
        downloadPdf: string;
        downloadPremium: string;
        viewMap: string;
        pdfLocked?: string;
    };
}

export const DestinationActions: React.FC<DestinationActionsProps> = ({
    onDownloadPdf,
    onOpenMap,
    pdfFile,
    texts
}) => {
    const pdfLabel = pdfFile ? texts.downloadPdf : texts.downloadPremium;

    return (
        <div className="px-5 py-4 grid grid-cols-2 gap-3">
            <button
                type="button"
                disabled={!PDF_DOWNLOAD_ENABLED}
                onClick={PDF_DOWNLOAD_ENABLED ? onDownloadPdf : undefined}
                title={!PDF_DOWNLOAD_ENABLED ? texts.pdfLocked : undefined}
                aria-disabled={!PDF_DOWNLOAD_ENABLED}
                className={`font-bold py-3.5 px-3 rounded-xl flex items-center justify-center gap-2 text-sm truncate transition-all ${
                    PDF_DOWNLOAD_ENABLED
                        ? 'bg-primary hover:bg-orange-600 text-white shadow-lg shadow-orange-900/20 active:scale-[0.98]'
                        : 'bg-overlay/10 text-content/40 border border-overlay/10 cursor-not-allowed opacity-70'
                }`}
            >
                <span className="material-symbols-outlined text-[20px]">
                    {PDF_DOWNLOAD_ENABLED ? 'description' : 'lock'}
                </span>
                {pdfLabel}
            </button>
            <button
                onClick={onOpenMap}
                className="bg-surface-dark border border-overlay/10 text-content font-bold py-3.5 px-3 rounded-xl flex items-center justify-center gap-2 hover:bg-overlay/5 transition-all active:scale-[0.98] text-sm"
            >
                <span className="material-symbols-outlined text-[20px] text-blue-400">map</span>
                {texts.viewMap}
            </button>
        </div>
    );
};
