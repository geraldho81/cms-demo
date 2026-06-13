import { blockList } from "@/blocks/registry";
import { requireApiKey } from "@/lib/api-auth";

/** Machine-readable block catalog so agents can discover available block types. */
export async function GET(request: Request) {
  const denied = await requireApiKey(request);
  if (denied) return denied;
  return Response.json({
    blocks: blockList.map((def) => ({
      type: def.type,
      label: def.label,
      description: def.description,
      defaults: def.defaults,
      fields: def.fields,
      hasZones: !!def.zoneCount,
    })),
  });
}
