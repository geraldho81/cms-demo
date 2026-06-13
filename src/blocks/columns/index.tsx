import { z } from "zod";
import { defineBlock } from "@/blocks/types";

const schema = z.object({
  count: z.enum(["2", "3"]),
  gap: z.enum(["normal", "large"]),
  verticalAlign: z.enum(["top", "center"]),
});

type Props = z.infer<typeof schema>;

/**
 * Container block: each column is a child zone holding any other blocks.
 * The editor lets you add blocks inside each column.
 */
export default defineBlock<Props>({
  type: "columns",
  label: "Columns",
  description: "Side-by-side layout, each column holds other blocks",
  icon: "▥",
  schema,
  defaults: { count: "2", gap: "normal", verticalAlign: "top" },
  fields: [
    {
      kind: "select",
      name: "count",
      label: "Columns",
      options: [
        { value: "2", label: "2" },
        { value: "3", label: "3" },
      ],
    },
    {
      kind: "select",
      name: "gap",
      label: "Gap",
      options: [
        { value: "normal", label: "Normal" },
        { value: "large", label: "Large" },
      ],
    },
    {
      kind: "select",
      name: "verticalAlign",
      label: "Vertical alignment",
      options: [
        { value: "top", label: "Top" },
        { value: "center", label: "Center" },
      ],
    },
  ],
  zoneCount: (p) => Number(p.count),
  Render: (p) => (
    <div className="cms-container cms-block">
      <div
        className="cms-columns"
        style={{
          gridTemplateColumns: `repeat(${p.count}, 1fr)`,
          gap: p.gap === "large" ? "4rem" : "2rem",
          alignItems: p.verticalAlign === "center" ? "center" : "start",
        }}
      >
        {Array.from({ length: Number(p.count) }, (_, i) => (
          <div className="cms-column" key={i}>
            {p.ctx?.zones?.[i]}
          </div>
        ))}
      </div>
    </div>
  ),
});
