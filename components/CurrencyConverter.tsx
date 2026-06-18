import React, { useState, useMemo } from 'react';
import { Language } from '../types/core';
import { useTranslation } from '../hooks/useTranslation';
import { useExchangeRates } from '../hooks/useExchangeRates';
import { convertFromCop, convertToCop, formatCop, formatForeign } from '../utils/currency';
import type { TripCurrency } from '../types/trips';
import { CurrencyPicker } from './trips/CurrencyPicker';

interface CurrencyConverterProps {
    language: Language;
    onBack: () => void;
}

export const CurrencyConverter: React.FC<CurrencyConverterProps> = ({ onBack }) => {
    const { t } = useTranslation();
    const { rates, loading, isOnline } = useExchangeRates();
    const [amount, setAmount] = useState('100');
    const [from, setFrom] = useState<TripCurrency>('USD');
    const [to, setTo] = useState<TripCurrency>('COP');

    const numericAmount = parseFloat(amount.replace(/,/g, '')) || 0;

    const result = useMemo(() => {
        if (!rates || numericAmount <= 0) return 0;
        const { amountCOP } = convertToCop(numericAmount, from, rates);
        return convertFromCop(amountCOP, to, rates);
    }, [numericAmount, from, to, rates]);

    const swap = () => {
        setFrom(to);
        setTo(from);
    };

    return (
        <div className="bg-background-dark h-screen flex flex-col text-content font-display">
            <header className="sticky top-0 z-30 flex items-center bg-background-dark/95 backdrop-blur-md px-4 pb-2 pt-safe border-b border-overlay/5">
                <button onClick={onBack} className="touch-target flex items-center justify-center rounded-full hover:bg-overlay/10">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h1 className="flex-1 text-center font-bold pr-10">{t('trips.converterTitle')}</h1>
            </header>

            <main className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
                <p className="text-content-muted text-sm text-center">{t('trips.converterSubtitle')}</p>

                {rates && (
                    <div className="bg-overlay/5 border border-overlay/10 rounded-2xl p-4 text-center">
                        <p className="text-[10px] font-bold text-content-muted uppercase tracking-widest mb-1">
                            {t('trips.trmDateLine', { date: rates.trmDate || rates.updatedAt.slice(0, 10) })}
                        </p>
                        <p className="text-sm text-content">
                            {t('trips.usdTrmLine', { amount: formatCop(rates.COP_per_USD) })}
                        </p>
                        <p className="text-sm text-content-muted">
                            {t('trips.eurTrmLine', { amount: formatCop(rates.COP_per_EUR) })}
                        </p>
                        {!isOnline && (
                            <p className="text-[10px] text-amber-400 mt-2 font-bold">{t('trips.ratesCached')}</p>
                        )}
                    </div>
                )}

                <div className="bg-surface-dark rounded-[28px] p-6 border border-overlay/10 shadow-xl">
                    <label className="text-xs font-bold text-content-muted uppercase tracking-wider">{t('trips.amount')}</label>
                    <input
                        type="number"
                        inputMode="decimal"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full mt-2 text-4xl font-black bg-transparent border-none focus:ring-0 text-content text-center"
                    />

                    <div className="flex items-center gap-3 mt-6">
                        <CurrencyPicker value={from} onChange={setFrom} className="flex-1" />
                        <button
                            type="button"
                            onClick={swap}
                            className="touch-target size-12 shrink-0 rounded-xl bg-budget-primary/10 text-budget-primary flex items-center justify-center border border-budget-primary/20"
                            aria-label="Swap currencies"
                        >
                            <span className="material-symbols-outlined">swap_horiz</span>
                        </button>
                        <CurrencyPicker value={to} onChange={setTo} className="flex-1" />
                    </div>

                    <div className="mt-8 pt-6 border-t border-overlay/10 text-center">
                        <p className="text-xs text-content-muted mb-2">{t('trips.convertedAmount')}</p>
                        <p className="text-3xl font-black text-budget-primary">
                            {loading && !rates
                                ? '…'
                                : to === 'COP'
                                  ? formatCop(result)
                                  : formatForeign(result, to)}
                        </p>
                    </div>
                </div>

                <p className="text-[10px] text-content-subtle text-center leading-relaxed px-4">
                    {t('trips.converterDisclaimer')}
                </p>
            </main>
        </div>
    );
};
