import { parseAgentJsonResponse } from '../parseJson';
import { runAgentWithSession } from '../runner';
import { getFirestoreSessionService } from '../sessions/firestoreSessionService';
import { buildHyperlocalChatAgent, type HyperlocalChatBuildContext } from './agent';

export interface ChatAdkResult {
    message: string;
    widgets: unknown[];
    telemetry: Record<string, unknown>;
    raw: Record<string, unknown>;
}

export interface ChatAdkRunParams {
    /** The user's message for this turn (history lives in the ADK session). */
    userMessage: string;
    userId: string;
    departmentId: string;
    /** Stable chat thread id — maps 1:1 to the ADK session. */
    sessionId: string;
    buildContext: HyperlocalChatBuildContext;
}

/** Runs the ADK hyperlocal chat agent with a persistent Firestore session. */
export async function runChatAdk(params: ChatAdkRunParams): Promise<ChatAdkResult> {
    const agent = await buildHyperlocalChatAgent(params.buildContext);

    const text = await runAgentWithSession(agent, params.userMessage, {
        userId: params.userId,
        appName: `hidden-chat-${params.departmentId}`,
        sessionId: params.sessionId,
        sessionService: getFirestoreSessionService(),
    });

    const raw = parseAgentJsonResponse(text);
    const message =
        typeof raw.message === 'string' && raw.message.trim()
            ? raw.message.trim()
            : text.trim();

    if (!message) {
        throw new Error('Chat ADK response missing message');
    }

    const widgets = Array.isArray(raw.widgets) ? raw.widgets : [];
    const telemetry =
        raw.telemetry && typeof raw.telemetry === 'object'
            ? (raw.telemetry as Record<string, unknown>)
            : {};

    return { message, widgets, telemetry, raw };
}
