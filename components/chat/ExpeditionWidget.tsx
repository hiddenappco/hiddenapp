import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useExpedition } from '../../hooks/useExpedition';
import { useTranslation } from '../../hooks/useTranslation';
import { ExpeditionSkeleton } from '../expedition/ExpeditionSkeleton';
import { ExpeditionResult } from '../expedition/ExpeditionResult';

/** Compact chat card — links to the full planner page for live progress and result. */
export const ChatExpeditionWidget: React.FC<{ id: string }> = ({ id }) => {
    const { data: expedition, loading } = useExpedition(id);
    const { t } = useTranslation();
    const navigate = useNavigate();

    if (loading) {
        return (
            <div className="flex-none w-full max-w-[340px]">
                <ExpeditionSkeleton status="queued" days={3} compact />
            </div>
        );
    }
    if (!expedition) return null;

    const openFull = () => navigate(`/expedition/${id}`);

    if (expedition.status === 'error') {
        const isNotFeasible = expedition.error === 'NOT_FEASIBLE';
        return (
            <div className="flex-none w-full max-w-[340px] rounded-2xl border border-amber-500/30 bg-surface-dark p-4">
                <p className="text-content/85 text-[12px] leading-snug mb-3">
                    {isNotFeasible
                        ? `${t('expedition.notFeasible')} ${expedition.note || ''}`
                        : t('expedition.error')}
                </p>
                <button type="button" onClick={openFull} className="text-primary text-[11px] font-bold">
                    {t('expedition.adjustPlan')}
                </button>
            </div>
        );
    }

    if (expedition.status !== 'ready' || !expedition.itinerary) {
        return (
            <div className="flex-none w-full max-w-[340px]">
                <ExpeditionSkeleton status={expedition.status} days={expedition.request?.days} compact />
                <button
                    type="button"
                    onClick={openFull}
                    className="w-full mt-2 text-center text-primary text-[11px] font-bold"
                >
                    {t('expedition.openFullPlan')}
                </button>
            </div>
        );
    }

    return (
        <div className="flex-none w-full max-w-[340px]">
            <div className="max-h-[420px] overflow-y-auto no-scrollbar rounded-2xl border border-primary/30 bg-surface-dark">
                <ExpeditionResult
                    itinerary={expedition.itinerary}
                    groundMobility={expedition.request?.groundMobility}
                />
            </div>
            <button
                type="button"
                onClick={openFull}
                className="w-full mt-2 text-center text-primary text-[11px] font-bold"
            >
                {t('expedition.openFullPlan')}
            </button>
        </div>
    );
};
