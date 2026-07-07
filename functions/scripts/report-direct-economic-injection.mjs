#!/usr/bin/env node
/**
 * P2-ESG-01 — Monthly direct economic injection report (aggregates only, no PII).
 *
 * Usage (from repo root, with Application Default Credentials):
 *   cd functions && npm run report:direct-injection
 *   cd functions && npm run report:direct-injection -- --month 2026-06
 *   cd functions && npm run report:direct-injection -- --month 2026-06 --verify
 *
 * Exit 0 = success. Writes JSON summary to stdout.
 */

import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const admin = require(join(dirname(fileURLToPath(import.meta.url)), '../node_modules/firebase-admin'));

function resolveProjectId() {
    if (process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT) {
        return process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
    }
    try {
        const firebaserc = join(dirname(fileURLToPath(import.meta.url)), '../../.firebaserc');
        const parsed = JSON.parse(readFileSync(firebaserc, 'utf8'));
        return parsed.projects?.default || null;
    } catch {
        return null;
    }
}

const projectId = resolveProjectId();
if (!projectId) {
    console.error(
        'Missing Firebase project id. Set GOOGLE_CLOUD_PROJECT or run from the repo with .firebaserc present.'
    );
    process.exit(1);
}

if (!admin.apps.length) {
    admin.initializeApp({ projectId });
}

const db = admin.firestore();

const INJECTIONS = 'esg_direct_injections';
const MONTHLY = 'esg_monthly_totals';

function parseArgs(argv) {
    let month = null;
    let verify = false;
    for (let i = 2; i < argv.length; i++) {
        if (argv[i] === '--month' && argv[i + 1]) {
            month = argv[++i];
        } else if (argv[i] === '--verify') {
            verify = true;
        }
    }
    if (!month) {
        const now = new Date();
        const y = now.getUTCFullYear();
        const m = String(now.getUTCMonth() + 1).padStart(2, '0');
        month = `${y}-${m}`;
    }
    if (!/^\d{4}-\d{2}$/.test(month)) {
        throw new Error(`Invalid --month format (expected YYYY-MM): ${month}`);
    }
    return { month, verify };
}

async function sumInjectionsForMonth(monthKey) {
    const snap = await db
        .collection(INJECTIONS)
        .where('monthKey', '==', monthKey)
        .where('status', '==', 'active')
        .get();

    let totalCop = 0;
    const byDepartment = {};
    const byRefugio = {};

    for (const doc of snap.docs) {
        const row = doc.data();
        const amount = Number(row.amountCop || 0);
        totalCop += amount;
        const dept = String(row.departmentId || 'unknown');
        const ref = String(row.refugioId || 'unknown');
        byDepartment[dept] = (byDepartment[dept] || 0) + amount;
        byRefugio[ref] = (byRefugio[ref] || 0) + amount;
    }

    return {
        monthKey,
        totalCop,
        transactionCount: snap.size,
        byDepartment,
        byRefugioId: byRefugio,
        source: 'esg_direct_injections',
    };
}

async function readMonthlyAggregate(monthKey) {
    const snap = await db.collection(MONTHLY).doc(monthKey).get();
    if (!snap.exists) return null;
    const data = snap.data();
    return {
        totalCop: Number(data.totalCop || 0),
        transactionCount: Number(data.transactionCount || 0),
        source: 'esg_monthly_totals',
    };
}

async function main() {
    const { month, verify } = parseArgs(process.argv);
    const [computed, aggregate] = await Promise.all([
        sumInjectionsForMonth(month),
        readMonthlyAggregate(month),
    ]);

    const report = {
        generatedAt: new Date().toISOString(),
        projectId,
        monthKey: month,
        totalCopInjected: computed.totalCop,
        transactionCount: computed.transactionCount,
        byDepartment: computed.byDepartment,
        byRefugioId: computed.byRefugioId,
        aggregateDoc: aggregate,
        privacy: 'aggregates_only_no_pii',
    };

    if (verify) {
        if (!aggregate && computed.transactionCount === 0) {
            report.reconciliation = {
                status: 'empty_month',
                message: 'No active injections for this month yet — nothing to reconcile.',
            };
        } else if (aggregate) {
            report.reconciliation = {
                aggregateTotalCop: aggregate.totalCop,
                computedTotalCop: computed.totalCop,
                match: aggregate.totalCop === computed.totalCop,
                aggregateCount: aggregate.transactionCount,
                computedCount: computed.transactionCount,
                countMatch: aggregate.transactionCount === computed.transactionCount,
            };
            if (!report.reconciliation.match || !report.reconciliation.countMatch) {
                console.error(JSON.stringify(report, null, 2));
                process.exit(2);
            }
        } else {
            report.reconciliation = {
                status: 'missing_aggregate_doc',
                computedTotalCop: computed.totalCop,
                computedCount: computed.transactionCount,
                message:
                    'Injections exist but esg_monthly_totals doc is missing — check onTripExpenseWritten logs.',
            };
            console.error(JSON.stringify(report, null, 2));
            process.exit(2);
        }
    }

    console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
    const msg = String(err?.message || err);
    if (msg.includes('Could not load the default credentials') || msg.includes('invalid_grant')) {
        console.error(
            'Firestore auth failed. Run once:\n' +
                '  gcloud auth application-default login\n' +
                'Or set GOOGLE_APPLICATION_CREDENTIALS to a service-account JSON.\n' +
                `Project: ${projectId}`
        );
    }
    console.error(err);
    process.exit(1);
});
