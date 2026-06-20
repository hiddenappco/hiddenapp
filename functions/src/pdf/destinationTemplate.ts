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
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            margin-bottom: 4px;
        }
        .stat-card {
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.06);
            border-radius: 12px;
            padding: 12px 10px;
            text-align: center;
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
        }
        .planning-block .prose {
            white-space: pre-wrap;
            font-size: 11px;
            line-height: 1.65;
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
    `;
}

function renderList(items: string[]): string {
    if (!items.length) return '';
    return `<ul class="list">${items
        .map((item) => `<li><span class="bullet"></span><span>${escapeHtml(item)}</span></li>`)
        .join('')}</ul>`;
}

function renderGettingThere(rows: Row[]): string {
    if (!rows.length) return '';
    return rows
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
                `<div class="card"><div class="card-label">${escapeHtml(name)}</div>${itemRows}</div>`
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
    return `<div class="stats-grid">${cells.join('')}</div>`;
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
    const heroImage = String(destination.heroImage || destination.image || '').trim();
    const stats = (destination.stats as Row) || {};
    const coordinates = (destination.coordinates as Row | null) || null;
    const isOpen = isDestinationOpen(destination.status);

    const metaPills = [
        `<span class="meta-pill">${escapeHtml(departmentName)}</span>`,
        ...(location ? [`<span class="meta-pill accent">${escapeHtml(location)}</span>`] : []),
        `<span class="meta-pill">${escapeHtml(L.verified)}</span>`,
    ].join('');

    const body = `
        ${pdfHeader(L.badge)}
        ${heroImage ? `<img src="${escapeHtml(heroImage)}" class="hero-image" alt="" />` : ''}
        <section class="pdf-hero">
            <div class="pdf-meta-row">${metaPills}</div>
            <h1 class="pdf-hero-title">${escapeHtml(title)}</h1>
            <span class="status-pill ${isOpen ? 'open' : 'closed'}">${escapeHtml(isOpen ? L.statusOpen : L.statusClosed)}</span>
            ${renderCoordinates(coordinates, location, title, L)}
        </section>

        <div class="dest-section">
        ${description ? `<div class="section-title">${L.about}</div><p class="prose">${escapeHtml(description)}</p>` : ''}

        ${
            aiTip
                ? `<div class="tip-box" style="margin-top:16px"><div class="tip-label">${L.aiTip}</div><p class="prose">${escapeHtml(aiTip)}</p></div>`
                : ''
        }

        ${renderStats(stats, L)}

        ${
            planningNotes
                ? `<div class="section-title">${L.planning}</div><div class="planning-block"><p class="prose">${escapeHtml(planningNotes)}</p></div>`
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

        ${packingHtml ? `<div class="section-title">${L.packing}</div>${packingHtml}` : ''}

        ${
            pricingGuide.length
                ? `<div class="section-title">${L.pricing}</div><div class="card">${renderPricing(pricingGuide, lang)}</div>`
                : ''
        }
        </div>

        ${pdfFooter(lang, L.seal1, L.seal2)}
    `;

    return wrapPdfDocument(title, lang, body, destinationPdfStyles());
}
