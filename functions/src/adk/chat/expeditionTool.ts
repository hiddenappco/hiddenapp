import { FunctionTool } from '@google/adk';
import { z } from 'zod';
import { db, admin } from '../../config/firebase';
import type { AppLanguage } from './briefing';

export interface ExpeditionToolContext {
    userId: string;
    departmentId: string;
    appLanguage: AppLanguage;
    userCoordinates?: { lat: number; lng: number } | null;
}

/**
 * Chat entry point for the multi-agent expedition planner. Enqueues an
 * expedition document; the onExpeditionCreate trigger runs the pipeline in
 * the background while the chat replies immediately with a live widget.
 */
export function createPlanExpeditionTool(ctx: ExpeditionToolContext): FunctionTool {
    return new FunctionTool({
        name: 'planExpedition',
        description:
            'Use when the user asks to plan a trip, expedition or itinerary of one or more days (e.g. "plan me 3 days", "arma mi expedición"). Starts the multi-agent planner in the background. Ask for the number of days first if the user did not specify it.',
        parameters: z.object({
            days: z.number().int().min(1).max(10).describe('Number of travel days requested.'),
            originLabel: z
                .string()
                .optional()
                .describe('Starting point as the user described it (city or place), if mentioned.'),
            interests: z
                .array(z.string())
                .optional()
                .describe('Traveler interests mentioned: rivers, sea, hiking, gastronomy, wildlife...'),
            budget: z.string().optional().describe('Approximate budget if the user mentioned one.'),
        }),
        execute: async ({ days, originLabel, interests, budget }) => {
            const docRef = await db.collection('expeditions').add({
                userId: ctx.userId,
                departmentId: ctx.departmentId,
                language: ctx.appLanguage,
                request: {
                    days,
                    originLabel: originLabel || '',
                    originLat: ctx.userCoordinates?.lat ?? null,
                    originLng: ctx.userCoordinates?.lng ?? null,
                    interests: interests || [],
                    budget: budget || '',
                },
                status: 'queued',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            console.log(`[planExpedition] Enqueued ${docRef.id} | ${ctx.departmentId} | ${days} days`);

            return {
                expeditionId: docRef.id,
                status: 'queued',
                instruction:
                    `The planner is now building the itinerary in the background (takes ~1 minute). ` +
                    `Tell the user their expedition is being prepared by the specialist agents and that the plan will appear in the card below. ` +
                    `You MUST include this widget in your response: {"type":"expedition","id":"${docRef.id}"}.`,
            };
        },
    });
}
