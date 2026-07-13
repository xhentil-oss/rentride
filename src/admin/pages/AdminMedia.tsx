import React, { useState, useRef, useCallback } from "react";
import {
  UploadSimple,
  Image as ImageIcon,
  Car,
  Trash,
  MagnifyingGlass,
  X,
  Check,
  Link as LinkIcon,
  SpinnerGap,
  FolderOpen,
  Copy,
  ArrowSquareOut,
  Warning,
} from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import { useQuery, useMutation } from "../../hooks/useApi";
import { useBulkSelection } from "../../hooks/useBulkSelection";
import BulkActionBar, { BulkCheckbox } from "../components/BulkActionBar";

type MediaItem = {
  id: string;
  url: string;
  name: string;
  carId?: string;
  carLabel?: string;
};

// We store media as Car.image field values + allow standalone hosted URLs.
// Since there's no dedicated Media entity, we display all car images + allow
// the user to upload a file (converted to a data URL preview or hosted URL input).

export default function AdminMedia() {
  const { data: cars, isPending } = useQuery("Car");
  const { update } = useMutation("Car");

  const [search, setSearch] = useState("");
  const [filterCarId, setFilterCarId] = useState("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadUrl, setUploadUrl] = useState("");
  const [uploadMode, setUploadMode] = useState<"file" | "url">("file");
  const [uploadCarId, setUploadCarId] = useState("none");
  const [dragging, setDragging] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [uploadName, setUploadName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Build media list from all car images
  const mediaItems: MediaItem[] = (cars ?? [])
    .filter((c) => c.image)
    .map((c) => ({
      id: c.id,
      url: c.image,
      name: `${c.brand} ${c.model} (${c.year})`,
      carId: c.id,
      carLabel: `${c.brand} ${c.model}`,
    }));

  const filtered = mediaItems.filter((m) => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) || m.url.toLowerCase().includes(search.toLowerCase());
    const matchCar = filterCarId === "all" || m.carId === filterCarId;
    return matchSearch && matchCar;
  });

  const selectedItem = selected ? mediaItems.find((m) => m.id === selected) : null;

  const bulk = useBulkSelection(filtered);
  const [bulkConfirm, setBulkConfirm] = useState(false);

  const handleBulkDelete = async () => {
    const items = bulk.getSelectedItems();
    try {
      await Promise.all(items.map((m) => update(m.id, { image: "/placeholder-car.svg" })));
      bulk.clear();
      setBulkConfirm(false);
    } catch (e) { console.error(e); }
  };

  const handleFileChange = (file: File | null) => {
    if (!file) return;
    setUploadName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewImg(e.target?.result as string);
      setUploadUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file && file.type.startsWith("image/")) handleFileChange(file);
    },
    []
  );

  const handleSaveUpload = async () => {
    if (!uploadUrl.trim()) return;
    if (uploadCarId === "none") {
      alert("Ju lutemi zgjidhni një makinë për të lidhur imazhin.");
      return;
    }
    setUploading(true);
    try {
      await update(uploadCarId, { image: uploadUrl.trim() });
      setUploadUrl("");
      setPreviewImg(null);
      setUploadName("");
      setUploadCarId("none");
      setShowUploadPanel(false);
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async (carId: string) => {
    await update(carId, { image: "/placeholder-car.svg" });
    setDeleteConfirm(null);
    if (selected === carId) setSelected(null);
  };

  const handleCopyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-medium text-neutral-900">Media</h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            {mediaItems.length} imazhe · lidhur me automjetet e flotës
          </p>
        </div>
        <button
          onClick={() => { setShowUploadPanel(true); setUploadMode("file"); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-primary text-white text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer"
        >
          <UploadSimple size={16} weight="bold" />
          Ngarko imazh
        </button>
      </div>

      {/* Upload Panel */}
      {showUploadPanel && (
        <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-neutral-800">Ngarko imazh të ri</p>
            <button
              onClick={() => { setShowUploadPanel(false); setPreviewImg(null); setUploadUrl(""); setUploadName(""); }}
              className="p-1.5 rounded-md text-neutral-400 hover:bg-secondary transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Mode tabs */}
          <div className="flex gap-2 mb-4">
            {(["file", "url"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => { setUploadMode(mode); setPreviewImg(null); setUploadUrl(""); setUploadName(""); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  uploadMode === mode
                    ? "bg-primary/10 text-primary border border-primary/30"
                    : "bg-neutral-100 text-neutral-500 border border-transparent hover:bg-neutral-200"
                }`}
              >
                {mode === "file" ? <UploadSimple size={13} /> : <LinkIcon size={13} />}
                {mode === "file" ? "Ngarko nga PC" : "Vendos URL"}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Left: upload area */}
            <div>
              {uploadMode === "file" ? (
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative flex flex-col items-center justify-center gap-3 h-40 rounded-xl border-2 border-dashed transition-colors cursor-pointer ${
                    dragging
                      ? "border-primary bg-primary/5"
                      : "border-neutral-200 hover:border-primary/50 hover:bg-neutral-50"
                  }`}
                >
                  {previewImg ? (
                    <img src={previewImg} alt="preview" className="absolute inset-0 w-full h-full object-cover rounded-xl opacity-80" />
                  ) : (
                    <>
                      <UploadSimple size={28} className="text-neutral-300" />
                      <p className="text-sm text-neutral-400 text-center px-4">
                        Tërhiq imazhin këtu ose <span className="text-primary font-medium">kliko për të zgjedhur</span>
                      </p>
                      <p className="text-xs text-neutral-300">JPG, PNG, WebP · max 10 MB</p>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-neutral-600">URL e imazhit</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={uploadUrl}
                    onChange={(e) => {
                      setUploadUrl(e.target.value);
                      setPreviewImg(e.target.value || null);
                    }}
                    className="w-full px-3 py-2.5 rounded-lg border border-border text-sm font-mono text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                  {previewImg && (
                    <img
                      src={previewImg}
                      alt="preview"
                      className="w-full h-32 object-cover rounded-lg mt-2"
                      onError={() => setPreviewImg(null)}
                    />
                  )}
                </div>
              )}
              {uploadName && (
                <p className="text-xs text-neutral-400 mt-2 truncate">📎 {uploadName}</p>
              )}
            </div>

            {/* Right: link to car */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-neutral-600 block mb-1.5">Lidhe me makinën <span className="text-red-400">*</span></label>
                <select
                  value={uploadCarId}
                  onChange={(e) => setUploadCarId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-border text-sm text-neutral-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="none">— Zgjidh makinën —</option>
                  {(cars ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.brand} {c.model} ({c.year})
                    </option>
                  ))}
                </select>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-700">
                <strong>Shënim:</strong> Imazhi i ngarkuar do të bëhet imazhi kryesor i makinës së zgjedhur. Imazhi aktual do të zëvendësohet.
              </div>
              <button
                onClick={handleSaveUpload}
                disabled={uploading || !uploadUrl.trim() || uploadCarId === "none"}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gradient-primary text-white text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-opacity cursor-pointer"
              >
                {uploading ? <SpinnerGap size={15} className="animate-spin" /> : <Check size={15} weight="bold" />}
                {uploading ? "Duke ruajtur..." : "Ruaj imazhin"}
              </button>
            </div>
          </div>
        </div>
      )}

      <BulkActionBar
        selectedCount={bulk.selectedCount}
        onClear={bulk.clear}
        itemLabel="imazh"
        actions={[
          { label: "Fshi", icon: Trash, variant: "danger", onClick: () => setBulkConfirm(true) },
        ]}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="search"
            placeholder="Kërko imazhe..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
        <select
          value={filterCarId}
          onChange={(e) => setFilterCarId(e.target.value)}
          className="px-3 py-2.5 rounded-lg border border-border text-sm text-neutral-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 min-w-40"
        >
          <option value="all">Të gjitha makina</option>
          {(cars ?? []).map((c) => (
            <option key={c.id} value={c.id}>{c.brand} {c.model}</option>
          ))}
        </select>
      </div>

      {/* Grid + Detail panel */}
      <div className="flex gap-5">
        {/* Image grid */}
        <div className="flex-1 min-w-0">
          {isPending ? (
            <div className="flex items-center justify-center py-20">
              <SpinnerGap size={28} className="animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-neutral-400">
              <FolderOpen size={48} />
              <p className="text-sm">Nuk u gjetën imazhe.</p>
            </div>
          ) : (
            <>
            {filtered.length > 0 && (
              <label className="flex items-center gap-2 text-xs text-neutral-500 cursor-pointer mb-3">
                <BulkCheckbox
                  checked={bulk.isAllSelected}
                  indeterminate={bulk.isSomeSelected}
                  onChange={bulk.toggleAll}
                  ariaLabel="Zgjidh të gjitha imazhet"
                />
                Zgjidh të gjitha ({filtered.length})
              </label>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filtered.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelected(selected === item.id ? null : item.id)}
                  className={`group relative rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${
                    bulk.isSelected(item.id)
                      ? "border-primary shadow-md ring-2 ring-primary/30"
                      : selected === item.id
                      ? "border-primary shadow-md"
                      : "border-transparent hover:border-primary/40"
                  }`}
                >
                  <div className="absolute top-2 left-2 z-10 bg-white/90 rounded p-0.5 shadow-sm" onClick={(e) => e.stopPropagation()}>
                    <BulkCheckbox
                      checked={bulk.isSelected(item.id)}
                      onChange={() => bulk.toggleOne(item.id)}
                      ariaLabel={`Zgjidh ${item.name}`}
                    />
                  </div>
                  <img
                    src={item.url}
                    alt={item.name}
                    className="w-full h-32 object-cover bg-neutral-100"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "/placeholder-car.svg";
                    }}
                  />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-neutral-900/0 group-hover:bg-neutral-900/30 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCopyUrl(item.url, item.id); }}
                      className="p-2 bg-white rounded-full text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer shadow"
                      title="Kopjo URL-in"
                    >
                      {copiedId === item.id ? <Check size={14} weight="bold" className="text-emerald-600" /> : <Copy size={14} />}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirm(item.id); }}
                      className="p-2 bg-white rounded-full text-red-500 hover:bg-red-50 transition-colors cursor-pointer shadow"
                      title="Fshi imazhin"
                    >
                      <Trash size={14} />
                    </button>
                  </div>
                  {/* Car label */}
                  <div className="px-2 py-1.5 bg-white">
                    <p className="text-xs font-medium text-neutral-700 truncate">{item.carLabel}</p>
                  </div>
                  {selected === item.id && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <Check size={11} weight="bold" className="text-white" />
                    </div>
                  )}
                </div>
              ))}
            </div>
            </>
          )}
        </div>

        {/* Detail side panel */}
        {selectedItem && (
          <div className="w-64 shrink-0 bg-white rounded-xl border border-border p-4 space-y-4 self-start sticky top-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Detajet</p>
              <button onClick={() => setSelected(null)} className="p-1 text-neutral-400 hover:text-neutral-700 cursor-pointer">
                <X size={14} />
              </button>
            </div>
            <img
              src={selectedItem.url}
              alt={selectedItem.name}
              className="w-full h-36 object-cover rounded-lg bg-neutral-100"
              onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder-car.svg"; }}
            />
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 p-2 bg-neutral-50 rounded-lg">
                <Car size={14} className="text-neutral-400 shrink-0" />
                <span className="text-neutral-700 font-medium truncate">{selectedItem.carLabel}</span>
              </div>
              <div className="flex items-start gap-2 p-2 bg-neutral-50 rounded-lg">
                <LinkIcon size={14} className="text-neutral-400 shrink-0 mt-0.5" />
                <span className="text-neutral-500 text-xs font-mono break-all line-clamp-3">{selectedItem.url}</span>
              </div>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => handleCopyUrl(selectedItem.url, selectedItem.id)}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-border text-sm text-neutral-700 hover:bg-secondary transition-colors cursor-pointer"
              >
                {copiedId === selectedItem.id ? <Check size={14} weight="bold" className="text-emerald-600" /> : <Copy size={14} />}
                {copiedId === selectedItem.id ? "U kopjua!" : "Kopjo URL-in"}
              </button>
              <Link
                to={`/admin/flota/${selectedItem.carId}`}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-border text-sm text-neutral-700 hover:bg-secondary transition-colors no-underline"
              >
                <ArrowSquareOut size={14} />
                Hap makinën
              </Link>
              <button
                onClick={() => setDeleteConfirm(selectedItem.id)}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-red-100 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              >
                <Trash size={14} />
                Fshi imazhin
              </button>
            </div>
          </div>
        )}
      </div>

      {bulkConfirm && (
        <div className="fixed inset-0 bg-neutral-900/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-base font-semibold text-neutral-900 mb-2">Fshi imazhet</h3>
            <p className="text-sm text-neutral-500 mb-6">
              {bulk.selectedCount} imazhe do të zëvendësohen me imazhin standard.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setBulkConfirm(false)} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium text-neutral-700 hover:bg-secondary cursor-pointer">Anulo</button>
              <button onClick={handleBulkDelete} className="flex-1 py-2.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 cursor-pointer">Po, fshi</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-neutral-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Warning size={20} weight="fill" className="text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-neutral-900">Fshi imazhin</h3>
                <p className="text-xs text-neutral-500">Imazhi do të zëvendësohet me imazhin standard.</p>
              </div>
            </div>
            <p className="text-sm text-neutral-600 mb-6">Jeni të sigurt? Imazhi aktual i makinës do të hiqet.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium text-neutral-700 hover:bg-secondary transition-colors cursor-pointer"
              >
                Anulo
              </button>
              <button
                onClick={() => handleDeleteImage(deleteConfirm)}
                className="flex-1 py-2.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors cursor-pointer"
              >
                Fshi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
