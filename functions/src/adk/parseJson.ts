/**
 * Normalizes LLM text (ADK or legacy) into a JSON object for agent HTTP responses.
 */
export function parseAgentJsonResponse(rawText: string): Record<string, unknown> {
    let cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();

    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        cleaned = jsonMatch[0];
    }

    try {
        const parsed = JSON.parse(cleaned) as Record<string, unknown>;
        if (parsed.message && typeof parsed.message === 'string' && parsed.message.trim().startsWith('{')) {
            try {
                const inner = JSON.parse(parsed.message) as Record<string, unknown>;
                if (inner.message) parsed.message = inner.message;
            } catch {
                /* keep outer message */
            }
        }
        return parsed;
    } catch {
        try {
            const unescaped = cleaned.replace(/\\n/g, '\n').replace(/\\"/g, '"');
            return JSON.parse(unescaped) as Record<string, unknown>;
        } catch {
            return { message: cleaned || 'No response generated.' };
        }
    }
}
