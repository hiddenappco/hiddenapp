/**
 * Hidden App — agent orchestration (Google ADK).
 * HTTP handlers in api/agents.ts delegate here; legacy Gemini SDK remains as fallback.
 */
export { runRangerAdk } from './ranger/run';
export { runChatAdk } from './chat/run';
export { getRangerAgent } from './ranger/agent';
export { buildHyperlocalChatAgent } from './chat/agent';
