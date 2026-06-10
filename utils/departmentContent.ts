/**
 * Normalizes department fields from Firestore / Rowy (plain text, markdown, rich text objects).
 */

export interface ParsedListItem {
  label: string;
  description?: string;
}

const LABEL_KEYS = ['name', 'nombre', 'title', 'titulo', 'plato', 'tipo', 'type', 'label', 'ecosystem', 'ecosistema'];
const DESC_KEYS = ['description', 'descripcion', 'detail', 'details', 'subtitle', 'subtitulo', 'text', 'tip', 'consejo'];

/** Strip lightweight markdown for chip / short labels */
export function stripMarkdownInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/^[-*•]\s+/gm, '')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .trim();
}

export function normalizeRichText(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);

  if (typeof value === 'object') {
    const o = value as Record<string, unknown>;
    for (const key of ['markdown', 'md', 'content', 'text', 'html', 'value']) {
      const v = o[key];
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
    if (Array.isArray(o.content)) {
      return slateNodesToText(o.content);
    }
  }

  return '';
}

function slateNodesToText(nodes: unknown[]): string {
  const parts: string[] = [];
  for (const node of nodes) {
    if (!node || typeof node !== 'object') continue;
    const n = node as Record<string, unknown>;
    if (typeof n.text === 'string') {
      parts.push(n.text);
      continue;
    }
    if (Array.isArray(n.children)) {
      const inner = slateNodesToText(n.children);
      if (inner) {
        const type = typeof n.type === 'string' ? n.type : '';
        if (type === 'paragraph' || type === 'p') parts.push(inner);
        else if (type === 'heading') parts.push(`\n## ${inner}\n`);
        else if (type === 'bulleted-list' || type === 'ul') parts.push(inner.split('\n').map((l) => `- ${l}`).join('\n'));
        else if (type === 'list-item' || type === 'li') parts.push(`- ${inner}`);
        else parts.push(inner);
      }
    }
  }
  return parts.join('\n\n').trim();
}

function tryParseJsonString(str: string): unknown | null {
  const trimmed = str.trim();
  if (!trimmed) return null;
  const first = trimmed[0];
  if (first !== '[' && first !== '{') return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    try {
      return JSON.parse(trimmed.replace(/'/g, '"'));
    } catch {
      return null;
    }
  }
}

function pickString(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (typeof v === 'number') return String(v);
  }
  return null;
}

function itemToParsed(item: unknown): ParsedListItem | null {
  if (item == null) return null;

  if (typeof item === 'string') {
    const trimmed = item.trim();
    if (!trimmed) return null;
    const parsed = tryParseJsonString(trimmed);
    if (parsed !== null) {
      const fromParsed = itemToParsed(parsed);
      if (fromParsed) return fromParsed;
      const list = normalizeListValue(parsed);
      if (list.length === 1) return list[0];
      if (list.length > 1) return { label: list.map((i) => i.label).join(', ') };
    }
    if ((trimmed.startsWith('{') || trimmed.startsWith('[')) && trimmed.length > 2) {
      return { label: stripMarkdownInline(trimmed) };
    }
    return { label: stripMarkdownInline(trimmed) };
  }

  if (typeof item === 'number' || typeof item === 'boolean') {
    return { label: String(item) };
  }

  if (Array.isArray(item)) {
    const nested = normalizeListValue(item);
    if (nested.length === 0) return null;
    if (nested.length === 1) return nested[0];
    return { label: nested.map((i) => i.label).join(', ') };
  }

  if (typeof item === 'object') {
    const o = item as Record<string, unknown>;
    const label = pickString(o, LABEL_KEYS);
    const description = pickString(o, DESC_KEYS);
    if (label && description && label !== description) {
      return { label: stripMarkdownInline(label), description: stripMarkdownInline(description) };
    }
    if (label) return { label: stripMarkdownInline(label) };
    if (description) return { label: stripMarkdownInline(description) };

    const stringValues = Object.values(o).filter(
      (v): v is string => typeof v === 'string' && v.trim().length > 0
    );
    if (stringValues.length === 1) {
      return { label: stripMarkdownInline(stringValues[0]) };
    }
    if (stringValues.length > 1) {
      return {
        label: stripMarkdownInline(stringValues[0]),
        description: stringValues.slice(1).map(stripMarkdownInline).join(' · '),
      };
    }
  }

  return null;
}

function splitPlainTextList(text: string): ParsedListItem[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const byNewline = trimmed
    .split(/\n+/)
    .map((line) => line.replace(/^[-*•]\s+/, '').trim())
    .filter(Boolean);
  if (byNewline.length > 1) {
    return byNewline.map((label) => ({ label: stripMarkdownInline(label) }));
  }

  if (trimmed.includes(';')) {
    return trimmed
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((label) => ({ label: stripMarkdownInline(label) }));
  }

  if (trimmed.includes(',')) {
    const parts = trimmed.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length > 1) {
      return parts.map((label) => ({ label: stripMarkdownInline(label) }));
    }
  }

  return [{ label: stripMarkdownInline(trimmed) }];
}

/**
 * Parses ecosystems, gastronomy, tips, etc. from JSON arrays, Rowy objects, or plain text.
 */
export function normalizeListValue(value: unknown): ParsedListItem[] {
  if (value == null) return [];

  if (typeof value === 'string') {
    const parsed = tryParseJsonString(value);
    if (parsed !== null) return normalizeListValue(parsed);
    return splitPlainTextList(value);
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) => {
      const item = itemToParsed(entry);
      return item ? [item] : [];
    });
  }

  if (typeof value === 'object') {
    const o = value as Record<string, unknown>;
    const keys = Object.keys(o);
    if (keys.length > 0 && keys.every((k) => /^\d+$/.test(k))) {
      return keys
        .sort((a, b) => Number(a) - Number(b))
        .flatMap((k) => normalizeListValue(o[k]));
    }
    const single = itemToParsed(o);
    return single ? [single] : [];
  }

  const fallback = itemToParsed(value);
  return fallback ? [fallback] : [];
}

export function isHtmlContent(text: string): boolean {
  return /^\s*</.test(text) && /<[a-z][\s\S]*>/i.test(text);
}

/** Minimal sanitization for CMS HTML (Rowy rich text export) */
export function sanitizeRichHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\s on\w+="[^"]*"/gi, '')
    .replace(/\s on\w+='[^']*'/gi, '');
}
