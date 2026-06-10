import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExpedition, type ExpeditionDay, type ExpeditionStatus } from '../../hooks/useExpedition';
import { useTranslation } from '../../hooks/useTranslation';

const PIPELINE_STEPS: ExpeditionStatus[] = ['curating', 'routing', 'writing'];

const STATUS_LABEL_KEY: Record<string, string> = {
    queued: 'chat.expedition.statusQueued',
    curating: 'chat.expedition.statusCurating',
    routing: 'chat.expedition.statusRouting',
    writing: 'chat.expedition.statusWriting',
};

const ProgressCard: React.FC<{ status: ExpeditionStatus }> = ({ status }) => {
    const { t } = useTranslation();
    const activeIndex = PIPELINE_STEPS.indexOf(status);

    return (
        <div className="flex-none w-full max-w-[340px] rounded-2xl border border-primary/25 bg-surface-dark p-4 shadow-lg">
            <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-primary text-[20px] animate-pulse">explore</span>
                <span className="text-[9px] font-black uppercase tracking-widest text-primary">
                    {t('chat.expedition.badge')}
                </span>
            </div>
            <p className="text-content text-[13px] font-medium mb-3">
                {t(STATUS_LABEL_KEY[status] || 'chat.expedition.statusQueued')}
            </p>
            <div className="flex gap-1.5">
                {PIPELINE_STEPS.map((step, i) => (
                    <div
                        key={step}
                        className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${
                            i < activeIndex
                                ? 'bg-primary'
                                : i === activeIndex
                                    ? 'bg-primary/70 animate-pulse'
                                    : 'bg-overlay/20'
                        }`}
                    />
                ))}
            </div>
        </div>
    );
};

const DayBlock: React.FC<{ day: ExpeditionDay; defaultOpen: boolean }> = ({ day, defaultOpen }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div className="rounded-xl border border-overlay/15 bg-background-dark/50 overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left"
            >
                <div className="flex items-center gap-2 min-w-0">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary text-[10px] font-black">
                        {day.day}
                    </span>
                    <div className="min-w-0">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-content/50">
                            {t('chat.expedition.dayLabel', { n: day.day })}
                        </p>
                        <p className="text-content text-[12px] font-bold leading-tight truncate">{day.title}</p>
                    </div>
                </div>
                <span className="material-symbols-outlined text-content/50 text-[18px]">
                    {open ? 'expand_less' : 'expand_more'}
                </span>
            </button>

            {open && (
                <div className="px-3 pb-3 space-y-2.5">
                    {day.stops.map((stop, i) => (
                        <div key={`${stop.destinationId}-${i}`}>
                            {stop.travel && (stop.travel.durationText || stop.travel.distanceText) && (
                                <div className="flex items-center gap-1.5 mb-1.5 text-content/50">
                                    <span className="material-symbols-outlined text-[13px]">route</span>
                                    <span className="text-[10px] font-semibold">
                                        {[stop.travel.durationText, stop.travel.distanceText].filter(Boolean).join(' · ')}
                                    </span>
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={() => navigate(`/destination/${stop.destinationId}`)}
                                className="w-full text-left rounded-lg bg-surface-dark border border-overlay/10 px-2.5 py-2 hover:border-primary/40 transition-colors"
                            >
                                <p className="text-primary text-[11px] font-bold flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[13px]">landscape</span>
                                    {stop.name}
                                </p>
                                <p className="text-content/80 text-[11px] leading-snug mt-0.5">{stop.plan}</p>
                            </button>
                        </div>
                    ))}

                    {day.refugio && (
                        <button
                            type="button"
                            onClick={() => navigate(`/refugio/${day.refugio!.id}`)}
                            className="w-full text-left rounded-lg bg-primary/10 border border-primary/20 px-2.5 py-2 hover:border-primary/40 transition-colors"
                        >
                            <p className="text-[9px] font-bold uppercase tracking-widest text-primary/80 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[12px]">cottage</span>
                                {t('chat.expedition.refugioLabel')} · {day.refugio.name}
                            </p>
                            {day.refugioNote && (
                                <p className="text-content/80 text-[11px] leading-snug mt-0.5">{day.refugioNote}</p>
                            )}
                        </button>
                    )}

                    {day.tips && (
                        <p className="text-content/65 text-[10.5px] leading-snug italic">
                            <span className="font-bold not-italic text-content/80">{t('chat.expedition.tipLabel')}: </span>
                            {day.tips}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};

export const ChatExpeditionWidget: React.FC<{ id: string }> = ({ id }) => {
    const { data: expedition, loading } = useExpedition(id);
    const { t } = useTranslation();

    if (loading) return <ProgressCard status="queued" />;
    if (!expedition) return null;

    if (expedition.status === 'error') {
        const isNotFeasible = expedition.error === 'NOT_FEASIBLE';
        return (
            <div className="flex-none w-full max-w-[340px] rounded-2xl border border-amber-500/30 bg-surface-dark p-4">
                <div className="flex items-center gap-2 mb-1.5">
                    <span className="material-symbols-outlined text-amber-400 text-[18px]">warning</span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-amber-400">
                        {t('chat.expedition.badge')}
                    </span>
                </div>
                <p className="text-content/85 text-[12px] leading-snug">
                    {isNotFeasible
                        ? `${t('chat.expedition.notFeasible')} ${expedition.note || ''}`
                        : t('chat.expedition.error')}
                </p>
            </div>
        );
    }

    if (expedition.status !== 'ready' || !expedition.itinerary) {
        return <ProgressCard status={expedition.status} />;
    }

    const { itinerary } = expedition;

    return (
        <div className="flex-none w-full max-w-[340px] rounded-2xl border border-primary/30 bg-surface-dark shadow-lg overflow-hidden">
            <div className="bg-gradient-to-br from-primary/25 to-transparent px-4 pt-4 pb-3 border-b border-overlay/10">
                <div className="flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-primary text-[18px]">explore</span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-primary">
                        {t('chat.expedition.badge')}
                    </span>
                </div>
                <h3 className="text-content font-bold text-[15px] leading-snug">{itinerary.title}</h3>
                {itinerary.summary && (
                    <p className="text-content/70 text-[11px] leading-snug mt-1">{itinerary.summary}</p>
                )}
            </div>

            <div className="p-3 space-y-2">
                {itinerary.days.map((day, i) => (
                    <DayBlock key={day.day} day={day} defaultOpen={i === 0} />
                ))}

                {itinerary.packing && (
                    <div className="rounded-xl border border-overlay/15 bg-background-dark/50 px-3 py-2.5">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-content/50 flex items-center gap-1 mb-1">
                            <span className="material-symbols-outlined text-[12px]">backpack</span>
                            {t('chat.expedition.packingLabel')}
                        </p>
                        <p className="text-content/80 text-[11px] leading-snug">{itinerary.packing}</p>
                    </div>
                )}

                <p className="text-[9px] text-content/40 text-center pt-1 flex items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-[11px]">verified</span>
                    {t('chat.expedition.poweredBy')}
                </p>
            </div>
        </div>
    );
};
