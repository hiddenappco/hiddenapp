import {
    pickLocalized,
    pickLocalizedListSource,
    pickLocalizedObjectArray,
    pickLocalizedRawField,
    pickLocalizedStringArray,
    type AppLanguage,
} from './localizedContent';

type RawDoc = Record<string, unknown>;

const EXTENDED_DEPARTMENT_FIELDS = [
    'geography',
    'geographicInfo',
    'culture',
    'culturalInfo',
    'history',
    'historyInfo',
    'generalInfo',
] as const;

export function localizeDepartment(raw: RawDoc, lang: AppLanguage): Record<string, unknown> {
    const doc = raw;
    const out: Record<string, unknown> = {
        ...raw,
        name: pickLocalized(doc, 'name', lang) || String(raw.name || ''),
        subtitle: pickLocalized(doc, 'subtitle', lang) || String(raw.subtitle || ''),
        tag: pickLocalized(doc, 'tag', lang) || String(raw.tag || ''),
        locationLabel: pickLocalized(doc, 'locationLabel', lang) || String(raw.locationLabel || ''),
        description: pickLocalized(doc, 'description', lang) || String(raw.description || ''),
        safetyNote: pickLocalized(doc, 'safetyNote', lang) || raw.safetyNote,
        logistics: pickLocalized(doc, 'logistics', lang) || raw.logistics,
        seasonality: pickLocalized(doc, 'seasonality', lang) || raw.seasonality,
        ecosystems: pickLocalizedListSource(doc, 'ecosystems', lang) ?? raw.ecosystems,
        mustTryGastronomy: pickLocalizedListSource(doc, 'mustTryGastronomy', lang) ?? raw.mustTryGastronomy,
        tips: pickLocalizedListSource(doc, 'tips', lang) ?? raw.tips,
    };

    for (const field of EXTENDED_DEPARTMENT_FIELDS) {
        const localized = pickLocalized(doc, field, lang);
        if (localized) out[field] = localized;
    }

    return out;
}

export function localizeDestination(raw: RawDoc, lang: AppLanguage): Record<string, unknown> {
    const doc = raw;
    const packingGuide =
        pickLocalizedRawField(
            {
                ...doc,
                packingGuide: doc.packingGuide ?? doc.packingGuige,
                packingGuide_en: doc.packingGuide_en ?? doc.packingGuige_en,
            },
            'packingGuide',
            lang
        ) ?? doc.packingGuide ?? doc.packingGuige;

    return {
        ...raw,
        title: pickLocalized(doc, 'title', lang) || String(raw.title || raw.name || ''),
        location: pickLocalized(doc, 'location', lang) || String(raw.location || ''),
        description: pickLocalized(doc, 'description', lang) || String(raw.description || ''),
        aiTip: pickLocalized(doc, 'aiTip', lang) || String(raw.aiTip || ''),
        activities: pickLocalizedStringArray(doc, 'activities', lang),
        gettingThere: pickLocalizedObjectArray(doc, 'gettingThere', lang),
        pricingGuide: pickLocalizedObjectArray(doc, 'pricingGuide', lang),
        packingSummary:
            pickLocalized(doc, 'packingSummary', lang) || String(raw.packingSummary || ''),
        packingGuide,
    };
}

export function localizeCoupon(raw: RawDoc, lang: AppLanguage): Record<string, unknown> {
    const doc = raw;
    return {
        ...raw,
        title: pickLocalized(doc, 'title', lang) || String(raw.title || ''),
        description: pickLocalized(doc, 'description', lang) || String(raw.description || ''),
        location: pickLocalized(doc, 'location', lang) || String(raw.location || ''),
        redemptionInstructions:
            pickLocalized(doc, 'redemptionInstructions', lang) || raw.redemptionInstructions,
        validity: pickLocalized(doc, 'validity', lang) || String(raw.validity || ''),
        discount: pickLocalized(doc, 'discount', lang) || String(raw.discount || ''),
    };
}

export function localizeNewsArticle(raw: RawDoc, lang: AppLanguage): Record<string, unknown> {
    const doc = raw;
    return {
        ...raw,
        title: pickLocalized(doc, 'title', lang) || String(raw.title || ''),
        summary: pickLocalized(doc, 'summary', lang) || String(raw.summary || ''),
        content: pickLocalized(doc, 'content', lang) || String(raw.content || ''),
        category: pickLocalized(doc, 'category', lang) || String(raw.category || ''),
        author: pickLocalized(doc, 'author', lang) || String(raw.author || ''),
        badge: pickLocalized(doc, 'badge', lang) || raw.badge,
        readTime: pickLocalized(doc, 'readTime', lang) || raw.readTime,
    };
}

export function localizeEvent(raw: RawDoc, lang: AppLanguage): Record<string, unknown> {
    const doc = raw;
    return {
        ...raw,
        name: pickLocalized(doc, 'name', lang) || String(raw.name || ''),
        subtitle: pickLocalized(doc, 'subtitle', lang) || raw.subtitle,
        description: pickLocalized(doc, 'description', lang) || String(raw.description || ''),
        location: pickLocalized(doc, 'location', lang) || String(raw.location || ''),
        tips: pickLocalized(doc, 'tips', lang) || raw.tips,
        priceType: pickLocalized(doc, 'priceType', lang) || String(raw.priceType || ''),
    };
}

export function localizeRefugio(raw: RawDoc, lang: AppLanguage): Record<string, unknown> {
    const doc = raw;
    const amenities = pickLocalizedStringArray(doc, 'amenities', lang);
    const types = pickLocalizedStringArray(doc, 'type', lang);

    return {
        ...raw,
        name: pickLocalized(doc, 'name', lang) || String(raw.name || ''),
        tagline: pickLocalized(doc, 'tagline', lang) || String(raw.tagline || ''),
        location: pickLocalized(doc, 'location', lang) || String(raw.location || ''),
        description: pickLocalized(doc, 'description', lang) || String(raw.description || ''),
        howToBook: pickLocalized(doc, 'howToBook', lang) || String(raw.howToBook || ''),
        amenities: amenities.length > 0 ? amenities : raw.amenities,
        type: types.length > 0 ? types : raw.type,
        pricingGuide: pickLocalizedRawField(doc, 'pricingGuide', lang) ?? raw.pricingGuide,
        activities: pickLocalizedRawField(doc, 'activities', lang) ?? raw.activities,
        restrictions: pickLocalizedRawField(doc, 'restrictions', lang) ?? raw.restrictions,
        checkInCheckOut: pickLocalizedRawField(doc, 'checkInCheckOut', lang) ?? raw.checkInCheckOut,
    };
}

export type CatalogCollection =
    | 'departments'
    | 'destinations'
    | 'Coupons'
    | 'News'
    | 'Events'
    | 'refugios';

export function localizeCatalogDocument(
    collection: CatalogCollection,
    raw: RawDoc,
    lang: AppLanguage
): Record<string, unknown> {
    switch (collection) {
        case 'departments':
            return localizeDepartment(raw, lang);
        case 'destinations':
            return localizeDestination(raw, lang);
        case 'Coupons':
            return localizeCoupon(raw, lang);
        case 'News':
            return localizeNewsArticle(raw, lang);
        case 'Events':
            return localizeEvent(raw, lang);
        case 'refugios':
            return localizeRefugio(raw, lang);
        default:
            return raw;
    }
}

export const DESTINATION_SEARCH_FIELDS = [
    'title',
    'name',
    'location',
    'description',
    'aiTip',
    'activities',
    'packingSummary',
] as const;
