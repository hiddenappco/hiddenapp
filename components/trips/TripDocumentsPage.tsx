import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Browser } from '@capacitor/browser';
import { useAuth } from '../layout/AuthProvider';
import { useRevenueCat } from '../layout/RevenueCatProvider';
import { useTranslation } from '../../hooks/useTranslation';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useTrip, useTripExpenses } from '../../hooks/useFirestore';
import { useTripDocuments } from '../../hooks/useTripDocuments';
import { useTripSync } from '../../hooks/useTripSync';
import type { TripActivityActor, TripDocument } from '../../types/trips';
import { StickyGlassHeader } from '../ui/StickyGlassHeader';
import { PageLoadingScreen } from '../ui/PageLoadingScreen';
import { TripSyncBanner } from './TripSyncBanner';
import {
    canDeleteTripDocument,
    canRenameTripDocument,
    canUploadTripDocument,
    canViewTripDocuments,
    formatBytes,
} from '../../utils/tripDocumentPermissions';
import {
    createTripDocumentLocalFirst,
    getUserTripDocumentBytesUsed,
    TRIP_DOCUMENT_FILE_TOO_LARGE,
    TRIP_DOCUMENT_QUOTA_EXCEEDED,
    TRIP_DOCUMENT_TYPE_NOT_ALLOWED,
    tripFinishedAtMs,
    isLocalCacheExpiredForCompletedTrip,
} from '../../services/tripDocumentService';
import { TRIP_DOCUMENT_LIMITS } from '../../config/constants';
import { makeTempId } from '../../services/tripLedgerStore';
import { deleteTripDocumentLocal } from '../../services/tripDocumentFileStore';
import { TripDocumentViewer } from './TripDocumentViewer';
import { purgeExpiredTripDocumentLocalCaches } from '../../services/tripDocumentRetention';

interface TripDocumentsPageProps {
    onBack: () => void;
}

export const TripDocumentsPage: React.FC<TripDocumentsPageProps> = ({ onBack }) => {
    const { tripId } = useParams<{ tripId: string }>();
    const [searchParams] = useSearchParams();
    const linkExpenseId = searchParams.get('expenseId') || undefined;
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { user } = useAuth();
    const { isPremium } = useRevenueCat();
    const isOnline = useNetworkStatus();

    const { trip, loading: tripLoading } = useTrip(tripId, isOnline);
    const { documents, loading: docsLoading, refreshMirror } = useTripDocuments(tripId, isOnline);
    const { expenses } = useTripExpenses(tripId, isOnline);
    const {
        pendingCount,
        syncing,
        queueAddDocument,
        queueDeleteDocument,
        queueRenameDocument,
        syncDocumentNow,
        renameDocumentNow,
    } = useTripSync(user?.uid);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [quotaUsed, setQuotaUsed] = useState(0);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [viewerDoc, setViewerDoc] = useState<TripDocument | null>(null);
    const [selectedExpenseId, setSelectedExpenseId] = useState<string | undefined>(linkExpenseId);
    // Naming dialog: pops after picking a file (mode 'upload') or when editing an
    // existing document's label (mode 'rename').
    const [nameDialog, setNameDialog] = useState<
        | { mode: 'upload'; file: File; value: string }
        | { mode: 'rename'; doc: TripDocument; value: string }
        | null
    >(null);

    const actor: TripActivityActor | undefined = user?.uid
        ? {
              uid: user.uid,
              displayName: user.displayName || t('trips.traveler'),
          }
        : undefined;

    const canView = canViewTripDocuments(trip, user?.uid, isPremium);
    const canUpload = canUploadTripDocument(trip, user?.uid, isPremium);

    useEffect(() => {
        purgeExpiredTripDocumentLocalCaches().catch(() => undefined);
    }, []);

    useEffect(() => {
        if (!user?.uid || !isPremium) return;
        getUserTripDocumentBytesUsed(user.uid).then(setQuotaUsed).catch(() => setQuotaUsed(0));
    }, [user?.uid, isPremium]);

    useEffect(() => {
        setSelectedExpenseId(linkExpenseId);
    }, [linkExpenseId]);

    const retentionHint = useMemo(() => {
        if (!trip || trip.status !== 'completed') return null;
        const finished = tripFinishedAtMs(trip);
        if (!finished) return null;
        if (!isLocalCacheExpiredForCompletedTrip(finished)) {
            const graceEnd = finished + TRIP_DOCUMENT_LIMITS.LOCAL_CACHE_GRACE_DAYS * 24 * 60 * 60 * 1000;
            return t('trips.documentsRetentionHint', {
                date: new Date(graceEnd).toLocaleDateString(),
            });
        }
        return t('trips.documentsRetentionExpired');
    }, [trip, t]);

    const handlePickFile = () => {
        if (!canUpload) return;
        fileInputRef.current?.click();
    };

    const stripExtension = (name: string) => name.replace(/\.[^./\\]+$/, '');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file || !trip || !actor || !tripId) return;
        // Let the user name the file before it's uploaded, prefilled with the
        // technical file name (sans extension) so generic "Screenshot_2026…"
        // names can be replaced with something meaningful.
        setError(null);
        setNameDialog({ mode: 'upload', file, value: stripExtension(file.name) });
    };

    const handleUploadConfirmed = async (file: File, title: string) => {
        if (!trip || !actor || !tripId) return;

        setNameDialog(null);
        setError(null);
        setUploading(true);
        try {
            const docId = makeTempId('doc');
            const draft = await createTripDocumentLocalFirst(
                tripId,
                file,
                actor,
                selectedExpenseId,
                docId,
                title
            );

            if (isOnline && !tripId.startsWith('local_')) {
                try {
                    await syncDocumentNow(draft, actor);
                } catch {
                    await queueAddDocument(draft, actor);
                }
            } else {
                await queueAddDocument(draft, actor);
            }

            await refreshMirror();
            setQuotaUsed((prev) => prev + draft.sizeBytes);
        } catch (err) {
            const code = err instanceof Error ? err.message : '';
            if (code === TRIP_DOCUMENT_FILE_TOO_LARGE) {
                setError(t('trips.documentsFileTooLarge', { mb: 20 }));
            } else if (code === TRIP_DOCUMENT_QUOTA_EXCEEDED) {
                setError(t('trips.documentsQuotaExceeded'));
            } else if (code === TRIP_DOCUMENT_TYPE_NOT_ALLOWED) {
                setError(t('trips.documentsTypeNotAllowed'));
            } else {
                setError(t('trips.documentsUploadError'));
            }
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (doc: TripDocument) => {
        if (!trip || !actor || !canDeleteTripDocument(trip, user?.uid, doc)) return;
        if (!window.confirm(t('trips.documentsDeleteConfirm', { name: doc.fileName }))) return;

        setError(null);
        const isPendingLocal = Boolean(doc.pendingSync || doc.uploadPending || doc.localOnly);
        try {
            if (isOnline && !trip.id.startsWith('local_') && !isPendingLocal) {
                const { tombstoneTripDocument } = await import('../../services/tripDocumentService');
                await tombstoneTripDocument(trip.id, doc, actor);
                const { removeDocumentMirror } = await import('../../services/tripLedgerStore');
                await removeDocumentMirror(trip.id, doc.id);
            } else {
                await queueDeleteDocument(doc, actor);
            }
            if (doc.localPath) {
                await deleteTripDocumentLocal(doc.localPath);
            }
            await refreshMirror();
            if (doc.uploadedByUid === user?.uid) {
                setQuotaUsed((prev) => Math.max(0, prev - doc.sizeBytes));
            }
        } catch {
            setError(t('trips.documentsDeleteError'));
        }
    };

    const handleRenameConfirmed = async (doc: TripDocument, rawTitle: string) => {
        setNameDialog(null);
        const title = rawTitle.trim() || undefined;
        if (title === (doc.title || undefined)) return;
        setError(null);
        const isPendingLocal = Boolean(doc.pendingSync || doc.uploadPending || doc.localOnly);
        try {
            if (isOnline && !trip?.id.startsWith('local_') && !isPendingLocal) {
                await renameDocumentNow(doc, title);
            } else {
                await queueRenameDocument(doc, title);
            }
            await refreshMirror();
        } catch {
            setError(t('trips.documentsRenameError'));
        }
    };

    const openDocument = async (doc: TripDocument) => {
        setViewerDoc(doc);
    };

    if (tripLoading || !tripId) {
        return <PageLoadingScreen titleKey="trips.documentsLoading" />;
    }

    if (!trip) {
        return (
            <div className="h-screen bg-background-dark flex flex-col items-center justify-center p-6 text-center">
                <p className="text-content-muted mb-4">{t('trips.tripNotFound')}</p>
                <button onClick={onBack} className="text-budget-primary font-bold">
                    {t('trips.backToLedger')}
                </button>
            </div>
        );
    }

    if (!canView) {
        return (
            <div className="h-screen bg-background-dark flex flex-col text-content">
                <StickyGlassHeader onBack={onBack} title={t('trips.documentsTitle')} showLogo={false} />
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-4">
                    <span className="material-symbols-outlined text-5xl text-budget-primary">workspace_premium</span>
                    <h2 className="text-xl font-bold">{t('trips.documentsPremiumTitle')}</h2>
                    <p className="text-sm text-content-muted max-w-sm">{t('trips.documentsPremiumDesc')}</p>
                    <button
                        onClick={() => navigate('/premium')}
                        className="mt-2 px-6 py-3 rounded-2xl bg-budget-primary text-white font-bold"
                    >
                        {t('trips.documentsPremiumCta')}
                    </button>
                </div>
            </div>
        );
    }

    const quotaPercent = Math.min(100, (quotaUsed / TRIP_DOCUMENT_LIMITS.MAX_USER_BYTES) * 100);

    return (
        <div className="bg-background-dark font-display antialiased text-content h-screen w-full flex flex-col overflow-hidden relative">
            <StickyGlassHeader
                onBack={onBack}
                showLogo={false}
                title={t('trips.documentsTitle')}
                subtitle={trip.name}
            />

            <TripSyncBanner pendingCount={pendingCount} syncing={syncing} isOnline={isOnline} />

            <main className="flex-1 overflow-y-auto no-scrollbar p-4 flex flex-col gap-4 pb-[calc(7rem+var(--safe-bottom))]">
                <section className="rounded-2xl border border-overlay/10 bg-surface-dark p-4">
                    <div className="flex items-center justify-between gap-3 mb-2">
                        <p className="text-xs font-bold text-content-muted uppercase tracking-widest">
                            {t('trips.documentsStorageLabel')}
                        </p>
                        <p className="text-xs text-content-subtle">
                            {formatBytes(quotaUsed)} / {formatBytes(TRIP_DOCUMENT_LIMITS.MAX_USER_BYTES)}
                        </p>
                    </div>
                    <div className="h-2 rounded-full bg-overlay/10 overflow-hidden">
                        <div
                            className="h-full bg-budget-primary transition-all"
                            style={{ width: `${quotaPercent}%` }}
                        />
                    </div>
                    <p className="text-[10px] text-content-subtle mt-2">
                        {t('trips.documentsMaxFile', { mb: 20 })}
                    </p>
                </section>

                {retentionHint && (
                    <p className="text-xs text-amber-400/90 bg-amber-950/20 border border-amber-900/30 rounded-xl px-3 py-2">
                        {retentionHint}
                    </p>
                )}

                {canUpload && expenses.length > 0 && (
                    <label className="flex flex-col gap-1.5">
                        <span className="text-[10px] font-bold text-content-muted uppercase tracking-widest">
                            {t('trips.documentsLinkExpense')}
                        </span>
                        <select
                            value={selectedExpenseId || ''}
                            onChange={(e) => setSelectedExpenseId(e.target.value || undefined)}
                            className="h-11 px-3 rounded-2xl bg-surface-dark border border-overlay/10 text-sm"
                        >
                            <option value="">{t('trips.documentsNoExpenseLink')}</option>
                            {expenses.map((exp) => (
                                <option key={exp.id} value={exp.id}>
                                    {exp.note || t('trips.activityExpenseFallback')} · {exp.time}
                                </option>
                            ))}
                        </select>
                    </label>
                )}

                {error && (
                    <p className="text-xs text-red-400 bg-red-950/20 border border-red-900/30 rounded-xl px-3 py-2">
                        {error}
                    </p>
                )}

                {docsLoading ? (
                    <p className="text-center text-sm text-content-muted py-8">{t('trips.documentsLoading')}</p>
                ) : documents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                        <span className="material-symbols-outlined text-4xl text-content-subtle">folder_open</span>
                        <p className="text-sm text-content-muted max-w-xs">{t('trips.documentsEmpty')}</p>
                    </div>
                ) : (
                    <ul className="flex flex-col gap-3">
                        {documents.map((doc) => {
                            const deletable = canDeleteTripDocument(trip, user?.uid, doc);
                            const renamable = canRenameTripDocument(trip, user?.uid, doc);
                            const linked = doc.expenseId
                                ? expenses.find((e) => e.id === doc.expenseId)
                                : undefined;
                            const isImage = doc.mimeType.startsWith('image/');
                            const displayName = doc.title || doc.fileName;

                            return (
                                <li
                                    key={doc.id}
                                    className="flex items-center gap-3 p-3 rounded-2xl bg-surface-dark border border-overlay/10"
                                >
                                    <button
                                        type="button"
                                        onClick={() => openDocument(doc)}
                                        className="flex items-center gap-3 flex-1 min-w-0 text-left"
                                    >
                                        <div className="size-12 rounded-xl bg-overlay/5 flex items-center justify-center shrink-0">
                                            <span className="material-symbols-outlined text-budget-primary">
                                                {isImage ? 'image' : 'picture_as_pdf'}
                                            </span>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-bold text-sm truncate">{displayName}</p>
                                            <p className="text-[10px] text-content-muted">
                                                {formatBytes(doc.sizeBytes)} · {doc.uploadedByName}
                                                {doc.pendingSync || doc.uploadPending
                                                    ? ` · ${t('trips.activityPending')}`
                                                    : ''}
                                            </p>
                                            {linked && (
                                                <p className="text-[10px] text-budget-primary/80 truncate">
                                                    {t('trips.documentsLinkedExpense')}: {linked.note}
                                                </p>
                                            )}
                                        </div>
                                    </button>
                                    {renamable && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setNameDialog({
                                                    mode: 'rename',
                                                    doc,
                                                    value: doc.title || stripExtension(doc.fileName),
                                                })
                                            }
                                            className="p-2 text-content-subtle hover:text-budget-primary"
                                            aria-label={t('trips.documentsRename')}
                                        >
                                            <span className="material-symbols-outlined text-xl">edit</span>
                                        </button>
                                    )}
                                    {deletable && (
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(doc)}
                                            className="p-2 text-content-subtle hover:text-red-400"
                                            aria-label={t('trips.documentsDelete')}
                                        >
                                            <span className="material-symbols-outlined text-xl">delete</span>
                                        </button>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </main>

            {canUpload && (
                <div className="absolute bottom-safe right-6 z-40">
                    <button
                        type="button"
                        onClick={handlePickFile}
                        disabled={uploading}
                        className="flex items-center gap-2 px-5 py-3.5 rounded-full bg-budget-primary text-white font-bold shadow-lg disabled:opacity-60"
                    >
                        <span className="material-symbols-outlined">
                            {uploading ? 'hourglass_top' : 'add'}
                        </span>
                        {uploading ? t('trips.documentsUploading') : t('trips.documentsAttach')}
                    </button>
                </div>
            )}

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={handleFileChange}
            />

            {viewerDoc && (
                <TripDocumentViewer
                    document={viewerDoc}
                    isOnline={isOnline}
                    onClose={() => setViewerDoc(null)}
                    onOpenExternal={async (url) => {
                        await Browser.open({ url });
                    }}
                />
            )}

            {nameDialog &&
                createPortal(
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-5">
                        <button
                            type="button"
                            aria-label={t('trips.documentsNameCancel')}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => setNameDialog(null)}
                        />
                        <form
                            className="relative w-full max-w-sm rounded-3xl bg-surface-dark border border-overlay/10 p-5 flex flex-col gap-4 shadow-2xl"
                            onSubmit={(e) => {
                                e.preventDefault();
                                if (nameDialog.mode === 'upload') {
                                    handleUploadConfirmed(nameDialog.file, nameDialog.value);
                                } else {
                                    handleRenameConfirmed(nameDialog.doc, nameDialog.value);
                                }
                            }}
                        >
                            <div className="flex flex-col gap-1">
                                <h3 className="text-lg font-bold text-content">
                                    {t('trips.documentsNameTitle')}
                                </h3>
                                <p className="text-xs text-content-muted">
                                    {t('trips.documentsNameHint')}
                                </p>
                            </div>
                            <label className="flex flex-col gap-1.5">
                                <span className="text-[10px] font-bold text-content-muted uppercase tracking-widest">
                                    {t('trips.documentsNameLabel')}
                                </span>
                                <input
                                    type="text"
                                    autoFocus
                                    maxLength={120}
                                    value={nameDialog.value}
                                    placeholder={t('trips.documentsNamePlaceholder')}
                                    onChange={(e) =>
                                        setNameDialog((prev) =>
                                            prev ? { ...prev, value: e.target.value } : prev
                                        )
                                    }
                                    className="h-12 px-3.5 rounded-2xl bg-background-dark border border-overlay/10 text-sm text-content focus:border-budget-primary outline-none"
                                />
                            </label>
                            <div className="flex items-center gap-3 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setNameDialog(null)}
                                    className="flex-1 h-12 rounded-2xl border border-overlay/10 text-content-muted font-bold text-sm"
                                >
                                    {t('trips.documentsNameCancel')}
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 h-12 rounded-2xl bg-budget-primary text-white font-bold text-sm"
                                >
                                    {nameDialog.mode === 'upload'
                                        ? t('trips.documentsNameUpload')
                                        : t('trips.documentsNameSave')}
                                </button>
                            </div>
                        </form>
                    </div>,
                    document.body
                )}
        </div>
    );
};
