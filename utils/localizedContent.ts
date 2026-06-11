import { Language } from '../types/core';

type LocalizableDoc = Record<string, unknown> | null | undefined;

/**
 * Resolves a Firestore field for the active UI language.
 * Spanish (default): `description` | English: `description_en` → fallback to Spanish.
 */
export function pickLocalized(
    doc: LocalizableDoc,
    field: string,
    lang: Language
): string {
    if (!doc) return '';

    const base = doc[field];
    if (lang === Language.English) {
        const enKey = `${field}_en`;
        const enVal = doc[enKey];
        if (typeof enVal === 'string' && enVal.trim()) return enVal.trim();
        if (typeof enVal === 'number') return String(enVal);
    }

    if (typeof base === 'string') return base.trim();
    if (typeof base === 'number' || typeof base === 'boolean') return String(base);
    return '';
}

/**
 * Resolves string array fields (e.g. activities / activities_en).
 */
export function pickLocalizedStringArray(
    doc: LocalizableDoc,
    field: string,
    lang: Language
): string[] {
    if (!doc) return [];

    if (lang === Language.English) {
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

/**
 * Resolves object array fields (e.g. gettingThere / gettingThere_en, pricingGuide / pricingGuide_en).
 * English array is used when present; otherwise falls back to the Spanish array.
 */
export function pickLocalizedObjectArray(
    doc: LocalizableDoc,
    field: string,
    lang: Language
): Record<string, unknown>[] {
    if (!doc) return [];

    if (lang === Language.English) {
        const en = normalizeObjectArray(doc[`${field}_en`]);
        if (en.length > 0) return en;
    }

    return normalizeObjectArray(doc[field]);
}

/**
 * Whether English content exists for a field (for optional UI badge later).
 */
export function hasEnglishField(doc: LocalizableDoc, field: string): boolean {
    if (!doc) return false;
    const enVal = doc[`${field}_en`];
    if (typeof enVal === 'string') return enVal.trim().length > 0;
    if (Array.isArray(enVal)) return enVal.length > 0;
    return false;
}

/** Raw list/object field from Firestore for normalizeListValue (ecosystems, tips, etc.). */
export function pickLocalizedListSource(
    doc: LocalizableDoc,
    field: string,
    lang: Language
): unknown {
    if (!doc) return undefined;
    if (lang === Language.English) {
        const en = doc[`${field}_en`];
        if (en != null && en !== '') return en;
    }
    return doc[field];
}

/**
 * Resolves any Firestore field (string, array, or JSON object) for the active language.
 * English: `field_en` when present, else Spanish `field`.
 */
export function pickLocalizedRawField(
    doc: LocalizableDoc,
    field: string,
    lang: Language
): unknown {
    if (!doc) return undefined;
    if (lang === Language.English) {
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

/**
 * Case-insensitive search across Spanish and English variants of catalog text fields.
 */
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
