# Installing cubrik MCP (for AI agents doing the installation)

cubrik's MCP server is remote; nothing is installed locally.

- **Server URL:** `https://mcp.cubrik.ai/mcp`
- **Transport:** Streamable HTTP
- **Authentication:** OAuth 2.1 (PKCE, dynamic client registration). The first call returns `401`
  with a `WWW-Authenticate` header pointing at the protected resource metadata; the client then
  opens cubrik's sign-in in the browser. There is no API key and no environment variable to set.

Examples:

```bash
claude mcp add --transport http cubrik https://mcp.cubrik.ai/mcp
```

```json
{ "mcpServers": { "cubrik": { "url": "https://mcp.cubrik.ai/mcp" } } }
```

The user needs a cubrik account on the Intermediate plan or above (https://app.cubrik.ai). To trade,
they connect a broker or exchange in cubrik first (Settings → Brokers); keys are never entered in
the AI app.
