#!/usr/bin/env node
/**
 * Validates planning metadata on a Rowy/Firestore destinations JSON export.
 * Usage: node scripts/validate-rowy-planning-metadata.mjs [path/to/destinations.json]
 *
 * Exit code 0 = no warnings; 1 = at least one destination missing required fields.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const REQUIRED_STRING_FIELDS = ['regionCluster'];
const REQUIRED_ARRAY_FIELDS = ['accessModes'];
const REQUIRED_NUMBER_FIELDS = ['recommendedMinDays'];
const PLANNING_NOTE_FIELDS = ['planningNotes', 'planningNotes_en'];

function loadDestinations(filePath) {
  const raw = readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) return parsed;
  if (parsed && Array.isArray(parsed.destinations)) return parsed.destinations;
  throw new Error('JSON must be an array of destinations or { destinations: [...] }');
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNonEmptyArray(value) {
  return Array.isArray(value) && value.length > 0;
}

function isPositiveNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 1;
}

function validateDestination(dest) {
  const id = String(dest.id || dest.customId || dest._id || 'unknown');
  const issues = [];

  for (const field of REQUIRED_STRING_FIELDS) {
    if (!isNonEmptyString(dest[field])) {
      issues.push(`missing or empty ${field}`);
    }
  }

  for (const field of REQUIRED_ARRAY_FIELDS) {
    if (!isNonEmptyArray(dest[field])) {
      issues.push(`missing or empty ${field}`);
    }
  }

  const minDays = dest.recommendedMinDays ?? dest.suggestedDaysMin;
  if (!isPositiveNumber(minDays)) {
    issues.push('missing recommendedMinDays (or suggestedDaysMin)');
  }

  const hasPlanning =
    PLANNING_NOTE_FIELDS.some((f) => isNonEmptyString(dest[f]));
  if (!hasPlanning) {
    issues.push('missing planningNotes (es or en)');
  }

  return { id, departmentId: dest.departmentId ?? dest.department ?? '', issues };
}

const inputPath = process.argv[2];
if (!inputPath) {
  console.error('Usage: node scripts/validate-rowy-planning-metadata.mjs <destinations.json>');
  process.exit(2);
}

const file = resolve(process.cwd(), inputPath);
let destinations;
try {
  destinations = loadDestinations(file);
} catch (err) {
  console.error(`Failed to read ${file}:`, err instanceof Error ? err.message : err);
  process.exit(2);
}

const warnings = destinations.map(validateDestination).filter((r) => r.issues.length > 0);

console.log(`Checked ${destinations.length} destinations from ${file}`);

if (warnings.length === 0) {
  console.log('OK — all destinations have planning metadata.');
  process.exit(0);
}

console.warn(`\n${warnings.length} destination(s) with missing planning metadata:\n`);
for (const row of warnings) {
  const dept = row.departmentId ? ` [${row.departmentId}]` : '';
  console.warn(`  • ${row.id}${dept}: ${row.issues.join('; ')}`);
}

console.warn('\nSee docs/ROWY_PLANNING_METADATA.md for field conventions.');
process.exit(1);
