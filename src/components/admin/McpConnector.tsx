"use client";

import { useState } from "react";
import { generateMcpKey, disableMcpKey } from "@/app/admin/actions";

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mb-3">
      <div className="mb-1 text-xs font-semibold" style={{ color: "var(--ad-muted)" }}>
        {label}
      </div>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded px-2 py-1.5 text-xs" style={{ background: "var(--ad-bg)" }}>
          {value}
        </code>
        <button
          className="ad-btn shrink-0"
          style={{ padding: "0.35rem 0.7rem", fontSize: "0.75rem" }}
          onClick={() => {
            navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}

export function McpConnector({
  serverUrl,
  keyExists,
  cloudinaryConnected,
}: {
  serverUrl: string;
  keyExists: boolean;
  cloudinaryConnected: boolean;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [exists, setExists] = useState(keyExists);

  const tokenizedUrl = token ? `${serverUrl}/${token}` : null;

  return (
    <section className="mt-6 rounded-xl bg-white p-5">
      <h2 className="mb-1 text-sm font-bold tracking-tight">AI connector (MCP)</h2>
      <p className="mb-4 text-xs" style={{ color: "var(--ad-muted)" }}>
        Connect ChatGPT, Claude, Perplexity or Grok to this site. The assistant can read your pages and posts and write blog
        posts (create and update). It cannot edit pages or delete anything. Images are added through your Cloudinary when
        connected, or by URL otherwise.
      </p>

      <CopyField label="MCP server URL" value={serverUrl} />

      {token && tokenizedUrl ? (
        <div className="mb-4 rounded-lg p-3" style={{ background: "var(--ad-accent-soft)" }}>
          <p className="mb-2 text-xs font-semibold" style={{ color: "var(--ad-accent)" }}>
            Copy your token now - it will not be shown again.
          </p>
          <CopyField label="Token (paste in the connector's API key / token field)" value={token} />
          <CopyField label="One-line URL (for clients with only a URL field - token included)" value={tokenizedUrl} />
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          className="ad-btn ad-btn-primary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const raw = await generateMcpKey();
              setToken(raw);
              setExists(true);
            } finally {
              setBusy(false);
            }
          }}
        >
          {exists ? "Regenerate token" : "Generate token"}
        </button>
        {exists && (
          <button
            className="ad-btn ad-btn-danger"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await disableMcpKey();
                setToken(null);
                setExists(false);
              } finally {
                setBusy(false);
              }
            }}
          >
            Disable
          </button>
        )}
      </div>

      {exists && !token && (
        <p className="mb-4 text-xs" style={{ color: "var(--ad-muted)" }}>
          A connector token is active. Regenerate to get a new one (the old token stops working immediately).
        </p>
      )}

      {!cloudinaryConnected && (
        <p className="mb-4 text-xs" style={{ color: "var(--ad-muted)" }}>
          Cloudinary is not connected, so the assistant will use image URLs directly. Connect Cloudinary above to have it
          upload images into your own media library instead.
        </p>
      )}

      <details className="text-xs" style={{ color: "var(--ad-muted)" }}>
        <summary className="cursor-pointer font-semibold">How to connect</summary>
        <ul className="mt-2 list-disc space-y-1 pl-4">
          <li>
            <strong>Claude</strong>: Settings - Connectors - Add custom connector. Paste the MCP server URL and your token.
          </li>
          <li>
            <strong>ChatGPT</strong>: Settings - Connectors - Add. Paste the MCP server URL and token (or use the one-line URL).
          </li>
          <li>
            <strong>Perplexity / Grok</strong>: add a custom MCP connector with the server URL and token, or paste the one-line
            URL where only a URL is accepted.
          </li>
        </ul>
      </details>
    </section>
  );
}
