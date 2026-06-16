import React from 'react';
import type { TripCurrency } from '../../types/trips';

const CURRENCIES: TripCurrency[] = ['COP', 'USD', 'EUR'];

interface CurrencyPickerProps {
    value: TripCurrency;
    onChange: (currency: TripCurrency) => void;
    className?: string;
    compact?: boolean;
}

export const CurrencyPicker: React.FC<CurrencyPickerProps> = ({
    value,
    onChange,
    className = '',
    compact = false,
}) => {
    return (
        <div
            className={`flex gap-1 p-1 rounded-xl bg-overlay/5 border border-overlay/10 ${className}`}
            role="group"
            aria-label="Currency"
        >
            {CURRENCIES.map((c) => (
                <button
                    key={c}
                    type="button"
                    onClick={() => onChange(c)}
                    aria-pressed={value === c}
                    className={`flex-1 rounded-lg font-bold transition-all ${
                        compact ? 'h-9 text-[11px]' : 'h-10 text-xs'
                    } ${
                        value === c
                            ? 'bg-budget-primary text-white shadow-sm'
                            : 'text-content-muted hover:text-content hover:bg-overlay/10'
                    }`}
                >
                    {c}
                </button>
            ))}
        </div>
    );
};
