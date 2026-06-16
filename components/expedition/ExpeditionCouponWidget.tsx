import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCoupon } from '../../hooks/useFirestore';
import { useRevenueCat } from '../layout/RevenueCatProvider';
import { useTranslation } from '../../hooks/useTranslation';

interface ExpeditionCouponWidgetProps {
    couponId: string;
    isPremiumCatalog?: boolean;
}

export const ExpeditionCouponWidget: React.FC<ExpeditionCouponWidgetProps> = ({
    couponId,
    isPremiumCatalog,
}) => {
    const { data: coupon, loading } = useCoupon(couponId);
    const { isPremium } = useRevenueCat();
    const navigate = useNavigate();
    const { t } = useTranslation();

    if (loading) {
        return (
            <div className="h-[88px] rounded-xl bg-surface-dark border border-overlay/10 animate-pulse" />
        );
    }
    if (!coupon) return null;

    const locked = (isPremiumCatalog ?? coupon.isPremium) && !isPremium;

    const open = () => {
        if (locked) {
            navigate('/premium');
            return;
        }
        navigate(`/coupons/${couponId}`);
    };

    return (
        <button
            type="button"
            onClick={open}
            className={`w-full text-left rounded-xl border overflow-hidden transition-colors ${
                locked
                    ? 'border-amber-500/30 bg-amber-500/5'
                    : 'border-emerald-500/25 bg-emerald-500/5 hover:border-emerald-400/50'
            }`}
        >
            <div className="flex gap-3 p-3">
                <div
                    className="size-14 shrink-0 rounded-lg bg-cover bg-center border border-overlay/10"
                    style={{
                        backgroundImage: coupon.image ? `url("${coupon.image}")` : undefined,
                        backgroundColor: 'rgba(0,0,0,0.2)',
                    }}
                >
                    {!coupon.image && (
                        <span className="material-symbols-outlined text-content/30 flex size-full items-center justify-center">
                            local_offer
                        </span>
                    )}
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">local_offer</span>
                        {t('expedition.couponBadge')}
                        {locked && (
                            <span className="text-amber-400 normal-case tracking-normal font-bold">
                                · {t('expedition.couponPremium')}
                            </span>
                        )}
                    </p>
                    <p className="text-content text-[13px] font-bold leading-snug truncate">{coupon.title}</p>
                    <p className="text-content/60 text-[11px] truncate">
                        {[coupon.discount, coupon.location || coupon.coupon_code].filter(Boolean).join(' · ')}
                    </p>
                </div>
                <span className="material-symbols-outlined text-primary text-[20px] shrink-0 self-center">
                    {locked ? 'lock' : 'arrow_forward'}
                </span>
            </div>
        </button>
    );
};
