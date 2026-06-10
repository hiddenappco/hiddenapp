export type ChatWidgetType = 'destination' | 'coupon' | 'refugio' | 'event' | 'news' | 'expedition';

export interface ChatWidgetPayload {
    type: ChatWidgetType;
    id: string;
}

const WIDGET_TYPE_ALIASES: Record<string, ChatWidgetType> = {
    destination: 'destination', destino: 'destination', destinos: 'destination',
    coupon: 'coupon', coupons: 'coupon', cupon: 'coupon', cupones: 'coupon',
    refugio: 'refugio', refugios: 'refugio', lodging: 'refugio', hospedaje: 'refugio',
    event: 'event', events: 'event', feria: 'event', ferias: 'event', fair: 'event',
    news: 'news', noticia: 'news', noticias: 'news',
    expedition: 'expedition', expedicion: 'expedition', itinerario: 'expedition', itinerary: 'expedition',
};

export function normalizeWidgetType(raw: unknown): ChatWidgetType | null {
    const key = String(raw ?? '').toLowerCase().trim();
    return WIDGET_TYPE_ALIASES[key] ?? null;
}

type FirestoreDoc = { id: string; data: () => Record<string, unknown> };

export interface WidgetCatalog {
    validIds: Record<ChatWidgetType, Set<string>>;
    aliasToDocId: Record<ChatWidgetType, Map<string, string>>;
    index: Array<{ type: ChatWidgetType; docId: string; names: string[] }>;
}

function collectNames(data: Record<string, unknown>, docId: string): string[] {
    const names = new Set<string>();
    const add = (v: unknown) => {
        if (typeof v === 'string' && v.trim().length > 2) names.add(v.trim());
    };
    add(data.title);
    add(data.name);
    add(data.id);
    add(data.customId);
    add(docId);
    return [...names];
}

export function buildWidgetCatalog(snaps: {
    destinations: FirestoreDoc[];
    coupons: FirestoreDoc[];
    refugios: FirestoreDoc[];
    events: FirestoreDoc[];
    news: FirestoreDoc[];
}): WidgetCatalog {
    const validIds: Record<ChatWidgetType, Set<string>> = {
        destination: new Set(),
        coupon: new Set(),
        refugio: new Set(),
        event: new Set(),
        news: new Set(),
        expedition: new Set(),
    };
    const aliasToDocId: Record<ChatWidgetType, Map<string, string>> = {
        destination: new Map(),
        coupon: new Map(),
        refugio: new Map(),
        event: new Map(),
        news: new Map(),
        expedition: new Map(),
    };
    const index: WidgetCatalog['index'] = [];

    const register = (type: ChatWidgetType, doc: FirestoreDoc) => {
        const data = doc.data();
        validIds[type].add(doc.id);
        const names = collectNames(data, doc.id);
        for (const name of names) {
            aliasToDocId[type].set(name.toLowerCase(), doc.id);
        }
        index.push({ type, docId: doc.id, names });
    };

    snaps.destinations.forEach(d => register('destination', d));
    snaps.coupons.forEach(d => register('coupon', d));
    snaps.refugios.forEach(d => register('refugio', d));
    snaps.events.forEach(d => register('event', d));
    snaps.news.forEach(d => register('news', d));

    return { validIds, aliasToDocId, index };
}

function resolveDocId(type: ChatWidgetType, rawId: string, catalog: WidgetCatalog): string | null {
    const id = rawId.trim();
    if (!id) return null;
    if (catalog.validIds[type].has(id)) return id;
    const alias = catalog.aliasToDocId[type].get(id.toLowerCase());
    if (alias && catalog.validIds[type].has(alias)) return alias;
    return null;
}

export function sanitizeChatWidgets(widgets: unknown, catalog: WidgetCatalog): ChatWidgetPayload[] {
    if (!Array.isArray(widgets)) return [];
    const out: ChatWidgetPayload[] = [];
    const seen = new Set<string>();

    for (const raw of widgets) {
        if (!raw || typeof raw !== 'object') continue;
        const type = normalizeWidgetType((raw as { type?: unknown }).type);
        const rawId = String((raw as { id?: unknown }).id ?? '').trim();
        if (!type || !rawId) continue;

        // Expeditions are generated docs (not catalog entries): pass with id-format check
        const docId =
            type === 'expedition'
                ? (/^[A-Za-z0-9_-]{6,}$/.test(rawId) ? rawId : null)
                : resolveDocId(type, rawId, catalog);
        if (!docId) continue;

        const key = `${type}:${docId}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ type, id: docId });
        if (out.length >= 5) break;
    }
    return out;
}

const INTENT_PATTERNS: Array<{ type: ChatWidgetType; re: RegExp }> = [
    { type: 'coupon', re: /\b(cup[oó]n|cupones|descuento|oferta|promo)\b/i },
    { type: 'refugio', re: /\b(refugio|refugios|hospedaje|hotel|alojamiento|dormir)\b/i },
    { type: 'event', re: /\b(feria|ferias|evento|eventos|festival)\b/i },
    { type: 'news', re: /\b(noticia|noticias|novedad)\b/i },
    { type: 'destination', re: /\b(destino|destinos|lugar|visitar|conocer)\b/i },
];

function detectUserIntent(userMessage: string): ChatWidgetType | null {
    for (const { type, re } of INTENT_PATTERNS) {
        if (re.test(userMessage)) return type;
    }
    return null;
}

function textMentionsName(text: string, name: string): boolean {
    if (!name || name.length < 4) return false;
    return text.toLowerCase().includes(name.toLowerCase());
}

/** Fill widgets when the model omitted them or used wrong ids */
export function enrichChatWidgets(
    widgets: ChatWidgetPayload[],
    userMessage: string,
    assistantMessage: string,
    catalog: WidgetCatalog
): ChatWidgetPayload[] {
    const out = [...widgets];
    const seen = new Set(out.map(w => `${w.type}:${w.id}`));
    const combined = `${userMessage}\n${assistantMessage}`;

    // Match by names mentioned in the assistant reply
    for (const item of catalog.index) {
        if (out.length >= 5) break;
        const key = `${item.type}:${item.docId}`;
        if (seen.has(key)) continue;
        const mentioned = item.names.some(n => textMentionsName(combined, n));
        if (mentioned) {
            out.push({ type: item.type, id: item.docId });
            seen.add(key);
        }
    }

    // User asked for coupons/refugios/etc. but model sent none — attach catalog items cited in reply
    const intent = detectUserIntent(userMessage);
    if (intent && !out.some(w => w.type === intent)) {
        const candidates = catalog.index.filter(i => i.type === intent);
        for (const item of candidates) {
            if (out.length >= 5) break;
            const key = `${item.type}:${item.docId}`;
            if (seen.has(key)) continue;
            if (item.names.some(n => textMentionsName(assistantMessage, n))) {
                out.push({ type: item.type, id: item.docId });
                seen.add(key);
            }
        }
        // Broad ask ("qué cupones hay") with no name matches → up to 3 from that type
        if (!out.some(w => w.type === intent) && /\b(hay|tienes|cu[aá]les|alg[uú]n|disponible|mu[eé]strame|recomienda)\b/i.test(userMessage)) {
            for (const item of candidates.slice(0, 3)) {
                if (out.length >= 5) break;
                const key = `${item.type}:${item.docId}`;
                if (seen.has(key)) continue;
                out.push({ type: item.type, id: item.docId });
                seen.add(key);
            }
        }
    }

    return out.slice(0, 5);
}
