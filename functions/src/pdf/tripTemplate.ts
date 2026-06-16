import {
    escapeHtml,
    pdfFooter,
    pdfHeader,
    pdfHeroStyles,
    wrapPdfDocument,
    type PdfLanguage,
} from './shared';
import {
    categoryLabels,
    computeTripBalances,
    simplifyTripSettlements,
} from './tripBalances';

const LABELS = {
    es: {
        traveler: 'Viajero',
        defaultCountry: 'Colombia',
        badge: 'Bitácora financiera',
        totalInvestment: 'Inversión total',
        transactions: 'Movimientos',
        transactionsUnit: 'registrados',
        avgSpend: 'Promedio',
        perTransaction: 'por movimiento',
        topCategory: 'Mayor rubro',
        percentOfTotal: '{percent}% del total',
        distribution: 'Distribución del gasto',
        detail: 'Detalle de movimientos',
        colCategory: 'Categoría',
        colDescription: 'Descripción',
        colAmount: 'Monto',
        colMember: 'Viajero',
        colPaidShare: 'Pagó / parte',
        colBalance: 'Balance',
        noDescription: 'Sin descripción',
        emptyExpenses: 'No hay movimientos registrados para esta expedición.',
        seal1: 'Reporte de',
        seal2: 'Finanzas compartidas',
        balancesTitle: 'Balances del grupo',
        balancesSubtitle: 'Quién debe a quién según lo registrado',
        paidShare: 'Pagó {paid} · Su parte {share}',
        settled: 'A mano',
        settlementsTitle: 'Pagos sugeridos',
        settlementLine: '{from} → {to}',
        groupTrip: 'Viaje en grupo',
        soloTrip: 'Viaje individual',
        na: 'N/D',
        currency: 'COP',
    },
    en: {
        traveler: 'Traveler',
        defaultCountry: 'Colombia',
        badge: 'Financial log',
        totalInvestment: 'Total spent',
        transactions: 'Transactions',
        transactionsUnit: 'recorded',
        avgSpend: 'Average',
        perTransaction: 'per transaction',
        topCategory: 'Top category',
        percentOfTotal: '{percent}% of total',
        distribution: 'Spending breakdown',
        detail: 'Transaction details',
        colCategory: 'Category',
        colDescription: 'Description',
        colAmount: 'Amount',
        colMember: 'Traveler',
        colPaidShare: 'Paid / share',
        colBalance: 'Balance',
        noDescription: 'No description',
        emptyExpenses: 'No transactions recorded for this trip.',
        seal1: 'Shared',
        seal2: 'finance report',
        balancesTitle: 'Group balances',
        balancesSubtitle: 'Who owes whom based on recorded expenses',
        paidShare: 'Paid {paid} · Share {share}',
        settled: 'Settled',
        settlementsTitle: 'Suggested payments',
        settlementLine: '{from} → {to}',
        groupTrip: 'Group trip',
        soloTrip: 'Solo trip',
        na: 'N/A',
        currency: 'COP',
    },
} as const;

const CATEGORY_COLORS: Record<string, string> = {
    food: '#f97316',
    transport: '#3b82f6',
    lodging: '#6366f1',
    tours: '#22c55e',
    shopping: '#ec4899',
    health: '#ef4444',
    entertainment: '#a855f7',
    tips: '#f59e0b',
    misc: '#6b7280',
};

function tripPdfStyles(): string {
    return `${pdfHeroStyles()}
        .trip-kpi-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 10px;
            margin-bottom: 24px;
        }
        .trip-kpi-card {
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.06);
            border-radius: 14px;
            padding: 16px 14px;
            text-align: center;
            break-inside: avoid;
        }
        .trip-kpi-card.primary {
            grid-column: span 3;
            background: linear-gradient(135deg, rgba(255,108,82,0.1), rgba(255,108,82,0.02));
            border-color: rgba(255,108,82,0.2);
            padding: 22px 18px;
        }
        .trip-kpi-label {
            font-size: 8.5px;
            font-weight: 800;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 8px;
        }
        .trip-kpi-value {
            font-size: 22px;
            font-weight: 900;
            letter-spacing: -0.02em;
            color: #f1f5f9;
            line-height: 1.15;
            word-wrap: break-word;
        }
        .trip-kpi-card.primary .trip-kpi-value {
            font-size: 34px;
            color: #ff6c52;
        }
        .trip-kpi-sub {
            font-size: 10px;
            color: #475569;
            font-weight: 600;
            margin-top: 4px;
        }
        .trip-section {
            margin-bottom: 22px;
        }
        .trip-section-lead {
            font-size: 11px;
            color: #64748b;
            margin: -6px 0 14px;
            line-height: 1.45;
        }
        .master-bar {
            width: 100%;
            height: 10px;
            background: rgba(255,255,255,0.04);
            border-radius: 5px;
            display: flex;
            overflow: hidden;
            margin-bottom: 14px;
            break-inside: avoid;
        }
        .master-segment { height: 100%; min-width: 2px; }
        .breakdown-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-bottom: 8px;
        }
        .cat-card {
            background: rgba(255,255,255,0.025);
            border: 1px solid rgba(255,255,255,0.06);
            border-radius: 12px;
            padding: 12px 14px;
            break-inside: avoid;
        }
        .cat-card-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;
        }
        .cat-dot {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            flex-shrink: 0;
        }
        .cat-name {
            font-size: 11px;
            font-weight: 700;
            color: #e2e8f0;
            flex: 1;
            line-height: 1.3;
        }
        .cat-percent {
            font-size: 10px;
            font-weight: 800;
            color: #94a3b8;
            flex-shrink: 0;
        }
        .cat-bar-bg {
            width: 100%;
            height: 5px;
            background: rgba(255,255,255,0.05);
            border-radius: 3px;
            overflow: hidden;
            margin-bottom: 6px;
        }
        .cat-bar-fill { height: 100%; border-radius: 3px; }
        .cat-total {
            font-size: 12px;
            font-weight: 800;
            color: #fff;
        }
        .expenses-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
            table-layout: fixed;
        }
        .expenses-table thead {
            display: table-header-group;
        }
        .expenses-table th {
            font-size: 8.5px;
            font-weight: 800;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            padding: 10px 8px;
            text-align: left;
            border-bottom: 1px solid rgba(255,255,255,0.08);
            break-after: avoid;
        }
        .expenses-table th.col-amount { text-align: right; }
        .expenses-table td {
            padding: 10px 8px;
            border-bottom: 1px solid rgba(255,255,255,0.04);
            font-size: 11px;
            vertical-align: top;
            word-wrap: break-word;
            hyphens: auto;
        }
        .expenses-table tr { break-inside: avoid; }
        .expenses-table .col-cat { width: 24%; }
        .expenses-table .col-note { width: 46%; }
        .expenses-table .col-amount { width: 30%; text-align: right; }
        .cat-badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 6px;
            font-size: 8px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.03em;
            line-height: 1.3;
            word-wrap: break-word;
        }
        .expense-note { color: #cbd5e1; font-weight: 500; }
        .expense-amount {
            text-align: right;
            font-weight: 800;
            color: #fff;
            white-space: nowrap;
            font-size: 11px;
        }
        .balance-positive { color: #4ade80; }
        .balance-negative { color: #f87171; }
        .balance-neutral { color: #94a3b8; }
        .empty-state {
            text-align: center;
            padding: 28px 16px;
            color: #64748b;
            font-size: 12px;
            font-weight: 600;
            border: 1px dashed rgba(255,255,255,0.08);
            border-radius: 12px;
            break-inside: avoid;
        }
        .detail-section {
            margin-top: 8px;
        }
    `;
}

function formatCop(amount: number, lang: PdfLanguage): string {
    return new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
    }).format(amount);
}

function labelReplace(template: string, vars: Record<string, string | number>): string {
    let out = template;
    for (const [k, v] of Object.entries(vars)) {
        out = out.replace(`{${k}}`, String(v));
    }
    return out;
}

export function generateTripPdfHtml(
    trip: Record<string, unknown>,
    expenses: Array<Record<string, unknown>>,
    totalSpent: number,
    lang: PdfLanguage = 'es'
): string {
    const L = LABELS[lang];
    const cats = categoryLabels(lang);
    const formattedTotal = formatCop(totalSpent, lang);
    const tripName = String(trip.name || '').trim() || (lang === 'en' ? 'Trip' : 'Viaje');
    const tripLocation = String(trip.location || L.defaultCountry).trim();
    const tripDate = String(trip.date || '').trim();
    const capitalizedDate = tripDate ? tripDate.charAt(0).toUpperCase() + tripDate.slice(1) : '';
    const isGroup = trip.type === 'group';

    const stats = Object.keys(cats)
        .map((catKey) => {
            const catTotal = expenses
                .filter((e) => e.category === catKey)
                .reduce((a, c) => a + (Number(c.amount) || 0), 0);
            const percent = totalSpent > 0 ? (catTotal / totalSpent) * 100 : 0;
            return {
                key: catKey,
                label: cats[catKey],
                color: CATEGORY_COLORS[catKey] || '#6b7280',
                total: catTotal,
                percent: Math.round(percent),
            };
        })
        .filter((s) => s.total > 0)
        .sort((a, b) => b.percent - a.percent);

    const totalTransactions = expenses.length;
    const avgTransaction = totalTransactions > 0 ? totalSpent / totalTransactions : 0;
    const topCategory = stats.length > 0 ? stats[0] : null;

    const metaPills = [
        `<span class="meta-pill accent">${escapeHtml(tripLocation)}</span>`,
        ...(capitalizedDate ? [`<span class="meta-pill">${escapeHtml(capitalizedDate)}</span>`] : []),
        `<span class="meta-pill">${escapeHtml(isGroup ? L.groupTrip : L.soloTrip)}</span>`,
    ].join('');

    const categoryCards = stats
        .map(
            (s) => `
        <div class="cat-card">
            <div class="cat-card-header">
                <div class="cat-dot" style="background:${s.color};"></div>
                <span class="cat-name">${escapeHtml(s.label)}</span>
                <span class="cat-percent">${s.percent}%</span>
            </div>
            <div class="cat-bar-bg">
                <div class="cat-bar-fill" style="width:${s.percent}%;background:${s.color};"></div>
            </div>
            <span class="cat-total">${formatCop(s.total, lang)}</span>
        </div>`
        )
        .join('');

    const expenseRows = expenses
        .map((e) => {
            const catKey = String(e.category || 'misc');
            const catLabel = cats[catKey] || catKey;
            const color = CATEGORY_COLORS[catKey] || '#6b7280';
            return `
            <tr>
                <td class="col-cat">
                    <span class="cat-badge" style="background:${color}20;color:${color};border:1px solid ${color}40;">${escapeHtml(catLabel)}</span>
                </td>
                <td class="col-note expense-note">${escapeHtml(String(e.note || L.noDescription))}</td>
                <td class="col-amount expense-amount">${formatCop(Number(e.amount) || 0, lang)}</td>
            </tr>`;
        })
        .join('');

    let balancesHtml = '';
    if (isGroup) {
        const balances = computeTripBalances(trip, expenses, L.traveler);
        const settlements = simplifyTripSettlements(balances);
        if (balances.length > 1) {
            const balanceRows = balances
                .map((b) => {
                    const netClass =
                        Math.abs(b.net) < 1
                            ? 'balance-neutral'
                            : b.net > 0
                              ? 'balance-positive'
                              : 'balance-negative';
                    const netLabel =
                        Math.abs(b.net) < 1
                            ? L.settled
                            : b.net > 0
                              ? `+${formatCop(b.net, lang)}`
                              : formatCop(b.net, lang);
                    return `
                    <tr>
                        <td class="col-note expense-note">${escapeHtml(b.displayName)}</td>
                        <td class="col-note expense-note" style="font-size:10px;">${escapeHtml(
                            labelReplace(L.paidShare, {
                                paid: formatCop(b.paid, lang),
                                share: formatCop(b.share, lang),
                            })
                        )}</td>
                        <td class="col-amount expense-amount ${netClass}">${escapeHtml(netLabel)}</td>
                    </tr>`;
                })
                .join('');

            const settlementRows = settlements
                .map(
                    (s) => `
                <tr>
                    <td class="col-note expense-note" colspan="2">${escapeHtml(
                        labelReplace(L.settlementLine, { from: s.fromName, to: s.toName })
                    )}</td>
                    <td class="col-amount expense-amount">${formatCop(s.amount, lang)}</td>
                </tr>`
                )
                .join('');

            balancesHtml = `
            <div class="trip-section">
                <div class="section-title">${escapeHtml(L.balancesTitle)}</div>
                <p class="trip-section-lead">${escapeHtml(L.balancesSubtitle)}</p>
                <table class="expenses-table">
                    <thead>
                        <tr>
                            <th class="col-note">${escapeHtml(L.colMember)}</th>
                            <th class="col-note">${escapeHtml(L.colPaidShare)}</th>
                            <th class="col-amount">${escapeHtml(L.colBalance)}</th>
                        </tr>
                    </thead>
                    <tbody>${balanceRows}</tbody>
                </table>
            </div>
            ${
                settlements.length
                    ? `<div class="trip-section">
                <div class="section-title">${escapeHtml(L.settlementsTitle)}</div>
                <table class="expenses-table">
                    <thead>
                        <tr>
                            <th class="col-note" colspan="2">${escapeHtml(L.settlementsTitle)}</th>
                            <th class="col-amount">${escapeHtml(L.colAmount)}</th>
                        </tr>
                    </thead>
                    <tbody>${settlementRows}</tbody>
                </table>
            </div>`
                    : ''
            }`;
        }
    }

    const distributionHtml =
        stats.length > 0
            ? `<div class="trip-section">
            <div class="section-title">${escapeHtml(L.distribution)}</div>
            <div class="master-bar">
                ${stats.map((s) => `<div class="master-segment" style="width:${s.percent}%;background:${s.color};"></div>`).join('')}
            </div>
            <div class="breakdown-grid">${categoryCards}</div>
        </div>`
            : '';

    const body = `
        ${pdfHeader(L.badge)}
        <section class="pdf-hero">
            <div class="pdf-meta-row">${metaPills}</div>
            <h1 class="pdf-hero-title">${escapeHtml(tripName)}</h1>
        </section>

        <div class="trip-kpi-grid">
            <div class="trip-kpi-card primary">
                <div class="trip-kpi-label">${escapeHtml(L.totalInvestment)}</div>
                <div class="trip-kpi-value">${formattedTotal}</div>
                <div class="trip-kpi-sub">${escapeHtml(L.currency)}</div>
            </div>
            <div class="trip-kpi-card">
                <div class="trip-kpi-label">${escapeHtml(L.transactions)}</div>
                <div class="trip-kpi-value">${totalTransactions}</div>
                <div class="trip-kpi-sub">${escapeHtml(L.transactionsUnit)}</div>
            </div>
            <div class="trip-kpi-card">
                <div class="trip-kpi-label">${escapeHtml(L.avgSpend)}</div>
                <div class="trip-kpi-value">${formatCop(avgTransaction, lang)}</div>
                <div class="trip-kpi-sub">${escapeHtml(L.perTransaction)}</div>
            </div>
            <div class="trip-kpi-card">
                <div class="trip-kpi-label">${escapeHtml(L.topCategory)}</div>
                <div class="trip-kpi-value" style="font-size:16px;line-height:1.25;">${escapeHtml(topCategory ? topCategory.label : L.na)}</div>
                <div class="trip-kpi-sub">${topCategory ? labelReplace(L.percentOfTotal, { percent: topCategory.percent }) : ''}</div>
            </div>
        </div>

        ${distributionHtml}
        ${balancesHtml}

        <div class="trip-section detail-section">
            <div class="section-title">${escapeHtml(L.detail)}</div>
            ${
                expenses.length > 0
                    ? `<table class="expenses-table">
                <thead>
                    <tr>
                        <th class="col-cat">${escapeHtml(L.colCategory)}</th>
                        <th class="col-note">${escapeHtml(L.colDescription)}</th>
                        <th class="col-amount">${escapeHtml(L.colAmount)}</th>
                    </tr>
                </thead>
                <tbody>${expenseRows}</tbody>
            </table>`
                    : `<div class="empty-state">${escapeHtml(L.emptyExpenses)}</div>`
            }
        </div>

        ${pdfFooter(lang, L.seal1, L.seal2)}
    `;

    return wrapPdfDocument(tripName, lang, body, tripPdfStyles());
}
