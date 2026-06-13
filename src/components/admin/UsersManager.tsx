"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUser, updateUserRole, deleteUser, resetUserPassword } from "@/app/admin/actions";

type UserRow = { id: string; email: string; name: string; role: "admin" | "editor"; createdAt: string };

export function UsersManager({ meId, initial }: { meId: string; initial: UserRow[] }) {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "editor" as "admin" | "editor" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [resetFor, setResetFor] = useState<UserRow | null>(null);
  const [newPassword, setNewPassword] = useState("");

  async function run(fn: () => Promise<void>) {
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
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Users</h1>

      <section className="mb-6 rounded-xl bg-white p-5">
        <h2 className="mb-3 text-sm font-bold tracking-tight">Add a user</h2>
        <div className="grid grid-cols-2 gap-x-4">
          <div className="ad-field">
            <label className="ad-label">Name</label>
            <input className="ad-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="ad-field">
            <label className="ad-label">Email</label>
            <input className="ad-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="ad-field">
            <label className="ad-label">Password</label>
            <input className="ad-input" type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <div className="ad-field">
            <label className="ad-label">Role</label>
            <select className="ad-select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as "admin" | "editor" })}>
              <option value="editor">Editor</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
        <button
          className="ad-btn ad-btn-primary"
          disabled={busy || !form.name || !form.email || form.password.length < 8}
          onClick={() =>
            run(async () => {
              await createUser(form);
              setForm({ name: "", email: "", password: "", role: "editor" });
            })
          }
        >
          Add user
        </button>
        {form.password.length > 0 && form.password.length < 8 && (
          <p className="mt-2 text-xs" style={{ color: "var(--ad-muted)" }}>Password needs at least 8 characters.</p>
        )}
      </section>

      {error && <p className="mb-4 text-sm" style={{ color: "var(--ad-danger)" }}>{error}</p>}

      <div className="overflow-hidden rounded-xl bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide" style={{ color: "var(--ad-muted)" }}>
              <th className="px-5 py-3 font-semibold">Name</th>
              <th className="px-5 py-3 font-semibold">Email</th>
              <th className="px-5 py-3 font-semibold">Role</th>
              <th className="px-5 py-3 font-semibold">Joined</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {initial.map((u) => (
              <tr key={u.id} className="hover:bg-[var(--ad-bg)]">
                <td className="px-5 py-3 font-semibold">
                  {u.name}
                  {u.id === meId && <span className="ml-2 text-xs font-normal" style={{ color: "var(--ad-muted)" }}>(you)</span>}
                </td>
                <td className="px-5 py-3" style={{ color: "var(--ad-muted)" }}>{u.email}</td>
                <td className="px-5 py-3">
                  {u.id === meId ? (
                    <span className="ad-chip ad-chip-published">{u.role}</span>
                  ) : (
                    <select
                      className="ad-select"
                      style={{ width: "auto", padding: "0.25rem 0.5rem", fontSize: "0.8rem" }}
                      value={u.role}
                      disabled={busy}
                      onChange={(e) => run(() => updateUserRole(u.id, e.target.value as "admin" | "editor"))}
                    >
                      <option value="editor">editor</option>
                      <option value="admin">admin</option>
                    </select>
                  )}
                </td>
                <td className="px-5 py-3" style={{ color: "var(--ad-muted)" }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="px-5 py-3 text-right">
                  {u.id !== meId &&
                    (confirmDeleteId === u.id ? (
                      <span className="inline-flex gap-1.5">
                        <button className="ad-btn ad-btn-danger" style={{ padding: "0.3rem 0.6rem", fontSize: "0.7rem" }} disabled={busy} onClick={() => run(() => deleteUser(u.id))}>
                          Confirm
                        </button>
                        <button className="ad-btn ad-btn-soft" style={{ padding: "0.3rem 0.6rem", fontSize: "0.7rem" }} onClick={() => setConfirmDeleteId(null)}>
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <span className="inline-flex gap-1.5">
                        <button className="ad-btn ad-btn-soft" style={{ padding: "0.3rem 0.6rem", fontSize: "0.7rem" }} onClick={() => { setResetFor(u); setNewPassword(""); }}>
                          Reset password
                        </button>
                        <button className="ad-btn ad-btn-danger" style={{ padding: "0.3rem 0.6rem", fontSize: "0.7rem" }} onClick={() => setConfirmDeleteId(u.id)}>
                          Delete
                        </button>
                      </span>
                    ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {resetFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35" onClick={() => setResetFor(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-3 text-lg font-bold tracking-tight">Reset password for {resetFor.name}</h2>
            <input className="ad-input mb-4" type="text" placeholder="New password (8+ characters)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            <div className="flex justify-end gap-2">
              <button className="ad-btn ad-btn-soft" onClick={() => setResetFor(null)}>Cancel</button>
              <button
                className="ad-btn ad-btn-primary"
                disabled={busy || newPassword.length < 8}
                onClick={() =>
                  run(async () => {
                    await resetUserPassword(resetFor.id, newPassword);
                    setResetFor(null);
                  })
                }
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
