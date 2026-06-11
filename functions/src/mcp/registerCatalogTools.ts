import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
    getCouponsKnowledge,
    getDepartmentKnowledge,
    getDestinationsKnowledge,
    getEventsKnowledge,
    getNewsKnowledge,
    getRefugiosKnowledge,
} from '../adk/chat/knowledge';

const departmentId = z.string().describe('Canonical department id (e.g. valle-del-cauca).');

/**
 * Strict scoping: when HIDDEN_MCP_DEPARTMENT is set (by the ADK toolset spawn),
 * every tool call is clamped to that department regardless of what the model passes.
 */
function scopedDepartmentId(requested: string): string {
    return process.env.HIDDEN_MCP_DEPARTMENT || requested;
}

function scopedAppLanguage(): 'es' | 'en' {
    return process.env.HIDDEN_MCP_LANGUAGE === 'en' ? 'en' : 'es';
}

function catalogScope(departmentId: string) {
    return {
        departmentId: scopedDepartmentId(departmentId),
        appLanguage: scopedAppLanguage(),
    };
}

/** Registers Hidden App catalog tools on an MCP server (shared by stdio transport). */
export function registerHiddenCatalogTools(server: McpServer): void {
    server.registerTool(
        'hidden_get_department',
        {
            description:
                'Load department profile: culture, logistics, seasonality, safety, gastronomy, ecosystems.',
            inputSchema: { departmentId },
        },
        async ({ departmentId: deptId }) => {
            const department = await getDepartmentKnowledge(catalogScope(deptId));
            if (!department) {
                return {
                    content: [{ type: 'text' as const, text: JSON.stringify({ error: 'Department not found' }) }],
                    isError: true,
                };
            }
            return {
                content: [{ type: 'text' as const, text: JSON.stringify({ department }) }],
            };
        }
    );

    server.registerTool(
        'hidden_get_destinations',
        {
            description: 'List expedition destinations; optional searchQuery filters by title or description.',
            inputSchema: {
                departmentId,
                searchQuery: z.string().optional(),
                limit: z.number().int().min(1).max(80).optional(),
            },
        },
        async ({ departmentId: deptId, searchQuery, limit }) => {
            const destinations = await getDestinationsKnowledge(
                catalogScope(deptId),
                { searchQuery, limit }
            );
            return {
                content: [
                    {
                        type: 'text' as const,
                        text: JSON.stringify({ count: destinations.length, destinations }),
                    },
                ],
            };
        }
    );

    server.registerTool(
        'hidden_get_refugios',
        {
            description: 'List active refugios; pass destinationId to filter lodging linked to a destination.',
            inputSchema: {
                departmentId,
                destinationId: z.string().optional(),
                limit: z.number().int().min(1).max(60).optional(),
            },
        },
        async ({ departmentId: deptId, destinationId, limit }) => {
            const refugios = await getRefugiosKnowledge(
                catalogScope(deptId),
                { destinationId, limit }
            );
            return {
                content: [
                    { type: 'text' as const, text: JSON.stringify({ count: refugios.length, refugios }) },
                ],
            };
        }
    );

    server.registerTool(
        'hidden_get_coupons',
        {
            description: 'List partner coupons for the department.',
            inputSchema: {
                departmentId,
                limit: z.number().int().min(1).max(60).optional(),
            },
        },
        async ({ departmentId: deptId, limit }) => {
            const coupons = await getCouponsKnowledge(catalogScope(deptId), { limit });
            return {
                content: [
                    { type: 'text' as const, text: JSON.stringify({ count: coupons.length, coupons }) },
                ],
            };
        }
    );

    server.registerTool(
        'hidden_get_events',
        {
            description: 'List fairs, festivals and events.',
            inputSchema: {
                departmentId,
                limit: z.number().int().min(1).max(60).optional(),
            },
        },
        async ({ departmentId: deptId, limit }) => {
            const events = await getEventsKnowledge(catalogScope(deptId), { limit });
            return {
                content: [
                    { type: 'text' as const, text: JSON.stringify({ count: events.length, events }) },
                ],
            };
        }
    );

    server.registerTool(
        'hidden_get_news',
        {
            description: 'List news and announcements.',
            inputSchema: {
                departmentId,
                limit: z.number().int().min(1).max(40).optional(),
            },
        },
        async ({ departmentId: deptId, limit }) => {
            const news = await getNewsKnowledge(catalogScope(deptId), { limit });
            return {
                content: [
                    { type: 'text' as const, text: JSON.stringify({ count: news.length, news }) },
                ],
            };
        }
    );
}
