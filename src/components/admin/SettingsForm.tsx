"use client";

import { useRef, useState } from "react";
import { saveSettings } from "@/app/admin/actions";

type Values = {
  siteName: string;
  tagline: string;
  logoUrl: string;
  defaultOgImage: string;
  footerText: string;
  social: { label: string; href: string }[];
  gtmId: string;
};

const GTM_ID_PATTERN = /^GTM-[A-Z0-9]{4,12}$/;

export function SettingsForm({ initial }: { initial: Values }) {
  const [values, setValues] = useState(initial);
  const [state, setState] = useState<"idle" | "dirty" | "saving" | "saved">("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const valuesRef = useRef(values);
  valuesRef.current = values;

  function update(partial: Partial<Values>) {
    setValues((v) => ({ ...v, ...partial }));
    setState("dirty");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setState("saving");
      await saveSettings(valuesRef.current);
      setState("saved");
      setTimeout(() => setState("idle"), 1500);
    }, 800);
  }

  return (
    <section className="mb-6 rounded-xl bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold tracking-tight">Site identity</h2>
        <span className="text-xs" style={{ color: "var(--ad-muted)" }}>
          {state === "saving" ? "Saving..." : state === "saved" ? "Saved" : state === "dirty" ? "Unsaved" : ""}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-4">
        <div className="ad-field">
          <label className="ad-label">Site name</label>
          <input className="ad-input" value={values.siteName} onChange={(e) => update({ siteName: e.target.value })} />
        </div>
        <div className="ad-field">
          <label className="ad-label">Tagline</label>
          <input className="ad-input" value={values.tagline} onChange={(e) => update({ tagline: e.target.value })} />
        </div>
        <div className="ad-field">
          <label className="ad-label">Logo URL (optional)</label>
          <input className="ad-input" value={values.logoUrl} placeholder="https://..." onChange={(e) => update({ logoUrl: e.target.value })} />
        </div>
        <div className="ad-field">
          <label className="ad-label">Default social image URL</label>
          <input className="ad-input" value={values.defaultOgImage} placeholder="https://..." onChange={(e) => update({ defaultOgImage: e.target.value })} />
        </div>
      </div>
      <div className="ad-field">
        <label className="ad-label">Footer text</label>
        <input className="ad-input" value={values.footerText} onChange={(e) => update({ footerText: e.target.value })} />
      </div>

      <label className="ad-label">Social links</label>
      <div className="flex flex-col gap-2">
        {values.social.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              className="ad-input"
              placeholder="Label (e.g. X)"
              value={s.label}
              onChange={(e) => update({ social: values.social.map((it, j) => (j === i ? { ...it, label: e.target.value } : it)) })}
            />
            <input
              className="ad-input"
              placeholder="https://..."
              value={s.href}
              onChange={(e) => update({ social: values.social.map((it, j) => (j === i ? { ...it, href: e.target.value } : it)) })}
            />
            <button className="px-1 text-xs" style={{ color: "var(--ad-danger)" }} onClick={() => update({ social: values.social.filter((_, j) => j !== i) })}>
              ✕
            </button>
          </div>
        ))}
      </div>
      <button className="ad-btn ad-btn-soft mt-2" onClick={() => update({ social: [...values.social, { label: "", href: "" }] })}>
        + Add social link
      </button>

      <div className="mt-6 border-t pt-5" style={{ borderColor: "var(--ad-bg)" }}>
        <h2 className="mb-1 text-sm font-bold tracking-tight">Tracking</h2>
        <p className="mb-3 text-xs" style={{ color: "var(--ad-muted)" }}>
          Paste your Google Tag Manager container ID and the snippet is added to every public page
          automatically. Manage everything else - Google Analytics, Meta Pixel, LinkedIn Insight,
          conversion tags - inside your GTM container, not in the CMS.
        </p>
        <div className="ad-field" style={{ maxWidth: "16rem" }}>
          <label className="ad-label">Google Tag Manager ID</label>
          <input
            className="ad-input"
            placeholder="GTM-XXXXXXX"
            value={values.gtmId}
            onChange={(e) => update({ gtmId: e.target.value.trim().toUpperCase() })}
          />
          {values.gtmId && !GTM_ID_PATTERN.test(values.gtmId) && (
            <p className="mt-1 text-xs" style={{ color: "var(--ad-danger)" }}>
              That does not look like a GTM ID (expected GTM-XXXXXXX). Nothing will be injected
              until it matches.
            </p>
          )}
        </div>
        <a
          className="text-xs underline"
          style={{ color: "var(--ad-accent)" }}
          href="https://tagmanager.google.com/"
          target="_blank"
          rel="noreferrer"
        >
          Open Google Tag Manager
        </a>
      </div>
    </section>
  );
}
