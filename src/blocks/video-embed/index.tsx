import { z } from "zod";
import { defineBlock } from "@/blocks/types";

const schema = z.object({
  url: z.string(),
  caption: z.string(),
});

type Props = z.infer<typeof schema>;

function toEmbedUrl(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  if (url.includes("/embed/")) return url;
  return null;
}

export default defineBlock<Props>({
  type: "video-embed",
  label: "Video",
  description: "YouTube or Vimeo embed",
  icon: "▶",
  schema,
  defaults: { url: "", caption: "" },
  fields: [
    { kind: "text", name: "url", label: "Video URL (YouTube or Vimeo)" },
    { kind: "text", name: "caption", label: "Caption" },
  ],
  Render: (p) => {
    const embed = p.url ? toEmbedUrl(p.url) : null;
    return (
      <figure className="cms-container cms-block">
        {embed ? (
          <div className="cms-video">
            <iframe src={embed} title={p.caption || "Video"} allowFullScreen loading="lazy" />
          </div>
        ) : (
          <div className="cms-image-placeholder">Paste a YouTube or Vimeo URL in the settings panel</div>
        )}
        {p.caption && <figcaption>{p.caption}</figcaption>}
      </figure>
    );
  },
});
