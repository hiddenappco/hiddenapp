import { useState, useEffect, useCallback } from 'react';
import { useNetworkStatus } from './useNetworkStatus';
import { fetchExchangeRates } from '../services/exchangeRateService';
import type { ExchangeRates } from '../types/trips';

export function useExchangeRates() {
    const isOnline = useNetworkStatus();
    const [rates, setRates] = useState<ExchangeRates | null>(null);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        setLoading(true);
        const data = await fetchExchangeRates(isOnline);
        setRates(data);
        setLoading(false);
    }, [isOnline]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return { rates, loading, refresh, isOnline };
}
