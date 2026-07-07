import React, { useEffect, useState } from 'react';
import type { TripDocument } from '../../types/trips';
import { useTranslation } from '../../hooks/useTranslation';
import {
    readTripDocumentLocalObjectUrl,
} from '../../services/tripDocumentFileStore';

interface TripDocumentViewerProps {
    document: TripDocument;
    isOnline: boolean;
    onClose: () => void;
    onOpenExternal: (url: string) => Promise<void>;
}

export const TripDocumentViewer: React.FC<TripDocumentViewerProps> = ({
    document,
    isOnline,
    onClose,
    onOpenExternal,
}) => {
    const { t } = useTranslation();
    const [objectUrl, setObjectUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let revoked: string | null = null;
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                if (document.localPath) {
                    const localUrl = await readTripDocumentLocalObjectUrl(
                        document.localPath,
                        document.mimeType
                    );
                    if (localUrl) {
                        revoked = localUrl;
                        setObjectUrl(localUrl);
                        setLoading(false);
                        return;
                    }
                }
                if (document.downloadUrl) {
                    setObjectUrl(document.downloadUrl);
                    setLoading(false);
                    return;
                }
                if (!isOnline) {
                    setError(t('trips.documentsOfflineUnavailable'));
                    return;
                }
                setError(t('trips.documentsViewError'));
            } catch {
                setError(t('trips.documentsViewError'));
            } finally {
                setLoading(false);
            }
        };
        load();
        return () => {
            if (revoked) URL.revokeObjectURL(revoked);
        };
    }, [document, isOnline, t]);

    const isImage = document.mimeType.startsWith('image/');
    const isPdf = document.mimeType === 'application/pdf' || document.fileName.toLowerCase().endsWith('.pdf');

    return (
        <div className="fixed inset-0 z-[70] bg-black/90 flex flex-col">
            <header className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <button type="button" onClick={onClose} className="text-white font-bold text-sm">
                    {t('trips.cancel')}
                </button>
                <p className="text-white text-sm font-semibold truncate max-w-[60%]">{document.fileName}</p>
                {objectUrl && isPdf && (
                    <button
                        type="button"
                        onClick={() => onOpenExternal(objectUrl)}
                        className="text-budget-primary text-sm font-bold"
                    >
                        {t('trips.download')}
                    </button>
                )}
                {!isPdf && <span className="w-12" />}
            </header>

            <div className="flex-1 overflow-auto flex items-center justify-center p-4">
                {loading && (
                    <p className="text-white/70 text-sm">{t('trips.documentsLoading')}</p>
                )}
                {error && (
                    <p className="text-red-300 text-sm text-center max-w-sm">{error}</p>
                )}
                {!loading && !error && objectUrl && isImage && (
                    <img
                        src={objectUrl}
                        alt={document.fileName}
                        className="max-w-full max-h-full object-contain rounded-lg"
                    />
                )}
                {!loading && !error && objectUrl && isPdf && (
                    <iframe
                        title={document.fileName}
                        src={objectUrl}
                        className="w-full h-full min-h-[70vh] rounded-lg bg-white"
                    />
                )}
            </div>
        </div>
    );
};
