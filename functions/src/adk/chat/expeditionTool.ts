import { FunctionTool } from '@google/adk';
import { z } from 'zod';
import { db, admin } from '../../config/firebase';
import type { AppLanguage } from './briefing';
import { GROUND_MOBILITY_VALUES, type GroundMobility } from '../expedition/types';

export interface ExpeditionToolContext {
    userId: string;
    departmentId: string;
    appLanguage: AppLanguage;
    userCoordinates?: { lat: number; lng: number } | null;
}

const GROUND_MOBILITY_SCHEMA = z.enum(['private_vehicle', 'public_transport', 'mixed']);

/**
 * Chat entry point for the multi-agent expedition planner. Enqueues an
 * expedition document; the onExpeditionCreate trigger runs the pipeline in
 * the background while the chat replies immediately with a live widget.
 */
export function createPlanExpeditionTool(ctx: ExpeditionToolContext): FunctionTool {
    return new FunctionTool({
        name: 'planExpedition',
        description:
            'Use when the user asks to plan a trip, expedition or itinerary of one or more days (e.g. "plan me 3 days", "arma mi expedición"). ' +
            'Before calling: confirm number of days, starting city, AND ground transport (private vehicle, public buses/colectivos, or mixed). ' +
            'Starts the multi-agent planner in the background.',
        parameters: z.object({
            days: z.number().int().min(1).max(10).describe('Number of travel days requested.'),
            groundMobility: GROUND_MOBILITY_SCHEMA.describe(
                'Required. private_vehicle = car/moto; public_transport = buses/colectivos with fixed schedules; mixed = own vehicle to a hub then public/local legs.'
            ),
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
        execute: async ({ days, groundMobility, originLabel, interests, budget }) => {
            const mobility: GroundMobility = GROUND_MOBILITY_VALUES.includes(groundMobility)
                ? groundMobility
                : 'private_vehicle';

            const docRef = await db.collection('expeditions').add({
                userId: ctx.userId,
                departmentId: ctx.departmentId,
                language: ctx.appLanguage,
                request: {
                    days,
                    groundMobility: mobility,
                    origin: {
                        label: originLabel || '',
                        lat: ctx.userCoordinates?.lat ?? null,
                        lng: ctx.userCoordinates?.lng ?? null,
                    },
                    originLabel: originLabel || '',
                    originLat: ctx.userCoordinates?.lat ?? null,
                    originLng: ctx.userCoordinates?.lng ?? null,
                    interests: interests?.length ? interests : ['general'],
                    budgetMode: budget ? 'fixed' : 'open',
                    budget: budget ? { amountCOP: parseInt(String(budget).replace(/\D/g, ''), 10) || null } : {},
                    budget_legacy: budget || '',
                    pace: 'balanced',
                    travelerProfile: 'solo',
                },
                status: 'queued',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            console.log(
                `[planExpedition] Enqueued ${docRef.id} | ${ctx.departmentId} | ${days} days | ${mobility}`
            );

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
