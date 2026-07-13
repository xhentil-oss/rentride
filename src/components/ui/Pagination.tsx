import { CaretLeft, CaretRight } from "@phosphor-icons/react";

interface Props {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  itemLabel?: string;
}

export default function Pagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  itemLabel = "rezultate",
}: Props) {
  if (totalItems === 0) return null;

  const firstVisible = (page - 1) * pageSize + 1;
  const lastVisible = Math.min(page * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-neutral-50/50">
      <p className="text-xs text-neutral-500">
        Shfaqen <span className="font-medium text-neutral-700">{firstVisible}</span>
        {" – "}
        <span className="font-medium text-neutral-700">{lastVisible}</span>
        {" nga "}
        <span className="font-medium text-neutral-700">{totalItems}</span>{" "}
        {itemLabel}
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={onPrev}
          disabled={!hasPrev}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium border border-border text-neutral-700 bg-white hover:bg-secondary transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Faqja paraardhëse"
        >
          <CaretLeft size={12} weight="bold" />
          Mbrapa
        </button>
        <span className="text-xs text-neutral-600 px-2">
          {page} / {totalPages}
        </span>
        <button
          onClick={onNext}
          disabled={!hasNext}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium border border-border text-neutral-700 bg-white hover:bg-secondary transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Faqja tjetër"
        >
          Para
          <CaretRight size={12} weight="bold" />
        </button>
      </div>
    </div>
  );
}
