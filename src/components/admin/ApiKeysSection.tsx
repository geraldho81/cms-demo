"use client";

import { useState } from "react";
import { createApiKey, deleteApiKey } from "@/app/admin/actions";

type KeyRow = { id: string; name: string; createdAt: string; lastUsedAt: string | null };

export function ApiKeysSection({ initial }: { initial: KeyRow[] }) {
  const [name, setName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  return (
    <section className="rounded-xl bg-white p-5">
      <h2 className="mb-1 text-sm font-bold tracking-tight">API keys</h2>
      <p className="mb-4 text-xs" style={{ color: "var(--ad-muted)" }}>
        For the REST API at /api/v1 - used by AI agents and external tools. Keys are shown once on creation.
      </p>

      {newKey && (
        <div className="mb-4 rounded-lg p-3" style={{ background: "var(--ad-accent-soft)" }}>
          <p className="mb-1.5 text-xs font-semibold" style={{ color: "var(--ad-accent)" }}>
            Copy this key now - it will not be shown again.
          </p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded bg-white px-2 py-1.5 text-xs">{newKey}</code>
            <button
              className="ad-btn ad-btn-primary"
              style={{ padding: "0.35rem 0.7rem", fontSize: "0.75rem" }}
              onClick={() => {
                navigator.clipboard.writeText(newKey);
                setCopied(true);
              }}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      )}

      <div className="mb-4 flex gap-2">
        <input className="ad-input" placeholder="Key name (e.g. claude-agent)" value={name} onChange={(e) => setName(e.target.value)} />
        <button
          className="ad-btn ad-btn-primary shrink-0"
          disabled={busy || !name.trim()}
          onClick={async () => {
            setBusy(true);
            setCopied(false);
            try {
              const raw = await createApiKey(name.trim());
              setNewKey(raw);
              setName("");
            } finally {
              setBusy(false);
            }
          }}
        >
          Create key
        </button>
      </div>

      {initial.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {initial.map((k) => (
            <div key={k.id} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: "var(--ad-bg)" }}>
              <div>
                <div className="text-sm font-semibold">{k.name}</div>
                <div className="text-xs" style={{ color: "var(--ad-muted)" }}>
                  Created {new Date(k.createdAt).toLocaleDateString()}
                  {k.lastUsedAt ? ` · Last used ${new Date(k.lastUsedAt).toLocaleDateString()}` : " · Never used"}
                </div>
              </div>
              <button className="ad-btn ad-btn-danger" style={{ padding: "0.35rem 0.7rem", fontSize: "0.75rem" }} onClick={() => deleteApiKey(k.id)}>
                Revoke
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
