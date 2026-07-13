import { useEffect, useMemo, useState } from "react";

interface UsePaginationOptions {
  pageSize?: number;
  /**
   * Dependency hash that, when changed, resets the current page back to 1.
   * Pass e.g. `[search, filterStatus]` (joined as string) so filters reset
   * the page automatically.
   */
  resetKey?: string;
}

/**
 * Client-side pagination for a pre-filtered array. Resets to page 1 when
 * `resetKey` changes so a new filter doesn't leave the user on page 5 of
 * results that no longer exist.
 */
export function usePagination<T>(items: T[], { pageSize = 20, resetKey = "" }: UsePaginationOptions = {}) {
  const [page, setPage] = useState(1);

  // Reset when filter changes.
  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  // Clamp page in case data shrank (e.g. after delete).
  const safePage = Math.min(page, totalPages);

  const pageItems = useMemo(
    () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, safePage, pageSize],
  );

  const goTo = (n: number) => setPage(Math.max(1, Math.min(totalPages, n)));

  return {
    page: safePage,
    totalPages,
    pageItems,
    pageSize,
    totalItems: items.length,
    hasPrev: safePage > 1,
    hasNext: safePage < totalPages,
    goTo,
    next: () => goTo(safePage + 1),
    prev: () => goTo(safePage - 1),
  };
}
