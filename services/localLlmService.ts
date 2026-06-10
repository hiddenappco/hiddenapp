/**
 * localLlmService.ts
 * 
 * Hybrid Local LLM Engine for the Off-Grid Tactical Terminal.
 * 
 * Architecture (dual offline product — see TAREA_4_ARQUITECTURA_OFFLINE_DUAL.md):
 * 1. Primary Engine (WebGPU + MediaPipe/WebLLM): Full Gemma 4 inference on-device (TODO).
 * 2. Fallback Engine (Guided local search): Structured RAG responder — default for all devices;
 *    used when Gemma is not installed, WebGPU is unavailable, or inference is not wired yet.
 * 
 * Both engines consume the same RAG context from the local SQLite database
 * and present responses through the same UI, but the fallback engine
 * surfaces the raw protocol/destination data with structured formatting
 * instead of generative AI responses.
 */

import { Language } from '../types/core';
import { es } from '../locales/es';
import { en } from '../locales/en';
import type { TranslationType } from '../locales/es';

const getLocale = (language: Language): TranslationType =>
  language === Language.English ? en : es;

// ─── Types ──────────────────────────────────────────────────────────────────

export type EngineMode = 'gemma' | 'fallback';

export interface EngineStatus {
  mode: EngineMode;
  ready: boolean;
  loading: boolean;
  error: string | null;
}

export interface RagDestination {
  title: string;
  description: string;
  location?: string;
  aiTip?: string;
  activities?: string[];
  pricing?: string[];
  gettingThere?: string[];
  packingSummary?: string;
}

export interface RagCoupon {
  title: string;
  description?: string;
  discount?: string;
  location?: string;
  validity?: string;
}

export interface RagEvent {
  name: string;
  subtitle?: string;
  description?: string;
  location?: string;
  date?: string;
}

export interface RagContext {
  protocols: Array<{ title: string; content: string; category?: string }>;
  destinations: RagDestination[];
  refugios: Array<{ name: string; tagline?: string; description: string; location?: string }>;
  coupons: RagCoupon[];
  events: RagEvent[];
  rawText: string; // The truncated context string injected into the prompt
}

export interface LlmResponse {
  text: string;
  engineUsed: EngineMode;
  ragContext: RagContext | null;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const MAX_CONTEXT_CHARS = 2000;
const SQL_RESULT_LIMIT = 3;

/**
 * The system prompt for the smart tourist guide personality.
 * Used by both the Gemma engine and the fallback structured responder.
 */
const TACTICAL_SYSTEM_PROMPT = `Eres el Guía Local Inteligente de Hidden App, un experto acompañante de viajes. Tu misión es ayudar al turista a descubrir destinos mágicos, aprovechar cupones, conocer eventos locales y resolver cualquier duda de su viaje usando la base de datos proporcionada. Tu tono es cálido, natural, directo y muy resolutivo. 

Si el usuario se encuentra en una situación de incomodidad, urgencia o pide consejos prácticos (ej. un dolor de cabeza, desorientación, picaduras), actúa con calma y empatía. Bríndale inmediatamente las soluciones prácticas que encuentres en los protocolos de tu base de datos. Sé conversacional y humano; no utilices advertencias robóticas, frases enlatadas ni avisos legales excesivos. Tu prioridad es ser el mejor compañero de viaje: útil, rápido y confiable.`;

// ─── SQL Queries for RAG ────────────────────────────────────────────────────

export function buildProtocolSearchSQL(
  userQuery: string,
  lang: 'es' | 'en' = 'es'
): { sql: string; params: string[] } {
  const titleExpr = lang === 'en'
    ? `COALESCE(NULLIF(title_en, ''), title)`
    : 'title';
  const contentExpr = lang === 'en'
    ? `COALESCE(NULLIF(content_en, ''), content)`
    : 'content';

  const terms = userQuery.trim().split(/\s+/).filter(t => t.length > 2);
  if (terms.length === 0) {
    return {
      sql: `SELECT ${titleExpr} AS title, ${contentExpr} AS content, category FROM survival_protocols LIMIT ${SQL_RESULT_LIMIT}`,
      params: []
    };
  }

  const conditions = terms.map(() =>
    `(title LIKE ? OR title_en LIKE ? OR keywords LIKE ? OR content LIKE ? OR content_en LIKE ?)`
  ).join(' OR ');
  const params = terms.flatMap(t => {
    const like = `%${t}%`;
    return [like, like, like, like, like];
  });

  return {
    sql: `SELECT ${titleExpr} AS title, ${contentExpr} AS content, category FROM survival_protocols WHERE ${conditions} LIMIT ${SQL_RESULT_LIMIT}`,
    params
  };
}

export function buildDestinationSearchSQL(
  userQuery: string,
  lang: 'es' | 'en' = 'es'
): { sql: string; params: string[] } {
  const titleExpr = lang === 'en'
    ? `COALESCE(NULLIF(title_en, ''), title)`
    : 'title';
  const descExpr = lang === 'en'
    ? `COALESCE(NULLIF(description_en, ''), description)`
    : 'description';
  const locExpr = lang === 'en'
    ? `COALESCE(NULLIF(location_en, ''), location)`
    : 'location';
  const actExpr = lang === 'en'
    ? `COALESCE(NULLIF(activities_en, ''), activities)`
    : 'activities';
  const tipExpr = lang === 'en'
    ? `COALESCE(NULLIF(aiTip_en, ''), aiTip)`
    : 'aiTip';
  const gettingExpr = lang === 'en'
    ? `COALESCE(NULLIF(gettingThere_en, ''), gettingThere)`
    : 'gettingThere';
  const pricingExpr = lang === 'en'
    ? `COALESCE(NULLIF(pricingGuide_en, ''), pricingGuide)`
    : 'pricingGuide';
  const packExpr = lang === 'en'
    ? `COALESCE(NULLIF(packingSummary_en, ''), packingSummary)`
    : 'packingSummary';

  const selectCols = `${titleExpr} AS title, ${descExpr} AS description, ${locExpr} AS location, ${tipExpr} AS aiTip, ${actExpr} AS activities, ${gettingExpr} AS gettingThere, ${pricingExpr} AS pricingGuide, ${packExpr} AS packingSummary`;

  const terms = userQuery.trim().split(/\s+/).filter(t => t.length > 2);
  if (terms.length === 0) {
    return {
      sql: `SELECT ${selectCols} FROM destinations LIMIT ${SQL_RESULT_LIMIT}`,
      params: []
    };
  }

  // Relevance score (in SELECT, so its params bind first): a title or location
  // match weighs far more than a description match, so when the explorer names
  // a specific place, that place ranks first instead of any loosely related doc.
  const relevance = terms.map(() =>
    `(CASE WHEN title LIKE ? OR title_en LIKE ? THEN 5 ELSE 0 END) + (CASE WHEN location LIKE ? THEN 2 ELSE 0 END)`
  ).join(' + ');
  const relParams = terms.flatMap(t => {
    const like = `%${t}%`;
    return [like, like, like];
  });

  const conditions = terms.map(() =>
    `(title LIKE ? OR title_en LIKE ? OR description LIKE ? OR description_en LIKE ? OR location LIKE ?)`
  ).join(' OR ');
  const whereParams = terms.flatMap(t => {
    const like = `%${t}%`;
    return [like, like, like, like, like];
  });

  return {
    sql: `SELECT ${selectCols}, (${relevance}) AS relevance FROM destinations WHERE ${conditions} ORDER BY relevance DESC LIMIT ${SQL_RESULT_LIMIT}`,
    params: [...relParams, ...whereParams]
  };
}

export function buildRefugioSearchSQL(
  userQuery: string,
  lang: 'es' | 'en' = 'es'
): { sql: string; params: string[] } {
  const nameExpr = lang === 'en'
    ? `COALESCE(NULLIF(name_en, ''), name)`
    : 'name';
  const taglineExpr = lang === 'en'
    ? `COALESCE(NULLIF(tagline_en, ''), tagline)`
    : 'tagline';
  const descExpr = lang === 'en'
    ? `COALESCE(NULLIF(description_en, ''), description)`
    : 'description';

  const terms = userQuery.trim().split(/\s+/).filter(t => t.length > 2);
  if (terms.length === 0) {
    return {
      sql: `SELECT ${nameExpr} AS name, ${taglineExpr} AS tagline, ${descExpr} AS description, location FROM refugios LIMIT ${SQL_RESULT_LIMIT}`,
      params: []
    };
  }

  const conditions = terms.map(() =>
    `(name LIKE ? OR name_en LIKE ? OR tagline LIKE ? OR tagline_en LIKE ? OR description LIKE ? OR description_en LIKE ? OR location LIKE ? OR amenities LIKE ?)`
  ).join(' OR ');
  const params = terms.flatMap(t => {
    const like = `%${t}%`;
    return [like, like, like, like, like, like, like, like];
  });

  return {
    sql: `SELECT ${nameExpr} AS name, ${taglineExpr} AS tagline, ${descExpr} AS description, location FROM refugios WHERE ${conditions} LIMIT ${SQL_RESULT_LIMIT}`,
    params
  };
}

export function buildCouponSearchSQL(
  userQuery: string,
  lang: 'es' | 'en' = 'es'
): { sql: string; params: string[] } {
  const titleExpr = lang === 'en'
    ? `COALESCE(NULLIF(title_en, ''), title)`
    : 'title';
  const descExpr = lang === 'en'
    ? `COALESCE(NULLIF(description_en, ''), description)`
    : 'description';

  const selectCols = `${titleExpr} AS title, ${descExpr} AS description, discount, location, validity`;

  const terms = userQuery.trim().split(/\s+/).filter(t => t.length > 2);
  if (terms.length === 0) {
    return {
      sql: `SELECT ${selectCols} FROM coupons LIMIT ${SQL_RESULT_LIMIT}`,
      params: []
    };
  }

  const conditions = terms.map(() =>
    `(title LIKE ? OR title_en LIKE ? OR description LIKE ? OR description_en LIKE ? OR discount LIKE ? OR location LIKE ?)`
  ).join(' OR ');
  const params = terms.flatMap(t => {
    const like = `%${t}%`;
    return [like, like, like, like, like, like];
  });

  return {
    sql: `SELECT ${selectCols} FROM coupons WHERE ${conditions} LIMIT ${SQL_RESULT_LIMIT}`,
    params
  };
}

export function buildEventSearchSQL(
  userQuery: string,
  lang: 'es' | 'en' = 'es'
): { sql: string; params: string[] } {
  const nameExpr = lang === 'en'
    ? `COALESCE(NULLIF(name_en, ''), name)`
    : 'name';
  const subtitleExpr = lang === 'en'
    ? `COALESCE(NULLIF(subtitle_en, ''), subtitle)`
    : 'subtitle';
  const descExpr = lang === 'en'
    ? `COALESCE(NULLIF(description_en, ''), description)`
    : 'description';

  const selectCols = `${nameExpr} AS name, ${subtitleExpr} AS subtitle, ${descExpr} AS description, location, date`;

  const terms = userQuery.trim().split(/\s+/).filter(t => t.length > 2);
  if (terms.length === 0) {
    return {
      sql: `SELECT ${selectCols} FROM events LIMIT ${SQL_RESULT_LIMIT}`,
      params: []
    };
  }

  const conditions = terms.map(() =>
    `(name LIKE ? OR name_en LIKE ? OR subtitle LIKE ? OR subtitle_en LIKE ? OR description LIKE ? OR description_en LIKE ? OR location LIKE ?)`
  ).join(' OR ');
  const params = terms.flatMap(t => {
    const like = `%${t}%`;
    return [like, like, like, like, like, like, like];
  });

  return {
    sql: `SELECT ${selectCols} FROM events WHERE ${conditions} LIMIT ${SQL_RESULT_LIMIT}`,
    params
  };
}

// ─── Rich Text Sanitizer ────────────────────────────────────────────────────

const NAMED_ENTITIES: Record<string, string> = {
  aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú',
  Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú',
  ntilde: 'ñ', Ntilde: 'Ñ', uuml: 'ü', Uuml: 'Ü', uml: '\u00a8',
  iexcl: '¡', iquest: '¿', ordf: 'ª', ordm: 'º', deg: '°', middot: '·',
  nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
  laquo: '«', raquo: '»', hellip: '…', mdash: '—', ndash: '–',
  rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', euro: '€',
};

/**
 * Converts CMS rich text (HTML tags + named/numeric entities) into clean,
 * human-readable plain text. The offline packs store descriptions as HTML,
 * so without this the chat shows raw markup like `&aacute;` or `</p>`.
 */
export function sanitizeRichText(input?: string | null): string {
  if (!input) return '';
  let text = String(input);

  // Convert block-level boundaries into line breaks before stripping tags
  text = text.replace(/<\s*br\s*\/?>/gi, '\n');
  text = text.replace(/<\s*\/\s*(p|div|li|h[1-6]|ul|ol|tr)\s*>/gi, '\n');
  text = text.replace(/<\s*li[^>]*>/gi, '• ');

  // Strip any remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // Decode numeric entities (&#225; and &#xE1;)
  text = text.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
  text = text.replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)));

  // Decode common named entities
  text = text.replace(/&([a-zA-Z]+);/g, (match, name) => NAMED_ENTITIES[name] ?? match);

  // Normalize whitespace
  text = text.replace(/\r/g, '');
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/ *\n */g, '\n');
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}

/**
 * Activities are stored in the offline pack as JSON-stringified arrays
 * (strings or objects with a label/name/title). Parse them into a clean
 * list of human-readable activity names.
 */
function parseActivities(raw: unknown): string[] {
  if (raw == null) return [];
  let value: unknown = raw;

  if (typeof value === 'string') {
    const s = value.trim();
    if (!s || s === '[]') return [];
    if (s.startsWith('[') || s.startsWith('{')) {
      try {
        value = JSON.parse(s);
      } catch {
        return [s];
      }
    } else {
      return [s];
    }
  }

  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      if (item && typeof item === 'object') {
        const o = item as Record<string, unknown>;
        const label = o.label ?? o.name ?? o.title ?? o.activity;
        return typeof label === 'string' ? label.trim() : '';
      }
      return '';
    })
    .filter(Boolean);
}

function parseJsonArray(raw: unknown): Record<string, unknown>[] {
  if (raw == null) return [];
  let value: unknown = raw;
  if (typeof value === 'string') {
    const s = value.trim();
    if (!s || s === '[]') return [];
    try {
      value = JSON.parse(s);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is Record<string, unknown> => !!v && typeof v === 'object');
}

/** Formats destination pricingGuide (PricingItem[]) into readable price lines. */
function parsePricing(raw: unknown): string[] {
  return parseJsonArray(raw)
    .map((o) => {
      const item = String(o.item ?? o.categoria ?? '').trim();
      const min = o.precio_min;
      const max = o.precio_max;
      const fmt = (n: unknown) =>
        typeof n === 'number' && !Number.isNaN(n) ? `$${n.toLocaleString('es-CO')}` : '';
      const minStr = fmt(min);
      const maxStr = fmt(max);
      let price = '';
      if (minStr && maxStr && minStr !== maxStr) price = `${minStr} – ${maxStr}`;
      else price = minStr || maxStr;
      if (!item && !price) return '';
      return price ? `${item}: ${price}` : item;
    })
    .filter(Boolean);
}

/** Formats destination gettingThere (GettingThereItem[]) into readable lines. */
function parseGettingThere(raw: unknown): string[] {
  return parseJsonArray(raw)
    .map((o) => {
      const modalidad = String(o.modalidad ?? o.mode ?? '').trim();
      const instrucciones = String(o.instrucciones ?? o.instructions ?? '').trim();
      if (!modalidad && !instrucciones) return '';
      if (modalidad && instrucciones) return `${modalidad}: ${instrucciones}`;
      return modalidad || instrucciones;
    })
    .filter(Boolean);
}

// ─── Context Builder ────────────────────────────────────────────────────────

/**
 * Builds a RAG context object from SQLite query results.
 * Sanitizes CMS HTML from every text field and truncates the combined
 * text to MAX_CONTEXT_CHARS to respect the model's context window.
 */
export function buildRagContext(
  protocolResults: Array<{ title: string; content: string; category?: string }>,
  destinationResults: Array<{
    title: string;
    description: string;
    location?: string;
    aiTip?: string;
    activities?: unknown;
    gettingThere?: unknown;
    pricingGuide?: unknown;
    packingSummary?: string;
  }>,
  refugioResults: Array<{ name: string; tagline?: string; description: string; location?: string }> = [],
  couponResults: Array<{ title: string; description?: string; discount?: string; location?: string; validity?: string }> = [],
  eventResults: Array<{ name: string; subtitle?: string; description?: string; location?: string; date?: string }> = []
): RagContext {
  const protocols = protocolResults.map((p) => ({
    title: sanitizeRichText(p.title),
    content: sanitizeRichText(p.content),
    category: p.category ? sanitizeRichText(p.category) : p.category,
  }));
  const destinations: RagDestination[] = destinationResults.map((d) => ({
    title: sanitizeRichText(d.title),
    description: sanitizeRichText(d.description),
    location: d.location ? sanitizeRichText(d.location) : d.location,
    aiTip: d.aiTip ? sanitizeRichText(d.aiTip) : undefined,
    activities: parseActivities(d.activities)
      .map((a) => sanitizeRichText(a))
      .filter(Boolean),
    gettingThere: parseGettingThere(d.gettingThere)
      .map((g) => sanitizeRichText(g))
      .filter(Boolean),
    pricing: parsePricing(d.pricingGuide)
      .map((p) => sanitizeRichText(p))
      .filter(Boolean),
    packingSummary: d.packingSummary ? sanitizeRichText(d.packingSummary) : undefined,
  }));
  const refugios = refugioResults.map((r) => ({
    name: sanitizeRichText(r.name),
    tagline: r.tagline ? sanitizeRichText(r.tagline) : r.tagline,
    description: sanitizeRichText(r.description),
    location: r.location ? sanitizeRichText(r.location) : r.location,
  }));
  const coupons: RagCoupon[] = couponResults.map((c) => ({
    title: sanitizeRichText(c.title),
    description: c.description ? sanitizeRichText(c.description) : undefined,
    discount: c.discount ? sanitizeRichText(c.discount) : undefined,
    location: c.location ? sanitizeRichText(c.location) : undefined,
    validity: c.validity ? sanitizeRichText(c.validity) : undefined,
  }));
  const events: RagEvent[] = eventResults.map((e) => ({
    name: sanitizeRichText(e.name),
    subtitle: e.subtitle ? sanitizeRichText(e.subtitle) : undefined,
    description: e.description ? sanitizeRichText(e.description) : undefined,
    location: e.location ? sanitizeRichText(e.location) : undefined,
    date: e.date ? sanitizeRichText(e.date) : undefined,
  }));

  let rawText = '';

  if (protocols.length > 0) {
    rawText += '=== PROTOCOLOS DE SUPERVIVENCIA ===\n';
    for (const p of protocols) {
      rawText += `\n📋 ${p.title}${p.category ? ` [${p.category}]` : ''}\n${p.content}\n`;
    }
  }

  if (destinations.length > 0) {
    rawText += '\n=== DESTINOS RELEVANTES ===\n';
    for (const d of destinations) {
      rawText += `\n📍 ${d.title}${d.location ? ` — ${d.location}` : ''}\n${d.description}\n`;
      if (d.activities && d.activities.length > 0) {
        rawText += `Actividades: ${d.activities.join(', ')}\n`;
      }
      if (d.pricing && d.pricing.length > 0) {
        rawText += `Precios: ${d.pricing.join('; ')}\n`;
      }
      if (d.gettingThere && d.gettingThere.length > 0) {
        rawText += `Cómo llegar: ${d.gettingThere.join('; ')}\n`;
      }
      if (d.packingSummary) {
        rawText += `Qué llevar: ${d.packingSummary}\n`;
      }
      if (d.aiTip) {
        rawText += `Consejo: ${d.aiTip}\n`;
      }
    }
  }

  if (refugios.length > 0) {
    rawText += '\n=== REFUGIOS Y HOSPEDAJES ===\n';
    for (const r of refugios) {
      rawText += `\n🏠 ${r.name}${r.tagline ? ` — ${r.tagline}` : ''}${r.location ? ` (${r.location})` : ''}\n${r.description}\n`;
    }
  }

  if (coupons.length > 0) {
    rawText += '\n=== CUPONES Y DESCUENTOS ===\n';
    for (const c of coupons) {
      rawText += `\n🎟️ ${c.title}${c.discount ? ` — ${c.discount}` : ''}${c.location ? ` (${c.location})` : ''}\n`;
      if (c.description) rawText += `${c.description}\n`;
      if (c.validity) rawText += `Vigencia: ${c.validity}\n`;
    }
  }

  if (events.length > 0) {
    rawText += '\n=== EVENTOS, FERIAS Y FESTIVALES ===\n';
    for (const e of events) {
      rawText += `\n🎉 ${e.name}${e.subtitle ? ` — ${e.subtitle}` : ''}${e.date ? ` [${e.date}]` : ''}${e.location ? ` (${e.location})` : ''}\n`;
      if (e.description) rawText += `${e.description}\n`;
    }
  }

  // Truncate to respect context window limits
  if (rawText.length > MAX_CONTEXT_CHARS) {
    rawText = rawText.substring(0, MAX_CONTEXT_CHARS) + '\n\n[... contexto truncado por límite de seguridad ...]';
  }

  return {
    protocols,
    destinations,
    refugios,
    coupons,
    events,
    rawText: rawText.trim()
  };
}

// ─── Prompt Assembly ────────────────────────────────────────────────────────

/**
 * Constructs the full prompt for Gemma 4 inference,
 * injecting the RAG context into the system instructions.
 */
export function assemblePrompt(userMessage: string, ragContext: RagContext | null): string {
  let systemBlock = TACTICAL_SYSTEM_PROMPT;

  if (ragContext && ragContext.rawText.length > 0) {
    systemBlock += `\n\nCONTEXTO LOCAL DE BASE DE DATOS (usa esta información para responder):\n${ragContext.rawText}`;
  } else {
    systemBlock += '\n\nNo se encontró contexto relevante en la base de datos local para esta consulta.';
  }

  return `<start_of_turn>system\n${systemBlock}<end_of_turn>\n<start_of_turn>user\n${userMessage}<end_of_turn>\n<start_of_turn>model\n`;
}

// ─── Engine Detection ───────────────────────────────────────────────────────

/**
 * Checks if the device supports WebGPU, which is required
 * for on-device Gemma 4 inference via MediaPipe/WebLLM.
 */
export async function detectEngineCapability(): Promise<EngineMode> {
  try {
    if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
      const gpu = (navigator as any).gpu;
      if (gpu) {
        const adapter = await gpu.requestAdapter();
        if (adapter) {
          console.log('[LocalLLM] WebGPU adapter detected. Gemma engine available.');
          return 'gemma';
        }
      }
    }
  } catch (err) {
    console.warn('[LocalLLM] WebGPU detection failed:', err);
  }
  
  console.log('[LocalLLM] WebGPU not available. Using fallback quick-search engine.');
  return 'fallback';
}

// ─── Fallback Engine ────────────────────────────────────────────────────────

/**
 * The fallback "Quick Search" engine.
 * Instead of generative AI, it formats the RAG context into a structured,
 * human-readable response. This provides value even without the LLM model.
 */
export function generateFallbackResponse(
  userMessage: string,
  ragContext: RagContext | null,
  language: Language
): string {
  const llm = getLocale(language).vault.llm;

  if (
    !ragContext ||
    (ragContext.protocols.length === 0 &&
      ragContext.destinations.length === 0 &&
      ragContext.refugios.length === 0 &&
      ragContext.coupons.length === 0 &&
      ragContext.events.length === 0)
  ) {
    return llm.noResults.replace('{query}', userMessage);
  }

  let response = '';

  if (ragContext.protocols.length > 0) {
    response += `${llm.protocolsHeader}\n\n`;
    for (const p of ragContext.protocols) {
      response += `**${p.title}**${p.category ? ` _(${p.category})_` : ''}\n${p.content}\n\n---\n\n`;
    }
  }

  if (ragContext.destinations.length > 0) {
    response += `${llm.destinationsHeader}\n\n`;
    for (const d of ragContext.destinations) {
      response += `**${d.title}**${d.location ? ` — _${d.location}_` : ''}\n${d.description}\n`;
      if (d.activities && d.activities.length > 0) {
        response += `\n${llm.activitiesLabel}\n`;
        for (const activity of d.activities) {
          response += `• ${activity}\n`;
        }
      }
      if (d.pricing && d.pricing.length > 0) {
        response += `\n${llm.pricingLabel}\n`;
        for (const price of d.pricing) {
          response += `• ${price}\n`;
        }
      }
      if (d.gettingThere && d.gettingThere.length > 0) {
        response += `\n${llm.gettingThereLabel}\n`;
        for (const route of d.gettingThere) {
          response += `• ${route}\n`;
        }
      }
      if (d.packingSummary) {
        response += `\n${llm.packingLabel} ${d.packingSummary}\n`;
      }
      if (d.aiTip) {
        response += `\n${llm.aiTipLabel} ${d.aiTip}\n`;
      }
      response += `\n`;
    }
  }

  if (ragContext.refugios.length > 0) {
    response += `${llm.refugiosHeader}\n\n`;
    for (const r of ragContext.refugios) {
      response += `**${r.name}**${r.tagline ? ` — _${r.tagline}_` : ''}${r.location ? ` · ${r.location}` : ''}\n${r.description}\n\n`;
    }
  }

  if (ragContext.coupons.length > 0) {
    response += `${llm.couponsHeader}\n\n`;
    for (const c of ragContext.coupons) {
      response += `**${c.title}**${c.discount ? ` — _${c.discount}_` : ''}${c.location ? ` · ${c.location}` : ''}\n`;
      if (c.description) response += `${c.description}\n`;
      if (c.validity) response += `_${c.validity}_\n`;
      response += `\n`;
    }
  }

  if (ragContext.events.length > 0) {
    response += `${llm.eventsHeader}\n\n`;
    for (const e of ragContext.events) {
      response += `**${e.name}**${e.subtitle ? ` — _${e.subtitle}_` : ''}${e.date ? ` · ${e.date}` : ''}${e.location ? ` · ${e.location}` : ''}\n`;
      if (e.description) response += `${e.description}\n`;
      response += `\n`;
    }
  }

  response += llm.quickSearchFooter;

  return response.trim();
}

// ─── Main Service Class ─────────────────────────────────────────────────────

export class LocalLlmService {
  private engineMode: EngineMode = 'fallback';
  private isReady: boolean = false;
  private isLoading: boolean = false;
  private error: string | null = null;

  /**
   * Initialize the service by detecting the best available engine.
   */
  async initialize(): Promise<EngineStatus> {
    this.isLoading = true;
    this.error = null;

    try {
      this.engineMode = await detectEngineCapability();
      
      if (this.engineMode === 'gemma') {
        // In a production build, this is where you would initialize
        // the MediaPipe LLM Inference API or WebLLM runtime.
        // For now, we mark it as ready since the model file is managed
        // by the installGemma/uninstallGemma flow in useOffGrid.
        console.log('[LocalLLM] Gemma engine initialized (pending model load).');
      }

      this.isReady = true;
    } catch (err: any) {
      this.error = err.message || 'Unknown engine initialization error';
      this.engineMode = 'fallback';
      this.isReady = true; // Fallback is always ready
      console.error('[LocalLLM] Initialization error, falling back:', err);
    } finally {
      this.isLoading = false;
    }

    return this.getStatus();
  }

  /**
   * Get the current engine status for UI display.
   */
  getStatus(): EngineStatus {
    return {
      mode: this.engineMode,
      ready: this.isReady,
      loading: this.isLoading,
      error: this.error
    };
  }

  /**
   * Generate a response using the active engine.
   * Both engines receive the same RAG context.
   */
  async generateResponse(
    userMessage: string,
    ragContext: RagContext | null,
    language: Language
  ): Promise<LlmResponse> {
    if (this.engineMode === 'gemma') {
      try {
        // Assemble the full prompt with RAG context
        const prompt = assemblePrompt(userMessage, ragContext);
        
        // In production, this would call the MediaPipe/WebLLM inference API:
        // const result = await this.llmSession.generateResponse(prompt);
        // For now, we use the fallback since the actual WebGPU inference
        // pipeline requires the model binary to be loaded into GPU memory.
        console.log('[LocalLLM] Gemma inference prompt assembled:', prompt.substring(0, 200) + '...');
        
        // TODO: Replace with actual MediaPipe LLM Inference call
        // when the model binary integration is complete.
        const fallbackText = generateFallbackResponse(userMessage, ragContext, language);
        
        return {
          text: fallbackText,
          engineUsed: 'fallback', // Will change to 'gemma' when inference is wired
          ragContext
        };
      } catch (err: any) {
        console.error('[LocalLLM] Gemma inference failed, using fallback:', err);
        return {
          text: generateFallbackResponse(userMessage, ragContext, language),
          engineUsed: 'fallback',
          ragContext
        };
      }
    }

    // Fallback engine
    return {
      text: generateFallbackResponse(userMessage, ragContext, language),
      engineUsed: 'fallback',
      ragContext
    };
  }
}

// Singleton instance
export const localLlm = new LocalLlmService();
