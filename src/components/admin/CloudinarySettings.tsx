"use client";

import { useState } from "react";
import { saveCloudinaryConfig } from "@/app/admin/actions";

type Props = {
  initial: { cloudName: string; apiKey: string; secretSet: boolean };
  envManaged: boolean;
};

export function CloudinarySettings({ initial, envManaged }: Props) {
  const [cloudName, setCloudName] = useState(initial.cloudName);
  const [apiKey, setApiKey] = useState(initial.apiKey);
  const [apiSecret, setApiSecret] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");

  const connected = envManaged || (!!initial.cloudName && !!initial.apiKey && initial.secretSet);

  async function save() {
    setState("saving");
    await saveCloudinaryConfig({ cloudName, apiKey, apiSecret });
    setApiSecret("");
    setState("saved");
    setTimeout(() => setState("idle"), 1500);
  }

  return (
    <section className="mb-6 rounded-xl bg-white p-5">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-sm font-bold tracking-tight">Media storage (Cloudinary)</h2>
        <span
          className="rounded-full px-2 py-0.5 text-xs font-semibold"
          style={connected ? { background: "#dcfce7", color: "#166534" } : { background: "#fee2e2", color: "#991b1b" }}
        >
          {connected ? "Connected" : "Not connected"}
        </span>
      </div>
      <p className="mb-4 text-xs" style={{ color: "var(--ad-muted)" }}>
        Your media library is stored in your own Cloudinary account (free to start at cloudinary.com).
        Find these on your Cloudinary dashboard under Account Details.
      </p>

      {envManaged ? (
        <p className="rounded-lg p-3 text-sm" style={{ background: "var(--ad-bg)", color: "var(--ad-muted)" }}>
          Cloudinary is configured through environment variables (<code>CLOUDINARY_*</code>). To change it,
          update those env vars. Remove them to manage credentials here instead.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-x-4">
            <div className="ad-field">
              <label className="ad-label">Cloud name</label>
              <input className="ad-input" value={cloudName} placeholder="e.g. dabcd1234" onChange={(e) => setCloudName(e.target.value)} />
            </div>
            <div className="ad-field">
              <label className="ad-label">API key</label>
              <input className="ad-input" value={apiKey} placeholder="e.g. 123456789012345" onChange={(e) => setApiKey(e.target.value)} />
            </div>
          </div>
          <div className="ad-field">
            <label className="ad-label">API secret</label>
            <input
              className="ad-input"
              type="password"
              value={apiSecret}
              placeholder={initial.secretSet ? "•••••••••• (saved - leave blank to keep)" : "Enter your API secret"}
              onChange={(e) => setApiSecret(e.target.value)}
            />
          </div>
          <div className="mt-2 flex items-center gap-3">
            <button className="ad-btn ad-btn-primary" onClick={save} disabled={state === "saving"}>
              {state === "saving" ? "Saving..." : "Save Cloudinary settings"}
            </button>
            {state === "saved" && <span className="text-xs" style={{ color: "var(--ad-green)" }}>Saved</span>}
          </div>
        </>
      )}
    </section>
  );
}
