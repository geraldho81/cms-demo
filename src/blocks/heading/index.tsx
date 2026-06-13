import { z } from "zod";
import { defineBlock } from "@/blocks/types";

const schema = z.object({
  text: z.string(),
  level: z.enum(["h2", "h3"]),
  align: z.enum(["left", "center"]),
});

type Props = z.infer<typeof schema>;

export default defineBlock<Props>({
  type: "heading",
  label: "Heading",
  description: "Section heading",
  icon: "H",
  schema,
  defaults: { text: "Section heading", level: "h2", align: "left" },
  fields: [
    { kind: "text", name: "text", label: "Text" },
    {
      kind: "select",
      name: "level",
      label: "Size",
      options: [
        { value: "h2", label: "Large (H2)" },
        { value: "h3", label: "Medium (H3)" },
      ],
    },
    {
      kind: "select",
      name: "align",
      label: "Alignment",
      options: [
        { value: "left", label: "Left" },
        { value: "center", label: "Centered" },
      ],
    },
  ],
  Render: (p) => {
    const Tag = p.level;
    return (
      <div className="cms-container cms-block">
        <Tag style={{ textAlign: p.align }}>{p.text}</Tag>
      </div>
    );
  },
});
