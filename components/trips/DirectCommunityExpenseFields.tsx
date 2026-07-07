import React, { useMemo } from 'react';
import { useCoupons, useRefugios } from '../../hooks/useFirestore';
import { useTranslation } from '../../hooks/useTranslation';
import type { ExpenseDirectCommunity } from '../../types/trips';
import {
    buildExpenseDirectCommunity,
    listCouponsForRefugio,
    listEligibleRefugios,
} from '../../utils/directCommunityExpense';
import { formatCop } from '../../utils/currency';

interface DirectCommunityExpenseFieldsProps {
    amountCop: number;
    enabled: boolean;
    onEnabledChange: (enabled: boolean) => void;
    refugioId: string;
    onRefugioIdChange: (id: string) => void;
    couponId: string;
    onCouponIdChange: (id: string) => void;
    onDirectCommunityChange: (value: ExpenseDirectCommunity | null) => void;
}

export const DirectCommunityExpenseFields: React.FC<DirectCommunityExpenseFieldsProps> = ({
    amountCop,
    enabled,
    onEnabledChange,
    refugioId,
    onRefugioIdChange,
    couponId,
    onCouponIdChange,
    onDirectCommunityChange,
}) => {
    const { t } = useTranslation();
    const { data: refugios = [] } = useRefugios();
    const { data: coupons = [] } = useCoupons();

    const eligibleRefugios = useMemo(() => listEligibleRefugios(refugios), [refugios]);

    const selectedRefugio = useMemo(
        () => eligibleRefugios.find((r) => r.id === refugioId) ?? null,
        [eligibleRefugios, refugioId]
    );

    const refugioCoupons = useMemo(
        () => (selectedRefugio ? listCouponsForRefugio(coupons, selectedRefugio) : []),
        [coupons, selectedRefugio]
    );

    const directCommunity = useMemo(() => {
        if (!enabled || !refugioId || !couponId || amountCop <= 0) return null;
        return buildExpenseDirectCommunity({
            couponId,
            refugioId,
            amountCop,
            coupons,
            refugios,
        });
    }, [enabled, refugioId, couponId, amountCop, coupons, refugios]);

    React.useEffect(() => {
        onDirectCommunityChange(directCommunity);
    }, [directCommunity, onDirectCommunityChange]);

    if (eligibleRefugios.length === 0) return null;

    return (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
            <label className="flex items-start gap-3 cursor-pointer touch-target">
                <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => onEnabledChange(e.target.checked)}
                    className="mt-1 size-4 rounded border-emerald-500/40 text-emerald-500 focus:ring-emerald-500/30"
                />
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-content">{t('esg.expenseRedemptionTitle')}</p>
                    <p className="text-xs text-content-muted mt-1 leading-relaxed">
                        {t('esg.expenseRedemptionHint')}
                    </p>
                </div>
            </label>

            {enabled && (
                <div className="space-y-3 pt-1">
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-content-muted mb-1.5 block">
                            {t('esg.expenseSelectRefugio')}
                        </label>
                        <select
                            value={refugioId}
                            onChange={(e) => {
                                onRefugioIdChange(e.target.value);
                                onCouponIdChange('');
                            }}
                            className="w-full rounded-xl border border-overlay/10 bg-surface-dark px-3 py-2.5 text-sm font-medium text-content"
                        >
                            <option value="">{t('esg.expenseSelectPlaceholder')}</option>
                            {eligibleRefugios.map((r) => (
                                <option key={r.id} value={r.id}>
                                    {r.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {selectedRefugio && (
                        <div>
                            <label className="text-[10px] font-bold uppercase tracking-wider text-content-muted mb-1.5 block">
                                {t('esg.expenseSelectCoupon')}
                            </label>
                            {refugioCoupons.length === 0 ? (
                                <p className="text-xs text-amber-500/90">{t('esg.expenseNoCoupons')}</p>
                            ) : (
                                <select
                                    value={couponId}
                                    onChange={(e) => onCouponIdChange(e.target.value)}
                                    className="w-full rounded-xl border border-overlay/10 bg-surface-dark px-3 py-2.5 text-sm font-medium text-content"
                                >
                                    <option value="">{t('esg.expenseSelectPlaceholder')}</option>
                                    {refugioCoupons.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.title}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                    )}

                    {directCommunity && (
                        <p className="text-xs font-semibold text-emerald-400">
                            {t('esg.expenseInjectionPreview', {
                                amount: formatCop(directCommunity.injectionCop),
                            })}
                        </p>
                    )}

                    {enabled && refugioId && couponId && amountCop > 0 && !directCommunity && (
                        <p className="text-xs text-amber-500/90">{t('esg.expenseValidationFailed')}</p>
                    )}
                </div>
            )}
        </div>
    );
};
