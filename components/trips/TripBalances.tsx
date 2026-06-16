import React, { useMemo } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { computeMemberBalances, simplifySettlements } from '../../utils/tripBalances';
import { formatCop } from '../../utils/currency';
import type { Expense, Trip } from '../../types/trips';

interface TripBalancesProps {
    trip: Trip;
    expenses: Expense[];
    currentUid?: string;
}

export const TripBalances: React.FC<TripBalancesProps> = ({ trip, expenses, currentUid }) => {
    const { t } = useTranslation();

    const { balances, settlements } = useMemo(() => {
        const travelerFallback = t('trips.traveler');
        const balances = computeMemberBalances(trip, expenses, travelerFallback);
        const settlements = simplifySettlements(balances);
        return { balances, settlements };
    }, [trip, expenses, t]);

    if (trip.type !== 'group' || balances.length < 2) return null;

    const hasActivity = expenses.length > 0;

    return (
        <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between px-1">
                <h3 className="font-bold text-content text-lg">{t('trips.balancesTitle')}</h3>
                <span className="text-[9px] font-bold text-content-muted uppercase tracking-widest">
                    {t('trips.balancesSubtitle')}
                </span>
            </div>

            {!hasActivity ? (
                <p className="text-xs text-content-muted text-center py-4 bg-overlay/5 rounded-2xl border border-overlay/5">
                    {t('trips.balancesEmpty')}
                </p>
            ) : (
                <>
                    <div className="flex flex-col gap-2">
                        {balances.map((b) => (
                            <div
                                key={b.uid}
                                className={`flex items-center gap-3 p-3 rounded-xl border ${
                                    b.uid === currentUid
                                        ? 'bg-budget-primary/5 border-budget-primary/20'
                                        : 'bg-overlay/5 border-overlay/5'
                                }`}
                            >
                                <div className="size-9 rounded-full bg-overlay/10 flex items-center justify-center text-xs font-black text-content">
                                    {b.displayName.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-content truncate">
                                        {b.displayName}
                                        {b.uid === currentUid && (
                                            <span className="text-content-muted font-medium text-xs">
                                                {' '}
                                                ({t('trips.you')})
                                            </span>
                                        )}
                                    </p>
                                    <p className="text-[10px] text-content-muted">
                                        {t('trips.paidShare', {
                                            paid: formatCop(b.paid),
                                            share: formatCop(b.share),
                                        })}
                                    </p>
                                </div>
                                <div className="text-right">
                                    {Math.abs(b.net) < 1 ? (
                                        <span className="text-xs font-bold text-green-400">{t('trips.settled')}</span>
                                    ) : b.net > 0 ? (
                                        <span className="text-sm font-black text-green-400">
                                            +{formatCop(b.net)}
                                        </span>
                                    ) : (
                                        <span className="text-sm font-black text-red-400">{formatCop(b.net)}</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {settlements.length > 0 && (
                        <div className="bg-gradient-to-br from-budget-primary/10 to-transparent border border-budget-primary/20 rounded-2xl p-4">
                            <p className="text-[10px] font-bold text-budget-primary uppercase tracking-widest mb-3">
                                {t('trips.settlementsTitle')}
                            </p>
                            <div className="flex flex-col gap-2">
                                {settlements.map((s, idx) => (
                                    <div
                                        key={`${s.fromUid}-${s.toUid}-${idx}`}
                                        className="flex items-center gap-2 text-sm text-content"
                                    >
                                        <span className="material-symbols-outlined text-budget-primary text-base">
                                            arrow_forward
                                        </span>
                                        <span className="font-medium">
                                            <span className="font-bold">{s.fromName}</span>
                                            {' → '}
                                            <span className="font-bold">{s.toName}</span>
                                        </span>
                                        <span className="ml-auto font-black text-budget-primary whitespace-nowrap">
                                            {formatCop(s.amount)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </section>
    );
};
