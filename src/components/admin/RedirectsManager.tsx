"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createRedirect, deleteRedirect } from "@/app/admin/actions";

type Row = { id: string; fromPath: string; toPath: string; permanent: boolean; createdAt: string };

export function RedirectsManager({ initial }: { initial: Row[] }) {
  const router = useRouter();
  const [form, setForm] = useState({ fromPath: "", toPath: "", permanent: true });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <h1 className="mb-1 text-2xl font-bold tracking-tight">Redirects</h1>
      <p className="mb-6 text-sm" style={{ color: "var(--ad-muted)" }}>
        Send old or changed URLs to their new home. Adding a redirect for an existing &quot;from&quot; path replaces it.
      </p>

      <form
        className="mb-6 rounded-xl bg-white p-5"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          setBusy(true);
          try {
            await createRedirect(form);
            setForm({ fromPath: "", toPath: "", permanent: true });
            router.refresh();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="grid grid-cols-2 gap-x-4">
          <div className="ad-field">
            <label className="ad-label">From path</label>
            <input className="ad-input" placeholder="/old-page" value={form.fromPath} onChange={(e) => setForm({ ...form, fromPath: e.target.value })} />
          </div>
          <div className="ad-field">
            <label className="ad-label">To path or URL</label>
            <input className="ad-input" placeholder="/new-page or https://..." value={form.toPath} onChange={(e) => setForm({ ...form, toPath: e.target.value })} />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.permanent} onChange={(e) => setForm({ ...form, permanent: e.target.checked })} />
            Permanent (301)
          </label>
          <button type="submit" className="ad-btn ad-btn-primary" disabled={busy || !form.fromPath.trim() || !form.toPath.trim()}>
            Add redirect
          </button>
        </div>
        {error && <p className="mt-3 text-sm" style={{ color: "var(--ad-danger)" }}>{error}</p>}
      </form>

      <div className="overflow-hidden rounded-xl bg-white">
        {initial.length === 0 ? (
          <p className="p-8 text-center text-sm" style={{ color: "var(--ad-muted)" }}>
            No redirects yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide" style={{ color: "var(--ad-muted)" }}>
                <th className="px-5 py-3 font-semibold">From</th>
                <th className="px-5 py-3 font-semibold">To</th>
                <th className="px-5 py-3 font-semibold">Type</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {initial.map((r) => (
                <tr key={r.id} className="hover:bg-[var(--ad-bg)]">
                  <td className="px-5 py-3 font-semibold">{r.fromPath}</td>
                  <td className="px-5 py-3" style={{ color: "var(--ad-muted)" }}>{r.toPath}</td>
                  <td className="px-5 py-3" style={{ color: "var(--ad-muted)" }}>{r.permanent ? "301" : "302"}</td>
                  <td className="px-5 py-3 text-right">
                    <button
                      className="ad-btn ad-btn-danger"
                      style={{ padding: "0.3rem 0.6rem", fontSize: "0.7rem" }}
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        try {
                          await deleteRedirect(r.id);
                          router.refresh();
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
