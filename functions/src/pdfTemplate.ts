export const generatePdfHtml = (trip: any, expenses: any[], totalSpent: number, formattedTotal: string) => {
    const categoriesConfig: Record<string, { label: string, color: string, icon: string }> = {
        food: { label: "Alimentación", color: "#f97316", icon: "🍽" },
        transport: { label: "Transporte", color: "#3b82f6", icon: "🚌" },
        lodging: { label: "Hospedaje", color: "#6366f1", icon: "🏨" },
        tours: { label: "Tours", color: "#22c55e", icon: "🥾" },
        misc: { label: "Varios", color: "#6b7280", icon: "📋" }
    };

    const stats = Object.keys(categoriesConfig).map(catKey => {
        const catTotal = expenses.filter(e => e.category === catKey).reduce((a, c) => a + c.amount, 0);
        const percent = totalSpent > 0 ? (catTotal / totalSpent) * 100 : 0;
        return {
            key: catKey,
            label: categoriesConfig[catKey].label,
            color: categoriesConfig[catKey].color,
            icon: categoriesConfig[catKey].icon,
            total: catTotal,
            percent: Math.round(percent)
        };
    }).filter(s => s.total > 0).sort((a, b) => b.percent - a.percent);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount);
    };

    // KPIs
    const totalTransactions = expenses.length;
    const avgTransaction = totalTransactions > 0 ? totalSpent / totalTransactions : 0;
    const topCategory = stats.length > 0 ? stats[0] : null;

    // SVG icons
    const locationPinSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" fill="#ff6c52"/></svg>`;

    const sealSvg = `<svg width="80" height="80" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" opacity="0.06">
        <circle cx="40" cy="40" r="38" stroke="#fff" stroke-width="2" fill="none"/>
        <circle cx="40" cy="40" r="32" stroke="#fff" stroke-width="1" fill="none"/>
        <text x="40" y="36" text-anchor="middle" font-family="Outfit" font-size="8" font-weight="700" fill="#fff" letter-spacing="2">HIDDEN</text>
        <text x="40" y="48" text-anchor="middle" font-family="Outfit" font-size="6" font-weight="500" fill="#fff" letter-spacing="1">FINANCE</text>
    </svg>`;

    const capitalizedDate = trip.date ? trip.date.charAt(0).toUpperCase() + trip.date.slice(1) : '';

    // Category breakdown cards
    const categoryCards = stats.map(s => `
        <div class="cat-card">
            <div class="cat-card-header">
                <div class="cat-dot" style="background: ${s.color};"></div>
                <span class="cat-name">${s.label}</span>
                <span class="cat-percent">${s.percent}%</span>
            </div>
            <div class="cat-bar-bg">
                <div class="cat-bar-fill" style="width: ${s.percent}%; background: ${s.color};"></div>
            </div>
            <span class="cat-total">${formatCurrency(s.total)}</span>
        </div>
    `).join('');

    // Expense rows (without date column)
    const expenseRows = expenses.map(e => {
        const cat = categoriesConfig[e.category] || { label: e.category, color: '#6b7280', icon: '📋' };
        return `
            <tr>
                <td>
                    <div class="expense-cat-wrapper">
                        <span class="cat-badge" style="background: ${cat.color}20; color: ${cat.color}; border: 1px solid ${cat.color}40;">${cat.label}</span>
                    </div>
                </td>
                <td class="expense-note">${e.note || 'Sin descripción'}</td>
                <td class="expense-amount">${formatCurrency(e.amount)}</td>
            </tr>
        `;
    }).join('');

    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bitácora Financiera - ${trip.name}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }

        body {
            font-family: 'Outfit', -apple-system, sans-serif;
            background: #020710;
            color: #fff;
            padding: 0;
            margin: 0;
        }

        .page {
            width: 794px; /* A4 width at 96dpi */
            min-height: 1123px;
            margin: 0 auto;
            padding: 48px;
            position: relative;
            overflow: hidden;
        }

        /* Background decoration */
        .bg-glow-1 {
            position: absolute;
            top: -120px;
            right: -80px;
            width: 400px;
            height: 400px;
            background: radial-gradient(circle, rgba(255, 108, 82, 0.12) 0%, transparent 70%);
            border-radius: 50%;
            z-index: 0;
        }
        .bg-glow-2 {
            position: absolute;
            bottom: -150px;
            left: -100px;
            width: 350px;
            height: 350px;
            background: radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%);
            border-radius: 50%;
            z-index: 0;
        }
        .bg-grid {
            position: absolute;
            inset: 0;
            background-image: 
                linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px);
            background-size: 40px 40px;
            z-index: 0;
        }

        .content {
            position: relative;
            z-index: 1;
        }

        /* Header */
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-bottom: 24px;
            border-bottom: 1px solid rgba(255,255,255,0.06);
            margin-bottom: 40px;
        }
        .header-logo {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .logo-img {
            height: 36px;
            width: auto;
        }
        .header-badge {
            background: rgba(255, 108, 82, 0.1);
            border: 1px solid rgba(255, 108, 82, 0.2);
            color: #ff6c52;
            padding: 6px 16px;
            border-radius: 100px;
            font-size: 9px;
            font-weight: 800;
            letter-spacing: 2.5px;
            text-transform: uppercase;
        }

        /* Hero / Trip Info */
        .hero {
            margin-bottom: 48px;
        }
        .trip-location {
            display: flex;
            align-items: center;
            gap: 6px;
            margin-bottom: 10px;
        }
        .trip-location-text {
            font-size: 11px;
            font-weight: 800;
            color: #ff6c52;
            text-transform: uppercase;
            letter-spacing: 2px;
        }
        .trip-name {
            font-size: 48px;
            font-weight: 900;
            line-height: 1.05;
            letter-spacing: -2px;
            margin-bottom: 10px;
            background: linear-gradient(135deg, #ffffff 0%, #94a3b8 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .trip-date {
            font-size: 14px;
            color: #64748b;
            font-weight: 500;
        }

        /* KPI Grid */
        .kpi-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 16px;
            margin-bottom: 48px;
        }
        .kpi-card {
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.06);
            border-radius: 20px;
            padding: 28px 24px;
            text-align: center;
            position: relative;
            overflow: hidden;
        }
        .kpi-card.primary {
            grid-column: span 3;
            background: linear-gradient(135deg, rgba(255, 108, 82, 0.08) 0%, rgba(255, 108, 82, 0.02) 100%);
            border-color: rgba(255, 108, 82, 0.15);
            padding: 36px;
        }
        .kpi-card.primary .kpi-value {
            font-size: 52px;
            background: linear-gradient(135deg, #ff6c52, #ff9a7a);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .kpi-label {
            font-size: 10px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-bottom: 12px;
        }
        .kpi-value {
            font-size: 28px;
            font-weight: 900;
            letter-spacing: -1px;
            color: #fff;
        }
        .kpi-sub {
            font-size: 11px;
            color: #475569;
            font-weight: 600;
            margin-top: 6px;
        }

        /* Category Breakdown */
        .section-title {
            font-size: 16px;
            font-weight: 800;
            color: #fff;
            margin-bottom: 20px;
            padding-bottom: 12px;
            border-bottom: 1px solid rgba(255,255,255,0.06);
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .section-title::before {
            content: '';
            display: inline-block;
            width: 3px;
            height: 16px;
            background: #ff6c52;
            border-radius: 2px;
        }

        .breakdown-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-bottom: 48px;
        }
        .cat-card {
            background: rgba(255,255,255,0.025);
            border: 1px solid rgba(255,255,255,0.05);
            border-radius: 14px;
            padding: 16px 18px;
        }
        .cat-card-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 10px;
        }
        .cat-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            flex-shrink: 0;
        }
        .cat-name {
            font-size: 12px;
            font-weight: 700;
            color: #e2e8f0;
            flex: 1;
        }
        .cat-percent {
            font-size: 11px;
            font-weight: 800;
            color: #94a3b8;
        }
        .cat-bar-bg {
            width: 100%;
            height: 6px;
            background: rgba(255,255,255,0.05);
            border-radius: 3px;
            overflow: hidden;
            margin-bottom: 8px;
        }
        .cat-bar-fill {
            height: 100%;
            border-radius: 3px;
            transition: width 0.3s;
        }
        .cat-total {
            font-size: 14px;
            font-weight: 800;
            color: #fff;
        }

        /* Chart Bar (consolidated) */
        .master-bar {
            width: 100%;
            height: 12px;
            background: rgba(255,255,255,0.04);
            border-radius: 6px;
            display: flex;
            overflow: hidden;
            margin-bottom: 32px;
        }
        .master-segment {
            height: 100%;
        }
        .master-segment:first-child {
            border-radius: 6px 0 0 6px;
        }
        .master-segment:last-child {
            border-radius: 0 6px 6px 0;
        }

        /* Expenses Table */
        .expenses-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        .expenses-table th {
            font-size: 9px;
            font-weight: 800;
            color: #475569;
            text-transform: uppercase;
            letter-spacing: 2px;
            padding: 12px 16px;
            text-align: left;
            border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .expenses-table th:last-child {
            text-align: right;
        }
        .expenses-table td {
            padding: 14px 16px;
            border-bottom: 1px solid rgba(255,255,255,0.03);
            font-size: 13px;
            vertical-align: middle;
        }
        .expense-cat-wrapper {
            display: flex;
            align-items: center;
        }
        .cat-badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 8px;
            font-size: 9px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            white-space: nowrap;
        }
        .expense-note {
            color: #cbd5e1;
            font-weight: 500;
        }
        .expense-amount {
            text-align: right;
            font-weight: 800;
            color: #fff;
            white-space: nowrap;
        }

        /* Footer */
        .footer {
            margin-top: 48px;
            padding-top: 24px;
            border-top: 1px solid rgba(255,255,255,0.06);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .footer-left {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        .footer-text {
            font-size: 10px;
            color: #475569;
            font-weight: 600;
        }
        .footer-link {
            font-size: 11px;
            color: #ff6c52;
            font-weight: 700;
            text-decoration: none;
            letter-spacing: 0.5px;
        }
        .footer-seal {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .seal-text {
            text-align: right;
        }
        .seal-line {
            font-size: 9px;
            font-weight: 700;
            color: #334155;
            text-transform: uppercase;
            letter-spacing: 1.5px;
        }

        /* Empty state for no expenses */
        .empty-state {
            text-align: center;
            padding: 40px;
            color: #475569;
            font-size: 14px;
            font-weight: 600;
        }
    </style>
</head>
<body>
    <div class="page">
        <!-- Background elements -->
        <div class="bg-glow-1"></div>
        <div class="bg-glow-2"></div>
        <div class="bg-grid"></div>

        <div class="content">
            <!-- Header -->
            <div class="header">
                <div class="header-logo">
                    <img src="https://i.imgur.com/WtlATYR.png" class="logo-img" alt="Hidden" />
                </div>
                <div class="header-badge">Bitácora Financiera</div>
            </div>

            <!-- Hero -->
            <div class="hero">
                <div class="trip-location">
                    ${locationPinSvg}
                    <span class="trip-location-text">${trip.location || 'Colombia'}</span>
                </div>
                <div class="trip-name">${trip.name}</div>
                <div class="trip-date">${capitalizedDate}</div>
            </div>

            <!-- KPI Grid -->
            <div class="kpi-grid">
                <div class="kpi-card primary">
                    <div class="kpi-label">Inversión Total de la Expedición</div>
                    <div class="kpi-value">${formattedTotal}</div>
                    <div class="kpi-sub">COP</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-label">Movimientos</div>
                    <div class="kpi-value">${totalTransactions}</div>
                    <div class="kpi-sub">transacciones</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-label">Gasto Promedio</div>
                    <div class="kpi-value">${formatCurrency(avgTransaction)}</div>
                    <div class="kpi-sub">por movimiento</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-label">Mayor Inversión</div>
                    <div class="kpi-value">${topCategory ? topCategory.label : 'N/A'}</div>
                    <div class="kpi-sub">${topCategory ? topCategory.percent + '% del total' : ''}</div>
                </div>
            </div>

            <!-- Distribution Bar -->
            <div class="section-title">Distribución del Gasto</div>
            <div class="master-bar">
                ${stats.map(s => `<div class="master-segment" style="width: ${s.percent}%; background: ${s.color};"></div>`).join('')}
            </div>

            <!-- Category Breakdown -->
            <div class="breakdown-grid">
                ${categoryCards}
            </div>

            <!-- Expenses Table -->
            <div class="section-title">Detalle de Movimientos</div>
            ${expenses.length > 0 ? `
            <table class="expenses-table">
                <thead>
                    <tr>
                        <th>Categoría</th>
                        <th>Descripción</th>
                        <th>Monto</th>
                    </tr>
                </thead>
                <tbody>
                    ${expenseRows}
                </tbody>
            </table>
            ` : '<div class="empty-state">No hay movimientos registrados para esta expedición.</div>'}

            <!-- Footer -->
            <div class="footer">
                <div class="footer-left">
                    <div style="display: flex; gap: 12px; align-items: center;">
                        <img src="https://i.imgur.com/a5vwrIi.png" style="width: 50px; height: 50px; border-radius: 4px;" alt="QR Code" />
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                            <span class="footer-text">Generado automáticamente por Hidden App</span>
                            <span class="footer-text" style="color: #ff6c52; font-weight: 800;">Escanea el QR para descargar la app</span>
                        </div>
                    </div>
                </div>
                <div class="footer-seal">
                    <div class="seal-text">
                        <div class="seal-line">Reporte de</div>
                        <div class="seal-line" style="color: #ff6c52;">Finanzas Compartidas</div>
                    </div>
                    ${sealSvg}
                </div>
            </div>
        </div>
    </div>
</body>
</html>
    `;
};
