"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type ContactField = {
  name: string;
  label: string;
  type: "text" | "email" | "tel" | "textarea" | "select";
  required: boolean;
  options: string;
  fullWidth: boolean;
};

type Props = {
  fields: ContactField[];
  submitLabel: string;
  successMode: "inline" | "redirect";
  successMessage: string;
  successPath: string;
  receiverToken: string;
  formName: string;
};

export default function ContactForm({
  fields,
  submitLabel,
  successMode,
  successMessage,
  successPath,
  receiverToken,
  formName,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const form = e.currentTarget;
    const entries = Object.fromEntries(new FormData(form).entries());
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...entries, _form: formName, _rt: receiverToken }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || "Something went wrong. Please try again.");
      }
      if (successMode === "redirect") {
        router.push(successPath || "/thank-you");
        return;
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="cms-form-success" role="status">
        {successMessage || "Thanks. We'll be in touch shortly."}
      </div>
    );
  }

  return (
    <form className="cms-form" onSubmit={onSubmit}>
      {fields.map((f) => {
        const id = `cf-${f.name}`;
        const opts = f.options
          .split(/\n|,/)
          .map((o) => o.trim())
          .filter(Boolean);
        return (
          <div
            key={f.name}
            className={`cms-field${f.fullWidth || f.type === "textarea" ? " cms-field-full" : ""}${f.type === "select" ? " cms-field-select" : ""}`}
          >
            <label htmlFor={id}>{f.label}</label>
            {f.type === "textarea" ? (
              <textarea id={id} name={f.name} rows={5} required={f.required} />
            ) : f.type === "select" ? (
              <select id={id} name={f.name} defaultValue={opts[0] ?? ""} required={f.required}>
                {opts.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : (
              <input id={id} name={f.name} type={f.type} required={f.required} />
            )}
          </div>
        );
      })}
      <div className="cms-hp" aria-hidden>
        <label htmlFor="cf-website">Website</label>
        <input id="cf-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      {error && <p className="cms-form-error">{error}</p>}
      <button className="cms-btn cms-btn-primary" type="submit" disabled={busy}>
        {busy ? "Sending..." : submitLabel}
      </button>
    </form>
  );
}
