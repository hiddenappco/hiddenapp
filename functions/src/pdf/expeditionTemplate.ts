import { escapeHtml, pdfFooter, pdfHeader, pdfHeroStyles, wrapPdfDocument, type PdfLanguage } from './shared';

type Row = Record<string, unknown>;

const LABELS = {
    es: {
        badge: 'Plan de expedición',
        days: 'días',
        budget: 'Presupuesto estimado',
        perPerson: 'Por persona',
        day: 'Día',
        stops: 'Parada',
        overnight: 'Pernocta',
        tips: 'Tips',
        coupons: 'Cupones Hidden',
        packing: 'Equipaje sugerido',
        curator: 'Nota del curador',
        travel: 'Trayecto',
        seal1: 'Itinerario',
        seal2: 'Hidden Planner',
        disclaimer: 'Estimación orientativa · verifica horarios en terreno',
        mobility: 'Transporte',
        mobilityPrivate: 'Vehículo propio',
        mobilityPublic: 'Transporte público',
        mobilityMixed: 'Mixto',
        restDay: 'Día de transición o descanso',
        restWithTips: 'Día ligero',
        directImpact: 'Impacto directo',
        directToHost: '{range} al anfitrión verificado',
        directPercent: '{percent}% documentado en catálogo',
    },
    en: {
        badge: 'Expedition plan',
        days: 'days',
        budget: 'Estimated budget',
        perPerson: 'Per person',
        day: 'Day',
        stops: 'Stop',
        overnight: 'Overnight',
        tips: 'Tips',
        coupons: 'Hidden coupons',
        packing: 'Suggested packing',
        curator: 'Curator note',
        travel: 'Leg',
        seal1: 'Itinerary',
        seal2: 'Hidden Planner',
        disclaimer: 'Indicative estimate · verify schedules on the ground',
        mobility: 'Transport',
        mobilityPrivate: 'Private vehicle',
        mobilityPublic: 'Public transport',
        mobilityMixed: 'Mixed',
        restDay: 'Transition or rest day',
        restWithTips: 'Light day',
        directImpact: 'Direct impact',
        directToHost: '{range} to verified host',
        directPercent: '{percent}% documented in catalog',
    },
} as const;

function expeditionPdfStyles(): string {
    return `${pdfHeroStyles()}
        .day-block {
            margin-bottom: 18px;
            break-inside: avoid;
            page-break-inside: avoid;
        }
        .day-block + .day-block {
            margin-top: 4px;
        }
        .day-header {
            display: flex;
            align-items: baseline;
            gap: 10px;
            margin-bottom: 10px;
            padding-bottom: 8px;
            border-bottom: 1px solid rgba(255,255,255,0.05);
            break-after: avoid;
        }
        .day-num {
            flex-shrink: 0;
            font-size: 11px;
            font-weight: 900;
            color: #ff6c52;
            background: rgba(255,108,82,0.12);
            border: 1px solid rgba(255,108,82,0.22);
            border-radius: 8px;
            padding: 4px 10px;
            letter-spacing: 0.02em;
        }
        .day-title {
            font-size: 13px;
            font-weight: 700;
            color: #e2e8f0;
            line-height: 1.35;
            word-wrap: break-word;
        }
        .day-body {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .stop-card {
            background: rgba(255,255,255,0.025);
            border: 1px solid rgba(255,255,255,0.06);
            border-radius: 12px;
            padding: 12px 14px;
            break-inside: avoid;
        }
        .stop-name {
            font-size: 12.5px;
            font-weight: 800;
            color: #f1f5f9;
            margin-bottom: 4px;
            line-height: 1.35;
        }
        .stop-plan {
            font-size: 11px;
            line-height: 1.6;
            color: #cbd5e1;
            margin-top: 6px;
            word-wrap: break-word;
            hyphens: auto;
        }
        .travel-line {
            font-size: 9.5px;
            font-weight: 700;
            color: #64748b;
            margin-top: 8px;
            letter-spacing: 0.02em;
        }
        .travel-segment {
            font-size: 9.5px;
            font-weight: 600;
            color: #64748b;
            margin: 3px 0 0;
            line-height: 1.45;
            display: flex;
            align-items: center;
        }
        .travel-segments {
            margin-top: 8px;
        }
        .seg-dot {
            display: inline-block;
            width: 6px;
            height: 6px;
            border-radius: 50%;
            margin-right: 6px;
            flex-shrink: 0;
        }
        .refugio-card {
            background: rgba(99,102,241,0.06);
            border: 1px solid rgba(99,102,241,0.18);
            border-radius: 12px;
            padding: 12px 14px;
            break-inside: avoid;
        }
        .refugio-name {
            font-size: 12px;
            font-weight: 700;
            color: #c7d2fe;
            line-height: 1.4;
        }
        .refugio-note {
            font-size: 10.5px;
            line-height: 1.55;
            color: #94a3b8;
            margin-top: 6px;
            word-wrap: break-word;
        }
        .rest-label {
            font-size: 10.5px;
            font-weight: 600;
            color: #64748b;
            font-style: italic;
            padding: 4px 0 2px;
        }
        .itinerary-section {
            margin-top: 8px;
        }
        .packing-block, .curator-block {
            margin-top: 20px;
            break-inside: avoid;
        }
        .esg-block {
            margin-top: 8px;
            padding: 8px 10px;
            border-radius: 8px;
            background: rgba(16, 185, 129, 0.08);
            border: 1px solid rgba(16, 185, 129, 0.22);
            break-inside: avoid;
        }
        .esg-label {
            font-size: 8px;
            font-weight: 800;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #6ee7b7;
            margin-bottom: 4px;
        }
        .esg-amount {
            font-size: 10px;
            font-weight: 700;
            color: #d1fae5;
            line-height: 1.45;
        }
        .esg-note {
            font-size: 9px;
            color: #94a3b8;
            margin-top: 4px;
            line-height: 1.4;
        }
    `;
}

function mobilityLabel(mode: string | undefined, lang: PdfLanguage): string {
    const L = LABELS[lang];
    if (mode === 'public_transport') return L.mobilityPublic;
    if (mode === 'mixed') return L.mobilityMixed;
    if (mode === 'private_vehicle') return L.mobilityPrivate;
    return '';
}

function formatCop(amount: number, lang: PdfLanguage): string {
    return new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
    }).format(amount);
}

function formatDirectCommunityRange(
    amount: { minCop: number; maxCop: number },
    lang: PdfLanguage
): string {
    if (amount.minCop === amount.maxCop) return formatCop(amount.minCop, lang);
    return `${formatCop(amount.minCop, lang)} – ${formatCop(amount.maxCop, lang)}`;
}

function renderRefugioEsg(refugio: Row, lang: PdfLanguage): string {
    const dc = refugio.directCommunity as Row | undefined;
    if (!dc) return '';
    const minCop = Number(dc.minCop);
    const maxCop = Number(dc.maxCop);
    const hostSharePercent = Number(dc.hostSharePercent);
    if (!Number.isFinite(minCop) || !Number.isFinite(maxCop) || !Number.isFinite(hostSharePercent)) {
        return '';
    }
    const L = LABELS[lang];
    const range = formatDirectCommunityRange({ minCop, maxCop }, lang);
    return `<div class="esg-block">
        <div class="esg-label">${L.directImpact}</div>
        <p class="esg-amount">${escapeHtml(L.directToHost.replace('{range}', range))}</p>
        <p class="esg-note">${escapeHtml(L.directPercent.replace('{percent}', String(hostSharePercent)))}</p>
    </div>`;
}

// Chromium in Cloud Functions (@sparticuz/chromium) ships no emoji font, so we
// use font-independent colored dots to differentiate travel modes in the PDF.
function segmentPdfColor(kind: string): string {
    switch (kind) {
        case 'driving':
            return '#60a5fa';
        case 'walking':
            return '#34d399';
        case 'transit':
            return '#fbbf24';
        case 'boat':
            return '#38bdf8';
        case 'horse':
            return '#f59e0b';
        default:
            return '#94a3b8';
    }
}

function formatSegmentLinePdf(seg: Row): string {
    const mode = String(seg.mode || '').trim();
    const dur = String(seg.durationText || '').trim();
    const dist = String(seg.distanceText || '').trim();
    if (mode && dur) {
        const base = `${dur} · ${mode}`;
        return dist ? `${base} (${dist})` : base;
    }
    if (dur) return dist ? `${dur} · ${dist}` : dur;
    return mode;
}

function renderStopTravelHtml(s: Row, lang: PdfLanguage): string {
    const L = LABELS[lang];
    const segments = Array.isArray(s.travelSegments) ? (s.travelSegments as Row[]) : [];
    if (segments.length > 0) {
        const lines = segments
            .map((seg) => {
                const color = segmentPdfColor(String(seg.kind || ''));
                const text = formatSegmentLinePdf(seg);
                if (!text) return '';
                return `<p class="travel-segment"><span class="seg-dot" style="background:${color}"></span>${escapeHtml(text)}</p>`;
            })
            .filter(Boolean)
            .join('');
        if (lines) return `<div class="travel-segments"><div class="card-label">${L.travel}</div>${lines}</div>`;
    }

    const travel = s.travel as Row | null;
    const travelParts = [travel?.durationText, travel?.distanceText]
        .map((v) => String(v || '').trim())
        .filter(Boolean);
    return travelParts.length > 0
        ? `<p class="travel-line">${L.travel}: ${escapeHtml(travelParts.join(' · '))}</p>`
        : '';
}

function renderDay(day: Row, lang: PdfLanguage): string {
    const L = LABELS[lang];
    const dayNum = Number(day.day) || 0;
    const title = String(day.title || '').trim();
    const stops = Array.isArray(day.stops) ? (day.stops as Row[]) : [];
    const refugio = day.refugio as Row | null;
    const refugioNote = String(day.refugioNote || '').trim();
    const tips = String(day.tips || '').trim();
    const coupons = Array.isArray(day.coupons) ? (day.coupons as Row[]) : [];

    const stopsHtml = stops
        .map((s) => {
            const travelHtml = renderStopTravelHtml(s, lang);
            return `<div class="stop-card">
                <div class="card-label">${L.stops}</div>
                <div class="stop-name">${escapeHtml(String(s.name || ''))}</div>
                ${s.plan ? `<p class="stop-plan">${escapeHtml(String(s.plan))}</p>` : ''}
                ${travelHtml}
            </div>`;
        })
        .join('');

    const refugioHtml =
        refugio?.name
            ? `<div class="refugio-card">
                <div class="card-label">${L.overnight}</div>
                <div class="refugio-name">${escapeHtml(String(refugio.name))}</div>
                ${refugioNote ? `<p class="refugio-note">${escapeHtml(refugioNote)}</p>` : ''}
                ${renderRefugioEsg(refugio, lang)}
            </div>`
            : '';

    const couponsHtml =
        coupons.length > 0
            ? `<div class="stop-card"><div class="card-label">${L.coupons}</div>${coupons
                  .map(
                      (c) =>
                          `<div class="price-row"><span>${escapeHtml(String(c.title || ''))}</span><strong>${escapeHtml(String(c.discount || ''))}</strong></div>`
                  )
                  .join('')}</div>`
            : '';

    const hasStops = stops.length > 0 || Boolean(refugio?.name) || coupons.length > 0;
    const isLightDay = !hasStops && Boolean(tips);

    let bodyHtml = '';
    if (hasStops) {
        bodyHtml = stopsHtml + refugioHtml + couponsHtml;
    } else if (isLightDay) {
        bodyHtml = `<p class="rest-label">${L.restWithTips}</p>`;
    } else {
        bodyHtml = `<p class="rest-label">${L.restDay}</p>`;
    }

    return `
        <div class="day-block">
            <div class="day-header">
                <span class="day-num">${L.day} ${dayNum}</span>
                ${title ? `<span class="day-title">${escapeHtml(title)}</span>` : ''}
            </div>
            <div class="day-body">
                ${bodyHtml}
                ${tips ? `<div class="tip-box"><div class="tip-label">${L.tips}</div><p class="prose">${escapeHtml(tips)}</p></div>` : ''}
            </div>
        </div>
    `;
}

export function generateExpeditionPdfHtml(
    itinerary: Row,
    meta: {
        departmentName: string;
        days: number;
        language: PdfLanguage;
        groundMobility?: string;
    }
): string {
    const lang = meta.language;
    const L = LABELS[lang];
    const title = String(itinerary.title || 'Expedición Hidden');
    const summary = String(itinerary.summary || '').trim();
    const days = Array.isArray(itinerary.days) ? (itinerary.days as Row[]) : [];
    const budget = itinerary.budgetEstimate as Row | undefined;
    const packing = String(itinerary.packing || '').trim();
    const curatorNote = String(itinerary.curatorNote || '').trim();
    const travelContext = (itinerary.travelContext as Row | undefined) ?? {};
    const mobility =
        String(meta.groundMobility || travelContext.groundMobility || '').trim() || undefined;
    const mobilityText = mobility ? mobilityLabel(mobility, lang) : '';

    const metaPills = [
        `<span class="meta-pill">${escapeHtml(meta.departmentName)}</span>`,
        `<span class="meta-pill">${meta.days} ${L.days}</span>`,
        ...(mobilityText ? [`<span class="meta-pill accent">${escapeHtml(mobilityText)}</span>`] : []),
    ].join('');

    let budgetHtml = '';
    const budgetMin = budget ? Number(budget.totalMin) : NaN;
    const budgetMax = budget ? Number(budget.totalMax) : NaN;
    if (budget && Number.isFinite(budgetMin) && Number.isFinite(budgetMax)) {
        const ppMin = Number(budget.perPersonMin);
        const ppMax = Number(budget.perPersonMax);
        const hasPerPerson = Number.isFinite(ppMin) && Number.isFinite(ppMax);
        budgetHtml = `
            <div class="card budget-card">
                <div class="card-label">${L.budget}</div>
                <div class="budget-amount">${formatCop(budgetMin, lang)} – ${formatCop(budgetMax, lang)}</div>
                ${
                    hasPerPerson
                        ? `<p class="footer-text" style="margin-top:6px;">${L.perPerson}: ${formatCop(ppMin, lang)} – ${formatCop(ppMax, lang)}</p>`
                        : ''
                }
                ${budget.narrative ? `<p class="prose" style="margin-top:10px;">${escapeHtml(String(budget.narrative))}</p>` : ''}
                <p class="footer-text" style="margin-top:8px;">${L.disclaimer}</p>
            </div>
        `;
    }

    const departmentCoupons = Array.isArray(itinerary.departmentCoupons)
        ? (itinerary.departmentCoupons as Row[])
        : [];
    const departmentCouponsHtml =
        departmentCoupons.length > 0
            ? `<div class="card"><div class="card-label">${L.coupons}</div>${departmentCoupons
                  .map(
                      (c) =>
                          `<div class="price-row"><span>${escapeHtml(String(c.title || ''))}</span><strong>${escapeHtml(String(c.discount || ''))}</strong></div>`
                  )
                  .join('')}</div>`
            : '';

    const body = `
        ${pdfHeader(L.badge)}
        <section class="pdf-hero">
            <div class="pdf-meta-row">${metaPills}</div>
            <h1 class="pdf-hero-title">${escapeHtml(title)}</h1>
            ${summary ? `<p class="pdf-hero-lead">${escapeHtml(summary)}</p>` : ''}
        </section>
        ${budgetHtml}
        ${departmentCouponsHtml}
        <div class="itinerary-section">
            ${days.map((d) => renderDay(d, lang)).join('')}
        </div>
        ${
            packing
                ? `<div class="packing-block"><div class="section-title">${L.packing}</div><p class="prose">${escapeHtml(packing)}</p></div>`
                : ''
        }
        ${
            curatorNote
                ? `<div class="curator-block tip-box"><div class="tip-label">${L.curator}</div><p class="prose">${escapeHtml(curatorNote)}</p></div>`
                : ''
        }
        ${pdfFooter(lang, L.seal1, L.seal2)}
    `;

    return wrapPdfDocument(title, lang, body, expeditionPdfStyles());
}
