import { z } from "zod";
import { defineBlock } from "@/blocks/types";
import ContactForm, { type ContactField } from "@/components/site/ContactForm";

const fieldSchema = z.object({
  name: z.string(),
  label: z.string(),
  type: z.enum(["text", "email", "tel", "textarea", "select"]),
  required: z.boolean(),
  options: z.string(),
  fullWidth: z.boolean(),
});

const schema = z.object({
  eyebrow: z.string(),
  heading: z.string(),
  body: z.string(),
  fields: z.array(fieldSchema),
  submitLabel: z.string(),
  receiverEmail: z.string(),
  formName: z.string(),
  successMode: z.enum(["inline", "redirect"]),
  successMessage: z.string(),
  successPath: z.string(),
});

type Props = z.infer<typeof schema>;

const defaultFields: ContactField[] = [
  { name: "name", label: "Name", type: "text", required: true, options: "", fullWidth: false },
  { name: "email", label: "Email", type: "email", required: true, options: "", fullWidth: false },
  { name: "message", label: "Message", type: "textarea", required: false, options: "", fullWidth: true },
];

export default defineBlock<Props>({
  type: "contact-form",
  label: "Contact form",
  description: "Configurable form: define your own fields, set the receiver, reply inline or redirect.",
  icon: "✉",
  schema,
  defaults: {
    eyebrow: "",
    heading: "Get in touch",
    body: "Tell us a little about what you need and we'll get back to you.",
    fields: defaultFields,
    submitLabel: "Send message",
    receiverEmail: "",
    formName: "Contact",
    successMode: "inline",
    successMessage: "Thanks. We'll be in touch shortly.",
    successPath: "/thank-you",
  },
  fields: [
    { kind: "text", name: "eyebrow", label: "Eyebrow (optional)" },
    { kind: "text", name: "heading", label: "Heading" },
    { kind: "textarea", name: "body", label: "Intro text", rows: 3 },
    {
      kind: "list",
      name: "fields",
      label: "Form fields",
      itemLabel: "Field",
      fields: [
        { kind: "text", name: "label", label: "Label (shown to visitor)" },
        { kind: "text", name: "name", label: "Field key (lowercase, no spaces)" },
        {
          kind: "select",
          name: "type",
          label: "Type",
          options: [
            { value: "text", label: "Text" },
            { value: "email", label: "Email" },
            { value: "tel", label: "Phone" },
            { value: "textarea", label: "Long text" },
            { value: "select", label: "Dropdown" },
          ],
        },
        { kind: "textarea", name: "options", label: "Dropdown options (one per line)", rows: 3 },
        { kind: "toggle", name: "required", label: "Required" },
        { kind: "toggle", name: "fullWidth", label: "Full width" },
      ],
    },
    { kind: "text", name: "submitLabel", label: "Submit button label" },
    { kind: "text", name: "receiverEmail", label: "Send submissions to (email)" },
    { kind: "text", name: "formName", label: "Form name (labels submissions)" },
    {
      kind: "select",
      name: "successMode",
      label: "After submit",
      options: [
        { value: "inline", label: "Show a thank-you message on the same page" },
        { value: "redirect", label: "Redirect to a thank-you page" },
      ],
    },
    { kind: "textarea", name: "successMessage", label: "Thank-you message (inline)", rows: 2 },
    { kind: "page", name: "successPath", label: "Thank-you page (redirect)", placeholder: "Select a thank-you page..." },
  ],
  // Sign the receiver server-side so the browser never carries a forgeable
  // recipient address (see src/lib/contact-token.ts).
  getData: async (props) => {
    if (!props.receiverEmail) return { token: "" };
    const { signReceiver } = await import("@/lib/contact-token");
    return { token: signReceiver(props.receiverEmail) };
  },
  Render: (p) => {
    const token = (p.ctx?.data as { token?: string } | undefined)?.token ?? "";
    return (
      <section className="cms-container cms-block cms-form-section">
        <div className="cms-form-layout">
          <div className="cms-form-intro">
            {p.eyebrow && <p className="cms-eyebrow">{p.eyebrow}</p>}
            {p.heading && <h2>{p.heading}</h2>}
            {p.body && p.body.split(/\n\s*\n/).map((para, i) => <p key={i}>{para}</p>)}
          </div>
          <div>
            <ContactForm
              fields={p.fields}
              submitLabel={p.submitLabel}
              successMode={p.successMode}
              successMessage={p.successMessage}
              successPath={p.successPath}
              receiverToken={token}
              formName={p.formName}
            />
          </div>
        </div>
      </section>
    );
  },
  Preview: (p) => (
    <section className="cms-container cms-block cms-form-section">
      <div className="cms-form-layout">
        <div className="cms-form-intro">
          {p.eyebrow && <p className="cms-eyebrow">{p.eyebrow}</p>}
          {p.heading && <h2>{p.heading}</h2>}
          {p.body && p.body.split(/\n\s*\n/).map((para, i) => <p key={i}>{para}</p>)}
        </div>
        <div>
          <ContactForm
            fields={p.fields}
            submitLabel={p.submitLabel}
            successMode={p.successMode}
            successMessage={p.successMessage}
            successPath={p.successPath}
            receiverToken=""
            formName={p.formName}
          />
        </div>
      </div>
    </section>
  ),
});
