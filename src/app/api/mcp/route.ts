import { handleMcpPost, mcpOptions, mcpMethodNotAllowed } from "@/lib/mcp/server";

export const dynamic = "force-dynamic";

export function POST(request: Request) {
  return handleMcpPost(request, "");
}

export function OPTIONS() {
  return mcpOptions();
}

export function GET() {
  return mcpMethodNotAllowed();
}

export function DELETE() {
  return mcpMethodNotAllowed();
}
