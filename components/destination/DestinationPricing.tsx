import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { Language } from '../../types/core';

const isLodgingCategory = (categoria: string) => {
    const c = (categoria || '').toLowerCase();
    return c === 'alojamiento' || c === 'lodging' || c === 'accommodation';
};

interface PricingGuideProps {
    pricingGuide: any[];
}

export const DestinationPricing: React.FC<PricingGuideProps> = ({
    pricingGuide,
}) => {
    const { t, language } = useTranslation();

    if (!pricingGuide || pricingGuide.length === 0) return null;

    const formatter = new Intl.NumberFormat(
        language === Language.English ? 'en-US' : 'es-CO'
    );

    const dayTripMin = pricingGuide.filter(i => !isLodgingCategory(i.categoria)).reduce((acc, curr) => acc + curr.precio_min, 0);
    const dayTripMax = pricingGuide.filter(i => !isLodgingCategory(i.categoria)).reduce((acc, curr) => acc + curr.precio_max, 0);
    
    const withStayMin = pricingGuide.reduce((acc, curr) => acc + curr.precio_min, 0);
    const withStayMax = pricingGuide.reduce((acc, curr) => acc + curr.precio_max, 0);

    return (
        <div className="px-5 mt-6 mb-8">
            <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-primary text-[24px]">payments</span>
                <h3 className="font-bold text-xl text-content">{t('destination.pricingGuide')}</h3>
            </div>
            <p className="text-content-muted text-xs mb-4">
                {t('destination.pricingNote')}
            </p>

            <div className="space-y-3">
                {pricingGuide.map((priceItem, idx) => (
                    <div key={idx} className="bg-surface-dark border border-overlay/5 rounded-2xl p-4 shadow-sm relative overflow-hidden">
                        <div className="inline-block bg-primary/10 text-primary px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider mb-2 border border-primary/20">
                            {priceItem.categoria}
                        </div>
                        <h4 className="text-content text-sm font-bold leading-tight mb-1">{priceItem.item}</h4>
                        {priceItem.nota && (
                            <p className="text-content-muted text-xs leading-relaxed mb-3">{priceItem.nota}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2 pt-3 border-t border-overlay/5">
                            <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-[16px]">sell</span>
                            <span className="text-content font-mono font-medium text-sm">
                                ${formatter.format(priceItem.precio_min)} - ${formatter.format(priceItem.precio_max)}
                            </span>
                        </div>
                    </div>
                ))}

                <div className="mt-4 bg-gradient-to-br from-overlay/5 to-surface-dark border border-overlay/10 rounded-2xl p-5 shadow-lg">
                    <p className="text-content-muted text-xs font-bold uppercase tracking-wider mb-3">
                        {t('destination.estimatedBudgets')}
                    </p>
                    
                    <div className="mb-4">
                        <p className="text-content text-sm font-bold mb-1 flex items-center gap-1">
                            <span className="material-symbols-outlined text-primary text-[16px]">sunny</span>
                            {t('destination.dayTrip')}
                        </p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-content font-bold text-xl">${formatter.format(dayTripMin)}</span>
                            <span className="text-content-muted text-sm">{t('destination.to')}</span>
                            <span className="text-content font-bold text-xl">${formatter.format(dayTripMax)}</span>
                        </div>
                    </div>

                    {pricingGuide.some(i => isLodgingCategory(i.categoria)) && (
                        <div className="pt-3 border-t border-overlay/10">
                            <p className="text-content text-sm font-bold mb-1 flex items-center gap-1">
                                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-[16px]">bed</span>
                                {t('destination.withStay')}
                            </p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-blue-600 dark:text-blue-400 font-bold text-xl">${formatter.format(withStayMin)}</span>
                                <span className="text-content-muted text-sm">{t('destination.to')}</span>
                                <span className="text-blue-600 dark:text-blue-400 font-bold text-xl">${formatter.format(withStayMax)}</span>
                            </div>
                        </div>
                    )}
                    <p className="text-content-subtle text-[10px] mt-3">
                        * {t('destination.calcDisclaimer')}
                    </p>
                </div>
            </div>
        </div>
    );
};
