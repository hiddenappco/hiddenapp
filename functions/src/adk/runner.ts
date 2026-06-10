import {
    InMemoryRunner,
    Runner,
    toStructuredEvents,
    EventType,
    isFinalResponse,
    stringifyContent,
    type BaseAgent,
    type BaseSessionService,
} from '@google/adk';
import { createPartFromText } from '@google/genai';
import type { Event } from '@google/adk';
import { ensureGeminiApiKey } from './config';
import { ensureAdkTelemetry } from './telemetry';

/** Consumes a runner event stream and returns the final text response. */
async function collectFinalText(events: AsyncGenerator<Event, void, undefined>): Promise<string> {
    let finalText = '';
    let streamedContent = '';

    for await (const event of events) {
        for (const structured of toStructuredEvents(event)) {
            if (structured.type === EventType.ERROR) {
                const errMsg =
                    'error' in structured && structured.error
                        ? String((structured.error as { message?: string }).message || structured.error)
                        : 'ADK agent error';
                throw new Error(errMsg);
            }
            if (structured.type === EventType.CONTENT) {
                streamedContent += structured.content;
            }
            if (structured.type === EventType.TOOL_CALL) {
                console.log(`[ADK] tool_call: ${structured.call.name || 'unknown'}`);
            }
            if (structured.type === EventType.TOOL_RESULT) {
                console.log(`[ADK] tool_result: ${structured.result.name || 'unknown'}`);
            }
        }

        if (isFinalResponse(event)) {
            const text = stringifyContent(event).trim();
            if (text) finalText = text;
        }
    }

    const result = finalText || streamedContent.trim();
    if (!result) {
        throw new Error('ADK agent returned empty response');
    }
    return result;
}

/**
 * Runs a single stateless ADK agent turn and returns the final text response.
 */
export async function runAgentEphemeral(
    agent: BaseAgent,
    userMessage: string,
    userId: string,
    appName: string
): Promise<string> {
    ensureGeminiApiKey();
    await ensureAdkTelemetry();

    const runner = new InMemoryRunner({ agent, appName });
    return collectFinalText(
        runner.runEphemeral({
            userId,
            newMessage: { role: 'user', parts: [createPartFromText(userMessage)] },
        })
    );
}

export interface SessionRunOptions {
    userId: string;
    appName: string;
    sessionId: string;
    sessionService: BaseSessionService;
}

/**
 * Runs an ADK agent turn against a persistent session. The session keeps the
 * full multi-turn event history (user messages, model replies, tool calls),
 * so only the new user message needs to be sent each turn.
 */
export async function runAgentWithSession(
    agent: BaseAgent,
    userMessage: string,
    opts: SessionRunOptions
): Promise<string> {
    ensureGeminiApiKey();
    await ensureAdkTelemetry();

    await opts.sessionService.getOrCreateSession({
        appName: opts.appName,
        userId: opts.userId,
        sessionId: opts.sessionId,
    });

    const runner = new Runner({
        appName: opts.appName,
        agent,
        sessionService: opts.sessionService,
    });

    return collectFinalText(
        runner.runAsync({
            userId: opts.userId,
            sessionId: opts.sessionId,
            newMessage: { role: 'user', parts: [createPartFromText(userMessage)] },
        })
    );
}
