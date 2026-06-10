import { Language } from '../types/core';
import { pickLocalized } from './localizedContent';
import type { PackingCategory, ResolvedPackingGuide } from '../types/content';

const PACKING_FIELD_KEYS = [
    'packingGuide',
    'packingGuige', // Rowy typo on San Cipriano doc
    'packing_guide',
    'PackingGuide',
    'packingGuide_en',
    'packingGuige_en',
    'packing_guide_en',
] as const;

function deepParseJson(raw: unknown, maxDepth = 4): unknown {
    let current = raw;
    for (let i = 0; i < maxDepth; i++) {
        if (typeof current !== 'string') break;
        const trimmed = current.trim();
        if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) break;
        try {
            current = JSON.parse(trimmed);
        } catch {
            break;
        }
    }
    return current;
}

/** Firestore / Rowy sometimes persist arrays as numeric-key maps ({ "0": {}, "1": {} }). */
function coerceToArray(raw: unknown): unknown[] {
    const parsed = deepParseJson(raw);
    if (Array.isArray(parsed)) return parsed;
    if (!parsed || typeof parsed !== 'object') return [];

    const obj = parsed as Record<string, unknown>;
    const numericKeys = Object.keys(obj)
        .filter((k) => /^\d+$/.test(k))
        .sort((a, b) => Number(a) - Number(b));

    if (numericKeys.length > 0) {
        return numericKeys.map((k) => obj[k]).filter((v) => v != null);
    }

    if ('categoria' in obj || 'category' in obj || 'Categoria' in obj || 'Category' in obj) {
        return [obj];
    }

    return [];
}

function readField(row: Record<string, unknown>, ...keys: string[]): unknown {
    for (const key of keys) {
        const value = row[key];
        if (value !== undefined && value !== null && value !== '') return value;
    }
    const lowerKeys = keys.map((k) => k.toLowerCase());
    for (const [k, value] of Object.entries(row)) {
        if (value === undefined || value === null || value === '') continue;
        if (lowerKeys.includes(k.toLowerCase())) return value;
    }
    return undefined;
}

function normalizePackingItems(items: unknown): PackingCategory['items'] {
    return coerceToArray(items)
        .filter((item) => item != null)
        .map((item) => {
            if (typeof item === 'string' && item.trim()) {
                return { nombre: item.trim(), prioridad: 'recomendado' };
            }
            if (!item || typeof item !== 'object') return null;

            const row = item as Record<string, unknown>;
            const nombre = String(
                readField(row, 'nombre', 'name', 'item', 'title', 'label') || ''
            ).trim();
            if (!nombre) return null;

            const prioridad = String(
                readField(row, 'prioridad', 'priority', 'importance') || 'recomendado'
            ).toLowerCase();
            const notaRaw = readField(row, 'nota', 'note', 'notes', 'description');
            const nota = typeof notaRaw === 'string' ? notaRaw : undefined;

            return { nombre, prioridad, nota };
        })
        .filter((item): item is PackingCategory['items'][number] => item !== null);
}

function normalizePackingCategories(raw: unknown): PackingCategory[] {
    return coerceToArray(raw)
        .filter((entry) => entry != null)
        .map((entry) => {
            if (typeof entry === 'string' && entry.trim()) {
                return { categoria: entry.trim(), items: [] };
            }
            if (!entry || typeof entry !== 'object') return null;

            const row = entry as Record<string, unknown>;
            const categoria = String(
                readField(row, 'categoria', 'category', 'Categoria', 'Category', 'title') || ''
            ).trim();
            const items = normalizePackingItems(readField(row, 'items', 'Items', 'articulos', 'articles'));
            if (!categoria || items.length === 0) return null;
            return { categoria, items };
        })
        .filter((cat): cat is PackingCategory => cat !== null);
}

function parsePackingPayload(raw: unknown): { summary: string; categories: PackingCategory[] } {
    const parsed = deepParseJson(raw);

    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const obj = parsed as Record<string, unknown>;
        const summaryRaw = readField(obj, 'packingSummary', 'summary', 'resumen', 'PackingSummary');
        const summary = typeof summaryRaw === 'string' ? summaryRaw.trim() : '';
        const categories = normalizePackingCategories(
            readField(obj, 'packingGuide', 'packing_guide', 'categories', 'guide', 'items')
        );
        return { summary, categories };
    }

    return { summary: '', categories: normalizePackingCategories(parsed) };
}

function extractRawPackingField(
    doc: Record<string, unknown>,
    lang: Language
): unknown {
    const preferredKeys =
        lang === Language.English
            ? (['packingGuide_en', 'packingGuige_en', 'packing_guide_en', 'packingGuide', 'packingGuige', 'packing_guide'] as const)
            : (['packingGuide', 'packingGuige', 'packing_guide', 'packingGuide_en', 'packingGuige_en', 'packing_guide_en'] as const);

    for (const key of preferredKeys) {
        const value = doc[key];
        if (value !== undefined && value !== null && value !== '') return value;
    }

    for (const key of PACKING_FIELD_KEYS) {
        const value = doc[key];
        if (value !== undefined && value !== null && value !== '') return value;
    }

    return undefined;
}

/**
 * Resolves packing guide for the active UI language.
 * Supports array-only fields, full JSON blobs { packingSummary, packingGuide }, *_en fields,
 * JSON strings, and Firestore map-style arrays.
 */
export function pickLocalizedPackingGuide(
    doc: Record<string, unknown> | null | undefined,
    lang: Language
): ResolvedPackingGuide | null {
    if (!doc) return null;

    const spanish = parsePackingPayload(extractRawPackingField(doc, Language.Spanish));
    const fieldSummary = pickLocalized(doc, 'packingSummary', lang);

    if (lang === Language.English) {
        const english = parsePackingPayload(extractRawPackingField(doc, Language.English));
        const categories = english.categories.length > 0 ? english.categories : spanish.categories;
        const summary = fieldSummary || english.summary || spanish.summary;
        if (categories.length === 0 && !summary) return null;
        return { summary, categories };
    }

    const summary = fieldSummary || spanish.summary;
    if (spanish.categories.length === 0 && !summary) return null;
    return { summary, categories: spanish.categories };
}

export function formatPackingGuidePlainText(
    guide: ResolvedPackingGuide,
    labels: {
        title: string;
        essential: string;
        recommended: string;
        optional: string;
    }
): string {
    const lines: string[] = [labels.title];
    if (guide.summary) {
        lines.push('', guide.summary);
    }
    for (const category of guide.categories) {
        lines.push('', category.categoria);
        for (const item of category.items) {
            const priority =
                item.prioridad === 'esencial'
                    ? labels.essential
                    : item.prioridad === 'opcional'
                      ? labels.optional
                      : labels.recommended;
            lines.push(`• ${item.nombre} (${priority})`);
            if (item.nota) lines.push(`  ${item.nota}`);
        }
    }
    return lines.join('\n');
}
