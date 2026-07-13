import React from "react";

interface StatusBadgeProps {
  status: string;
}

const statusConfig: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  Pending: {
    bg: "bg-warning",
    text: "text-warning-foreground",
    label: "Në pritje",
  },
  Confirmed: {
    bg: "bg-info",
    text: "text-info-foreground",
    label: "Konfirmuar",
  },
  Active: { bg: "bg-success", text: "text-success-foreground", label: "Aktiv" },
  Completed: { bg: "bg-neutral-500", text: "text-white", label: "Përfunduar" },
  Cancelled: {
    bg: "bg-error",
    text: "text-error-foreground",
    label: "Anuluar",
  },
  "Në dispozicion": {
    bg: "bg-success",
    text: "text-success-foreground",
    label: "Në dispozicion",
  },
  "I rezervuar": {
    bg: "bg-warning",
    text: "text-warning-foreground",
    label: "I rezervuar",
  },
  "Në mirëmbajtje": {
    bg: "bg-neutral-400",
    text: "text-white",
    label: "Në mirëmbajtje",
  },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] || {
    bg: "bg-neutral-400",
    text: "text-white",
    label: status,
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
    >
      {config.label}
    </span>
  );
}
