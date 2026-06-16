import type { ExchangeRates, TripCurrency } from '../types/trips';

export function formatCop(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
    }).format(amount);
}

export function formatForeign(amount: number, currency: TripCurrency): string {
    if (currency === 'COP') return formatCop(amount);
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        maximumFractionDigits: 2,
    }).format(amount);
}

export function convertToCop(
    amount: number,
    currency: TripCurrency,
    rates: ExchangeRates | null
): { amountCOP: number; rate: number; rateDate: string } {
    if (currency === 'COP' || !rates) {
        return { amountCOP: Math.round(amount), rate: 1, rateDate: rates?.trmDate || rates?.updatedAt || '' };
    }
    const rate = currency === 'USD' ? rates.COP_per_USD : rates.COP_per_EUR;
    return {
        amountCOP: Math.round(amount * rate),
        rate,
        rateDate: rates.trmDate || rates.updatedAt,
    };
}

export function convertFromCop(
    amountCop: number,
    to: TripCurrency,
    rates: ExchangeRates | null
): number {
    if (to === 'COP' || !rates) return amountCop;
    const rate = to === 'USD' ? rates.COP_per_USD : rates.COP_per_EUR;
    return amountCop / rate;
}
