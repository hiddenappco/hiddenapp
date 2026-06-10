import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { runExpeditionPipeline } from '../adk/expedition/run';

/**
 * Runs the multi-agent expedition planner whenever the chat tool enqueues a
 * new expedition document. Long-running: 3 sequential Gemini agents plus
 * Google Routes legs, so it executes as a background trigger instead of
 * blocking the chat HTTP request.
 */
export const onExpeditionCreate = onDocumentCreated(
    {
        document: 'expeditions/{expeditionId}',
        timeoutSeconds: 540,
        memory: '1GiB',
        secrets: ['GEMINI_API_KEY', 'GOOGLE_MAPS_API_KEY'],
    },
    async (event) => {
        const data = event.data?.data();
        if (!data || data.status !== 'queued') return;
        await runExpeditionPipeline(event.params.expeditionId);
    }
);
