import { LlmAgent, type ToolUnion } from '@google/adk';
import { getCatalogMcpToolset } from '../mcp/catalogToolset';
import { createCatalogRagTools, type CatalogToolContext } from './ragTools';
import { createLiveConditionsTool, type LiveConditionsToolContext } from './rangerTool';
import { createCheckRouteStatusTool, type RouteToolContext } from './tools';

export interface HyperlocalChatBuildContext {
    route: RouteToolContext;
    catalog: CatalogToolContext;
    liveConditions: LiveConditionsToolContext;
    /** Canonical department id — used for planner deep links in instructions. */
    departmentId: string;
    instruction: string;
}

const BASE_INSTRUCTION = `You are a Hidden App hyperlocal expedition guide.

CATALOG ACCESS (Agentic RAG):
- Prefer MCP tools (mcp_hidden_get_*) when available for department, destinations, refugios, coupons, events, news.
- Otherwise use getDepartment, getDestinations, getRefugios, getCoupons, getEvents, getNews FunctionTools.
- Use checkRouteStatus for travel, traffic, routes, tolls, or "how to get there".
- Use getLiveConditions for CURRENT weather, live conditions, tides, air quality or environmental safety at a destination.

MULTI-DAY / MULTI-DESTINATION TRIPS:
- You do NOT run the full expedition planner. If the user wants an itinerary across SEVERAL destinations or several days touring the region, warmly direct them to the dedicated Hidden Trip Planner at /expedition/plan/{departmentId}. Offer to help with questions while they plan.
- For ONE destination only: you MAY suggest a day plan (activities, timing) using getDestinations and the destination checklist — keep it tactical and grounded in catalog data.

Never invent prices, routes, weather, or catalog entries. Always fetch real data via tools before citing fichas.
When a destination includes planningNotes (editorial logistics: duration, access, schedules, combinations), use it before improvising from description alone.
Widget ids must come from tool results.`;

function createHyperlocalChatAgent(tools: ToolUnion[], sessionInstruction: string): LlmAgent {
    return new LlmAgent({
        name: 'hidden-hyperlocal-chat',
        description:
            'Expert expedition guide for Hidden App — destinations, refugios, coupons, events, routes and live conditions in one Colombian department.',
        model: 'gemini-2.5-flash',
        instruction: `${BASE_INSTRUCTION}\n\n${sessionInstruction}`,
        tools,
    });
}

export async function buildHyperlocalChatAgent(
    ctx: HyperlocalChatBuildContext
): Promise<LlmAgent> {
    const routeTool = createCheckRouteStatusTool(ctx.route);
    const liveConditionsTool = createLiveConditionsTool(ctx.liveConditions);
    const mcpToolset = await getCatalogMcpToolset(
        ctx.catalog.departmentId,
        ctx.catalog.appLanguage ?? 'es'
    );

    if (mcpToolset) {
        return createHyperlocalChatAgent(
            [mcpToolset, routeTool, liveConditionsTool],
            ctx.instruction
        );
    }

    const ragTools = createCatalogRagTools(ctx.catalog);
    return createHyperlocalChatAgent([...ragTools, routeTool, liveConditionsTool], ctx.instruction);
}
