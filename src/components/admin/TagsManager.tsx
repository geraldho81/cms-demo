"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { renameTag, deleteTag } from "@/app/admin/actions";

type Row = { tag: string; count: number };

export function TagsManager({ initial }: { initial: Row[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [confirm, setConfirm] = useState<string | null>(null);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <h1 className="mb-1 text-2xl font-bold tracking-tight">Tags</h1>
      <p className="mb-6 text-sm" style={{ color: "var(--ad-muted)" }}>
        Tags are added on each post. Renaming or deleting a tag here updates every post that uses it.
        Renaming a tag to an existing tag merges them.
      </p>

      <div className="overflow-hidden rounded-xl bg-white">
        {initial.length === 0 ? (
          <p className="p-8 text-center text-sm" style={{ color: "var(--ad-muted)" }}>
            No tags yet. Add tags in the post editor sidebar.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide" style={{ color: "var(--ad-muted)" }}>
                <th className="px-5 py-3 font-semibold">Tag</th>
                <th className="px-5 py-3 font-semibold">Posts</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {initial.map((t) => (
                <tr key={t.tag} className="hover:bg-[var(--ad-bg)]">
                  <td className="px-5 py-3 font-semibold">
                    {editing === t.tag ? (
                      <input
                        className="ad-input"
                        value={editName}
                        autoFocus
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && editName.trim()) {
                            run(async () => {
                              await renameTag(t.tag, editName);
                              setEditing(null);
                            });
                          }
                          if (e.key === "Escape") setEditing(null);
                        }}
                      />
                    ) : (
                      t.tag
                    )}
                  </td>
                  <td className="px-5 py-3" style={{ color: "var(--ad-muted)" }}>{t.count}</td>
                  <td className="px-5 py-3 text-right">
                    {editing === t.tag ? (
                      <span className="inline-flex gap-1.5">
                        <button
                          className="ad-btn ad-btn-primary"
                          style={{ padding: "0.3rem 0.6rem", fontSize: "0.7rem" }}
                          disabled={busy || !editName.trim()}
                          onClick={() =>
                            run(async () => {
                              await renameTag(t.tag, editName);
                              setEditing(null);
                            })
                          }
                        >
                          Save
                        </button>
                        <button className="ad-btn ad-btn-soft" style={{ padding: "0.3rem 0.6rem", fontSize: "0.7rem" }} onClick={() => setEditing(null)}>
                          Cancel
                        </button>
                      </span>
                    ) : confirm === t.tag ? (
                      <span className="inline-flex gap-1.5">
                        <button
                          className="ad-btn ad-btn-danger"
                          style={{ padding: "0.3rem 0.6rem", fontSize: "0.7rem" }}
                          disabled={busy}
                          onClick={() =>
                            run(async () => {
                              await deleteTag(t.tag);
                              setConfirm(null);
                            })
                          }
                        >
                          Remove from {t.count} post{t.count === 1 ? "" : "s"}
                        </button>
                        <button className="ad-btn ad-btn-soft" style={{ padding: "0.3rem 0.6rem", fontSize: "0.7rem" }} onClick={() => setConfirm(null)}>
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <span className="inline-flex gap-1.5">
                        <button
                          className="ad-btn ad-btn-soft"
                          style={{ padding: "0.3rem 0.6rem", fontSize: "0.7rem" }}
                          onClick={() => {
                            setEditing(t.tag);
                            setEditName(t.tag);
                          }}
                        >
                          Rename
                        </button>
                        <button className="ad-btn ad-btn-danger" style={{ padding: "0.3rem 0.6rem", fontSize: "0.7rem" }} onClick={() => setConfirm(t.tag)}>
                          Delete
                        </button>
                      </span>
                    )}
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
