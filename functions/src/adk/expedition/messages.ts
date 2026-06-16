import type { AppLanguage } from '../chat/briefing';

const MESSAGES: Record<AppLanguage, Record<string, string>> = {
    es: {
        NOT_FEASIBLE_DEFAULT: 'El catálogo actual no permite armar esta expedición.',
        MUST_VISIT_REASON: 'Destino imprescindible del viajero',
        BUDGET_FALLBACK_ASSUMPTION: 'Estimación basada solo en precios de actividades del catálogo',
        BUDGET_ACTIVITIES_NOTE: 'Según pricingGuide del catálogo',
        ROUTING_FAILED_NOTE: 'No se pudo armar un itinerario viable con los destinos seleccionados.',
    },
    en: {
        NOT_FEASIBLE_DEFAULT: 'The current catalog cannot support this expedition.',
        MUST_VISIT_REASON: 'Traveler must-visit destination',
        BUDGET_FALLBACK_ASSUMPTION: 'Estimate based on catalog activity prices only',
        BUDGET_ACTIVITIES_NOTE: 'From catalog pricingGuide',
        ROUTING_FAILED_NOTE: 'Could not build a viable itinerary with the selected destinations.',
    },
};

export function expeditionMessage(lang: AppLanguage, key: string): string {
    return MESSAGES[lang]?.[key] ?? MESSAGES.es[key] ?? key;
}
