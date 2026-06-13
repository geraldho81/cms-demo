"use client";

import { useEffect, useRef, useState } from "react";
import { listMedia } from "@/app/admin/actions";
import { useUpload } from "@/lib/useUpload";

type MediaItem = {
  id: string;
  url: string;
  name: string;
  mimeType: string;
  alt: string | null;
  createdAt: string;
};

export function MediaPicker({ onSelect, onClose }: { onSelect: (url: string) => void; onClose: () => void }) {
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { upload, uploading } = useUpload();
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listMedia().then(setItems).catch(() => setItems([]));
  }, []);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    try {
      const uploaded = await upload(files[0]);
      setItems((prev) => [uploaded, ...(prev ?? [])]);
      onSelect(uploaded.url);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 p-6" onClick={onClose}>
      <div
        className="flex h-[70vh] w-full max-w-3xl flex-col rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight">Choose media</h2>
          <div className="flex items-center gap-2">
            <button className="ad-btn ad-btn-primary" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? "Uploading..." : "Upload"}
            </button>
            <button className="ad-btn ad-btn-soft" onClick={onClose}>Close</button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => handleFiles(e.target.files)} />
        </div>
        {error && <p className="mb-3 text-sm" style={{ color: "var(--ad-danger)" }}>{error}</p>}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {items === null ? (
            <p className="text-sm" style={{ color: "var(--ad-muted)" }}>Loading...</p>
          ) : items.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--ad-muted)" }}>
              No media yet. Upload your first image.
            </p>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {items
                .filter((m) => m.mimeType.startsWith("image/"))
                .map((m) => (
                  <button
                    key={m.id}
                    className="group overflow-hidden rounded-lg bg-[var(--ad-bg)] text-left"
                    onClick={() => {
                      onSelect(m.url);
                      onClose();
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.url} alt={m.alt ?? m.name} className="aspect-square w-full object-cover transition-transform group-hover:scale-[1.03]" />
                    <div className="truncate px-2 py-1.5 text-xs" style={{ color: "var(--ad-muted)" }}>{m.name}</div>
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
