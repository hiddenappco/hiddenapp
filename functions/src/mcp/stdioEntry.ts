/**
 * Stdio MCP server — spawned by ADK MCPToolset from chatAgent.
 * Logs must go to stderr only (stdout is the MCP wire protocol).
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import '../config/firebase';
import { registerHiddenCatalogTools } from './registerCatalogTools';

async function main(): Promise<void> {
    const server = new McpServer(
        { name: 'hidden-catalog-mcp', version: '1.0.0' },
        {
            instructions:
                'Hidden App expedition catalog — department profiles, destinations, refugios, coupons, events and news from Firestore.',
        }
    );

    registerHiddenCatalogTools(server);

    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('[hidden-mcp] stdio catalog server ready');
}

main().catch((err) => {
    console.error('[hidden-mcp] fatal:', err);
    process.exit(1);
});
