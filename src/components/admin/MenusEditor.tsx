"use client";

import { useState } from "react";
import type { MenuItem } from "@/db/schema";
import { saveMenu } from "@/app/admin/actions";

type PageOption = { label: string; href: string };

export function MenusEditor({ header, footer, pageOptions }: { header: MenuItem[]; footer: MenuItem[]; pageOptions: PageOption[] }) {
  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Menus</h1>
      <SingleMenu name="header" label="Header navigation" initial={header} pageOptions={pageOptions} />
      <SingleMenu name="footer" label="Footer links" initial={footer} pageOptions={pageOptions} />
    </div>
  );
}

function SingleMenu({ name, label, initial, pageOptions }: { name: string; label: string; initial: MenuItem[]; pageOptions: PageOption[] }) {
  const [items, setItems] = useState(initial);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");

  async function persist(next: MenuItem[]) {
    setItems(next);
    setState("saving");
    await saveMenu(name, next);
    setState("saved");
    setTimeout(() => setState("idle"), 1500);
  }

  return (
    <section className="mb-6 rounded-xl bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold tracking-tight">{label}</h2>
        <span className="text-xs" style={{ color: "var(--ad-muted)" }}>
          {state === "saving" ? "Saving..." : state === "saved" ? "Saved" : ""}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2 rounded-lg p-2" style={{ background: "var(--ad-bg)" }}>
            <input
              className="ad-input"
              style={{ background: "#fff" }}
              placeholder="Label"
              value={item.label}
              onChange={(e) => persist(items.map((it, j) => (j === i ? { ...it, label: e.target.value } : it)))}
            />
            <input
              className="ad-input"
              style={{ background: "#fff" }}
              placeholder="/about or https://..."
              value={item.href}
              list={`pages-${name}`}
              onChange={(e) => persist(items.map((it, j) => (j === i ? { ...it, href: e.target.value } : it)))}
            />
            <button
              className="px-1 text-xs"
              style={{ color: "var(--ad-muted)" }}
              disabled={i === 0}
              onClick={() => {
                const next = [...items];
                [next[i - 1], next[i]] = [next[i], next[i - 1]];
                persist(next);
              }}
            >
              ↑
            </button>
            <button
              className="px-1 text-xs"
              style={{ color: "var(--ad-muted)" }}
              disabled={i === items.length - 1}
              onClick={() => {
                const next = [...items];
                [next[i], next[i + 1]] = [next[i + 1], next[i]];
                persist(next);
              }}
            >
              ↓
            </button>
            <button className="px-1 text-xs" style={{ color: "var(--ad-danger)" }} onClick={() => persist(items.filter((_, j) => j !== i))}>
              ✕
            </button>
          </div>
        ))}
      </div>

      <datalist id={`pages-${name}`}>
        {pageOptions.map((p) => (
          <option key={p.href} value={p.href}>
            {p.label}
          </option>
        ))}
      </datalist>

      <button className="ad-btn ad-btn-soft mt-3" onClick={() => persist([...items, { label: "", href: "" }])}>
        + Add item
      </button>
    </section>
  );
}
