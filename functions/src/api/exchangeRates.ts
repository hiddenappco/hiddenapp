import fetch from 'node-fetch';
import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { db } from '../config/firebase';

export interface StoredExchangeRates {
    COP_per_USD: number;
    COP_per_EUR: number;
    source: string;
    updatedAt: string;
    trmDate: string;
}

const DOC_PATH = 'config/exchangeRates';

async function fetchTrmCopPerUsd(): Promise<{ value: number; date: string }> {
    const url =
        'https://www.datos.gov.co/resource/32sa-8pi3.json?$order=vigenciadesde%20DESC&$limit=1';
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) {
        throw new Error(`TRM fetch failed: ${res.status}`);
    }
    const rows = (await res.json()) as Array<{ valor: string; vigenciadesde: string }>;
    const row = rows[0];
    if (!row?.valor) {
        throw new Error('TRM response empty');
    }
    return {
        value: parseFloat(row.valor),
        date: row.vigenciadesde?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    };
}

async function fetchUsdToEur(): Promise<number> {
    const res = await fetch('https://api.frankfurter.app/latest?from=USD&to=EUR');
    if (!res.ok) {
        throw new Error(`EUR cross-rate failed: ${res.status}`);
    }
    const data = (await res.json()) as { rates: { EUR: number } };
    const eurPerUsd = data.rates?.EUR;
    if (!eurPerUsd || eurPerUsd <= 0) {
        throw new Error('EUR rate missing');
    }
    return eurPerUsd;
}

export async function refreshExchangeRates(): Promise<StoredExchangeRates> {
    const [trm, eurPerUsd] = await Promise.all([fetchTrmCopPerUsd(), fetchUsdToEur()]);
    const copPerEur = trm.value / eurPerUsd;
    const now = new Date().toISOString();
    const payload: StoredExchangeRates = {
        COP_per_USD: trm.value,
        COP_per_EUR: Math.round(copPerEur * 100) / 100,
        source: 'Banco de la República (TRM) + ECB vía Frankfurter',
        updatedAt: now,
        trmDate: trm.date,
    };
    await db.doc(DOC_PATH).set(payload, { merge: true });
    return payload;
}

export const scheduledExchangeRates = onSchedule(
    { schedule: 'every day 08:00', timeZone: 'America/Bogota' },
    async () => {
        try {
            await refreshExchangeRates();
            console.log('[exchangeRates] Scheduled refresh OK');
        } catch (err) {
            console.error('[exchangeRates] Scheduled refresh failed:', err);
        }
    }
);

export const getExchangeRates = onRequest({ cors: true }, async (_req, res) => {
    try {
        const snap = await db.doc(DOC_PATH).get();
        let rates = snap.data() as StoredExchangeRates | undefined;
        const stale =
            !rates?.updatedAt ||
            Date.now() - new Date(rates.updatedAt).getTime() > 24 * 60 * 60 * 1000;

        if (!rates || stale) {
            try {
                rates = await refreshExchangeRates();
            } catch (refreshErr) {
                if (!rates) {
                    res.status(503).json({ error: 'Rates unavailable', detail: String(refreshErr) });
                    return;
                }
            }
        }

        res.status(200).json(rates);
    } catch (err) {
        console.error('[getExchangeRates]', err);
        res.status(500).json({ error: 'Internal error' });
    }
});
