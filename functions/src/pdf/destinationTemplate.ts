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
        gettingThere: 'Cómo llegar',
        activities: 'Qué hacer',
        packing: 'Qué empacar',
        pricing: 'Costos orientativos',
        aiTip: 'Tip del guía',
        seal1: 'Ficha verificada',
        seal2: 'Hidden Premium',
        verified: 'Catálogo curado · 0% comisión',
    },
    en: {
        badge: 'Hidden Guide',
        about: 'About this place',
        gettingThere: 'Getting there',
        activities: 'What to do',
        packing: 'What to pack',
        pricing: 'Price guide',
        aiTip: 'Guide tip',
        seal1: 'Verified listing',
        seal2: 'Hidden Premium',
        verified: 'Curated catalog · 0% commission',
    },
} as const;

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
        .ai-tip-block {
            margin-top: 20px;
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

function renderPacking(summary: string, guide: unknown): string {
    const parts: string[] = [];
    if (summary) {
        parts.push(`<p class="prose">${escapeHtml(summary)}</p>`);
    }
    if (Array.isArray(guide)) {
        for (const cat of guide.slice(0, 6)) {
            const c = cat as Row;
            const name = String(c.categoria ?? c.category ?? '');
            const items = Array.isArray(c.items) ? c.items : [];
            const lines = items
                .slice(0, 8)
                .map((it) => {
                    const row = it as Row;
                    return String(row.nombre ?? row.name ?? '');
                })
                .filter(Boolean);
            if (lines.length) {
                parts.push(
                    `<div class="card"><div class="card-label">${escapeHtml(name)}</div>${renderList(lines)}</div>`
                );
            }
        }
    }
    return parts.join('');
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
    const activities = Array.isArray(destination.activities)
        ? destination.activities.map(String).filter(Boolean)
        : [];
    const gettingThere = Array.isArray(destination.gettingThere)
        ? (destination.gettingThere as Row[])
        : [];
    const pricingGuide = Array.isArray(destination.pricingGuide)
        ? (destination.pricingGuide as Row[])
        : [];
    const aiTip = String(destination.aiTip || '');
    const heroImage = String(destination.heroImage || destination.image || '').trim();

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
        </section>

        <div class="dest-section">
        ${description ? `<div class="section-title">${L.about}</div><p class="prose">${escapeHtml(description)}</p>` : ''}

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
            destination.packingSummary || destination.packingGuide
                ? `<div class="section-title">${L.packing}</div>${renderPacking(
                      String(destination.packingSummary || ''),
                      destination.packingGuide
                  )}`
                : ''
        }

        ${
            pricingGuide.length
                ? `<div class="section-title">${L.pricing}</div><div class="card">${renderPricing(pricingGuide, lang)}</div>`
                : ''
        }

        ${
            aiTip
                ? `<div class="ai-tip-block tip-box"><div class="tip-label">${L.aiTip}</div><p class="prose">${escapeHtml(aiTip)}</p></div>`
                : ''
        }
        </div>

        ${pdfFooter(lang, L.seal1, L.seal2)}
    `;

    return wrapPdfDocument(title, lang, body, destinationPdfStyles());
}
