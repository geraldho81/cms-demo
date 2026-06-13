"use client";

import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { MediaPicker } from "@/components/admin/MediaPicker";

export function RichTextField({
  value,
  onChange,
  variant = "field",
  placeholder = "Write something...",
}: {
  value: string;
  onChange: (html: string) => void;
  variant?: "field" | "post";
  placeholder?: string;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const loadedFor = useRef<string | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ link: false }),
      Link.configure({ openOnClick: false }),
      Image,
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  // Load external value only when switching to a different block/post,
  // not on every keystroke echo (which would reset the cursor).
  useEffect(() => {
    if (!editor) return;
    if (loadedFor.current === null) {
      loadedFor.current = value;
      return;
    }
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  if (!editor) return <div className="ad-richtext" />;

  const btn = (active: boolean) =>
    `rounded px-1.5 py-0.5 text-xs font-semibold ${active ? "bg-[var(--ad-accent-soft)] text-[var(--ad-accent)]" : "text-[var(--ad-muted)] hover:bg-[var(--ad-bg)]"}`;

  return (
    <div className={`ad-richtext ${variant === "post" ? "ad-richtext-post" : ""}`}>
      <div className="mb-1.5 flex flex-wrap items-center gap-0.5">
        <button type="button" className={btn(editor.isActive("bold"))} onClick={() => editor.chain().focus().toggleBold().run()}>B</button>
        <button type="button" className={btn(editor.isActive("italic"))} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <em>I</em>
        </button>
        <button type="button" className={btn(editor.isActive("heading", { level: 2 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</button>
        <button type="button" className={btn(editor.isActive("heading", { level: 3 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</button>
        <button type="button" className={btn(editor.isActive("bulletList"))} onClick={() => editor.chain().focus().toggleBulletList().run()}>•</button>
        <button type="button" className={btn(editor.isActive("orderedList"))} onClick={() => editor.chain().focus().toggleOrderedList().run()}>1.</button>
        <button type="button" className={btn(editor.isActive("blockquote"))} onClick={() => editor.chain().focus().toggleBlockquote().run()}>&ldquo;</button>
        <button type="button" className={btn(editor.isActive("codeBlock"))} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>{"</>"}</button>
        <button
          type="button"
          className={btn(editor.isActive("link") || linkOpen)}
          onClick={() => {
            setLinkUrl((editor.getAttributes("link").href as string) ?? "");
            setLinkOpen((v) => !v);
          }}
        >
          Link
        </button>
        <button type="button" className={btn(false)} onClick={() => setPickerOpen(true)}>Img</button>
      </div>
      {linkOpen && (
        <div className="mb-1.5 flex items-center gap-1.5">
          <input
            className="ad-input"
            style={{ padding: "0.3rem 0.6rem", fontSize: "0.8rem" }}
            placeholder="https://..."
            value={linkUrl}
            autoFocus
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (linkUrl) editor.chain().focus().setLink({ href: linkUrl }).run();
                else editor.chain().focus().unsetLink().run();
                setLinkOpen(false);
              }
              if (e.key === "Escape") setLinkOpen(false);
            }}
          />
          <button
            type="button"
            className="ad-btn ad-btn-soft"
            style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}
            onClick={() => {
              if (linkUrl) editor.chain().focus().setLink({ href: linkUrl }).run();
              else editor.chain().focus().unsetLink().run();
              setLinkOpen(false);
            }}
          >
            Set
          </button>
        </div>
      )}
      <EditorContent editor={editor} />
      {pickerOpen && (
        <MediaPicker
          onSelect={(url) => editor.chain().focus().setImage({ src: url }).run()}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}
