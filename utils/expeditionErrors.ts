/** Maps API / pipeline error codes to locale keys under expedition.errors.* */
export function translateExpeditionError(
    t: (key: string) => string,
    code: string
): string {
    const normalized = String(code || '').trim();
    if (!normalized) return t('expedition.errors.generic');

    const key = `expedition.errors.${normalized}`;
    const translated = t(key);
    if (translated !== key) return translated;

    return t('expedition.errors.generic');
}
