import { LlmAgent, type ToolUnion } from '@google/adk';
import { getCatalogMcpToolset } from '../mcp/catalogToolset';
import { createPlanExpeditionTool, type ExpeditionToolContext } from './expeditionTool';
import { createCatalogRagTools, type CatalogToolContext } from './ragTools';
import { createLiveConditionsTool, type LiveConditionsToolContext } from './rangerTool';
import { createCheckRouteStatusTool, type RouteToolContext } from './tools';

export interface HyperlocalChatBuildContext {
    route: RouteToolContext;
    catalog: CatalogToolContext;
    liveConditions: LiveConditionsToolContext;
    expedition: ExpeditionToolContext;
    /** Session-scoped briefing: personality, rules, catalog access, output format. */
    instruction: string;
}

const BASE_INSTRUCTION = `You are a Hidden App hyperlocal expedition guide.

CATALOG ACCESS (Agentic RAG):
- Prefer MCP tools (mcp_hidden_get_*) when available for department, destinations, refugios, coupons, events, news.
- Otherwise use getDepartment, getDestinations, getRefugios, getCoupons, getEvents, getNews FunctionTools.
- Use checkRouteStatus for travel, traffic, routes, tolls, or "how to get there".
- Use getLiveConditions for CURRENT weather, live conditions, tides, air quality or environmental safety at a destination.
- Use planExpedition when the user asks to plan a multi-day trip, expedition or itinerary. It runs in the background: reply that the plan is being prepared and include the expedition widget exactly as the tool instructs.

Never invent prices, routes, weather, or catalog entries. Always fetch real data via tools before citing fichas.
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

/**
 * Builds chat agent with MCP catalog toolset (pilot) + FunctionTool RAG fallback
 * + route analysis + live environmental conditions (Ranger as a tool).
 */
export async function buildHyperlocalChatAgent(
    ctx: HyperlocalChatBuildContext
): Promise<LlmAgent> {
    const routeTool = createCheckRouteStatusTool(ctx.route);
    const liveConditionsTool = createLiveConditionsTool(ctx.liveConditions);
    const expeditionTool = createPlanExpeditionTool(ctx.expedition);
    const mcpToolset = await getCatalogMcpToolset(ctx.catalog.departmentId);

    if (mcpToolset) {
        return createHyperlocalChatAgent(
            [mcpToolset, routeTool, liveConditionsTool, expeditionTool],
            ctx.instruction
        );
    }

    const ragTools = createCatalogRagTools(ctx.catalog);
    return createHyperlocalChatAgent(
        [...ragTools, routeTool, liveConditionsTool, expeditionTool],
        ctx.instruction
    );
}
