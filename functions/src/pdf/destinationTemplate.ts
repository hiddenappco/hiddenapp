import type { PackingCategory } from '../lib/packingGuide';
import {
    escapeHtml,
    pdfFooter,
    pdfHeader,
    pdfHeroStyles,
    wrapPdfDocument,
    type PdfLanguage,
} from './shared';

type Row = Record<string, unknown>;

const LABELS = {
    es: {
        badge: 'Guía Hidden',
        about: 'Sobre este destino',
        planning: 'Planificación y logística',
        statsHiking: 'Dificultad de caminata',
        statsSignal: 'Señal móvil',
        statsTemp: 'Clima típico',
        coordinates: 'Ubicación GPS',
        openMap: 'Abrir en Google Maps',
        gettingThere: 'Cómo llegar',
        activities: 'Qué hacer',
        packing: 'Qué empacar',
        packingEssential: 'Esencial',
        packingRecommended: 'Recomendado',
        packingOptional: 'Opcional',
        pricing: 'Costos orientativos',
        aiTip: 'Tip del guía',
        seal1: 'Ficha verificada',
        seal2: 'Hidden Premium',
        verified: 'Catálogo curado · 0% comisión',
        planningRefGettingThere: 'Consulta la sección «Cómo llegar».',
        statusOpen: 'Abierto',
        statusClosed: 'Cerrado temporalmente',
    },
    en: {
        badge: 'Hidden Guide',
        about: 'About this place',
        planning: 'Planning & logistics',
        statsHiking: 'Hiking difficulty',
        statsSignal: 'Mobile signal',
        statsTemp: 'Typical weather',
        coordinates: 'GPS location',
        openMap: 'Open in Google Maps',
        gettingThere: 'Getting there',
        activities: 'What to do',
        packing: 'What to pack',
        packingEssential: 'Essential',
        packingRecommended: 'Recommended',
        packingOptional: 'Optional',
        pricing: 'Price guide',
        aiTip: 'Guide tip',
        seal1: 'Verified listing',
        seal2: 'Hidden Premium',
        verified: 'Curated catalog · 0% commission',
        planningRefGettingThere: 'See the «Getting there» section.',
        statusOpen: 'Open',
        statusClosed: 'Temporarily closed',
    },
} as const;

type LabelSet = (typeof LABELS)[PdfLanguage];

function formatCop(amount: unknown, lang: PdfLanguage): string {
    const n = Number(amount);
    if (!Number.isFinite(n)) return '';
    return new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
    }).format(n);
}

function destinationPdfStyles(): string {
    return `${pdfHeroStyles()}
        .dest-section {
            margin-top: 4px;
        }
        .stats-grid {
            display: grid;
            gap: 10px;
            margin-top: 4px;
            margin-bottom: 22px;
        }
        .stats-grid.cols-1 { grid-template-columns: 1fr; max-width: 220px; }
        .stats-grid.cols-2 { grid-template-columns: repeat(2, 1fr); }
        .stats-grid.cols-3 { grid-template-columns: repeat(3, 1fr); }
        .stat-card {
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.06);
            border-radius: 12px;
            padding: 12px 10px;
            text-align: center;
            break-inside: avoid;
        }
        .stat-label {
            font-size: 8px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            margin-bottom: 6px;
            line-height: 1.3;
        }
        .stat-value {
            font-size: 12px;
            font-weight: 800;
            color: #f1f5f9;
        }
        .coords-row {
            font-size: 11px;
            color: #94a3b8;
            margin-top: 8px;
            line-height: 1.5;
        }
        .coords-row a {
            color: #ff6c52;
            text-decoration: none;
            font-weight: 700;
        }
        .planning-block {
            background: rgba(255,255,255,0.02);
            border: 1px solid rgba(255,255,255,0.06);
            border-radius: 12px;
            padding: 14px 16px;
            margin-bottom: 4px;
            break-inside: avoid;
        }
        .planning-row + .planning-row {
            margin-top: 10px;
            padding-top: 10px;
            border-top: 1px solid rgba(255,255,255,0.04);
        }
        .planning-label {
            font-size: 8px;
            font-weight: 800;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 4px;
        }
        .planning-value {
            font-size: 11px;
            line-height: 1.6;
            color: #cbd5e1;
            word-wrap: break-word;
        }
        .planning-block .prose {
            white-space: pre-wrap;
            font-size: 11px;
            line-height: 1.65;
        }
        .card-packing {
            break-inside: avoid;
            page-break-inside: avoid;
        }
        .pricing-card {
            break-inside: avoid;
            page-break-inside: avoid;
            margin-bottom: 8px;
        }
        .activity-title {
            color: #e2e8f0;
            font-weight: 700;
        }
        .pack-item {
            display: flex;
            gap: 8px;
            align-items: flex-start;
            font-size: 11px;
            line-height: 1.45;
            margin-bottom: 6px;
        }
        .pack-priority {
            flex-shrink: 0;
            font-size: 7px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            padding: 2px 6px;
            border-radius: 100px;
            margin-top: 2px;
        }
        .pack-priority.essential {
            background: rgba(239,68,68,0.15);
            color: #fca5a5;
        }
        .pack-priority.recommended {
            background: rgba(59,130,246,0.15);
            color: #93c5fd;
        }
        .pack-priority.optional {
            background: rgba(148,163,184,0.12);
            color: #94a3b8;
        }
        .pack-note {
            display: block;
            font-size: 10px;
            color: #64748b;
            margin-top: 2px;
        }
        .ai-tip-block {
            margin-top: 20px;
        }
        .status-pill {
            display: inline-block;
            font-size: 8px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            padding: 4px 10px;
            border-radius: 100px;
            margin-bottom: 12px;
        }
        .status-pill.open {
            background: rgba(34,197,94,0.12);
            color: #86efac;
            border: 1px solid rgba(34,197,94,0.25);
        }
        .status-pill.closed {
            background: rgba(239,68,68,0.1);
            color: #fca5a5;
            border: 1px solid rgba(239,68,68,0.2);
        }
        .meta-pill.location {
            max-width: 52%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
    `;
}

function formatActivityItem(item: string): string {
    const idx = item.indexOf(':');
    if (idx > 0 && idx < 72) {
        const title = item.slice(0, idx).trim();
        const desc = item.slice(idx + 1).trim();
        if (title && desc) {
            return `<li><span class="bullet"></span><span><strong class="activity-title">${escapeHtml(title)}</strong>: ${escapeHtml(desc)}</span></li>`;
        }
    }
    return `<li><span class="bullet"></span><span>${escapeHtml(item)}</span></li>`;
}

function renderList(items: string[]): string {
    if (!items.length) return '';
    return `<ul class="list">${items
        .slice(0, 20)
        .map((item) => formatActivityItem(item))
        .join('')}</ul>`;
}

function renderGettingThere(rows: Row[]): string {
    if (!rows.length) return '';
    return rows
        .slice(0, 12)
        .map((g) => {
            const mode = String(g.modalidad ?? g.mode ?? '');
            const text = String(g.instrucciones ?? g.instructions ?? '');
            return `<div class="card"><div class="card-label">${escapeHtml(mode)}</div><div class="card-value">${escapeHtml(text)}</div></div>`;
        })
        .join('');
}

function renderPricing(rows: Row[], lang: PdfLanguage): string {
    if (!rows.length) return '';
    return rows
        .slice(0, 16)
        .map((p) => {
            const cat = String(p.categoria ?? p.category ?? '');
            const item = String(p.item ?? '');
            const min = p.precio_min ?? p.min;
            const max = p.precio_max ?? p.max;
            const range =
                min != null && max != null
                    ? `${formatCop(min, lang)} – ${formatCop(max, lang)}`
                    : formatCop(min ?? max, lang);
            return `<div class="price-row"><span>${escapeHtml(cat)} · ${escapeHtml(item)}</span><strong>${range}</strong></div>`;
        })
        .join('');
}

function priorityLabel(prioridad: string, L: LabelSet): string {
    const p = prioridad.toLowerCase();
    if (p === 'esencial' || p === 'essential') return L.packingEssential;
    if (p === 'opcional' || p === 'optional') return L.packingOptional;
    return L.packingRecommended;
}

function priorityClass(prioridad: string): string {
    const p = prioridad.toLowerCase();
    if (p === 'esencial' || p === 'essential') return 'essential';
    if (p === 'opcional' || p === 'optional') return 'optional';
    return 'recommended';
}

function renderPacking(summary: string, guide: unknown, lang: PdfLanguage): string {
    const L = LABELS[lang];
    const parts: string[] = [];
    if (summary) {
        parts.push(`<p class="prose">${escapeHtml(summary)}</p>`);
    }
    if (Array.isArray(guide)) {
        for (const cat of (guide as PackingCategory[]).slice(0, 8)) {
            const name = String(cat.categoria || '');
            const items = Array.isArray(cat.items) ? cat.items : [];
            if (!name || items.length === 0) continue;

            const itemRows = items
                .slice(0, 12)
                .map((item) => {
                    const prioridad = String(item.prioridad || 'recomendado');
                    const nota = item.nota ? `<span class="pack-note">${escapeHtml(item.nota)}</span>` : '';
                    return `<div class="pack-item">
                        <span class="pack-priority ${priorityClass(prioridad)}">${escapeHtml(priorityLabel(prioridad, L))}</span>
                        <span>${escapeHtml(item.nombre)}${nota}</span>
                    </div>`;
                })
                .join('');

            parts.push(
                `<div class="card card-packing"><div class="card-label">${escapeHtml(name)}</div>${itemRows}</div>`
            );
        }
    }
    return parts.join('');
}

function renderStats(stats: Row, L: LabelSet): string {
    const hiking = String(stats.hiking || '').trim();
    const signal = String(stats.signal || '').trim();
    const temp = String(stats.temp || '').trim();
    if (!hiking && !signal && !temp) return '';

    const cell = (label: string, value: string) =>
        value && value !== '--'
            ? `<div class="stat-card"><div class="stat-label">${escapeHtml(label)}</div><div class="stat-value">${escapeHtml(value)}</div></div>`
            : '';

    const cells = [
        cell(L.statsHiking, hiking),
        cell(L.statsSignal, signal),
        cell(L.statsTemp, temp),
    ].filter(Boolean);

    if (!cells.length) return '';
    const colClass = cells.length === 1 ? 'cols-1' : cells.length === 2 ? 'cols-2' : 'cols-3';
    return `<div class="stats-grid ${colClass}">${cells.join('')}</div>`;
}

function renderCoordinates(coords: Row | null, location: string, title: string, L: LabelSet): string {
    const lat = Number(coords?.lat);
    const lng = Number(coords?.lng);
    const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
    const query = hasCoords
        ? `${lat},${lng}`
        : encodeURIComponent(`${location} ${title}`.trim());
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;

    if (!hasCoords && !location) return '';

    return `<div class="coords-row">
        ${hasCoords ? `<strong>${escapeHtml(L.coordinates)}:</strong> ${lat.toFixed(5)}, ${lng.toFixed(5)}<br/>` : ''}
        <a href="${escapeHtml(mapUrl)}">${escapeHtml(L.openMap)}</a>
    </div>`;
}

function isDestinationOpen(status: unknown): boolean {
    return status === true || status === 'Abierto' || status === 'open' || status === 'Open';
}

function shortenLocationForPdf(location: string, maxLen = 52): string {
    const trimmed = location.trim();
    if (trimmed.length <= maxLen) return trimmed;
    const firstSegment = trimmed.split(',')[0]?.trim() || trimmed;
    if (firstSegment.length <= maxLen) return firstSegment;
    return `${trimmed.slice(0, maxLen - 1).trim()}…`;
}

function sanitizePlanningNotesForPdf(text: string, lang: PdfLanguage, L: LabelSet): string {
    let s = text;
    if (lang === 'es') {
        s = s.replace(/Ver\s+['"]?gettingThere['"]?\.?/gi, L.planningRefGettingThere);
        s = s.replace(/\bel agente debe programar\b/gi, 'Se recomienda programar');
        s = s.replace(/\bel agente debe sugerir\b/gi, 'Conviene sugerir');
        s = s.replace(/\bel agente debe\b/gi, 'Se recomienda');
    } else {
        s = s.replace(/See\s+['"]?gettingThere['"]?\.?/gi, L.planningRefGettingThere);
        s = s.replace(/\bthe agent should schedule\b/gi, 'We recommend scheduling');
        s = s.replace(/\bthe agent should suggest\b/gi, 'We recommend suggesting');
        s = s.replace(/\bthe agent should\b/gi, 'We recommend');
    }
    return s;
}

function renderPlanningNotes(text: string, lang: PdfLanguage, L: LabelSet): string {
    const sanitized = sanitizePlanningNotesForPdf(text, lang, L);
    const lines = sanitized.split(/\n+/).map((line) => line.trim()).filter(Boolean);
    const rows: string[] = [];

    for (const line of lines) {
        const colonIdx = line.indexOf(':');
        if (colonIdx > 0 && colonIdx < 48) {
            const label = line.slice(0, colonIdx).trim();
            const value = line.slice(colonIdx + 1).trim();
            if (label && value) {
                rows.push(
                    `<div class="planning-row"><div class="planning-label">${escapeHtml(label)}</div><div class="planning-value">${escapeHtml(value)}</div></div>`
                );
                continue;
            }
        }
        rows.push(`<p class="prose">${escapeHtml(line)}</p>`);
    }

    return `<div class="planning-block">${rows.join('')}</div>`;
}

export function generateDestinationPdfHtml(
    destination: Row,
    departmentName: string,
    lang: PdfLanguage
): string {
    const L = LABELS[lang];
    const title = String(destination.title || destination.name || '');
    const location = String(destination.location || '').trim();
    const description = String(destination.description || '');
    const planningNotes = String(destination.planningNotes || '').trim();
    const activities = Array.isArray(destination.activities)
        ? destination.activities.map(String).filter(Boolean)
        : [];
    const gettingThere = Array.isArray(destination.gettingThere)
        ? (destination.gettingThere as Row[])
        : [];
    const pricingGuide = Array.isArray(destination.pricingGuide)
        ? (destination.pricingGuide as Row[])
        : [];
    const packingGuide = destination.packingGuide;
    const packingSummary = String(destination.packingSummary || '');
    const packingHtml = renderPacking(packingSummary, packingGuide, lang);
    const aiTip = String(destination.aiTip || '');
    const stats = (destination.stats as Row) || {};
    const coordinates = (destination.coordinates as Row | null) || null;
    const isOpen = isDestinationOpen(destination.status);

    const locationShort = location ? shortenLocationForPdf(location) : '';

    const metaPills = [
        `<span class="meta-pill">${escapeHtml(departmentName)}</span>`,
        ...(locationShort
            ? [`<span class="meta-pill accent location">${escapeHtml(locationShort)}</span>`]
            : []),
    ].join('');

    const body = `
        ${pdfHeader(L.badge)}
        <section class="pdf-hero">
            <div class="pdf-meta-row">${metaPills}</div>
            <h1 class="pdf-hero-title">${escapeHtml(title)}</h1>
            <span class="status-pill ${isOpen ? 'open' : 'closed'}">${escapeHtml(isOpen ? L.statusOpen : L.statusClosed)}</span>
            ${renderCoordinates(coordinates, location, title, L)}
        </section>

        <div class="dest-section">
        ${description ? `<div class="section-title">${L.about}</div><p class="prose">${escapeHtml(description)}</p>` : ''}

        ${renderStats(stats, L)}

        ${
            aiTip
                ? `<div class="tip-box"><div class="tip-label">${L.aiTip}</div><p class="prose">${escapeHtml(aiTip)}</p></div>`
                : ''
        }

        ${
            gettingThere.length
                ? `<div class="section-title">${L.gettingThere}</div>${renderGettingThere(gettingThere)}`
                : ''
        }

        ${
            activities.length
                ? `<div class="section-title">${L.activities}</div>${renderList(activities)}`
                : ''
        }

        ${
            planningNotes
                ? `<div class="section-title">${L.planning}</div>${renderPlanningNotes(planningNotes, lang, L)}`
                : ''
        }

        ${packingHtml ? `<div class="section-title">${L.packing}</div>${packingHtml}` : ''}

        ${
            pricingGuide.length
                ? `<div class="section-title">${L.pricing}</div><div class="card pricing-card">${renderPricing(pricingGuide, lang)}</div>`
                : ''
        }
        </div>

        ${pdfFooter(lang, L.seal1, L.seal2)}
    `;

    return wrapPdfDocument(title, lang, body, destinationPdfStyles());
}
