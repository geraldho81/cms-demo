"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ContactField } from "@/db/schema";
import { createContactForm, updateContactForm, deleteContactForm, type ContactFormInput } from "@/app/admin/actions";

export type FormRow = ContactFormInput & { id: string; submissionCount: number };

const FIELD_TYPES = [
  { value: "text", label: "Text" },
  { value: "email", label: "Email" },
  { value: "tel", label: "Phone" },
  { value: "textarea", label: "Long text" },
  { value: "select", label: "Dropdown" },
] as const;

function blankForm(): ContactFormInput {
  return {
    name: "",
    fields: [
      { name: "name", label: "Name", type: "text", required: true, options: "", fullWidth: false },
      { name: "email", label: "Email", type: "email", required: true, options: "", fullWidth: false },
      { name: "message", label: "Message", type: "textarea", required: false, options: "", fullWidth: true },
    ],
    submitLabel: "Send message",
    receiverEmail: "",
    formName: "",
    successMode: "inline",
    successMessage: "Thanks. We'll be in touch shortly.",
    successPath: "/thank-you",
  };
}

export function ContactsManager({ initial }: { initial: FormRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<{ id: string | null; data: ContactFormInput } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function run(fn: () => Promise<unknown>) {
    setError(null);
    setBusy(true);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <FormBuilder
        initial={editing.data}
        busy={busy}
        error={error}
        onCancel={() => {
          setEditing(null);
          setError(null);
        }}
        onSave={(data) =>
          run(async () => {
            if (editing.id) await updateContactForm(editing.id, data);
            else await createContactForm(data);
            setEditing(null);
          })
        }
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="mb-1 text-2xl font-bold tracking-tight">Contacts</h1>
          <p className="text-sm" style={{ color: "var(--ad-muted)" }}>
            Build a form once, then drop it on any page with the Contact form block. Edit it here and every page updates.
          </p>
        </div>
        <Link href="/admin/contacts/submissions" className="ad-btn ad-btn-soft shrink-0">
          View submissions
        </Link>
      </div>

      <button className="ad-btn ad-btn-primary mb-6" onClick={() => setEditing({ id: null, data: blankForm() })}>
        + New form
      </button>

      {error && <p className="mb-4 text-sm" style={{ color: "var(--ad-danger)" }}>{error}</p>}

      {initial.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center text-sm" style={{ color: "var(--ad-muted)" }}>
          No forms yet. Create your first one to start collecting leads.
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {initial.map((f) => (
            <div key={f.id} className="flex items-center gap-4 rounded-xl bg-white px-5 py-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{f.name}</p>
                <p className="mt-0.5 text-xs" style={{ color: "var(--ad-muted)" }}>
                  {f.fields.length} field{f.fields.length === 1 ? "" : "s"}
                  {" · "}
                  {f.receiverEmail ? `sends to ${f.receiverEmail}` : "no receiver email"}
                  {" · "}
                  {f.submissionCount} lead{f.submissionCount === 1 ? "" : "s"}
                </p>
              </div>
              {confirmId === f.id ? (
                <span className="inline-flex shrink-0 gap-1.5">
                  <button
                    className="ad-btn ad-btn-danger"
                    style={{ padding: "0.3rem 0.6rem", fontSize: "0.7rem" }}
                    disabled={busy}
                    onClick={() => run(async () => { await deleteContactForm(f.id); setConfirmId(null); })}
                  >
                    Confirm delete
                  </button>
                  <button className="ad-btn ad-btn-soft" style={{ padding: "0.3rem 0.6rem", fontSize: "0.7rem" }} onClick={() => setConfirmId(null)}>
                    Cancel
                  </button>
                </span>
              ) : (
                <span className="inline-flex shrink-0 gap-1.5">
                  <button
                    className="ad-btn ad-btn-soft"
                    style={{ padding: "0.3rem 0.6rem", fontSize: "0.7rem" }}
                    onClick={() => {
                      const { id, submissionCount, ...data } = f;
                      void submissionCount;
                      setEditing({ id, data });
                    }}
                  >
                    Edit
                  </button>
                  <button className="ad-btn ad-btn-danger" style={{ padding: "0.3rem 0.6rem", fontSize: "0.7rem" }} onClick={() => setConfirmId(f.id)}>
                    Delete
                  </button>
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative h-5 w-9 shrink-0 rounded-full transition-colors"
      style={{ background: checked ? "var(--ad-accent)" : "#d6d6d0" }}
    >
      <span className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all" style={{ left: checked ? "calc(100% - 18px)" : "2px" }} />
    </button>
  );
}

function FormBuilder({
  initial,
  busy,
  error,
  onSave,
  onCancel,
}: {
  initial: ContactFormInput;
  busy: boolean;
  error: string | null;
  onSave: (data: ContactFormInput) => void;
  onCancel: () => void;
}) {
  const [data, setData] = useState<ContactFormInput>(initial);
  const set = (patch: Partial<ContactFormInput>) => setData((d) => ({ ...d, ...patch }));

  function setField(i: number, patch: Partial<ContactField>) {
    set({ fields: data.fields.map((f, j) => (j === i ? { ...f, ...patch } : f)) });
  }
  function addField() {
    set({ fields: [...data.fields, { name: "", label: "", type: "text", required: false, options: "", fullWidth: false }] });
  }
  function removeField(i: number) {
    set({ fields: data.fields.filter((_, j) => j !== i) });
  }
  function moveField(i: number, dir: -1 | 1) {
    const next = [...data.fields];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    set({ fields: next });
  }
  // Mirror the label into the key while the key is still empty/untouched.
  function slug(s: string) {
    return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  }

  return (
    <div className="mx-auto max-w-2xl px-8 py-10">
      <button className="mb-4 text-sm font-medium" style={{ color: "var(--ad-muted)" }} onClick={onCancel}>
        ← Back to forms
      </button>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">{initial.name ? "Edit form" : "New form"}</h1>

      <div className="ad-field">
        <label className="ad-label">Form name</label>
        <input className="ad-input" placeholder="e.g. Demo request" value={data.name} onChange={(e) => set({ name: e.target.value })} />
        <p className="mt-1 text-[11px]" style={{ color: "var(--ad-muted)" }}>
          Only you see this. It is how you pick the form when adding it to a page.
        </p>
      </div>

      <div className="ad-field">
        <label className="ad-label">Fields</label>
        <div className="flex flex-col gap-2">
          {data.fields.map((f, i) => (
            <div key={i} className="rounded-lg bg-[var(--ad-bg)] p-3">
              <div className="mb-2 flex items-center gap-1.5">
                <input
                  className="ad-input flex-1"
                  placeholder="Label (shown to visitors)"
                  value={f.label}
                  onChange={(e) => {
                    const label = e.target.value;
                    const keyWasAuto = !f.name || f.name === slug(f.label);
                    setField(i, keyWasAuto ? { label, name: slug(label) } : { label });
                  }}
                />
                <button type="button" className="px-1 text-xs" style={{ color: "var(--ad-muted)" }} disabled={i === 0} onClick={() => moveField(i, -1)}>↑</button>
                <button type="button" className="px-1 text-xs" style={{ color: "var(--ad-muted)" }} disabled={i === data.fields.length - 1} onClick={() => moveField(i, 1)}>↓</button>
                <button type="button" className="px-1 text-xs" style={{ color: "var(--ad-danger)" }} onClick={() => removeField(i)}>✕</button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select className="ad-select" value={f.type} onChange={(e) => setField(i, { type: e.target.value as ContactField["type"] })}>
                  {FIELD_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <input className="ad-input" placeholder="Field key" value={f.name} onChange={(e) => setField(i, { name: e.target.value })} />
              </div>
              {f.type === "select" && (
                <textarea
                  className="ad-textarea mt-2"
                  rows={3}
                  placeholder="Dropdown options, one per line"
                  value={f.options}
                  onChange={(e) => setField(i, { options: e.target.value })}
                />
              )}
              <div className="mt-2 flex items-center gap-6">
                <label className="flex items-center gap-2 text-xs font-medium">
                  <Toggle checked={f.required} onChange={(v) => setField(i, { required: v })} /> Required
                </label>
                <label className="flex items-center gap-2 text-xs font-medium">
                  <Toggle checked={f.fullWidth} onChange={(v) => setField(i, { fullWidth: v })} /> Full width
                </label>
              </div>
            </div>
          ))}
        </div>
        <button type="button" className="ad-btn ad-btn-soft mt-2 w-full" onClick={addField}>+ Add field</button>
      </div>

      <div className="ad-field">
        <label className="ad-label">Send submissions to (email)</label>
        <input className="ad-input" type="email" placeholder="you@company.com" value={data.receiverEmail} onChange={(e) => set({ receiverEmail: e.target.value })} />
        <p className="mt-1 text-[11px]" style={{ color: "var(--ad-muted)" }}>
          Every submission is saved here in Contacts. If email is configured, a copy is also sent to this address.
        </p>
      </div>

      <div className="ad-field">
        <label className="ad-label">Submit button label</label>
        <input className="ad-input" value={data.submitLabel} onChange={(e) => set({ submitLabel: e.target.value })} />
      </div>

      <div className="ad-field">
        <label className="ad-label">Submissions label</label>
        <input className="ad-input" placeholder="e.g. Demo request" value={data.formName} onChange={(e) => set({ formName: e.target.value })} />
        <p className="mt-1 text-[11px]" style={{ color: "var(--ad-muted)" }}>
          Groups leads under this name in the submissions list. Defaults to the form name.
        </p>
      </div>

      <div className="ad-field">
        <label className="ad-label">After submit</label>
        <select className="ad-select" value={data.successMode} onChange={(e) => set({ successMode: e.target.value as "inline" | "redirect" })}>
          <option value="inline">Show a thank-you message on the same page</option>
          <option value="redirect">Redirect to a thank-you page</option>
        </select>
      </div>

      {data.successMode === "inline" ? (
        <div className="ad-field">
          <label className="ad-label">Thank-you message</label>
          <textarea className="ad-textarea" rows={2} value={data.successMessage} onChange={(e) => set({ successMessage: e.target.value })} />
        </div>
      ) : (
        <div className="ad-field">
          <label className="ad-label">Thank-you page path</label>
          <input className="ad-input" placeholder="/thank-you" value={data.successPath} onChange={(e) => set({ successPath: e.target.value })} />
          <p className="mt-1 text-[11px]" style={{ color: "var(--ad-muted)" }}>
            Create the page under Pages first, then enter its path here (e.g. /thank-you).
          </p>
        </div>
      )}

      {error && <p className="mb-3 text-sm" style={{ color: "var(--ad-danger)" }}>{error}</p>}

      <div className="mt-4 flex gap-2">
        <button className="ad-btn ad-btn-primary" disabled={busy} onClick={() => onSave(data)}>
          {busy ? "Saving..." : "Save form"}
        </button>
        <button className="ad-btn ad-btn-soft" disabled={busy} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
