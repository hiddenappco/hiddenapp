/** Server-side premium limits — mirror of `config/premiumLimits.ts` on the client. */

export const CHAT_FREE_DAILY_MESSAGES = 10;

export const RANGER_FREE_DAILY = 5;
export const RANGER_PREMIUM_DAILY = 10;

export const LIVE_PREMIUM_MONTHLY_SECONDS = 30 * 60;
export const LIVE_TRIAL_SECONDS = 5 * 60;
export const LIVE_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

export const EXPEDITION_PASS_QUOTA = 1;
export const EXPEDITION_MONTHLY_QUOTA = 3;
export const EXPEDITION_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;
export const TRIP_PASS_DURATION_MS = 10 * 24 * 60 * 60 * 1000;

export const MAX_EXPEDITION_DAYS = 30;
export const MAX_REVISION_NOTES_LENGTH = 1200;
