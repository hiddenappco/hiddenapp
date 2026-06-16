import React, { useState } from 'react';

import { useNavigate, useParams } from 'react-router-dom';

import { motion } from 'framer-motion';

import { Browser } from '@capacitor/browser';

import { Language } from '../../types/core';

import { useExpedition } from '../../hooks/useExpedition';

import { useTranslation } from '../../hooks/useTranslation';

import { useAuth } from '../layout/AuthProvider';

import { exportExpeditionToPdf } from '../../services/pdfExportService';

import { ExpeditionProgress } from './ExpeditionProgress';

import { ExpeditionResult } from './ExpeditionResult';



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

    const { data: expedition, loading } = useExpedition(expeditionId);

    const [pdfLoading, setPdfLoading] = useState(false);



    if (loading && !expedition) {

        return (

            <div className="h-screen bg-background-dark flex items-center justify-center">

                <ExpeditionProgress status="queued" fullScreen days={3} />

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



    const isProcessing = expedition.status !== 'ready' && expedition.status !== 'error';

    const days = expedition.request?.days;

    const hasCachedPdf = isPdfStillValid(expedition.pdfUrl, expedition.pdfExpiresAt);



    const openPdf = async (url: string) => {

        await Browser.open({ url });

    };



    const handleExportPdf = async () => {

        if (!expeditionId || !user || pdfLoading) return;

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



    return (

        <div className="flex flex-col h-screen bg-background-dark text-content overflow-hidden">

            <header className="shrink-0 flex items-center gap-3 px-4 pt-safe-hero pb-3 border-b border-overlay/10 z-10">

                <button

                    type="button"

                    onClick={onBack}

                    className="size-10 rounded-full bg-overlay/10 flex items-center justify-center"

                >

                    <span className="material-symbols-outlined">arrow_back</span>

                </button>

                <div className="min-w-0 flex-1">

                    <p className="text-[9px] font-black uppercase tracking-widest text-primary">

                        {isProcessing ? t('expedition.planningBadge') : t('expedition.readyBadge')}

                    </p>

                    <h1 className="font-bold text-base truncate">

                        {expedition.itinerary?.title || t('expedition.hubTitle')}

                    </h1>

                </div>

                {expedition.status === 'ready' && (

                    <div className="flex items-center gap-2 shrink-0">

                        <button

                            type="button"

                            disabled={pdfLoading}

                            onClick={handleExportPdf}

                            className="size-10 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-primary disabled:opacity-50"

                            title={t('expedition.downloadPdf')}

                        >

                            <span className="material-symbols-outlined text-[20px]">

                                {pdfLoading ? 'hourglass_empty' : 'download'}

                            </span>

                        </button>

                        <button

                            type="button"

                            onClick={() => navigate(`/expedition/plan/${expedition.departmentId}`)}

                            className="text-[10px] font-bold text-primary uppercase hidden sm:block"

                        >

                            {t('expedition.newPlan')}

                        </button>

                    </div>

                )}

            </header>



            <div className="flex-1 overflow-y-auto px-4 py-5 no-scrollbar">

                {expedition.status === 'error' && (

                    <motion.div

                        initial={{ opacity: 0 }}

                        animate={{ opacity: 1 }}

                        className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-center"

                    >

                        <span className="material-symbols-outlined text-amber-400 text-[32px]">warning</span>

                        <p className="text-content mt-3 text-[14px]">

                            {expedition.error === 'NOT_FEASIBLE'

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

                    <ExpeditionProgress status={expedition.status} fullScreen days={days} />

                )}



                {expedition.status === 'ready' && expedition.itinerary && (

                    <>

                        <ExpeditionResult
                            itinerary={expedition.itinerary}
                            groundMobility={expedition.request?.groundMobility}
                        />

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

                    </>

                )}

            </div>

        </div>

    );

};


