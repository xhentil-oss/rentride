import { lazy, Suspense, useState } from "react";
import { useQuery, useMutation } from "../../hooks/useApi";
import { PencilSimple, Trash, Plus, Eye, EyeSlash, MagnifyingGlass, Article, Check } from "@phosphor-icons/react";
import ImagePicker from "../ImagePicker";
import { useBulkSelection } from "../../hooks/useBulkSelection";
import BulkActionBar, { BulkCheckbox } from "../components/BulkActionBar";

// Tiptap (used by RichEditor) is ~300KB minified. Lazy-load so the post list
// loads instantly; tiptap only downloads when the user opens the editor.
const RichEditor = lazy(() => import("../RichEditor"));

function RichEditorSkeleton() {
  return (
    <div className="border border-border rounded-lg bg-neutral-50 animate-pulse">
      <div className="h-10 border-b border-border bg-neutral-100" />
      <div className="p-4 space-y-2">
        <div className="h-3 bg-neutral-200 rounded w-3/4" />
        <div className="h-3 bg-neutral-200 rounded w-1/2" />
        <div className="h-3 bg-neutral-200 rounded w-5/6" />
      </div>
    </div>
  );
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[ëé]/g, "e").replace(/[çç]/g, "c").replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

interface BlogPost {
  id: string;
  titleSq: string;
  titleEn: string;
  slug: string;
  excerptSq: string;
  excerptEn: string;
  contentSq: string;
  contentEn: string;
  coverImage: string;
  tags: string;
  status: string;
  publishedAt: string;
  metaTitleSq: string;
  metaTitleEn: string;
  metaDescSq: string;
  metaDescEn: string;
}

const emptyPost: Omit<BlogPost, "id" | "publishedAt"> = {
  titleSq: "", titleEn: "", slug: "", excerptSq: "", excerptEn: "",
  contentSq: "", contentEn: "", coverImage: "", tags: "",
  status: "draft", metaTitleSq: "", metaTitleEn: "", metaDescSq: "", metaDescEn: "",
};

export default function AdminBlog() {
  const { data, isPending: loading, refetch } = useQuery("BlogPostAdmin");
  const posts: BlogPost[] = data ?? [];
  const { create: createPost, update: updatePost, remove: deletePost, isPending: mutating } = useMutation("BlogPost");

  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [form, setForm] = useState(emptyPost);
  const [showEditor, setShowEditor] = useState(false);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"sq" | "en">("sq");
  const [bulkConfirm, setBulkConfirm] = useState<null | "delete" | "published" | "draft">(null);

  const filtered = posts.filter(p =>
    p.titleSq.toLowerCase().includes(search.toLowerCase()) ||
    (p.titleEn || "").toLowerCase().includes(search.toLowerCase())
  );

  const bulk = useBulkSelection(filtered);

  const handleBulkDelete = async () => {
    const items = bulk.getSelectedItems();
    try {
      await Promise.all(items.map((p) => deletePost(p.id)));
      bulk.clear();
      setBulkConfirm(null);
      await refetch();
    } catch (e) { console.error(e); }
  };

  const handleBulkStatus = async (status: "published" | "draft") => {
    const items = bulk.getSelectedItems();
    try {
      await Promise.all(items.map((p) => updatePost(p.id, { status })));
      bulk.clear();
      setBulkConfirm(null);
      await refetch();
    } catch (e) { console.error(e); }
  };

  const openNew = () => {
    setEditing(null);
    setForm(emptyPost);
    setTab("sq");
    setShowEditor(true);
  };

  const openEdit = (post: BlogPost) => {
    setEditing(post);
    setForm({
      titleSq: post.titleSq, titleEn: post.titleEn || "", slug: post.slug,
      excerptSq: post.excerptSq || "", excerptEn: post.excerptEn || "",
      contentSq: post.contentSq, contentEn: post.contentEn || "",
      coverImage: post.coverImage || "", tags: post.tags || "",
      status: post.status, metaTitleSq: post.metaTitleSq || "", metaTitleEn: post.metaTitleEn || "",
      metaDescSq: post.metaDescSq || "", metaDescEn: post.metaDescEn || "",
    });
    setTab("sq");
    setShowEditor(true);
  };

  const handleSave = async (status?: string) => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        status: status || form.status,
        slug: form.slug || slugify(form.titleSq),
      };
      if (editing) {
        await updatePost(editing.id, payload);
      } else {
        await createPost(payload);
      }
      await refetch();
      setShowEditor(false);
    } catch { /* error handled by hook */ }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Jeni i sigurtë që doni të fshini këtë postim?")) return;
    await deletePost(id);
    await refetch();
  };

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  if (showEditor) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-neutral-800">
            {editing ? "Ndrysho Postimin" : "Postim i Ri"}
          </h1>
          <button onClick={() => setShowEditor(false)} className="text-sm text-neutral-500 hover:text-neutral-700 cursor-pointer">
            ← Kthehu te lista
          </button>
        </div>

        {/* Language tabs */}
        <div className="flex gap-1 bg-neutral-100 rounded-lg p-1 w-fit">
          <button onClick={() => setTab("sq")} className={`px-4 py-1.5 rounded-md text-sm font-medium cursor-pointer transition-colors ${tab === "sq" ? "bg-white shadow-sm text-primary" : "text-neutral-600 hover:text-neutral-800"}`}>
            🇦🇱 Shqip
          </button>
          <button onClick={() => setTab("en")} className={`px-4 py-1.5 rounded-md text-sm font-medium cursor-pointer transition-colors ${tab === "en" ? "bg-white shadow-sm text-primary" : "text-neutral-600 hover:text-neutral-800"}`}>
            🇬🇧 English
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main editor */}
          <div className="lg:col-span-2 space-y-4">
            {tab === "sq" ? (
              <>
                <div>
                  <label className="text-xs font-medium text-neutral-600 mb-1 block">Titulli (SQ) *</label>
                  <input value={form.titleSq} onChange={e => { set("titleSq", e.target.value); if (!editing) set("slug", slugify(e.target.value)); }} className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="Titulli i postimit në shqip" />
                </div>
                <div>
                  <label className="text-xs font-medium text-neutral-600 mb-1 block">Përshkrimi i shkurtër (SQ)</label>
                  <textarea value={form.excerptSq} onChange={e => set("excerptSq", e.target.value)} rows={2} className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-y" placeholder="1-2 fjali përshkruese..." />
                </div>
                <div>
                  <label className="text-xs font-medium text-neutral-600 mb-1.5 block">Imazhi i kopertinës</label>
                  <ImagePicker value={form.coverImage} onChange={url => set("coverImage", url)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-neutral-600 mb-1 block">Përmbajtja (SQ) *</label>
                  <Suspense fallback={<RichEditorSkeleton />}>
                    <RichEditor
                      value={form.contentSq}
                      onChange={val => set("contentSq", val)}
                      placeholder="Shkruaj përmbajtjen në shqip..."
                    />
                  </Suspense>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="text-xs font-medium text-neutral-600 mb-1 block">Title (EN)</label>
                  <input value={form.titleEn} onChange={e => set("titleEn", e.target.value)} className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="Post title in English" />
                </div>
                <div>
                  <label className="text-xs font-medium text-neutral-600 mb-1 block">Excerpt (EN)</label>
                  <textarea value={form.excerptEn} onChange={e => set("excerptEn", e.target.value)} rows={2} className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-y" placeholder="1-2 sentences..." />
                </div>
                <div>
                  <label className="text-xs font-medium text-neutral-600 mb-1.5 block">Cover image</label>
                  <ImagePicker value={form.coverImage} onChange={url => set("coverImage", url)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-neutral-600 mb-1 block">Content (EN)</label>
                  <Suspense fallback={<RichEditorSkeleton />}>
                    <RichEditor
                      value={form.contentEn}
                      onChange={val => set("contentEn", val)}
                      placeholder="Write content in English..."
                    />
                  </Suspense>
                </div>
              </>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-border p-4 space-y-3">
              <h3 className="text-sm font-semibold text-neutral-800">Cilësimet</h3>
              <div>
                <label className="text-xs font-medium text-neutral-600 mb-1 block">Slug (URL)</label>
                <input value={form.slug} onChange={e => set("slug", e.target.value)} className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="titulli-postimit" />
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-600 mb-1 block">Tags (me presje)</label>
                <input value={form.tags} onChange={e => set("tags", e.target.value)} className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="tiranë, aeroport, suv" />
              </div>
            </div>

            {/* SEO */}
            <div className="bg-white rounded-xl border border-border p-4 space-y-3">
              <h3 className="text-sm font-semibold text-neutral-800">SEO</h3>
              {tab === "sq" ? (
                <>
                  <div>
                    <label className="text-xs font-medium text-neutral-600 mb-1 block">Meta Title (SQ)</label>
                    <input value={form.metaTitleSq} onChange={e => set("metaTitleSq", e.target.value)} className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-neutral-600 mb-1 block">Meta Description (SQ)</label>
                    <textarea value={form.metaDescSq} onChange={e => set("metaDescSq", e.target.value)} rows={2} className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-y" />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-xs font-medium text-neutral-600 mb-1 block">Meta Title (EN)</label>
                    <input value={form.metaTitleEn} onChange={e => set("metaTitleEn", e.target.value)} className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-neutral-600 mb-1 block">Meta Description (EN)</label>
                    <textarea value={form.metaDescEn} onChange={e => set("metaDescEn", e.target.value)} rows={2} className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-y" />
                  </div>
                </>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleSave("published")}
                disabled={saving || !form.titleSq || !form.contentSq}
                className="w-full py-2.5 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-50 cursor-pointer transition-colors"
              >
                {saving ? "Duke ruajtur..." : "Publiko"}
              </button>
              <button
                onClick={() => handleSave("draft")}
                disabled={saving || !form.titleSq || !form.contentSq}
                className="w-full py-2.5 rounded-lg text-sm font-medium border border-border text-neutral-700 hover:bg-secondary disabled:opacity-50 cursor-pointer transition-colors"
              >
                {saving ? "Duke ruajtur..." : "Ruaj si draft"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-neutral-800">Blog</h1>
          <p className="text-sm text-neutral-500">Menaxho postimet e blogut</p>
        </div>
        <button onClick={openNew} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-colors cursor-pointer">
          <Plus size={16} /> Postim i Ri
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Kërko postime..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <span className="text-xs text-neutral-500">{filtered.length} postime</span>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="bg-white rounded-xl border border-border p-4 animate-pulse">
              <div className="h-4 bg-neutral-200 rounded w-1/3 mb-2" />
              <div className="h-3 bg-neutral-200 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-border">
          <Article size={40} className="text-neutral-300 mx-auto mb-3" />
          <p className="text-neutral-500">{search ? "Asnjë postim nuk u gjet." : "Nuk ka postime ende."}</p>
          <button onClick={openNew} className="mt-3 text-sm text-primary font-medium hover:underline cursor-pointer">
            Krijo postimin e parë
          </button>
        </div>
      ) : (
        <>
        <BulkActionBar
          selectedCount={bulk.selectedCount}
          onClear={bulk.clear}
          itemLabel="postim"
          actions={[
            { label: "Publiko", icon: Check, variant: "success", onClick: () => setBulkConfirm("published"), disabled: mutating },
            { label: "Bëj draft", icon: EyeSlash, variant: "warning", onClick: () => setBulkConfirm("draft"), disabled: mutating },
            { label: "Fshi", icon: Trash, variant: "danger", onClick: () => setBulkConfirm("delete"), disabled: mutating },
          ]}
        />

        {filtered.length > 0 && (
          <label className="flex items-center gap-2 text-xs text-neutral-500 cursor-pointer">
            <BulkCheckbox
              checked={bulk.isAllSelected}
              indeterminate={bulk.isSomeSelected}
              onChange={bulk.toggleAll}
              ariaLabel="Zgjidh të gjitha postimet"
            />
            Zgjidh të gjitha
          </label>
        )}

        <div className="space-y-3">
          {filtered.map(post => (
            <div key={post.id} className={`bg-white rounded-xl border p-4 flex items-center gap-4 hover:shadow-sm transition-shadow ${bulk.isSelected(post.id) ? "border-primary/40 bg-primary/5" : "border-border"}`}>
              <BulkCheckbox
                checked={bulk.isSelected(post.id)}
                onChange={() => bulk.toggleOne(post.id)}
                ariaLabel={`Zgjidh ${post.titleSq}`}
              />
              {post.coverImage ? (
                <img src={post.coverImage} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0">
                  <Article size={24} className="text-neutral-300" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-neutral-800 truncate">{post.titleSq}</h3>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    post.status === "published" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                  }`}>
                    {post.status === "published" ? "Publikuar" : "Draft"}
                  </span>
                </div>
                <p className="text-xs text-neutral-500 truncate">/blog/{post.slug}</p>
                {post.publishedAt && (
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {new Date(post.publishedAt).toLocaleDateString("sq-AL", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => openEdit(post)} className="p-2 rounded-lg hover:bg-secondary text-neutral-500 hover:text-primary transition-colors cursor-pointer" title="Ndrysho">
                  <PencilSimple size={16} />
                </button>
                <a href={`/blog/${post.slug}`} target="_blank" rel="noopener" className="p-2 rounded-lg hover:bg-secondary text-neutral-500 hover:text-primary transition-colors" title="Shiko">
                  {post.status === "published" ? <Eye size={16} /> : <EyeSlash size={16} />}
                </a>
                <button onClick={() => handleDelete(post.id)} className="p-2 rounded-lg hover:bg-red-50 text-neutral-500 hover:text-error transition-colors cursor-pointer" title="Fshi">
                  <Trash size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
        </>
      )}

      {bulkConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-neutral-900/55" onClick={() => setBulkConfirm(null)} />
          <div className="relative bg-white rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-medium text-neutral-900 mb-2">
              {bulkConfirm === "delete" ? "Fshi postimet" : bulkConfirm === "published" ? "Publiko postimet" : "Vendos në draft"}
            </h3>
            <p className="text-sm text-neutral-500 mb-6">
              {bulkConfirm === "delete" ? `${bulk.selectedCount} postime do të fshihen përgjithmonë.` : `Statusi i ${bulk.selectedCount} postimeve do të ndryshojë.`}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setBulkConfirm(null)} className="flex-1 py-2.5 rounded-md text-sm font-medium border border-border text-neutral-700 hover:bg-secondary cursor-pointer">Anulo</button>
              <button
                onClick={() => {
                  if (bulkConfirm === "delete") handleBulkDelete();
                  else handleBulkStatus(bulkConfirm);
                }}
                disabled={mutating}
                className={`flex-1 py-2.5 rounded-md text-sm font-medium hover:opacity-90 cursor-pointer disabled:opacity-50 ${bulkConfirm === "delete" ? "bg-error text-error-foreground" : "bg-primary text-primary-foreground"}`}
              >
                {bulkConfirm === "delete" ? "Po, fshi" : "Po, vazhdo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
