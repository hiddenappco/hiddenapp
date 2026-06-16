import { API_ENDPOINTS } from '../config/constants';
import type { ExchangeRates } from '../types/trips';
import { cacheExchangeRatesLocal, getExchangeRatesLocal } from './tripLedgerStore';

export async function fetchExchangeRates(isOnline: boolean): Promise<ExchangeRates | null> {
    if (!isOnline) {
        return getExchangeRatesLocal();
    }
    try {
        const res = await fetch(API_ENDPOINTS.GET_EXCHANGE_RATES);
        if (!res.ok) {
            return getExchangeRatesLocal();
        }
        const data = (await res.json()) as ExchangeRates;
        await cacheExchangeRatesLocal(data);
        return data;
    } catch {
        return getExchangeRatesLocal();
    }
}
