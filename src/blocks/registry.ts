// Block registry - the single source of truth for every block type.
//
// To add a block:
//   1. Create src/blocks/<your-block>/index.tsx exporting defineBlock({...})
//   2. Import it here and add it to the list below
// That's it. The editor palette, settings form, validation, REST API and
// public renderer all pick it up automatically. See CLAUDE.md for a walkthrough.

import type { Block, BlockDef } from "@/blocks/types";

import hero from "@/blocks/hero";
import heading from "@/blocks/heading";
import richtext from "@/blocks/richtext";
import image from "@/blocks/image";
import gallery from "@/blocks/gallery";
import columns from "@/blocks/columns";
import cta from "@/blocks/cta";
import featureGrid from "@/blocks/feature-grid";
import testimonial from "@/blocks/testimonial";
import faqAccordion from "@/blocks/faq-accordion";
import pricingTable from "@/blocks/pricing-table";
import videoEmbed from "@/blocks/video-embed";
import htmlEmbed from "@/blocks/html-embed";
import postsList from "@/blocks/posts-list";
import spacer from "@/blocks/spacer";
import logosStrip from "@/blocks/logos-strip";
import contactForm from "@/blocks/contact-form";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ALL: BlockDef<any>[] = [
  hero,
  heading,
  richtext,
  image,
  gallery,
  columns,
  cta,
  featureGrid,
  testimonial,
  faqAccordion,
  pricingTable,
  videoEmbed,
  htmlEmbed,
  postsList,
  spacer,
  logosStrip,
  contactForm,
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const registry: Record<string, BlockDef<any>> = Object.fromEntries(
  ALL.map((def) => [def.type, def])
);

export const blockList = ALL;

/** Validate one block's props against its schema. Returns cleaned props or an error. */
export function validateBlock(block: Block): { ok: true; props: Record<string, unknown> } | { ok: false; error: string } {
  const def = registry[block.type];
  if (!def) return { ok: false, error: `Unknown block type "${block.type}". Known types: ${Object.keys(registry).join(", ")}` };
  const parsed = def.schema.safeParse({ ...def.defaults, ...block.props });
  if (!parsed.success) {
    return { ok: false, error: `Invalid props for "${block.type}": ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}` };
  }
  return { ok: true, props: parsed.data as Record<string, unknown> };
}

/** Validate a whole block tree (including zones). Throws with a readable message on failure. */
export function validateBlocks(blocks: Block[], path = "blocks"): void {
  blocks.forEach((block, i) => {
    const result = validateBlock(block);
    if (!result.ok) throw new Error(`${path}[${i}]: ${result.error}`);
    if (block.zones) {
      block.zones.forEach((zone, z) => validateBlocks(zone, `${path}[${i}].zones[${z}]`));
    }
  });
}
