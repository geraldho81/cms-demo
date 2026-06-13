import { z } from "zod";
import { defineBlock } from "@/blocks/types";

const schema = z.object({
  size: z.enum(["small", "medium", "large"]),
  divider: z.boolean(),
});

type Props = z.infer<typeof schema>;

const SIZES = { small: "1.5rem", medium: "3rem", large: "6rem" };

export default defineBlock<Props>({
  type: "spacer",
  label: "Spacer",
  description: "Vertical space, optionally with a divider line",
  icon: "↕",
  schema,
  defaults: { size: "medium", divider: false },
  fields: [
    {
      kind: "select",
      name: "size",
      label: "Size",
      options: [
        { value: "small", label: "Small" },
        { value: "medium", label: "Medium" },
        { value: "large", label: "Large" },
      ],
    },
    { kind: "toggle", name: "divider", label: "Show divider line" },
  ],
  Render: (p) => (
    <div className="cms-container" style={{ paddingTop: `calc(${SIZES[p.size]} / 2)`, paddingBottom: `calc(${SIZES[p.size]} / 2)` }}>
      {p.divider && <hr className="cms-divider" />}
    </div>
  ),
});
