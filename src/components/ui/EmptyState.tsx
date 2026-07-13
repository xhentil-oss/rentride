import React from "react";
import { Car, Users, CalendarBlank, MagnifyingGlass, Plus } from "@phosphor-icons/react";

type EmptyStateType = "cars" | "customers" | "reservations" | "search" | "generic";

interface EmptyStateProps {
  type?: EmptyStateType;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

const illustrations: Record<EmptyStateType, React.ReactNode> = {
  cars: (
    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center mb-4">
      <Car size={36} className="text-primary" weight="duotone" />
    </div>
  ),
  customers: (
    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent/10 to-accent/20 flex items-center justify-center mb-4">
      <Users size={36} className="text-accent" weight="duotone" />
    </div>
  ),
  reservations: (
    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-info/10 to-info/20 flex items-center justify-center mb-4">
      <CalendarBlank size={36} className="text-info" weight="duotone" />
    </div>
  ),
  search: (
    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-neutral-100 to-neutral-200 flex items-center justify-center mb-4">
      <MagnifyingGlass size={36} className="text-neutral-400" weight="duotone" />
    </div>
  ),
  generic: (
    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-neutral-100 to-neutral-200 flex items-center justify-center mb-4">
      <Plus size={36} className="text-neutral-400" weight="duotone" />
    </div>
  ),
};

const defaultMessages: Record<EmptyStateType, { title: string; description: string }> = {
  cars: {
    title: "Nuk ka makina",
    description: "Nuk keni asnjë makinë të regjistruar. Shtoni makinën e parë për të filluar.",
  },
  customers: {
    title: "Nuk ka klientë",
    description: "Nuk keni asnjë klient të regjistruar ende.",
  },
  reservations: {
    title: "Nuk ka rezervime",
    description: "Nuk ka asnjë rezervim për të shfaqur.",
  },
  search: {
    title: "Nuk u gjet asgjë",
    description: "Provoni të ndryshoni kriteret e kërkimit.",
  },
  generic: {
    title: "Asgjë këtu",
    description: "Nuk ka të dhëna për të shfaqur.",
  },
};

export function EmptyState({
  type = "generic",
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const defaults = defaultMessages[type];

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {illustrations[type]}
      <h3 className="text-lg font-medium text-neutral-800 mb-1">
        {title || defaults.title}
      </h3>
      <p className="text-sm text-neutral-500 max-w-xs mb-4">
        {description || defaults.description}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer"
        >
          <Plus size={16} weight="bold" />
          {actionLabel}
        </button>
      )}
    </div>
  );
}
