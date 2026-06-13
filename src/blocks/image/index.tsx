import { z } from "zod";
import { defineBlock } from "@/blocks/types";

const schema = z.object({
  url: z.string(),
  alt: z.string(),
  caption: z.string(),
  width: z.enum(["normal", "wide", "full"]),
  rounded: z.boolean(),
});

type Props = z.infer<typeof schema>;

export default defineBlock<Props>({
  type: "image",
  label: "Image",
  description: "Single image with optional caption",
  icon: "🖼",
  schema,
  defaults: { url: "", alt: "", caption: "", width: "normal", rounded: true },
  fields: [
    { kind: "image", name: "url", label: "Image" },
    { kind: "text", name: "alt", label: "Alt text" },
    { kind: "text", name: "caption", label: "Caption" },
    {
      kind: "select",
      name: "width",
      label: "Width",
      options: [
        { value: "normal", label: "Normal" },
        { value: "wide", label: "Wide" },
        { value: "full", label: "Full bleed" },
      ],
    },
    { kind: "toggle", name: "rounded", label: "Rounded corners" },
  ],
  Render: (p) => (
    <figure className={`cms-block cms-image cms-image-${p.width}`}>
      {p.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.url} alt={p.alt} style={{ borderRadius: p.rounded && p.width !== "full" ? "var(--radius)" : 0 }} />
      ) : (
        <div className="cms-image-placeholder">Choose an image in the settings panel</div>
      )}
      {p.caption && <figcaption>{p.caption}</figcaption>}
    </figure>
  ),
});
