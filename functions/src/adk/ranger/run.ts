import { parseAgentJsonResponse } from '../parseJson';
import { runAgentEphemeral } from '../runner';
import { getRangerAgent } from './agent';

export interface RangerAdkResult {
    message: string;
    raw: Record<string, unknown>;
}

/** Runs the ADK Ranger agent with the full tactical briefing prompt. */
export async function runRangerAdk(
    briefingPrompt: string,
    userId: string
): Promise<RangerAdkResult> {
    const agent = getRangerAgent();
    const text = await runAgentEphemeral(
        agent,
        briefingPrompt,
        userId || 'hidden-ranger',
        'hidden-environmental-monitor'
    );

    const raw = parseAgentJsonResponse(text);
    const message =
        typeof raw.message === 'string' && raw.message.trim()
            ? raw.message.trim()
            : text.trim();

    if (!message) {
        throw new Error('Ranger ADK response missing message');
    }

    return { message, raw };
}
