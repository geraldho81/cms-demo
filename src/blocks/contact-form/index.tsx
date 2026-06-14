import { z } from "zod";
import { defineBlock } from "@/blocks/types";
import ContactForm, { type ContactField } from "@/components/site/ContactForm";
import ContactFormBlockPreview from "@/components/admin/ContactFormBlockPreview";
import type { ContactForm as ContactFormRow } from "@/db/schema";

const fieldSchema = z.object({
  name: z.string(),
  label: z.string(),
  type: z.enum(["text", "email", "tel", "textarea", "select"]),
  required: z.boolean(),
  options: z.string(),
  fullWidth: z.boolean(),
});

const schema = z.object({
  formId: z.string(),
  eyebrow: z.string(),
  heading: z.string(),
  body: z.string(),
  // Legacy inline config - kept so older blocks (no formId) still validate and render.
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

// Resolve the form config: a saved form wins, otherwise fall back to the block's
// own legacy inline props (so pre-existing contact-form blocks keep working).
function resolve(p: Props, form: ContactFormRow | null) {
  if (form) {
    return {
      fields: form.fields,
      submitLabel: form.submitLabel,
      successMode: form.successMode,
      successMessage: form.successMessage,
      successPath: form.successPath,
      formName: form.formName,
    };
  }
  return {
    fields: p.fields,
    submitLabel: p.submitLabel,
    successMode: p.successMode,
    successMessage: p.successMessage,
    successPath: p.successPath,
    formName: p.formName,
  };
}

export default defineBlock<Props>({
  type: "contact-form",
  label: "Contact form",
  description: "Drop in a form you built under Contacts: define it once, reuse it on any page.",
  icon: "✉",
  schema,
  defaults: {
    formId: "",
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
    { kind: "contactForm", name: "formId", label: "Form", placeholder: "Choose a saved form..." },
    { kind: "text", name: "eyebrow", label: "Eyebrow (optional)" },
    { kind: "text", name: "heading", label: "Heading" },
    { kind: "textarea", name: "body", label: "Intro text", rows: 3 },
  ],
  // Load the saved form server-side and sign its receiver so the browser never
  // carries a forgeable recipient address (see src/lib/contact-token.ts).
  getData: async (props) => {
    let form: ContactFormRow | null = null;
    if (props.formId) {
      const { getContactFormById } = await import("@/lib/queries");
      form = await getContactFormById(props.formId);
    }
    const receiverEmail = form ? form.receiverEmail : props.receiverEmail;
    if (!receiverEmail) return { token: "", form };
    const { signReceiver } = await import("@/lib/contact-token");
    return { token: signReceiver(receiverEmail), form };
  },
  Render: (p) => {
    const data = p.ctx?.data as { token?: string; form?: ContactFormRow | null } | undefined;
    const token = data?.token ?? "";
    const cfg = resolve(p, data?.form ?? null);
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
              fields={cfg.fields}
              submitLabel={cfg.submitLabel}
              successMode={cfg.successMode}
              successMessage={cfg.successMessage}
              successPath={cfg.successPath}
              receiverToken={token}
              formName={cfg.formName}
            />
          </div>
        </div>
      </section>
    );
  },
  Preview: (p) => <ContactFormBlockPreview {...p} />,
});
