import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Browser } from '@capacitor/browser';
import { Language } from '../../types/core';
import { useExpedition } from '../../hooks/useExpedition';
import { useTranslation } from '../../hooks/useTranslation';
import { useAuth } from '../layout/AuthProvider';
import { useRevenueCat } from '../layout/RevenueCatProvider';
import { exportExpeditionToPdf } from '../../services/pdfExportService';
import { ExpeditionSkeleton } from './ExpeditionSkeleton';
import { ExpeditionResult } from './ExpeditionResult';
import { reviseExpedition } from '../../hooks/useCreateExpedition';
import { translateExpeditionError } from '../../utils/expeditionErrors';
import { MAX_REVISION_NOTES_LENGTH } from '../../config/premiumLimits';
import { computeExpeditionQuotaDisplay } from '../../utils/premiumAccess';
import { useUserProfile } from '../../hooks/useSocial';
import { StickyGlassHeader, StickyHeaderActionButton } from '../ui/StickyGlassHeader';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { requestNotificationPermission } from '../../services/firebaseMessaging';
import {
    clearExpeditionNotifyPending,
    isExpeditionNotifyPending,
    markExpeditionNotifyPending,
} from '../../utils/expeditionNotifyWhenReady';
import { trackAnalyticsEvent } from '../../services/analytics';

interface ExpeditionResultPageProps {
    language: Language;
    onBack: () => void;
}

function isPdfStillValid(
    pdfUrl?: string,
    pdfExpiresAt?: { toDate?: () => Date } | string | Date
): boolean {
    if (!pdfUrl || !pdfExpiresAt) return false;
    const expires =
        typeof pdfExpiresAt === 'object' && pdfExpiresAt !== null && 'toDate' in pdfExpiresAt
            ? pdfExpiresAt.toDate!()
            : new Date(pdfExpiresAt as string | Date);
    return expires > new Date();
}

export const ExpeditionResultPage: React.FC<ExpeditionResultPageProps> = ({ onBack }) => {
    const { expeditionId } = useParams<{ expeditionId: string }>();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { user } = useAuth();
    const { isPremium } = useRevenueCat();
    const { data: profile } = useUserProfile(user?.uid);
    const { data: expedition, loading } = useExpedition(expeditionId);
    const [pdfLoading, setPdfLoading] = useState(false);
    const [revisionNotes, setRevisionNotes] = useState('');
    const [revisionSubmitting, setRevisionSubmitting] = useState(false);
    const [revisionError, setRevisionError] = useState('');
    const [notifyPending, setNotifyPending] = useState(false);
    const [elapsedMs, setElapsedMs] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    const processingStartedRef = useRef<number | null>(null);
    const refreshTimerRef = useRef<number | null>(null);

    const quota = computeExpeditionQuotaDisplay(profile);
    const revisionsUsed = Math.max(0, Math.floor(Number(expedition?.revisionsUsed ?? 0)));
    const canReviseIncluded = revisionsUsed === 0;
    const canReviseWithQuota = canReviseIncluded || quota.allowed;

    const isProcessing =
        expedition != null && expedition.status !== 'ready' && expedition.status !== 'error';
    const days = expedition?.request?.days;

    useEffect(() => {
        if (!expeditionId) return;
        setNotifyPending(isExpeditionNotifyPending(expeditionId));
    }, [expeditionId]);

    useEffect(() => {
        if (isProcessing) {
            if (!processingStartedRef.current) {
                processingStartedRef.current = Date.now();
            }
        } else {
            processingStartedRef.current = null;
            setElapsedMs(0);
        }
    }, [isProcessing, expedition?.id]);

    useEffect(() => {
        if (!isProcessing) return;
        const tick = () => {
            if (processingStartedRef.current) {
                setElapsedMs(Date.now() - processingStartedRef.current);
            }
        };
        tick();
        const id = window.setInterval(tick, 1000);
        return () => window.clearInterval(id);
    }, [isProcessing]);

    useEffect(() => {
        if (!expeditionId || expedition?.status !== 'ready') return;
        if (!isExpeditionNotifyPending(expeditionId)) return;
        clearExpeditionNotifyPending(expeditionId);
        setNotifyPending(false);
        trackAnalyticsEvent('expedition_notify_delivered', { expedition_id: expeditionId });
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            try {
                new Notification(t('expedition.skeletonNotifyReadyTitle'), {
                    body: t('expedition.skeletonNotifyReadyBody'),
                    tag: `expedition-${expeditionId}`,
                });
            } catch {
                /* Notification API unavailable */
            }
        }
    }, [expedition?.status, expeditionId, t]);

    const handleRequestNotify = useCallback(async () => {
        if (!expeditionId || !user?.uid) return;
        trackAnalyticsEvent('expedition_notify_when_ready', { expedition_id: expeditionId });
        if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
            await requestNotificationPermission(user.uid);
        }
        // Persist the opt-in on the expedition doc so a Cloud Function can push the
        // notification even if the user leaves the app during generation.
        try {
            await updateDoc(doc(db, 'expeditions', expeditionId), { notifyWhenReady: true });
        } catch (err) {
            console.error('[expedition] failed to set notifyWhenReady', err);
        }
        markExpeditionNotifyPending(expeditionId);
        setNotifyPending(true);
    }, [expeditionId, user?.uid]);

    const handleManualRefresh = useCallback(() => {
        if (!expeditionId) return;
        trackAnalyticsEvent('expedition_manual_refresh', {
            expedition_id: expeditionId,
            elapsed_sec: Math.floor(elapsedMs / 1000),
        });
        // The itinerary streams via a realtime listener, so there is nothing to
        // re-fetch — surface a short acknowledgment so users don't hard-reload.
        setRefreshing(true);
        if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = window.setTimeout(() => setRefreshing(false), 1800);
    }, [expeditionId, elapsedMs]);

    useEffect(() => {
        return () => {
            if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
        };
    }, []);

    if (loading && !expedition) {
        return (
            <div className="h-screen bg-background-dark flex flex-col overflow-hidden">
                <StickyGlassHeader
                    onBack={onBack}
                    showLogo={false}
                    center={
                        <div className="text-left min-w-0">
                            <p className="text-[9px] font-black uppercase tracking-widest text-primary">
                                {t('expedition.planningBadge')}
                            </p>
                            <h1 className="font-bold text-base truncate">{t('expedition.hubTitle')}</h1>
                        </div>
                    }
                />
                <div className="flex-1 overflow-y-auto px-4 pt-5 pb-[calc(1.25rem+var(--safe-bottom))] no-scrollbar">
                    <ExpeditionSkeleton status="queued" fullScreen days={3} elapsedMs={elapsedMs} />
                </div>
            </div>
        );
    }

    if (!expedition) {
        return (
            <div className="h-screen bg-background-dark flex flex-col items-center justify-center px-6 text-center">
                <p className="text-content/70">{t('expedition.notFound')}</p>
                <button type="button" onClick={onBack} className="mt-4 text-primary font-bold">
                    {t('common.back')}
                </button>
            </div>
        );
    }

    const hasCachedPdf = isPdfStillValid(expedition.pdfUrl, expedition.pdfExpiresAt);

    const openPdf = async (url: string) => {
        await Browser.open({ url });
    };

    const handleExportPdf = async () => {
        if (!expeditionId || !user || pdfLoading) return;
        if (!isPremium) {
            navigate('/premium');
            return;
        }
        if (hasCachedPdf && expedition.pdfUrl) {
            await openPdf(expedition.pdfUrl);
            return;
        }
        setPdfLoading(true);
        try {
            const url = await exportExpeditionToPdf(expeditionId);
            await openPdf(url);
        } catch {
            alert(t('expedition.pdfError'));
        } finally {
            setPdfLoading(false);
        }
    };

    const handleRevision = async () => {
        if (!expeditionId || !expedition.departmentId || revisionSubmitting) return;
        const notes = revisionNotes.trim();
        if (!notes) return;
        if (!canReviseWithQuota) {
            setRevisionError(t('expedition.revisionQuotaExceeded'));
            return;
        }

        setRevisionSubmitting(true);
        setRevisionError('');
        try {
            const lang = (expedition.language === 'en' ? 'en' : 'es') as 'es' | 'en';
            const { expeditionId: nextId } = await reviseExpedition(
                expeditionId,
                expedition.departmentId,
                lang,
                notes.slice(0, MAX_REVISION_NOTES_LENGTH),
                expedition.request as import('../../hooks/useCreateExpedition').CreateExpeditionPayload['request']
            );
            navigate(`/expedition/${nextId}`, { replace: true });
        } catch (e) {
            setRevisionError(translateExpeditionError(t, String((e as Error).message || e)));
            setRevisionSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-background-dark text-content overflow-hidden">
            <StickyGlassHeader
                onBack={onBack}
                showLogo={false}
                center={
                    <div className="text-left min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-widest text-primary">
                            {isProcessing ? t('expedition.planningBadge') : t('expedition.readyBadge')}
                        </p>
                        <h1 className="font-bold text-base truncate">
                            {expedition.itinerary?.title || t('expedition.hubTitle')}
                        </h1>
                    </div>
                }
                right={
                    expedition.status === 'ready' && isPremium ? (
                        <div className="flex items-center gap-1 shrink-0">
                            <StickyHeaderActionButton
                                icon={pdfLoading ? 'hourglass_empty' : 'download'}
                                onClick={handleExportPdf}
                                disabled={pdfLoading}
                                label={t('expedition.downloadPdf')}
                            />
                            <button
                                type="button"
                                onClick={() => navigate(`/expedition/plan/${expedition.departmentId}`)}
                                className="text-[10px] font-bold text-primary uppercase hidden sm:block px-1"
                            >
                                {t('expedition.newPlan')}
                            </button>
                        </div>
                    ) : undefined
                }
            />

            <div className="flex-1 overflow-y-auto px-4 pt-5 pb-[calc(1.25rem+var(--safe-bottom))] no-scrollbar">
                {expedition.status === 'error' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-center"
                    >
                        <span className="material-symbols-outlined text-amber-400 text-[32px]">warning</span>
                        <p className="text-content mt-3 text-[14px]">
                            {expedition.error === 'NOT_FEASIBLE' || expedition.error === 'REQUEST_NOT_FEASIBLE'
                                ? `${t('expedition.notFeasible')} ${expedition.note || ''}`
                                : t('expedition.error')}
                        </p>
                        <button
                            type="button"
                            onClick={() => navigate(`/expedition/plan/${expedition.departmentId}`)}
                            className="mt-4 rounded-xl bg-primary px-5 py-2.5 text-white font-bold text-sm"
                        >
                            {t('expedition.adjustPlan')}
                        </button>
                    </motion.div>
                )}

                {isProcessing && (
                    <ExpeditionSkeleton
                        status={expedition.status}
                        fullScreen
                        days={days}
                        expeditionId={expeditionId}
                        elapsedMs={elapsedMs}
                        notifyPending={notifyPending}
                        refreshing={refreshing}
                        onRequestNotify={user?.uid ? handleRequestNotify : undefined}
                        onManualRefresh={handleManualRefresh}
                    />
                )}

                {expedition.status === 'ready' && expedition.itinerary && (
                    <>
                        <ExpeditionResult
                            itinerary={expedition.itinerary}
                            groundMobility={expedition.request?.groundMobility}
                        />

                        {isPremium && (
                            <div className="mt-6 rounded-2xl border border-overlay/10 bg-surface-dark p-4">
                                <h3 className="font-bold text-sm">{t('expedition.revisionTitle')}</h3>
                                <p className="text-content-muted text-[12px] mt-1 leading-relaxed">
                                    {t('expedition.revisionDesc')}
                                </p>
                                {canReviseIncluded && (
                                    <p className="text-primary text-[11px] font-semibold mt-2">
                                        {t('expedition.revisionIncluded')}
                                    </p>
                                )}
                                <textarea
                                    value={revisionNotes}
                                    onChange={(e) => setRevisionNotes(e.target.value)}
                                    maxLength={MAX_REVISION_NOTES_LENGTH}
                                    placeholder={t('expedition.revisionPlaceholder')}
                                    className="mt-3 w-full min-h-[100px] rounded-xl border border-overlay/10 bg-background-dark px-3 py-2.5 text-sm text-content placeholder:text-content-subtle resize-y"
                                />
                                {revisionError && (
                                    <p className="text-amber-300 text-[12px] mt-2">{revisionError}</p>
                                )}
                                <button
                                    type="button"
                                    disabled={revisionSubmitting || !revisionNotes.trim() || !canReviseWithQuota}
                                    onClick={handleRevision}
                                    className="mt-3 w-full rounded-xl bg-primary py-3 text-sm font-bold text-white disabled:opacity-50"
                                >
                                    {revisionSubmitting
                                        ? t('expedition.revisionSubmitting')
                                        : t('expedition.revisionSubmit')}
                                </button>
                            </div>
                        )}

                        {isPremium && (
                            <button
                                type="button"
                                disabled={pdfLoading}
                                onClick={handleExportPdf}
                                className="mt-4 w-full rounded-2xl border border-primary/30 bg-primary/10 py-4 flex items-center justify-center gap-2 font-bold text-primary text-sm disabled:opacity-60"
                            >
                                <span className="material-symbols-outlined text-[20px]">
                                    {pdfLoading ? 'hourglass_empty' : 'picture_as_pdf'}
                                </span>
                                {pdfLoading ? t('expedition.pdfGenerating') : t('expedition.downloadPdf')}
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};
