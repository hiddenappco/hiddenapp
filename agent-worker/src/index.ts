/**
 * Hidden Agent Worker — Main Entry Point
 * 
 * This is the "Brain" of the Modo Live system for Hyperlocal Department Agents.
 * It runs as a LiveKit Agent Worker connecting outbound to LiveKit Cloud,
 * and bridges voice sessions to Gemini Multimodal Live API.
 * 
 * Each session is tied to a departmentId and uses the SAME assistant
 * configuration (from Firestore 'assistants' collection) as the text chatAgent.
 * 
 * Deployment: Google Cloud Run
 */

import 'dotenv/config';
import { AgentServer, ServerOptions, cli, WorkerOptions, defineAgent, JobContext, voice } from '@livekit/agents';
import * as google from '@livekit/agents-plugin-google';
import './firebase.js'; // Initialize Firebase Admin before anything else
import { buildWelcomeInstruction, getSystemPrompt, type AppLanguage } from './prompts.js';
import { createDepartmentTools, createRouteSessionContext } from './tools.js';
import http from 'node:http';

// ─── Health Check Server ─────────────────────────────────────────────────────
// Cloud Run requires a listening port. This lightweight HTTP server satisfies
// that requirement while the real work happens via outbound WebSocket to LiveKit.
// 
// IMPORTANT: LiveKit SDK forks child processes by re-importing this file.
// Child processes have `process.send` defined (IPC channel). We MUST only
// start the health check in the main process to avoid EADDRINUSE crashes
// that kill the voice session before it can speak.
if (!process.send) {
    const PORT = parseInt(process.env.PORT || '8080', 10);
    const healthServer = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', service: 'hidden-agent-worker', timestamp: new Date().toISOString() }));
    });
    healthServer.listen(PORT, () => {
        console.log(`[AgentWorker] 🏥 Health check listening on port ${PORT}`);
    });
}

// ─── Agent Definition ────────────────────────────────────────────────────────
const agent = defineAgent({
    entry: async (ctx: JobContext) => {
        const roomName = ctx.job.room?.name || ctx.room.name || 'unknown';
        
        let departmentId = '';
        let appLanguage: AppLanguage = 'es';

        // 1. Primary method: Extract from roomName (highly reliable via ctx.job.room?.name)
        if (roomName && roomName.startsWith('live-')) {
            const parts = roomName.split('-');
            if (parts.length >= 4) {
                // Remove "live" prefix and the last 2 segments (timestamp + random hash)
                departmentId = parts.slice(1, -2).join('-');
                console.log(`[AgentWorker] 🏷️ Extracted departmentId from roomName: "${departmentId}"`);
            }
        }

        // 2. Secondary/Priority method: Read from active remote participant metadata
        const participants = Array.from(ctx.room.remoteParticipants.values());
        for (const p of participants) {
            console.log('Metadata recibida:', p.metadata);
            if (p.metadata) {
                try {
                    const parsed = JSON.parse(p.metadata);
                    if (parsed.departmentId) {
                        departmentId = parsed.departmentId;
                        console.log(`[AgentWorker] 🎯 Overrode departmentId from participant metadata: "${departmentId}"`);
                    }
                    if (parsed.language === 'en' || parsed.language === 'es') {
                        appLanguage = parsed.language;
                        console.log(`[AgentWorker] 🌐 App language from participant metadata: "${appLanguage}"`);
                    }
                    if (departmentId && (parsed.language === 'en' || parsed.language === 'es')) {
                        break;
                    }
                } catch (err) {
                    console.warn(`[AgentWorker] Failed to parse participant metadata:`, err);
                }
            }
        }

        // 3. Error Validation: Prevent silent fallback to "general"
        if (!departmentId) {
            console.error(`[AgentWorker] ❌ CRITICAL ERROR: Could not resolve departmentId from roomName "${roomName}" or participant metadata.`);
            throw new Error(`Unable to resolve a valid departmentId. Session canceled.`);
        }

        console.log(`[AgentWorker] 🎙️ New session | Room: ${roomName} | Department: ${departmentId} | Language: ${appLanguage}`);

        // Fetch the assistant config from Firestore (same source as text chatAgent)
        const { systemPrompt, assistantName } = await getSystemPrompt(departmentId, appLanguage);
        console.log(`[AgentWorker] 📋 Loaded assistant: "${assistantName}" for dept: "${departmentId}"`);

        // Configure Gemini Realtime Model (native audio — no STT/TTS intermediary)
        const model = new google.beta.realtime.RealtimeModel({
            model: 'gemini-3.1-flash-live-preview',
            voice: 'Achird',
            temperature: 0.7,
        });

        const routeCtx = createRouteSessionContext(ctx.room);

        // Create department-scoped tools (closure: departmentId + GPS desde metadata LiveKit)
        const tools = createDepartmentTools(departmentId, routeCtx);

        // Create the Agent with department-specific prompt from Firestore and dynamic tools
        const voiceAgent = new voice.Agent({
            instructions: systemPrompt,
            tools: {
                getDepartmentInfo: tools.getDepartmentInfo,
                getDestinations: tools.getDestinations,
                getCoupons: tools.getCoupons,
                getEvents: tools.getEvents,
                getNews: tools.getNews,
                checkRouteStatus: tools.checkRouteStatus,
                getRefugios: tools.getRefugios,
            }
        });

        // Create session and connect
        const session = new voice.AgentSession({ llm: model });
        await ctx.connect();
        await session.start({ agent: voiceAgent, room: ctx.room });

        console.log(`[AgentWorker] ✅ Agent "${assistantName}" is LIVE in room: ${roomName}`);

        session.generateReply({
            instructions: buildWelcomeInstruction(departmentId, assistantName, appLanguage),
        });

        // Safety Parachute 2: The "Taxímetro"
        // Force disconnect after 15 minutes to prevent infinite idle listening
        const MAX_DURATION_MS = 15 * 60 * 1000;
        const disconnectTimer = setTimeout(() => {
            console.log(`[AgentWorker] ⏱️ Maximum duration (15m) reached for room: ${roomName}. Auto-disconnecting.`);
            ctx.room.disconnect();
        }, MAX_DURATION_MS);

        ctx.room.on('disconnected', () => {
            clearTimeout(disconnectTimer);
            console.log(`[AgentWorker] 👋 Room disconnected, timer cleared: ${roomName}`);
        });
    },
});

export default agent;

// ─── Worker Bootstrap ────────────────────────────────────────────────────────
// Force the 'start' command so the LiveKit CLI runs headlessly in Cloud Run
// without expecting external arguments, which properly initializes the logger.
// IMPORTANT: Only run this in the main process (process.send is undefined).
if (!process.send) {
    process.argv = ['node', 'dist/index.js', 'start'];
    cli.runApp(new WorkerOptions({ agent: 'dist/index.js' }));
}
