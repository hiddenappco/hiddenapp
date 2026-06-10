/** Server-side field resolver (mirrors frontend utils/localizedContent.ts). */
export function pickLocalized(
    doc: Record<string, unknown> | null | undefined,
    field: string,
    lang: 'es' | 'en'
): string {
    if (!doc) return '';

    const base = doc[field];
    if (lang === 'en') {
        const enKey = `${field}_en`;
        const enVal = doc[enKey];
        if (typeof enVal === 'string' && enVal.trim()) return enVal.trim();
    }

    if (typeof base === 'string') return base.trim();
    if (typeof base === 'number' || typeof base === 'boolean') return String(base);
    return '';
}
