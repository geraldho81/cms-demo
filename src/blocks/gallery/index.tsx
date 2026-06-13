import { z } from "zod";
import { defineBlock } from "@/blocks/types";

const schema = z.object({
  columns: z.enum(["2", "3", "4"]),
  images: z.array(
    z.object({
      url: z.string(),
      alt: z.string(),
    })
  ),
});

type Props = z.infer<typeof schema>;

export default defineBlock<Props>({
  type: "gallery",
  label: "Gallery",
  description: "Grid of images",
  icon: "▤",
  schema,
  defaults: { columns: "3", images: [] },
  fields: [
    {
      kind: "select",
      name: "columns",
      label: "Columns",
      options: [
        { value: "2", label: "2" },
        { value: "3", label: "3" },
        { value: "4", label: "4" },
      ],
    },
    {
      kind: "list",
      name: "images",
      label: "Images",
      itemLabel: "Image",
      fields: [
        { kind: "image", name: "url", label: "Image" },
        { kind: "text", name: "alt", label: "Alt text" },
      ],
    },
  ],
  Render: (p) => (
    <div className="cms-container cms-block">
      {p.images.length === 0 ? (
        <div className="cms-image-placeholder">Add images in the settings panel</div>
      ) : (
        <div className="cms-grid" style={{ gridTemplateColumns: `repeat(${p.columns}, 1fr)` }}>
          {p.images.map((img, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="cms-gallery-img" key={i} src={img.url} alt={img.alt} />
          ))}
        </div>
      )}
    </div>
  ),
});
