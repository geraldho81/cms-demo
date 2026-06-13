"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Block } from "@/blocks/types";
import { registry, blockList } from "@/blocks/registry";
import { savePage, trashPage, listRevisions, restoreRevision } from "@/app/admin/actions";
import { Canvas, type BlockAction } from "@/components/admin/editor/Canvas";
import { AutoFields } from "@/components/admin/editor/AutoFields";
import {
  createBlock,
  findBlock,
  updateBlockProps,
  removeBlock,
  duplicateBlock,
  moveBlock,
  insertTopLevel,
  insertIntoZone,
  reorderTopLevel,
} from "@/components/admin/editor/blockTree";

export type PageData = {
  id: string;
  title: string;
  slug: string;
  blocks: Block[];
  status: "draft" | "published" | "scheduled";
  publishAt: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  ogImage: string | null;
  noindex: boolean;
};

type SaveState = "saved" | "dirty" | "saving" | "error";

export function PageEditor({ initial }: { initial: PageData }) {
  const [page, setPage] = useState(initial);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [revisionsOpen, setRevisionsOpen] = useState(false);

  const pageRef = useRef(page);
  pageRef.current = page;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSave = useCallback(async (override?: Partial<PageData>) => {
    const current = { ...pageRef.current, ...override };
    setSaveState("saving");
    try {
      const result = await savePage(current.id, {
        title: current.title,
        slug: current.slug,
        blocks: current.blocks,
        status: current.status,
        publishAt: current.publishAt,
        metaTitle: current.metaTitle,
        metaDescription: current.metaDescription,
        ogImage: current.ogImage,
        noindex: current.noindex,
      });
      // Server may normalize the slug
      if (result.slug !== pageRef.current.slug) setPage((p) => ({ ...p, slug: result.slug }));
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }, []);

  const scheduleSave = useCallback(() => {
    setSaveState("dirty");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doSave(), 800);
  }, [doSave]);

  const update = useCallback(
    (partial: Partial<PageData>) => {
      setPage((p) => ({ ...p, ...partial }));
      scheduleSave();
    },
    [scheduleSave]
  );

  // Flush pending save on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function handleAction(id: string, action: BlockAction) {
    if (action === "delete") {
      update({ blocks: removeBlock(page.blocks, id) });
      if (selectedId === id) setSelectedId(null);
    } else if (action === "duplicate") {
      update({ blocks: duplicateBlock(page.blocks, id) });
    } else {
      update({ blocks: moveBlock(page.blocks, id, action === "up" ? -1 : 1) });
    }
  }

  function handleInsert(type: string) {
    const block = createBlock(type);
    const afterId = selectedId && page.blocks.some((b) => b.id === selectedId) ? selectedId : null;
    update({ blocks: insertTopLevel(page.blocks, block, afterId) });
    setSelectedId(block.id);
  }

  async function handlePublishClick() {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (page.status === "published") {
      await doSave();
    } else {
      setPage((p) => ({ ...p, status: "published" }));
      await doSave({ status: "published" });
    }
  }

  const selectedBlock = selectedId ? findBlock(page.blocks, selectedId) : null;
  const selectedDef = selectedBlock ? registry[selectedBlock.type] : null;

  const saveLabel =
    saveState === "saved" ? "Saved" : saveState === "saving" ? "Saving..." : saveState === "dirty" ? "Unsaved changes" : "Save failed - retrying on next change";

  const previewHref = `/${page.slug === "home" ? "" : page.slug}?preview=1`;

  return (
    <div className="fixed inset-0 z-40 flex flex-col" style={{ background: "var(--ad-bg)", color: "var(--ad-text)" }}>
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center gap-3 bg-white px-4">
        <Link href="/admin/pages" className="ad-btn ad-btn-soft" style={{ padding: "0.4rem 0.7rem" }}>
          ←
        </Link>
        <input
          className="min-w-0 flex-1 bg-transparent text-[15px] font-bold tracking-tight outline-none"
          value={page.title}
          onChange={(e) => update({ title: e.target.value })}
          placeholder="Page title"
        />
        <span className="shrink-0 text-xs" style={{ color: saveState === "error" ? "var(--ad-danger)" : "var(--ad-muted)" }}>
          {saveLabel}
        </span>
        <a href={previewHref} target="_blank" className="ad-btn ad-btn-soft">
          Preview
        </a>
        <button className="ad-btn ad-btn-primary" onClick={handlePublishClick} disabled={saveState === "saving"}>
          {page.status === "published" ? "Update" : "Publish"}
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Palette */}
        <aside className="w-52 shrink-0 overflow-y-auto p-3">
          <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--ad-muted)" }}>
            Blocks
          </p>
          <div className="flex flex-col gap-1">
            {blockList.map((def) => (
              <button
                key={def.type}
                className="flex items-center gap-2.5 rounded-lg bg-white px-3 py-2 text-left text-[13px] font-semibold transition-shadow hover:shadow-[0_2px_12px_rgba(0,0,0,0.07)]"
                onClick={() => handleInsert(def.type)}
                title={def.description}
              >
                <span className="w-5 text-center text-sm" style={{ color: "var(--ad-muted)" }}>{def.icon}</span>
                {def.label}
              </button>
            ))}
          </div>
        </aside>

        {/* Canvas */}
        <div className="min-w-0 flex-1 overflow-y-auto py-4 pr-1">
          <div className="mx-auto overflow-hidden rounded-xl shadow-[0_2px_24px_rgba(0,0,0,0.07)]" style={{ maxWidth: "1100px", background: "var(--bg)" }}>
            <Canvas
              blocks={page.blocks}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onAction={handleAction}
              onReorder={(a, b) => update({ blocks: reorderTopLevel(page.blocks, a, b) })}
              onAddToZone={(containerId, zoneIndex, type) => {
                const block = createBlock(type);
                update({ blocks: insertIntoZone(page.blocks, containerId, zoneIndex, block) });
                setSelectedId(block.id);
              }}
            />
          </div>
        </div>

        {/* Settings panel */}
        <aside className="w-80 shrink-0 overflow-y-auto bg-white p-4">
          {selectedBlock && selectedDef ? (
            <>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-bold tracking-tight">{selectedDef.label}</h2>
                <button className="text-xs font-medium" style={{ color: "var(--ad-muted)" }} onClick={() => setSelectedId(null)}>
                  Page settings
                </button>
              </div>
              <AutoFields
                fields={selectedDef.fields}
                values={{ ...selectedDef.defaults, ...selectedBlock.props }}
                onChange={(partial) => update({ blocks: updateBlockProps(page.blocks, selectedBlock.id, partial) })}
              />
            </>
          ) : (
            <PageSettings
              page={page}
              update={update}
              onShowRevisions={() => setRevisionsOpen(true)}
            />
          )}
        </aside>
      </div>

      {revisionsOpen && (
        <RevisionsModal
          pageId={page.id}
          onClose={() => setRevisionsOpen(false)}
          onRestored={(blocks) => {
            setPage((p) => ({ ...p, blocks }));
            setRevisionsOpen(false);
            setSaveState("saved");
          }}
        />
      )}
    </div>
  );
}

function PageSettings({
  page,
  update,
  onShowRevisions,
}: {
  page: PageData;
  update: (partial: Partial<PageData>) => void;
  onShowRevisions: () => void;
}) {
  return (
    <>
      <h2 className="mb-4 text-sm font-bold tracking-tight">Page settings</h2>

      <div className="ad-field">
        <label className="ad-label">Slug</label>
        <div className="flex items-center gap-1">
          <span className="text-sm" style={{ color: "var(--ad-muted)" }}>/</span>
          <input className="ad-input" value={page.slug} onChange={(e) => update({ slug: e.target.value })} />
        </div>
        <p className="mt-1 text-[11px]" style={{ color: "var(--ad-muted)" }}>
          The slug &quot;home&quot; is served at the site root.
        </p>
      </div>

      <div className="ad-field">
        <label className="ad-label">Status</label>
        <select
          className="ad-select"
          value={page.status}
          onChange={(e) => update({ status: e.target.value as PageData["status"] })}
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="scheduled">Scheduled</option>
        </select>
      </div>

      {page.status === "scheduled" && (
        <div className="ad-field">
          <label className="ad-label">Go live at</label>
          <input
            className="ad-input"
            type="datetime-local"
            value={page.publishAt ? page.publishAt.slice(0, 16) : ""}
            onChange={(e) => update({ publishAt: e.target.value ? new Date(e.target.value).toISOString() : null })}
          />
        </div>
      )}

      <details className="mb-3 mt-5" open>
        <summary className="mb-2 cursor-pointer text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--ad-muted)" }}>
          SEO
        </summary>
        <div className="ad-field">
          <label className="ad-label">Meta title</label>
          <input className="ad-input" value={page.metaTitle ?? ""} onChange={(e) => update({ metaTitle: e.target.value || null })} />
        </div>
        <div className="ad-field">
          <label className="ad-label">Meta description</label>
          <textarea className="ad-textarea" rows={3} value={page.metaDescription ?? ""} onChange={(e) => update({ metaDescription: e.target.value || null })} />
        </div>
        <div className="ad-field">
          <label className="ad-label">Social image URL</label>
          <input className="ad-input" value={page.ogImage ?? ""} onChange={(e) => update({ ogImage: e.target.value || null })} placeholder="https://..." />
        </div>
        <label className="mb-3 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={page.noindex} onChange={(e) => update({ noindex: e.target.checked })} />
          Hide from search engines (noindex)
        </label>
      </details>

      <button className="ad-btn ad-btn-soft mb-2 w-full" onClick={onShowRevisions}>
        Revision history
      </button>

      <button
        className="ad-btn ad-btn-danger w-full"
        title="Reversible - restore it from the Trash tab on the pages list"
        onClick={() => trashPage(page.id)}
      >
        Move to trash
      </button>
    </>
  );
}

function RevisionsModal({
  pageId,
  onClose,
  onRestored,
}: {
  pageId: string;
  onClose: () => void;
  onRestored: (blocks: Block[]) => void;
}) {
  const [revisions, setRevisions] = useState<{ id: string; savedAt: string; title: string; savedByName: string | null }[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listRevisions(pageId).then(setRevisions).catch(() => setRevisions([]));
  }, [pageId]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 p-6" onClick={onClose}>
      <div className="max-h-[70vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight">Revisions</h2>
          <button className="ad-btn ad-btn-soft" onClick={onClose}>Close</button>
        </div>
        {revisions === null ? (
          <p className="text-sm" style={{ color: "var(--ad-muted)" }}>Loading...</p>
        ) : revisions.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--ad-muted)" }}>
            No revisions yet. Snapshots are taken automatically as you edit.
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {revisions.map((rev) => (
              <div key={rev.id} className="flex items-center justify-between rounded-lg bg-[var(--ad-bg)] px-3 py-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{new Date(rev.savedAt).toLocaleString()}</div>
                  <div className="text-xs" style={{ color: "var(--ad-muted)" }}>
                    {rev.title}
                    {rev.savedByName ? ` · ${rev.savedByName}` : ""}
                  </div>
                </div>
                <button
                  className="ad-btn ad-btn-soft shrink-0"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const blocks = await restoreRevision(pageId, rev.id);
                      onRestored(blocks);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Restore
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
