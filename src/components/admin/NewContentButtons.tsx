"use client";

import { useState } from "react";
import { createPage, createPost } from "@/app/admin/actions";

function NewButton({ label, prompt, onCreate }: { label: string; prompt: string; onCreate: (title: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <>
      <button className="ad-btn ad-btn-primary" onClick={() => setOpen(true)}>
        {label}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => !busy && setOpen(false)}>
          <form
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            onSubmit={async (e) => {
              e.preventDefault();
              if (!title.trim()) return;
              setBusy(true);
              await onCreate(title.trim());
            }}
          >
            <h2 className="mb-4 text-lg font-bold tracking-tight">{prompt}</h2>
            <input
              className="ad-input mb-4"
              autoFocus
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button type="button" className="ad-btn ad-btn-soft" onClick={() => setOpen(false)} disabled={busy}>
                Cancel
              </button>
              <button type="submit" className="ad-btn ad-btn-primary" disabled={busy || !title.trim()}>
                {busy ? "Creating..." : "Create"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

export function NewPageButton() {
  return <NewButton label="New page" prompt="Create a page" onCreate={(t) => createPage(t)} />;
}

export function NewPostButton() {
  return <NewButton label="New post" prompt="Create a post" onCreate={(t) => createPost(t)} />;
}
