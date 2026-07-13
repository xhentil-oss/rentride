import React from "react";
import { X } from "@phosphor-icons/react";

export interface BulkAction {
  label: string;
  icon?: React.ElementType;
  onClick: () => void;
  variant?: "default" | "danger" | "success" | "warning";
  disabled?: boolean;
}

interface Props {
  selectedCount: number;
  onClear: () => void;
  actions: BulkAction[];
  itemLabel?: string;
}

const variantClass: Record<NonNullable<BulkAction["variant"]>, string> = {
  default: "bg-white text-neutral-700 border-border hover:border-primary hover:text-primary",
  danger: "bg-white text-error border-error/30 hover:bg-error hover:text-error-foreground",
  success: "bg-white text-success border-success/30 hover:bg-success hover:text-success-foreground",
  warning: "bg-white text-warning border-warning/30 hover:bg-warning hover:text-warning-foreground",
};

export default function BulkActionBar({ selectedCount, onClear, actions, itemLabel = "element" }: Props) {
  if (selectedCount === 0) return null;

  return (
    <div className="sticky top-2 z-30 flex items-center justify-between gap-3 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg shadow-md border border-primary/20">
      <div className="flex items-center gap-3">
        <button
          onClick={onClear}
          className="p-1 rounded hover:bg-white/15 transition-colors cursor-pointer"
          aria-label="Pastro përzgjedhjen"
        >
          <X size={16} />
        </button>
        <span className="text-sm font-medium">
          {selectedCount} {itemLabel}{selectedCount === 1 ? "" : "ë"} të zgjedhur
        </span>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              onClick={action.onClick}
              disabled={action.disabled}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer disabled:opacity-50 ${variantClass[action.variant ?? "default"]}`}
            >
              {Icon && <Icon size={14} />}
              {action.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface CheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  ariaLabel?: string;
}

export function BulkCheckbox({ checked, indeterminate, onChange, ariaLabel }: CheckboxProps) {
  return (
    <input
      type="checkbox"
      checked={checked}
      ref={(el) => {
        if (el) el.indeterminate = !!indeterminate && !checked;
      }}
      onChange={onChange}
      onClick={(e) => e.stopPropagation()}
      aria-label={ariaLabel ?? "Zgjidh"}
      className="h-4 w-4 rounded border-neutral-300 text-primary focus:ring-2 focus:ring-primary/40 cursor-pointer"
    />
  );
}
