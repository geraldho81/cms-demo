"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteContactSubmission } from "@/app/admin/actions";

export type SubmissionRow = {
  id: string;
  formName: string | null;
  data: Record<string, string>;
  createdAt: string;
};

export function SubmissionsTable({ initial }: { initial: SubmissionRow[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const forms = useMemo(
    () => Array.from(new Set(initial.map((r) => r.formName).filter(Boolean))) as string[],
    [initial]
  );
  const rows = filter ? initial.filter((r) => r.formName === filter) : initial;

  function preview(d: Record<string, string>) {
    const v = d.email || d.name || Object.values(d).find(Boolean) || "";
    return v.length > 60 ? `${v.slice(0, 60)}...` : v;
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      await deleteContactSubmission(id);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <Link href="/admin/contacts" className="mb-4 inline-block text-sm font-medium" style={{ color: "var(--ad-muted)" }}>
        ← Back to forms
      </Link>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="mb-1 text-2xl font-bold tracking-tight">Submissions</h1>
          <p className="text-sm" style={{ color: "var(--ad-muted)" }}>
            Every lead your forms have collected, newest first.
          </p>
        </div>
        {forms.length > 0 && (
          <select className="ad-select w-auto" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">All forms</option>
            {forms.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center text-sm" style={{ color: "var(--ad-muted)" }}>
          No submissions yet.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((r) => {
            const open = openId === r.id;
            return (
              <div key={r.id} className="rounded-xl bg-white">
                <button
                  className="flex w-full items-center gap-4 px-5 py-3.5 text-left"
                  onClick={() => setOpenId(open ? null : r.id)}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{preview(r.data) || "(empty)"}</p>
                    <p className="mt-0.5 text-xs" style={{ color: "var(--ad-muted)" }}>
                      {r.formName || "Contact"} · {new Date(r.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs" style={{ color: "var(--ad-muted)" }}>{open ? "Hide" : "View"}</span>
                </button>
                {open && (
                  <div className="border-t px-5 py-4" style={{ borderColor: "var(--ad-line)" }}>
                    <dl className="flex flex-col gap-2">
                      {Object.entries(r.data).map(([k, v]) => (
                        <div key={k} className="grid grid-cols-[120px_1fr] gap-3 text-sm">
                          <dt className="font-semibold" style={{ color: "var(--ad-muted)" }}>{k}</dt>
                          <dd className="whitespace-pre-wrap break-words">{v || "-"}</dd>
                        </div>
                      ))}
                    </dl>
                    <div className="mt-4 flex gap-2">
                      {r.data.email && (
                        <a className="ad-btn ad-btn-soft" style={{ padding: "0.3rem 0.6rem", fontSize: "0.7rem" }} href={`mailto:${r.data.email}`}>
                          Reply by email
                        </a>
                      )}
                      <button
                        className="ad-btn ad-btn-danger"
                        style={{ padding: "0.3rem 0.6rem", fontSize: "0.7rem" }}
                        disabled={busy}
                        onClick={() => remove(r.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
