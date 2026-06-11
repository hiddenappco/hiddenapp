/** Server-side field resolver (mirrors frontend utils/localizedContent.ts). */
export type AppLanguage = 'es' | 'en';

type LocalizableDoc = Record<string, unknown> | null | undefined;

export function pickLocalized(
    doc: LocalizableDoc,
    field: string,
    lang: AppLanguage
): string {
    if (!doc) return '';

    const base = doc[field];
    if (lang === 'en') {
        const enKey = `${field}_en`;
        const enVal = doc[enKey];
        if (typeof enVal === 'string' && enVal.trim()) return enVal.trim();
        if (typeof enVal === 'number') return String(enVal);
    }

    if (typeof base === 'string') return base.trim();
    if (typeof base === 'number' || typeof base === 'boolean') return String(base);
    return '';
}

export function pickLocalizedStringArray(
    doc: LocalizableDoc,
    field: string,
    lang: AppLanguage
): string[] {
    if (!doc) return [];

    if (lang === 'en') {
        const en = doc[`${field}_en`];
        if (Array.isArray(en) && en.length > 0) {
            return en.map((v) => (typeof v === 'string' ? v : String(v))).filter(Boolean);
        }
    }

    const base = doc[field];
    if (Array.isArray(base)) {
        return base.map((v) => (typeof v === 'string' ? v : String(v))).filter(Boolean);
    }
    return [];
}

function normalizeObjectArray(raw: unknown): Record<string, unknown>[] {
    if (raw == null || raw === '') return [];
    if (Array.isArray(raw)) {
        return raw.filter((item) => item != null) as Record<string, unknown>[];
    }
    if (typeof raw === 'string' && raw.trim()) {
        try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? (parsed as Record<string, unknown>[]) : [];
        } catch {
            return [];
        }
    }
    return [];
}

export function pickLocalizedObjectArray(
    doc: LocalizableDoc,
    field: string,
    lang: AppLanguage
): Record<string, unknown>[] {
    if (!doc) return [];

    if (lang === 'en') {
        const en = normalizeObjectArray(doc[`${field}_en`]);
        if (en.length > 0) return en;
    }

    return normalizeObjectArray(doc[field]);
}

export function pickLocalizedListSource(
    doc: LocalizableDoc,
    field: string,
    lang: AppLanguage
): unknown {
    if (!doc) return undefined;
    if (lang === 'en') {
        const en = doc[`${field}_en`];
        if (en != null && en !== '') return en;
    }
    return doc[field];
}

export function pickLocalizedRawField(
    doc: LocalizableDoc,
    field: string,
    lang: AppLanguage
): unknown {
    if (!doc) return undefined;
    if (lang === 'en') {
        const en = doc[`${field}_en`];
        if (en != null && en !== '') return en;
    }
    return doc[field];
}

function collectSearchTexts(value: unknown): string[] {
    if (value == null) return [];
    if (typeof value === 'string') return value.trim() ? [value] : [];
    if (typeof value === 'number' || typeof value === 'boolean') return [String(value)];
    if (Array.isArray(value)) return value.flatMap(collectSearchTexts);
    if (typeof value === 'object') {
        return Object.values(value as Record<string, unknown>).flatMap(collectSearchTexts);
    }
    return [];
}

export function matchesLocalizedSearch(
    doc: LocalizableDoc,
    term: string,
    fields: string[]
): boolean {
    const q = term.trim().toLowerCase();
    if (!q) return true;
    if (!doc) return false;

    for (const field of fields) {
        for (const key of [field, `${field}_en`]) {
            for (const text of collectSearchTexts(doc[key])) {
                if (text.toLowerCase().includes(q)) return true;
            }
        }
    }
    return false;
}
