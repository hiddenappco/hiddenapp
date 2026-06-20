import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Language } from '../../types/core';
import { useTranslation } from '../../hooks/useTranslation';
import type { UserExpeditionSummary } from '../../hooks/useUserExpeditions';
import { EXPEDITION_HISTORY_LIMIT } from '../../config/constants';
import { deleteUserExpedition } from '../../services/expeditionService';
import type { ExpeditionStatus } from '../../hooks/useExpedition';

interface ExpeditionPreviousPlansProps {
    plans: UserExpeditionSummary[];
    loading: boolean;
    language: Language;
    departmentNameById: Map<string, string>;
}

function formatPlanDate(date: Date | undefined, language: Language): string {
    if (!date) return '';
    const locale = language === Language.English ? 'en-US' : 'es-CO';
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function statusLabel(
    status: ExpeditionStatus,
    t: (key: string) => string
): { text: string; className: string } {
    if (status === 'ready') {
        return { text: t('expedition.planStatusReady'), className: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25' };
    }
    if (status === 'error') {
        return { text: t('expedition.planStatusError'), className: 'text-red-400 bg-red-500/10 border-red-500/25' };
    }
    return { text: t('expedition.planStatusProcessing'), className: 'text-amber-300 bg-amber-500/10 border-amber-500/25' };
}

function planTitle(plan: UserExpeditionSummary, departmentNameById: Map<string, string>): string {
    const itineraryTitle = plan.itinerary?.title?.trim();
    if (itineraryTitle) return itineraryTitle;
    const dept = departmentNameById.get(plan.departmentId) || plan.departmentId;
    const days = plan.request?.days;
    return days ? `${dept} · ${days}d` : dept;
}

export const ExpeditionPreviousPlans: React.FC<ExpeditionPreviousPlansProps> = ({
    plans,
    loading,
    language,
    departmentNameById,
}) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const subtitle = useMemo(
        () => t('expedition.previousPlansDesc').replace('{limit}', String(EXPEDITION_HISTORY_LIMIT)),
        [t]
    );

    const historyFull = plans.length >= EXPEDITION_HISTORY_LIMIT;

    const handleDelete = async (e: React.MouseEvent, planId: string) => {
        e.stopPropagation();
        if (deletingId) return;
        if (!window.confirm(t('expedition.previousPlansDeleteConfirm'))) return;

        setDeletingId(planId);
        try {
            await deleteUserExpedition(planId);
        } catch (err) {
            console.error('[ExpeditionPreviousPlans] delete failed:', err);
            window.alert(t('expedition.previousPlansDeleteError'));
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <section className="mt-8 pt-6 border-t border-overlay/10">
            <div className="mb-4">
                <h2 className="text-sm font-bold text-content">{t('expedition.previousPlansTitle')}</h2>
                <p className="text-[12px] text-content-muted leading-relaxed mt-1">{subtitle}</p>
            </div>

            {historyFull && (
                <p className="mb-4 text-[12px] leading-relaxed text-amber-300/95 bg-amber-500/10 border border-amber-500/25 rounded-xl px-3 py-2.5">
                    {t('expedition.historyFullHint').replace('{limit}', String(EXPEDITION_HISTORY_LIMIT))}
                </p>
            )}

            {loading ? (
                <div className="flex flex-col gap-2">
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="h-[72px] rounded-2xl bg-overlay/5 border border-overlay/10 animate-pulse" />
                    ))}
                </div>
            ) : plans.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-overlay/15 bg-surface-dark/60 px-4 py-8 text-center">
                    <span className="material-symbols-outlined text-content-subtle text-[32px] mb-2">map</span>
                    <p className="text-[13px] text-content-muted">{t('expedition.previousPlansEmpty')}</p>
                </div>
            ) : (
                <div className="flex flex-col gap-2.5">
                    {plans.map((plan) => {
                        const deptName = departmentNameById.get(plan.departmentId) || plan.departmentId;
                        const days = plan.request?.days;
                        const status = statusLabel(plan.status, t);
                        const isRevision = Boolean(plan.parentExpeditionId);
                        const isDeleting = deletingId === plan.id;

                        return (
                            <div
                                key={plan.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => !isDeleting && navigate(`/expedition/${plan.id}`)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        if (!isDeleting) navigate(`/expedition/${plan.id}`);
                                    }
                                }}
                                className={`w-full text-left rounded-2xl border border-overlay/10 bg-surface-dark px-4 py-3.5 hover:border-primary/30 hover:bg-overlay/5 transition-all cursor-pointer ${
                                    isDeleting ? 'opacity-60 pointer-events-none' : 'active:scale-[0.99]'
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                                        <span className="material-symbols-outlined text-primary text-[20px]">
                                            {plan.status === 'ready'
                                                ? 'route'
                                                : plan.status === 'error'
                                                  ? 'error'
                                                  : 'hourglass_top'}
                                        </span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="font-bold text-sm text-content leading-snug line-clamp-2">
                                                {planTitle(plan, departmentNameById)}
                                            </p>
                                            <span
                                                className={`shrink-0 text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full border ${status.className}`}
                                            >
                                                {status.text}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-content-muted mt-1 truncate">
                                            {deptName}
                                            {days ? ` · ${t('expedition.daysCount').replace('{n}', String(days))}` : ''}
                                            {plan.createdAt ? ` · ${formatPlanDate(plan.createdAt, language)}` : ''}
                                        </p>
                                        {isRevision && (
                                            <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-bold text-content-subtle uppercase tracking-wide">
                                                <span className="material-symbols-outlined text-[12px]">edit_note</span>
                                                {t('expedition.planRevisionBadge')}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex flex-col items-center gap-1 shrink-0 mt-0.5">
                                        <button
                                            type="button"
                                            onClick={(e) => handleDelete(e, plan.id)}
                                            disabled={isDeleting}
                                            title={t('expedition.previousPlansDelete')}
                                            className="flex size-8 items-center justify-center rounded-lg bg-overlay/5 text-content-subtle hover:bg-red-500/15 hover:text-red-400 border border-overlay/10 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">
                                                {isDeleting ? 'hourglass_empty' : 'delete'}
                                            </span>
                                        </button>
                                        <span className="material-symbols-outlined text-content-subtle text-[18px]">
                                            chevron_right
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
};
