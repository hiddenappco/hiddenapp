import React from 'react';

interface DestinationActionsProps {
    onDownloadPdf: () => void;
    onOpenMap: () => void;
    pdfFile?: string;
    texts: any;
}

export const DestinationActions: React.FC<DestinationActionsProps> = ({
    onDownloadPdf,
    onOpenMap,
    pdfFile,
    texts
}) => {
    return (
        <div className="px-5 py-4 grid grid-cols-2 gap-3">
            <button
                onClick={onDownloadPdf}
                className="bg-primary hover:bg-orange-600 text-white font-bold py-3.5 px-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-orange-900/20 transition-all active:scale-[0.98] text-sm truncate"
            >
                <span className="material-symbols-outlined text-[20px]">description</span>
                {pdfFile ? texts.downloadPdf : texts.downloadPremium}
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
