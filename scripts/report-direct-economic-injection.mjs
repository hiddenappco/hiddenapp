#!/usr/bin/env node
/**
 * P2-ESG-01 — Delegates to functions/scripts/report-direct-economic-injection.mjs
 * Usage: node scripts/report-direct-economic-injection.mjs [--month YYYY-MM] [--verify]
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const script = join(dirname(fileURLToPath(import.meta.url)), '../functions/scripts/report-direct-economic-injection.mjs');
const result = spawnSync(process.execPath, [script, ...process.argv.slice(2)], {
    stdio: 'inherit',
    cwd: join(dirname(fileURLToPath(import.meta.url)), '../functions'),
});
process.exit(result.status ?? 1);
