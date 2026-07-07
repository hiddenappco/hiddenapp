import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from '../../hooks/useTranslation';
import type { ExpeditionDay, ExpeditionItinerary } from '../../hooks/useExpedition';
import { Language } from '../../types/core';
import { ExpeditionCouponWidget } from './ExpeditionCouponWidget';
import { ExpeditionMobilityBadge } from './ExpeditionMobilityBadge';
import { isGroundMobility } from '../../utils/expeditionMobility';
import {
    formatTravelSegmentLine,
    resolveStopTravelSegments,
} from '../../utils/expeditionTravelSegments';

/** Walking legs are emphasized as a safety cue (terrain / footwear); others stay neutral. */
function segmentTone(kind: string): { icon: string; text: string } {
    if (kind === 'walking') {
        return { icon: 'text-emerald-400', text: 'text-emerald-300/90' };
    }
    return { icon: 'text-content/45', text: 'text-content/55' };
}

function formatCop(amount: number, language: Language | null): string {
    const locale = language === Language.English ? 'en-US' : 'es-CO';
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
    }).format(amount);
}

export const ExpeditionDayBlock: React.FC<{
    day: ExpeditionDay;
    defaultOpen: boolean;
    index: number;
}> = ({ day, defaultOpen, index }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [open, setOpen] = useState(defaultOpen);

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
            className="rounded-xl border border-overlay/15 bg-background-dark/50 overflow-hidden"
        >
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left"
            >
                <div className="flex items-center gap-2 min-w-0">
                    <span className="shrink-0 w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary text-[10px] font-black">
                        {day.day}
                    </span>
                    <div className="min-w-0">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-content/50">
                            {t('expedition.dayLabel', { n: day.day })}
                        </p>
                        <p className="text-content text-[13px] font-bold leading-tight truncate">{day.title}</p>
                    </div>
                </div>
                <span className="material-symbols-outlined text-content/50 text-[18px]">
                    {open ? 'expand_less' : 'expand_more'}
                </span>
            </button>

            {open && (
                <div className="px-3 pb-3 space-y-2.5">
                    {day.stops.map((stop, i) => {
                        const segments = resolveStopTravelSegments(stop.travel, stop.travelSegments);

                        return (
                        <div key={`${stop.destinationId}-${i}`}>
                            {segments.length > 0 && (
                                <div className="flex flex-col gap-1 mb-1.5">
                                    {segments.map((segment, segIdx) => {
                                        const tone = segmentTone(segment.kind);
                                        return (
                                            <div
                                                key={`${segment.kind}-${segIdx}`}
                                                className="flex items-center gap-1.5"
                                            >
                                                <span className={`material-symbols-outlined text-[13px] shrink-0 ${tone.icon}`}>
                                                    {segment.icon}
                                                </span>
                                                <span className={`text-[10px] font-semibold leading-snug ${tone.text}`}>
                                                    {formatTravelSegmentLine(segment)}
                                                </span>
                                            </div>
                                        );
                                    })}
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
                        );
                    })}

                    {day.refugio && (
                        <button
                            type="button"
                            onClick={() => navigate(`/refugio/${day.refugio!.id}`)}
                            className="w-full text-left rounded-lg bg-primary/10 border border-primary/20 px-2.5 py-2"
                        >
                            <p className="text-[9px] font-bold uppercase tracking-widest text-primary/80 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[12px]">cottage</span>
                                {t('expedition.refugioLabel')} · {day.refugio.name}
                            </p>
                            {day.refugioNote && (
                                <p className="text-content/80 text-[11px] leading-snug mt-0.5">{day.refugioNote}</p>
                            )}
                        </button>
                    )}

                    {day.tips && (
                        <p className="text-content/65 text-[10.5px] leading-snug italic">
                            <span className="font-bold not-italic text-content/80">{t('expedition.tipLabel')}: </span>
                            {day.tips}
                        </p>
                    )}

                    {day.coupons && day.coupons.length > 0 && (
                        <div className="space-y-2 pt-1">
                            <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-400/90">
                                {t('expedition.couponsForDay')}
                            </p>
                            {day.coupons.map((c) => (
                                <ExpeditionCouponWidget key={c.id} couponId={c.id} isPremiumCatalog={c.isPremium} />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </motion.div>
    );
};

interface ExpeditionResultProps {
    itinerary: ExpeditionItinerary;
    /** Fallback for plans generated before travelContext was stored on itinerary */
    groundMobility?: ExpeditionItinerary['travelContext'] extends { groundMobility?: infer M } ? M : never;
}

export const ExpeditionResult: React.FC<ExpeditionResultProps> = ({ itinerary, groundMobility }) => {
    const { t, language } = useTranslation();
    const budget = itinerary.budgetEstimate;
    const mobility = itinerary.travelContext?.groundMobility ?? groundMobility;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
        >
            <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/20 to-transparent p-5">
                <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-primary text-[22px]">explore</span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-primary">
                        {t('expedition.readyBadge')}
                    </span>
                </div>
                <h1 className="text-content font-bold text-xl leading-snug">{itinerary.title}</h1>
                {isGroundMobility(mobility) && (
                    <div className="flex flex-wrap gap-2 mt-3">
                        <ExpeditionMobilityBadge mode={mobility} />
                    </div>
                )}
                {itinerary.summary && (
                    <p className="text-content/75 text-[13px] leading-relaxed mt-2">{itinerary.summary}</p>
                )}
            </div>

            {budget && (
                <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-emerald-400 mb-2 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">payments</span>
                        {t('expedition.budgetTitle')}
                    </p>
                    <p className="text-content font-bold text-lg">
                        {formatCop(budget.totalMin, language)} – {formatCop(budget.totalMax, language)}
                    </p>
                    {budget.perPersonMin != null && budget.perPersonMax != null && (
                        <p className="text-content/60 text-[11px] mt-1">
                            {t('expedition.perPerson', {
                                min: formatCop(budget.perPersonMin, language),
                                max: formatCop(budget.perPersonMax, language),
                            })}
                        </p>
                    )}
                    {budget.narrative && (
                        <p className="text-content/75 text-[12px] mt-2 leading-snug">{budget.narrative}</p>
                    )}
                    <p className="text-[9px] text-content/40 mt-2">{t('expedition.budgetDisclaimer')}</p>
                </div>
            )}

            {itinerary.departmentCoupons && itinerary.departmentCoupons.length > 0 && (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-2">
                    <p className="text-[9px] font-black uppercase tracking-widest text-emerald-400">
                        {t('expedition.departmentCouponsTitle')}
                    </p>
                    {itinerary.departmentCoupons.map((c) => (
                        <ExpeditionCouponWidget key={c.id} couponId={c.id} isPremiumCatalog={c.isPremium} />
                    ))}
                </div>
            )}

            <div className="space-y-2">
                {itinerary.days.map((day, i) => (
                    <ExpeditionDayBlock key={day.day} day={day} defaultOpen={i === 0} index={i} />
                ))}
            </div>

            {itinerary.packing && (
                <div className="rounded-xl border border-overlay/15 bg-background-dark/50 px-4 py-3">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-content/50 flex items-center gap-1 mb-1">
                        <span className="material-symbols-outlined text-[12px]">backpack</span>
                        {t('expedition.packingLabel')}
                    </p>
                    <p className="text-content/80 text-[12px] leading-snug">{itinerary.packing}</p>
                </div>
            )}

            {itinerary.curatorNote && (
                <p className="text-[11px] text-content/55 italic text-center px-2">{itinerary.curatorNote}</p>
            )}

            <p className="text-[9px] text-content/40 text-center flex items-center justify-center gap-1 pb-4">
                <span className="material-symbols-outlined text-[11px]">verified</span>
                {t('expedition.poweredBy')}
            </p>
        </motion.div>
    );
};
