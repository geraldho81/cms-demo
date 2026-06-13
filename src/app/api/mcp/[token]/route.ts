import { handleMcpPost, mcpOptions, mcpMethodNotAllowed } from "@/lib/mcp/server";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ token: string }> };

export async function POST(request: Request, { params }: Params) {
  const { token } = await params;
  return handleMcpPost(request, decodeURIComponent(token));
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
