"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCategory, renameCategory, deleteCategory } from "@/app/admin/actions";

type Row = { id: string; name: string; slug: string; postCount: number };

export function CategoriesManager({ initial }: { initial: Row[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
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

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <h1 className="mb-1 text-2xl font-bold tracking-tight">Categories</h1>
      <p className="mb-6 text-sm" style={{ color: "var(--ad-muted)" }}>
        Each post belongs to one category. Deleting a category leaves its posts uncategorized.
      </p>

      <form
        className="mb-6 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          run(async () => {
            await createCategory(name);
            setName("");
          });
        }}
      >
        <input className="ad-input" placeholder="New category name" value={name} onChange={(e) => setName(e.target.value)} />
        <button type="submit" className="ad-btn ad-btn-primary shrink-0" disabled={busy || !name.trim()}>
          Add category
        </button>
      </form>

      {error && <p className="mb-4 text-sm" style={{ color: "var(--ad-danger)" }}>{error}</p>}

      <div className="overflow-hidden rounded-xl bg-white">
        {initial.length === 0 ? (
          <p className="p-8 text-center text-sm" style={{ color: "var(--ad-muted)" }}>
            No categories yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide" style={{ color: "var(--ad-muted)" }}>
                <th className="px-5 py-3 font-semibold">Name</th>
                <th className="px-5 py-3 font-semibold">Slug</th>
                <th className="px-5 py-3 font-semibold">Posts</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {initial.map((c) => (
                <tr key={c.id} className="hover:bg-[var(--ad-bg)]">
                  <td className="px-5 py-3 font-semibold">
                    {editingId === c.id ? (
                      <input
                        className="ad-input"
                        value={editName}
                        autoFocus
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && editName.trim()) {
                            run(async () => {
                              await renameCategory(c.id, editName);
                              setEditingId(null);
                            });
                          }
                          if (e.key === "Escape") setEditingId(null);
                        }}
                      />
                    ) : (
                      c.name
                    )}
                  </td>
                  <td className="px-5 py-3" style={{ color: "var(--ad-muted)" }}>{c.slug}</td>
                  <td className="px-5 py-3" style={{ color: "var(--ad-muted)" }}>{c.postCount}</td>
                  <td className="px-5 py-3 text-right">
                    {editingId === c.id ? (
                      <span className="inline-flex gap-1.5">
                        <button
                          className="ad-btn ad-btn-primary"
                          style={{ padding: "0.3rem 0.6rem", fontSize: "0.7rem" }}
                          disabled={busy || !editName.trim()}
                          onClick={() =>
                            run(async () => {
                              await renameCategory(c.id, editName);
                              setEditingId(null);
                            })
                          }
                        >
                          Save
                        </button>
                        <button className="ad-btn ad-btn-soft" style={{ padding: "0.3rem 0.6rem", fontSize: "0.7rem" }} onClick={() => setEditingId(null)}>
                          Cancel
                        </button>
                      </span>
                    ) : confirmId === c.id ? (
                      <span className="inline-flex gap-1.5">
                        <button
                          className="ad-btn ad-btn-danger"
                          style={{ padding: "0.3rem 0.6rem", fontSize: "0.7rem" }}
                          disabled={busy}
                          onClick={() =>
                            run(async () => {
                              await deleteCategory(c.id);
                              setConfirmId(null);
                            })
                          }
                        >
                          Confirm delete
                        </button>
                        <button className="ad-btn ad-btn-soft" style={{ padding: "0.3rem 0.6rem", fontSize: "0.7rem" }} onClick={() => setConfirmId(null)}>
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <span className="inline-flex gap-1.5">
                        <button
                          className="ad-btn ad-btn-soft"
                          style={{ padding: "0.3rem 0.6rem", fontSize: "0.7rem" }}
                          onClick={() => {
                            setEditingId(c.id);
                            setEditName(c.name);
                          }}
                        >
                          Rename
                        </button>
                        <button className="ad-btn ad-btn-danger" style={{ padding: "0.3rem 0.6rem", fontSize: "0.7rem" }} onClick={() => setConfirmId(c.id)}>
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
