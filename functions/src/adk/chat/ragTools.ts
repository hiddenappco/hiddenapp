import { FunctionTool } from '@google/adk';
import { z } from 'zod';
import {
    getCouponsKnowledge,
    getDepartmentKnowledge,
    getDestinationsKnowledge,
    getEventsKnowledge,
    getNewsKnowledge,
    getRefugiosKnowledge,
    type CatalogScope,
} from './knowledge';

export interface CatalogToolContext {
    departmentId: string;
    kbIds: string[];
    appLanguage?: 'es' | 'en';
}

/**
 * Native ADK FunctionTools — Agentic RAG over Firestore (fallback when MCP is unavailable).
 *
 * Strict department scoping: the session's departmentId/kbIds are enforced server-side.
 * The model cannot pass a departmentId — every tool is hard-wired to the session scope.
 */
export function createCatalogRagTools(ctx: CatalogToolContext): FunctionTool[] {
    const scope: CatalogScope = {
        departmentId: ctx.departmentId,
        kbIds: ctx.kbIds,
        appLanguage: ctx.appLanguage,
    };

    return [
        new FunctionTool({
            name: 'getDepartment',
            description:
                'Load the parent department profile: culture, logistics, seasonality, safety, gastronomy, ecosystems. Use for general department questions.',
            parameters: z.object({}),
            execute: async () => {
                const profile = await getDepartmentKnowledge(scope);
                if (!profile) {
                    return { error: `No department profile found for ${ctx.departmentId}.` };
                }
                return { department: profile };
            },
        }),
        new FunctionTool({
            name: 'getDestinations',
            description:
                'List expedition destinations in the department. Use optional searchQuery to filter by name or theme.',
            parameters: z.object({
                searchQuery: z.string().optional().describe('Optional text filter on title or description.'),
                limit: z.number().int().min(1).max(80).optional(),
            }),
            execute: async ({ searchQuery, limit }) => {
                const destinations = await getDestinationsKnowledge(scope, { searchQuery, limit });
                return { count: destinations.length, destinations };
            },
        }),
        new FunctionTool({
            name: 'getRefugios',
            description:
                'List active refugios / lodging. Pass destinationId to filter refugios linked to a specific destination.',
            parameters: z.object({
                destinationId: z
                    .string()
                    .optional()
                    .describe('Destination document id to filter linked refugios.'),
                limit: z.number().int().min(1).max(60).optional(),
            }),
            execute: async ({ destinationId, limit }) => {
                const refugios = await getRefugiosKnowledge(scope, { destinationId, limit });
                return { count: refugios.length, refugios };
            },
        }),
        new FunctionTool({
            name: 'getCoupons',
            description: 'List partner coupons and discounts for the department.',
            parameters: z.object({
                limit: z.number().int().min(1).max(60).optional(),
            }),
            execute: async ({ limit }) => {
                const coupons = await getCouponsKnowledge(scope, { limit });
                return { count: coupons.length, coupons };
            },
        }),
        new FunctionTool({
            name: 'getEvents',
            description: 'List fairs, festivals and events in the department.',
            parameters: z.object({
                limit: z.number().int().min(1).max(60).optional(),
            }),
            execute: async ({ limit }) => {
                const events = await getEventsKnowledge(scope, { limit });
                return { count: events.length, events };
            },
        }),
        new FunctionTool({
            name: 'getNews',
            description: 'List news and announcements for the department.',
            parameters: z.object({
                limit: z.number().int().min(1).max(40).optional(),
            }),
            execute: async ({ limit }) => {
                const news = await getNewsKnowledge(scope, { limit });
                return { count: news.length, news };
            },
        }),
    ];
}
