import { ENV } from '../config/env';

/** Ensures Gemini API key is available for ADK runners (uses GEMINI_API_KEY). */
export function ensureGeminiApiKey(): void {
    const key = process.env.GEMINI_API_KEY || ENV.GEMINI_API_KEY;
    if (!key) {
        throw new Error('GEMINI_API_KEY is not configured');
    }
    if (!process.env.GEMINI_API_KEY) {
        process.env.GEMINI_API_KEY = key;
    }
}
