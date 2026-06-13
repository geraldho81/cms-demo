import { createHash } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import { MCP_TOOLS, callTool } from "@/lib/mcp/tools";

/**
 * Streamable HTTP MCP server core. Speaks JSON-RPC 2.0 over a single POST,
 * shared by /api/mcp (Authorization: Bearer <key>) and /api/mcp/<key> (token in
 * the URL, for clients with no auth field). Stateless: no SSE stream, no
 * session. Reuses the CMS api_keys (SHA-256 hashed) for auth. Read pages and
 * posts, create and update posts - no delete tools are exposed.
 */

export const MCP_CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Mcp-Session-Id, MCP-Protocol-Version",
  "Access-Control-Expose-Headers": "Mcp-Session-Id",
};

function mcpJson(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...MCP_CORS, "Content-Type": "application/json" },
  });
}

function rpcError(id: unknown, code: number, message: string) {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
}

const SUPPORTED_PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];

const INSTRUCTIONS =
  "This connects an AI assistant to a Slim Minima CMS. You can READ the site's pages and blog posts for context, and you can CREATE and UPDATE blog posts. You cannot edit pages (read-only), and nothing can be deleted through this connector. " +
  "Workflow that avoids mistakes: to change an existing post, call find_post_by_title (or list_posts) to get its slug, then get_post to read the current Markdown body, edit that Markdown, and send the full edited body to update_post - content always replaces the whole body. " +
  "Post bodies are Markdown; the CMS converts them automatically. Before putting any image in a post body or hero image, call add_image with the image URL: it returns a hosted URL (uploaded to the user's Cloudinary if connected, otherwise the original URL) plus a ready Markdown snippet. " +
  "New posts land as drafts unless you pass status:'published'. Set a category by name and it is created if missing. Field names are forgiving - snake_case aliases like hero_image_url are accepted everywhere.";

type RpcMessage = { jsonrpc?: string; id?: unknown; method?: string; params?: Record<string, unknown> };

async function resolveToken(token: string): Promise<boolean> {
  if (!token) return false;
  const keyHash = createHash("sha256").update(token).digest("hex");
  const [row] = await db.select({ id: apiKeys.id }).from(apiKeys).where(eq(apiKeys.keyHash, keyHash)).limit(1);
  if (!row) return false;
  db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, row.id)).catch(() => {});
  return true;
}

async function handleRpcMessage(msg: RpcMessage): Promise<Record<string, unknown> | null> {
  // Notifications (no id) need no response.
  if (msg.id === undefined || msg.id === null) return null;

  switch (msg.method) {
    case "initialize": {
      const requested = msg.params?.protocolVersion;
      const protocolVersion =
        typeof requested === "string" && SUPPORTED_PROTOCOL_VERSIONS.includes(requested) ? requested : "2025-06-18";
      return {
        jsonrpc: "2.0",
        id: msg.id,
        result: {
          protocolVersion,
          capabilities: { tools: { listChanged: false } },
          serverInfo: {
            name: "slim-minima",
            title: "Slim Minima CMS",
            version: "1.0.0",
            description: "Read your site's pages and posts, and write blog posts. No delete actions are exposed.",
          },
          instructions: INSTRUCTIONS,
        },
      };
    }
    case "ping":
      return { jsonrpc: "2.0", id: msg.id, result: {} };
    case "tools/list":
      return { jsonrpc: "2.0", id: msg.id, result: { tools: MCP_TOOLS } };
    // Not in capabilities, but many clients probe these and surface the error.
    case "prompts/list":
      return { jsonrpc: "2.0", id: msg.id, result: { prompts: [] } };
    case "resources/list":
      return { jsonrpc: "2.0", id: msg.id, result: { resources: [] } };
    case "resources/templates/list":
      return { jsonrpc: "2.0", id: msg.id, result: { resourceTemplates: [] } };
    case "tools/call": {
      const name = msg.params?.name;
      if (typeof name !== "string") return rpcError(msg.id, -32602, "Missing tool name");
      try {
        const result = await callTool(name, (msg.params?.arguments as Record<string, unknown>) ?? {});
        return {
          jsonrpc: "2.0",
          id: msg.id,
          result: { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Tool call failed";
        return {
          jsonrpc: "2.0",
          id: msg.id,
          result: {
            content: [{ type: "text", text: JSON.stringify({ error: "Tool call failed", message }, null, 2) }],
            isError: true,
          },
        };
      }
    }
    default:
      return rpcError(msg.id, -32601, `Method not found: ${msg.method ?? "unknown"}`);
  }
}

/** Handle a POST to the MCP endpoint. `token` is the URL path token (or ""). */
export async function handleMcpPost(request: Request, token: string): Promise<Response> {
  let resolved = token;
  if (!resolved) {
    const authHeader = request.headers.get("Authorization") ?? "";
    if (authHeader.toLowerCase().startsWith("bearer ")) resolved = authHeader.slice(7).trim();
  }

  if (!(await resolveToken(resolved))) {
    return mcpJson(rpcError(null, -32001, "Invalid or missing Slim Minima MCP token"), 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return mcpJson(rpcError(null, -32700, "Parse error"), 400);
  }

  if (Array.isArray(body)) {
    const responses = [];
    for (const msg of body) {
      const response = await handleRpcMessage(msg as RpcMessage);
      if (response) responses.push(response);
    }
    if (responses.length === 0) return new Response(null, { status: 202, headers: MCP_CORS });
    return mcpJson(responses);
  }

  const response = await handleRpcMessage(body as RpcMessage);
  if (!response) return new Response(null, { status: 202, headers: MCP_CORS });
  return mcpJson(response);
}

export function mcpOptions(): Response {
  return new Response(null, { status: 204, headers: MCP_CORS });
}

export function mcpMethodNotAllowed(): Response {
  return new Response(null, { status: 405, headers: { ...MCP_CORS, Allow: "POST, OPTIONS" } });
}
