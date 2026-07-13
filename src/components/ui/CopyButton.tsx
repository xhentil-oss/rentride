import { useState } from "react";
import { Copy, Check } from "@phosphor-icons/react";

interface Props {
  value: string;
  label?: string;
  className?: string;
}

/**
 * Small inline button that copies `value` to the clipboard and shows a brief
 * confirmation. Use beside emails, phone numbers, IDs, URLs, etc.
 */
export default function CopyButton({ value, label, className = "" }: Props) {
  const [copied, setCopied] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!value) return;
    navigator.clipboard.writeText(value).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      },
      () => {
        // Clipboard API rejected — most likely a permission issue. Silent fail.
      },
    );
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title={copied ? "U kopjua!" : label ? `Kopjo ${label}` : "Kopjo"}
      aria-label={copied ? "U kopjua" : label ? `Kopjo ${label}` : "Kopjo"}
      className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-neutral-400 hover:text-primary hover:bg-secondary transition-colors cursor-pointer ${className}`}
    >
      {copied ? (
        <Check size={12} weight="bold" className="text-success" />
      ) : (
        <Copy size={12} weight="regular" />
      )}
    </button>
  );
}
