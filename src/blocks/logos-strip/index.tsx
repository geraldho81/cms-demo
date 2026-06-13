import { z } from "zod";
import { defineBlock } from "@/blocks/types";

const schema = z.object({
  heading: z.string(),
  logos: z.array(
    z.object({
      url: z.string(),
      alt: z.string(),
    })
  ),
});

type Props = z.infer<typeof schema>;

export default defineBlock<Props>({
  type: "logos-strip",
  label: "Logo strip",
  description: "Row of partner or client logos",
  icon: "◦◦◦",
  schema,
  defaults: { heading: "Trusted by teams everywhere", logos: [] },
  fields: [
    { kind: "text", name: "heading", label: "Heading" },
    {
      kind: "list",
      name: "logos",
      label: "Logos",
      itemLabel: "Logo",
      fields: [
        { kind: "image", name: "url", label: "Logo image" },
        { kind: "text", name: "alt", label: "Company name" },
      ],
    },
  ],
  Render: (p) => (
    <div className="cms-container cms-block">
      {p.heading && <p className="cms-logos-heading">{p.heading}</p>}
      {p.logos.length === 0 ? (
        <div className="cms-image-placeholder">Add logos in the settings panel</div>
      ) : (
        <div className="cms-logos">
          {p.logos.map((logo, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={logo.url} alt={logo.alt} />
          ))}
        </div>
      )}
    </div>
  ),
});
