import { useRef, useState } from "react";
import { Image, UploadSimple, Link, X, SpinnerGap } from "@phosphor-icons/react";

interface Props {
  value: string;
  onChange: (url: string) => void;
}

export default function ImagePicker({ value, onChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [drag, setDrag] = useState(false);
  const [urlMode, setUrlMode] = useState(false);
  const [urlInput, setUrlInput] = useState(value);

  const uploadFile = (file: File) => {
    setError("");
    if (!file.type.startsWith("image/")) {
      setError("Vetëm imazhe lejohen (JPG, PNG, WEBP, GIF).");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setError("Imazhi shumë i madh. Max 4MB.");
      return;
    }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      onChange(e.target?.result as string);
      setUrlMode(false);
      setUploading(false);
    };
    reader.onerror = () => {
      setError("Leximi i skedarit dështoi.");
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    uploadFile(files[0]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    handleFiles(e.dataTransfer.files);
  };

  const applyUrl = () => {
    onChange(urlInput.trim());
    setUrlMode(false);
  };

  return (
    <div className="space-y-2">
      {/* Preview or drop zone */}
      {value ? (
        <div className="relative group rounded-lg overflow-hidden border border-border">
          <img
            src={value}
            alt="Cover"
            className="w-full h-40 object-cover"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white text-neutral-800 text-xs font-medium hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              <UploadSimple size={13} />
              Ndrysho
            </button>
            <button
              type="button"
              onClick={() => { setUrlMode(true); setUrlInput(value); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white text-neutral-800 text-xs font-medium hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              <Link size={13} />
              URL
            </button>
            <button
              type="button"
              onClick={() => { onChange(""); setUrlInput(""); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors cursor-pointer"
            >
              <X size={13} />
              Hiq
            </button>
          </div>
          {uploading && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <SpinnerGap size={24} className="text-white animate-spin" />
            </div>
          )}
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onClick={() => !uploading && fileRef.current?.click()}
          className={`relative flex flex-col items-center justify-center gap-2 h-36 rounded-lg border-2 border-dashed transition-colors cursor-pointer ${
            drag
              ? "border-primary bg-secondary/30"
              : "border-border hover:border-primary/50 hover:bg-neutral-50"
          } ${uploading ? "pointer-events-none" : ""}`}
        >
          {uploading ? (
            <>
              <SpinnerGap size={24} className="text-primary animate-spin" />
              <p className="text-xs text-neutral-500">Duke ngarkuar...</p>
            </>
          ) : (
            <>
              <Image size={28} className="text-neutral-300" />
              <p className="text-xs text-neutral-500 text-center px-4">
                <span className="font-medium text-primary">Kliko për të zgjedhur</span>
                {" "}ose tërhiq një imazh këtu
              </p>
              <p className="text-[10px] text-neutral-400">JPG, PNG, WEBP · Max 4MB</p>
            </>
          )}
        </div>
      )}

      {/* URL input mode */}
      {urlMode && (
        <div className="flex items-center gap-2">
          <input
            autoFocus
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") applyUrl(); if (e.key === "Escape") setUrlMode(false); }}
            placeholder="https://..."
            className="flex-1 px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
          <button
            type="button"
            onClick={applyUrl}
            className="px-3 py-2 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 transition-colors cursor-pointer"
          >
            Apliko
          </button>
          <button
            type="button"
            onClick={() => setUrlMode(false)}
            className="p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* "Or use URL" toggle when no image */}
      {!value && !urlMode && (
        <button
          type="button"
          onClick={() => { setUrlMode(true); setUrlInput(""); }}
          className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-primary transition-colors cursor-pointer"
        >
          <Link size={12} />
          Ose fut URL-in e imazhit
        </button>
      )}

      {error && (
        <p className="text-xs text-error flex items-center gap-1">
          <X size={12} />
          {error}
        </p>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
