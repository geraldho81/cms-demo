import { z } from "zod";
import { defineBlock } from "@/blocks/types";

const schema = z.object({
  heading: z.string(),
  items: z.array(
    z.object({
      q: z.string(),
      a: z.string(),
    })
  ),
});

type Props = z.infer<typeof schema>;

export default defineBlock<Props>({
  type: "faq-accordion",
  label: "FAQ",
  description: "Expandable list of questions and answers",
  icon: "?",
  schema,
  defaults: {
    heading: "Frequently asked questions",
    items: [
      { q: "What is this?", a: "Answer the question in plain language." },
      { q: "How much does it cost?", a: "Answer the question in plain language." },
    ],
  },
  fields: [
    { kind: "text", name: "heading", label: "Heading" },
    {
      kind: "list",
      name: "items",
      label: "Questions",
      itemLabel: "Question",
      fields: [
        { kind: "text", name: "q", label: "Question" },
        { kind: "textarea", name: "a", label: "Answer", rows: 3 },
      ],
    },
  ],
  Render: (p) => (
    <section className="cms-container cms-block cms-narrow">
      {p.heading && <h2 className="cms-faq-heading">{p.heading}</h2>}
      <div className="cms-faq">
        {p.items.map((item, i) => (
          <details key={i}>
            <summary>{item.q}</summary>
            <p>{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  ),
});
