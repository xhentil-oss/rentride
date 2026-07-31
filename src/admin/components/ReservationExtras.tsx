import React from "react";
import { ShieldCheck } from "@phosphor-icons/react";

/**
 * Shared rendering for the options a customer actually bought with a booking
 * (insurance, equipment, services, add-ons).
 *
 * Source of truth is the `reservation_extras` snapshot, exposed by the API as
 * `extrasDetail` on both the list (`GET /api/reservations`) and the single
 * reservation endpoint. Reservations created before that table existed only
 * carry the legacy `insurance` label + comma-separated `extras` string, so we
 * fall back to those — otherwise old bookings would look like nothing was sold.
 */
export interface ReservationExtra {
  id?: string;
  extraId?: string;
  code?: string;
  name: string;
  category?: string;
  quantity?: number;
  unitPrice?: number;
  priceType?: string;
  totalPrice?: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  insurance: "Sigurim",
  equipment: "Pajisje",
  service: "Shërbim",
  addon: "Shtesë",
};

const CATEGORY_CHIP: Record<string, string> = {
  insurance: "bg-blue-50 text-blue-700 border-blue-200",
  equipment: "bg-emerald-50 text-emerald-700 border-emerald-200",
  service: "bg-purple-50 text-purple-700 border-purple-200",
  addon: "bg-amber-50 text-amber-700 border-amber-200",
};

const PRICE_TYPE_LABELS: Record<string, string> = {
  per_day: "për ditë",
  per_rental: "për rezervim",
  one_time: "një herë",
};

export function getReservationExtras(res: any): ReservationExtra[] {
  const detail = Array.isArray(res?.extrasDetail) ? (res.extrasDetail as ReservationExtra[]) : [];
  if (detail.length > 0) return detail;

  // Legacy fallback. The old `extras` string was built from the same list that
  // included insurance, so dedupe by name to avoid showing it twice.
  const legacy: ReservationExtra[] = [];
  const seen = new Set<string>();
  const push = (name: string, category?: string) => {
    const key = name.trim().toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    legacy.push({ name: name.trim(), category });
  };
  if (res?.insurance) push(String(res.insurance), "insurance");
  String(res?.extras || "").split(",").forEach((part: string) => push(part));
  return legacy;
}

export function getReservationExtrasTotal(extras: ReservationExtra[]): number {
  return extras.reduce((sum, e) => sum + (Number(e.totalPrice) || 0), 0);
}

function quantitySuffix(extra: ReservationExtra): string {
  const qty = Number(extra.quantity) || 1;
  return qty > 1 ? ` ×${qty}` : "";
}

function unitPriceLabel(extra: ReservationExtra): string {
  if (extra.unitPrice === undefined || extra.unitPrice === null) return "";
  const unit = Number(extra.unitPrice);
  if (!unit) return "Falas";
  const suffix = PRICE_TYPE_LABELS[String(extra.priceType)] || "";
  return suffix ? `€${unit} ${suffix}` : `€${unit}`;
}

/** Compact chips for table rows / cards. */
export function ReservationExtrasChips({ res }: { res: any }) {
  const extras = getReservationExtras(res);
  if (extras.length === 0) return null;
  return (
    <span className="mt-1 flex flex-wrap gap-1">
      {extras.map((extra, i) => (
        <span
          key={extra.id ?? `${extra.name}-${i}`}
          title={[CATEGORY_LABELS[String(extra.category)], unitPriceLabel(extra)].filter(Boolean).join(" · ")}
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-medium ${
            CATEGORY_CHIP[String(extra.category)] ?? "bg-neutral-100 text-neutral-600 border-neutral-200"
          }`}
        >
          {extra.category === "insurance" && <ShieldCheck size={10} weight="bold" />}
          {extra.name}
          {quantitySuffix(extra)}
        </span>
      ))}
    </span>
  );
}

/** Full, priced breakdown for the reservation detail view. */
export function ReservationExtrasBreakdown({ res }: { res: any }) {
  const extras = getReservationExtras(res);
  if (extras.length === 0) {
    return (
      <div className="pt-2">
        <p className="text-xs text-neutral-500 mb-1">Opsione të blera</p>
        <p className="text-sm text-neutral-400">Pa opsione shtesë</p>
      </div>
    );
  }
  const total = getReservationExtrasTotal(extras);
  return (
    <div className="pt-2">
      <p className="text-xs text-neutral-500 mb-2">Opsione të blera</p>
      <div className="space-y-2">
        {extras.map((extra, i) => {
          const meta = [CATEGORY_LABELS[String(extra.category)], unitPriceLabel(extra)].filter(Boolean).join(" · ");
          return (
            <div key={extra.id ?? `${extra.name}-${i}`} className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-neutral-800">
                  {extra.name}
                  {quantitySuffix(extra)}
                </p>
                {meta && <p className="text-[11px] text-neutral-500">{meta}</p>}
              </div>
              {extra.totalPrice !== undefined && extra.totalPrice !== null && (
                <span className="text-sm font-medium text-neutral-800 whitespace-nowrap">
                  {Number(extra.totalPrice) ? `€${Number(extra.totalPrice).toFixed(2)}` : "Falas"}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {total > 0 && (
        <div className="flex justify-between mt-2 pt-2 border-t border-border">
          <span className="text-xs text-neutral-500">Totali i opsioneve</span>
          <span className="text-sm font-semibold text-neutral-900">€{total.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}
