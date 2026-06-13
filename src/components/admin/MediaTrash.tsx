"use client";

import Link from "next/link";
import { useState } from "react";
import { restoreMedia, purgeMedia, emptyMediaTrash } from "@/app/admin/actions";

type TrashItem = {
  publicId: string;
  resourceType: string;
  url: string;
  name: string;
  mimeType: string | null;
  alt: string | null;
  trashedAt: string;
};

function daysLeft(trashedAt: string, ttlDays: number): number {
  const purgeAt = new Date(trashedAt).getTime() + ttlDays * 86400000;
  return Math.max(0, Math.ceil((purgeAt - Date.now()) / 86400000));
}

export function MediaTrash({ items, ttlDays }: { items: TrashItem[]; ttlDays: number }) {
  const [rows, setRows] = useState(items);
  const [busy, setBusy] = useState<string | null>(null);

  async function onRestore(id: string) {
    setBusy(id);
    try {
      await restoreMedia(id);
      setRows((prev) => prev.filter((r) => r.publicId !== id));
    } finally {
      setBusy(null);
    }
  }

  async function onPurge(item: TrashItem) {
    setBusy(item.publicId);
    try {
      await purgeMedia(item.publicId, item.resourceType);
      setRows((prev) => prev.filter((r) => r.publicId !== item.publicId));
    } finally {
      setBusy(null);
    }
  }

  async function onEmpty() {
    setBusy("__all__");
    try {
      await emptyMediaTrash();
      setRows([]);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Media trash</h1>
        <div className="flex items-center gap-2">
          <Link className="ad-btn ad-btn-soft" href="/admin/media">
            Back to media
          </Link>
          {rows.length > 0 && (
            <button className="ad-btn ad-btn-danger" disabled={busy === "__all__"} onClick={onEmpty}>
              {busy === "__all__" ? "Emptying..." : "Empty trash now"}
            </button>
          )}
        </div>
      </div>

      <p className="mb-6 text-sm" style={{ color: "var(--ad-muted)" }}>
        Trashed items are kept for {ttlDays} days, then permanently deleted from Cloudinary by a daily job. Restore to put an item back, or delete it now.
      </p>

      {rows.length === 0 ? (
        <div className="rounded-xl bg-white p-10 text-center text-sm" style={{ color: "var(--ad-muted)" }}>
          Trash is empty.
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-3">
          {rows.map((m) => {
            const left = daysLeft(m.trashedAt, ttlDays);
            return (
              <div key={m.publicId} className="overflow-hidden rounded-xl bg-white">
                {m.mimeType?.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.url} alt={m.alt ?? m.name} className="aspect-square w-full object-cover opacity-70" />
                ) : (
                  <div className="flex aspect-square items-center justify-center text-2xl" style={{ background: "var(--ad-bg)" }}>📄</div>
                )}
                <div className="px-2.5 py-2">
                  <div className="truncate text-xs font-medium">{m.name}</div>
                  <div className="mb-2 text-xs" style={{ color: left <= 3 ? "var(--ad-danger)" : "var(--ad-muted)" }}>
                    {left === 0 ? "Deletes today" : `${left} day${left === 1 ? "" : "s"} left`}
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      className="ad-btn ad-btn-soft flex-1 text-xs"
                      disabled={busy === m.publicId}
                      onClick={() => onRestore(m.publicId)}
                    >
                      Restore
                    </button>
                    <button
                      className="ad-btn ad-btn-danger text-xs"
                      disabled={busy === m.publicId}
                      onClick={() => onPurge(m)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
