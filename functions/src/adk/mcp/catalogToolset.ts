import path from 'path';
import { MCPToolset } from '@google/adk';

const MCP_CATALOG_TOOLS = [
    'hidden_get_department',
    'hidden_get_destinations',
    'hidden_get_refugios',
    'hidden_get_coupons',
    'hidden_get_events',
    'hidden_get_news',
];

const cachedToolsets = new Map<string, MCPToolset>();

function stdioServerEntryPath(): string {
    return path.join(__dirname, '..', '..', 'mcp', 'stdioEntry.js');
}

/**
 * Cached MCPToolset for the Hidden catalog (stdio child process), scoped per department.
 * The child server receives HIDDEN_MCP_DEPARTMENT and clamps every tool call to it,
 * so the model cannot query data outside the session's department.
 */
export async function getCatalogMcpToolset(
    departmentId: string,
    appLanguage: 'es' | 'en' = 'es'
): Promise<MCPToolset | null> {
    const cacheKey = `${departmentId}:${appLanguage}`;
    const cached = cachedToolsets.get(cacheKey);
    if (cached) return cached;

    try {
        const toolset = new MCPToolset(
            {
                type: 'StdioConnectionParams',
                serverParams: {
                    command: 'node',
                    args: [stdioServerEntryPath()],
                    env: {
                        ...process.env,
                        HIDDEN_MCP_DEPARTMENT: departmentId,
                        HIDDEN_MCP_LANGUAGE: appLanguage,
                    } as Record<string, string>,
                },
                timeout: 30_000,
            },
            MCP_CATALOG_TOOLS,
            'mcp'
        );

        await toolset.getTools();
        cachedToolsets.set(cacheKey, toolset);
        console.log(`[ADK] MCP catalog toolset connected (stdio, scope: ${departmentId}, lang: ${appLanguage})`);
        return toolset;
    } catch (err) {
        // Only successful toolsets are cached; a failure (possibly transient or
        // department-specific) must not disable MCP globally for the instance.
        console.warn('[ADK] MCP catalog toolset unavailable (will retry next request):', err);
        return null;
    }
}
