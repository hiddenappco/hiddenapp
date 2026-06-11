import { Language } from '../types/core';
import type {
    AppEvent,
    Coupon,
    Department,
    Destination,
    NewsArticle,
    Refugio,
} from '../types/content';
import { normalizeListValue } from './departmentContent';
import { pickLocalizedPackingGuide } from './packingGuide';
import {
    pickLocalized,
    pickLocalizedListSource,
    pickLocalizedObjectArray,
    pickLocalizedRawField,
    pickLocalizedStringArray,
} from './localizedContent';

type RawDoc = Record<string, unknown>;

export const DEPARTMENT_SEARCH_FIELDS = [
    'name',
    'subtitle',
    'tag',
    'locationLabel',
    'description',
    'safetyNote',
    'logistics',
    'seasonality',
] as const;

export const DESTINATION_SEARCH_FIELDS = [
    'title',
    'name',
    'location',
    'description',
    'aiTip',
    'activities',
    'packingSummary',
] as const;

export const COUPON_SEARCH_FIELDS = [
    'title',
    'description',
    'location',
    'discount',
    'validity',
    'coupon_code',
    'redemptionInstructions',
    'category',
] as const;

export const NEWS_SEARCH_FIELDS = [
    'title',
    'summary',
    'content',
    'category',
    'author',
    'badge',
] as const;

export const EVENT_SEARCH_FIELDS = [
    'name',
    'subtitle',
    'location',
    'description',
    'tips',
    'priceType',
] as const;

export const REFUGIO_SEARCH_FIELDS = [
    'name',
    'tagline',
    'location',
    'description',
    'howToBook',
    'amenities',
    'type',
    'activities',
    'restrictions',
    'pricingGuide',
] as const;

export function localizeDepartment(raw: RawDoc, lang: Language): Department {
    const doc = raw;
    const extendedFields = [
        'geography',
        'geographicInfo',
        'culture',
        'culturalInfo',
        'history',
        'historyInfo',
        'generalInfo',
    ] as const;

    const extended: Record<string, string> = {};
    for (const field of extendedFields) {
        const value = pickLocalized(doc, field, lang);
        if (value) extended[field] = value;
    }

    return {
        ...(raw as Department),
        ...extended,
        name: pickLocalized(doc, 'name', lang) || String(raw.name || ''),
        subtitle: pickLocalized(doc, 'subtitle', lang) || String(raw.subtitle || ''),
        tag: pickLocalized(doc, 'tag', lang) || String(raw.tag || ''),
        locationLabel: pickLocalized(doc, 'locationLabel', lang) || String(raw.locationLabel || ''),
        description: pickLocalized(doc, 'description', lang) || String(raw.description || ''),
        safetyNote: pickLocalized(doc, 'safetyNote', lang) || (raw.safetyNote as string | undefined),
        logistics: pickLocalized(doc, 'logistics', lang) || (raw.logistics as string | undefined),
        seasonality: pickLocalized(doc, 'seasonality', lang) || (raw.seasonality as string | undefined),
        ecosystems: normalizeListValue(pickLocalizedListSource(doc, 'ecosystems', lang)),
        mustTryGastronomy: normalizeListValue(pickLocalizedListSource(doc, 'mustTryGastronomy', lang)),
        tips: normalizeListValue(pickLocalizedListSource(doc, 'tips', lang)),
    };
}

export function localizeDestination(raw: RawDoc, lang: Language): Destination {
    const doc = raw;
    const packing = pickLocalizedPackingGuide(
        {
            ...doc,
            packingGuide: doc.packingGuide ?? doc.packingGuige,
            packingGuide_en: doc.packingGuide_en ?? doc.packingGuige_en,
        },
        lang
    );

    return {
        ...(raw as Destination),
        title: pickLocalized(doc, 'title', lang) || String(raw.title || raw.name || ''),
        location: pickLocalized(doc, 'location', lang) || String(raw.location || ''),
        description: pickLocalized(doc, 'description', lang) || String(raw.description || ''),
        aiTip: pickLocalized(doc, 'aiTip', lang) || String(raw.aiTip || ''),
        activities: pickLocalizedStringArray(doc, 'activities', lang),
        gettingThere: pickLocalizedObjectArray(doc, 'gettingThere', lang) as Destination['gettingThere'],
        pricingGuide: pickLocalizedObjectArray(doc, 'pricingGuide', lang) as Destination['pricingGuide'],
        packingSummary: packing?.summary || pickLocalized(doc, 'packingSummary', lang) || String(raw.packingSummary || ''),
        packingGuide: packing?.categories?.length
            ? packing.categories
            : ((raw.packingGuide ?? raw.packingGuige) as Destination['packingGuide']),
    };
}

export function localizeCoupon(raw: RawDoc, lang: Language): Coupon {
    const doc = raw;
    return {
        ...(raw as Coupon),
        title: pickLocalized(doc, 'title', lang) || String(raw.title || ''),
        description: pickLocalized(doc, 'description', lang) || String(raw.description || ''),
        location: pickLocalized(doc, 'location', lang) || String(raw.location || ''),
        redemptionInstructions:
            pickLocalized(doc, 'redemptionInstructions', lang) ||
            (raw.redemptionInstructions as string | undefined),
        validity: pickLocalized(doc, 'validity', lang) || String(raw.validity || ''),
        discount: pickLocalized(doc, 'discount', lang) || String(raw.discount || ''),
    };
}

export function localizeNewsArticle(raw: RawDoc, lang: Language): NewsArticle {
    const doc = raw;
    return {
        ...(raw as NewsArticle),
        title: pickLocalized(doc, 'title', lang) || String(raw.title || ''),
        summary: pickLocalized(doc, 'summary', lang) || String(raw.summary || ''),
        content: pickLocalized(doc, 'content', lang) || String(raw.content || ''),
        category: pickLocalized(doc, 'category', lang) || String(raw.category || ''),
        author: pickLocalized(doc, 'author', lang) || String(raw.author || ''),
        badge: pickLocalized(doc, 'badge', lang) || (raw.badge as string | undefined),
        readTime: pickLocalized(doc, 'readTime', lang) || (raw.readTime as string | undefined),
    };
}

export function localizeEvent(raw: RawDoc, lang: Language): AppEvent {
    const doc = raw;
    return {
        ...(raw as AppEvent),
        name: pickLocalized(doc, 'name', lang) || String(raw.name || ''),
        subtitle: pickLocalized(doc, 'subtitle', lang) || (raw.subtitle as string | undefined),
        description: pickLocalized(doc, 'description', lang) || String(raw.description || ''),
        location: pickLocalized(doc, 'location', lang) || String(raw.location || ''),
        tips: pickLocalized(doc, 'tips', lang) || (raw.tips as string | undefined),
        priceType: pickLocalized(doc, 'priceType', lang) || String(raw.priceType || ''),
    };
}

export function localizeRefugio(raw: RawDoc, lang: Language): Refugio {
    const doc = raw;
    const amenities = pickLocalizedStringArray(doc, 'amenities', lang);
    const types = pickLocalizedStringArray(doc, 'type', lang);

    return {
        ...(raw as Refugio),
        name: pickLocalized(doc, 'name', lang) || String(raw.name || ''),
        tagline: pickLocalized(doc, 'tagline', lang) || String(raw.tagline || ''),
        location: pickLocalized(doc, 'location', lang) || String(raw.location || ''),
        description: pickLocalized(doc, 'description', lang) || String(raw.description || ''),
        howToBook: pickLocalized(doc, 'howToBook', lang) || String(raw.howToBook || ''),
        amenities: amenities.length > 0 ? amenities : ((raw.amenities as string[]) || []),
        type: types.length > 0 ? types : ((raw.type as string[]) || []),
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
    lang: Language
): Department | Destination | Coupon | NewsArticle | AppEvent | Refugio {
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
            return raw as Department;
    }
}
