import { useEffect, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TiptapLink from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import {
  ListBullets,
  ListNumbers,
  Quotes,
  Link,
  ArrowCounterClockwise,
  ArrowClockwise,
  Minus,
} from "@phosphor-icons/react";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

const normalize = (html: string) => (html === "<p></p>" ? "" : html);

export default function RichEditor({
  value,
  onChange,
  placeholder = "Shkruaj përmbajtjen...",
  minHeight = 340,
}: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, link: false }),
      TiptapLink.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-primary underline cursor-pointer" },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || "",
    onUpdate: ({ editor }) => {
      onChange(normalize(editor.getHTML()));
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none px-4 py-3",
        style: `min-height: ${minHeight}px`,
      },
    },
  });

  // Sync when switching SQ/EN tab or loading a different post
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const current = normalize(editor.getHTML());
    const incoming = value ?? "";
    if (current !== incoming) {
      editor.commands.setContent(incoming, false);
    }
  }, [value, editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href ?? "";
    const url = window.prompt("URL e linkut:", prev);
    if (url === null) return;
    const trimmed = url.trim();
    if (trimmed === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      // Block dangerous protocols
      if (/^(javascript|data|vbscript):/i.test(trimmed)) return;
      // Auto-prepend https:// if no protocol given
      const href = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
      editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    }
  }, [editor]);

  if (!editor) return null;

  const Btn = ({
    onClick,
    active,
    title,
    children,
  }: {
    onClick: () => void;
    active: boolean;
    title: string;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      title={title}
      className={`p-1.5 rounded leading-none transition-colors cursor-pointer select-none ${
        active
          ? "bg-primary text-white"
          : "text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900"
      }`}
    >
      {children}
    </button>
  );

  const Sep = () => <div className="w-px h-4 bg-border mx-0.5 self-center shrink-0" />;

  return (
    <div className="border border-border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-colors">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-border bg-neutral-50">
        <Btn
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          title="Bold (Ctrl+B)"
        >
          <span className="text-xs font-bold w-4 text-center inline-block">B</span>
        </Btn>
        <Btn
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          title="Italic (Ctrl+I)"
        >
          <span className="text-xs italic font-semibold w-4 text-center inline-block">I</span>
        </Btn>
        <Sep />
        <Btn
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive("heading", { level: 2 })}
          title="Titulli 2"
        >
          <span className="text-xs font-bold w-5 text-center inline-block">H2</span>
        </Btn>
        <Btn
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive("heading", { level: 3 })}
          title="Titulli 3"
        >
          <span className="text-xs font-bold w-5 text-center inline-block">H3</span>
        </Btn>
        <Sep />
        <Btn
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          title="Lista me pika"
        >
          <ListBullets size={15} />
        </Btn>
        <Btn
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          title="Lista me numra"
        >
          <ListNumbers size={15} />
        </Btn>
        <Sep />
        <Btn
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive("blockquote")}
          title="Citat"
        >
          <Quotes size={15} />
        </Btn>
        <Btn
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          active={false}
          title="Vijë ndarëse"
        >
          <Minus size={15} />
        </Btn>
        <Btn onClick={setLink} active={editor.isActive("link")} title="Shto / ndrysho link">
          <Link size={15} />
        </Btn>
        {editor.isActive("link") && (
          <Btn
            onClick={() => editor.chain().focus().unsetLink().run()}
            active={false}
            title="Hiq link"
          >
            <span className="text-xs w-4 text-center inline-block">✕</span>
          </Btn>
        )}
        <Sep />
        <Btn
          onClick={() => editor.chain().focus().undo().run()}
          active={false}
          title="Zhbëj (Ctrl+Z)"
        >
          <ArrowCounterClockwise size={14} />
        </Btn>
        <Btn
          onClick={() => editor.chain().focus().redo().run()}
          active={false}
          title="Ribëj (Ctrl+Y)"
        >
          <ArrowClockwise size={14} />
        </Btn>
      </div>

      {/* Editor area */}
      <EditorContent editor={editor} className="bg-white" />
    </div>
  );
}
