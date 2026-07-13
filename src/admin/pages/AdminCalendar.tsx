import React, { useState } from "react";
import { CaretLeft, CaretRight, X, Car, User, MapPin, CalendarBlank, CurrencyEur } from "@phosphor-icons/react";
import { useQuery } from "../../hooks/useApi";

type Reservation = {
  id: string;
  carId: string;
  customerId: string;
  startDate: Date;
  endDate: Date;
  status: string;
  pickupLocation: string;
  dropoffLocation: string;
  totalPrice: number;
  insurance: string;
};

const STATUS_COLORS: Record<string, { cell: string; dot: string; label: string }> = {
  Active:    { cell: "bg-emerald-500",  dot: "bg-emerald-500",  label: "Aktiv" },
  Confirmed: { cell: "bg-blue-500",     dot: "bg-blue-500",     label: "Konfirmuar" },
  Pending:   { cell: "bg-amber-400",    dot: "bg-amber-400",    label: "Në pritje" },
  Completed: { cell: "bg-neutral-400",  dot: "bg-neutral-400",  label: "Përfunduar" },
  Cancelled: { cell: "bg-red-400",      dot: "bg-red-400",      label: "Anuluar" },
};

function fmt(d: Date | string) {
  const date = new Date(d);
  return date.toLocaleDateString("sq-AL", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AdminCalendar() {
  const { data: cars, isPending: carsLoading } = useQuery("Car");
  const { data: reservations, isPending: resLoading } = useQuery("Reservation");
  const { data: customers } = useQuery("Customer");

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedRes, setSelectedRes] = useState<Reservation | null>(null);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const monthName = new Date(viewYear, viewMonth).toLocaleString("sq-AL", {
    month: "long",
    year: "numeric",
  });

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  const getResForCarDay = (carId: string, day: number) => {
    const date = new Date(viewYear, viewMonth, day);
    date.setHours(0, 0, 0, 0);
    return (reservations ?? []).filter((r) => {
      if (r.carId !== carId) return false;
      const start = new Date(r.startDate);
      const end = new Date(r.endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return date >= start && date <= end;
    });
  };

  const getCustomerName = (customerId: string) => {
    const c = (customers ?? []).find((cu) => cu.id === customerId);
    if (!c) return (customerId ?? "").slice(0, 8) + "...";
    return c.name || `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || c.email;
  };

  const getCarName = (carId: string) => {
    const c = (cars ?? []).find((ca) => ca.id === carId);
    return c ? `${c.brand} ${c.model} (${c.year})` : (carId ?? "").slice(0, 8) + "...";
  };

  const isLoading = carsLoading || resLoading;

  // Count reservations in current month for KPIs
  const monthRes = (reservations ?? []).filter((r) => {
    const s = new Date(r.startDate);
    const e = new Date(r.endDate);
    const monthStart = new Date(viewYear, viewMonth, 1);
    const monthEnd = new Date(viewYear, viewMonth + 1, 0);
    return s <= monthEnd && e >= monthStart;
  });

  const activeCount = monthRes.filter((r) => r.status === "Active").length;
  const confirmedCount = monthRes.filter((r) => r.status === "Confirmed").length;
  const pendingCount = monthRes.filter((r) => r.status === "Pending").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium text-neutral-900">Kalendari i disponueshmërisë</h1>
          <p className="text-neutral-500 text-sm mt-1">Pamja e rezervimeve sipas makinës dhe ditës</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={prevMonth}
            className="p-2 rounded-md border border-border text-neutral-600 hover:bg-secondary transition-colors cursor-pointer"
            aria-label="Muaji i mëparshëm"
          >
            <CaretLeft size={16} />
          </button>
          <span className="text-sm font-semibold text-neutral-800 capitalize min-w-[160px] text-center">
            {monthName}
          </span>
          <button
            onClick={nextMonth}
            className="p-2 rounded-md border border-border text-neutral-600 hover:bg-secondary transition-colors cursor-pointer"
            aria-label="Muaji tjetër"
          >
            <CaretRight size={16} />
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Gjithsej këtë muaj", value: monthRes.length, color: "text-neutral-700" },
          { label: "Aktive", value: activeCount, color: "text-emerald-600" },
          { label: "Konfirmuara", value: confirmedCount, color: "text-blue-600" },
          { label: "Në pritje", value: pendingCount, color: "text-amber-600" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-lg border border-border px-4 py-3">
            <p className="text-xs text-neutral-500">{kpi.label}</p>
            <p className={`text-2xl font-bold mt-0.5 ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        {Object.entries(STATUS_COLORS).map(([status, { dot, label }]) => (
          <div key={status} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-sm ${dot}`} />
            <span className="text-xs text-neutral-600">{label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-blue-100 border border-blue-300" />
          <span className="text-xs text-neutral-600">Sot</span>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="bg-white rounded-lg border border-border p-12 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-neutral-500">Po ngarkon kalendarin...</p>
          </div>
        </div>
      ) : (cars ?? []).length === 0 ? (
        <div className="bg-white rounded-lg border border-border p-12 text-center text-neutral-500">
          Nuk ka makina të regjistruara.
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]" role="table">
              <thead>
                <tr className="border-b border-border bg-neutral-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wide sticky left-0 bg-neutral-50 min-w-[150px] z-10">
                    Makina
                  </th>
                  {days.map((d) => {
                    const isToday =
                      new Date(viewYear, viewMonth, d).toDateString() === today.toDateString();
                    return (
                      <th
                        key={d}
                        className={`px-0 py-3 text-xs font-medium text-center min-w-[30px] ${
                          isToday
                            ? "bg-blue-100 text-blue-700 font-bold"
                            : "text-neutral-500"
                        }`}
                      >
                        {d}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {(cars ?? []).map((car, idx) => (
                  <tr
                    key={car.id}
                    className={`border-b border-border last:border-0 ${idx % 2 === 0 ? "bg-white" : "bg-neutral-50/40"}`}
                  >
                    <td className="px-4 py-2.5 sticky left-0 bg-inherit border-r border-border z-10">
                      <p className="text-xs font-semibold text-neutral-800 whitespace-nowrap">
                        {car.brand} {car.model}
                      </p>
                      <p className="text-[11px] text-neutral-400">{car.year} · {car.category}</p>
                    </td>
                    {days.map((d) => {
                      const isToday =
                        new Date(viewYear, viewMonth, d).toDateString() === today.toDateString();
                      const dayRes = getResForCarDay(car.id, d);
                      const res = dayRes[0];

                      // Determine if this day is start, end, or middle
                      let isStart = false;
                      let isEnd = false;
                      if (res) {
                        const start = new Date(res.startDate);
                        const end = new Date(res.endDate);
                        start.setHours(0, 0, 0, 0);
                        end.setHours(0, 0, 0, 0);
                        const cellDate = new Date(viewYear, viewMonth, d);
                        isStart = cellDate.toDateString() === start.toDateString();
                        isEnd = cellDate.toDateString() === end.toDateString();
                      }

                      const colorCls = res ? (STATUS_COLORS[res.status]?.cell ?? "bg-neutral-300") : "";

                      return (
                        <td
                          key={d}
                          className={`px-0 py-2 text-center ${isToday ? "bg-blue-50" : ""}`}
                        >
                          {res ? (
                            <div
                              onClick={() => setSelectedRes(res as unknown as Reservation)}
                              className={`h-5 mx-0.5 flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity ${colorCls} ${
                                isStart && isEnd
                                  ? "rounded-md"
                                  : isStart
                                  ? "rounded-l-md"
                                  : isEnd
                                  ? "rounded-r-md"
                                  : "rounded-none"
                              }`}
                              title={`${getCustomerName(res.customerId)} — ${res.status}`}
                            >
                              {isStart && (
                                <span className="text-[9px] text-white font-semibold px-1 truncate max-w-[60px] leading-none">
                                  {getCustomerName(res.customerId).split(" ")[0]}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="h-5 mx-0.5" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedRes && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedRes(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <CalendarBlank size={18} className="text-primary" />
                <h2 className="text-base font-semibold text-neutral-800">Detajet e Rezervimit</h2>
              </div>
              <button
                onClick={() => setSelectedRes(null)}
                className="p-1 rounded-full hover:bg-neutral-100 text-neutral-400 cursor-pointer transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Status badge */}
            <div className="px-5 pt-4 pb-2">
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold text-white ${
                  STATUS_COLORS[selectedRes.status]?.cell ?? "bg-neutral-400"
                }`}
              >
                {STATUS_COLORS[selectedRes.status]?.label ?? selectedRes.status}
              </span>
            </div>

            {/* Details */}
            <div className="px-5 pb-5 space-y-3">
              <div className="flex items-start gap-3">
                <Car size={16} className="text-neutral-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-neutral-500">Makina</p>
                  <p className="text-sm font-medium text-neutral-800">{getCarName(selectedRes.carId)}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <User size={16} className="text-neutral-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-neutral-500">Klienti</p>
                  <p className="text-sm font-medium text-neutral-800">{getCustomerName(selectedRes.customerId)}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CalendarBlank size={16} className="text-neutral-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-neutral-500">Periudha</p>
                  <p className="text-sm font-medium text-neutral-800">
                    {fmt(selectedRes.startDate)} → {fmt(selectedRes.endDate)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin size={16} className="text-neutral-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-neutral-500">Marrja / Kthimi</p>
                  <p className="text-sm font-medium text-neutral-800">
                    {selectedRes.pickupLocation} → {selectedRes.dropoffLocation}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CurrencyEur size={16} className="text-neutral-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-neutral-500">Çmimi total</p>
                  <p className="text-sm font-bold text-neutral-800">€{selectedRes.totalPrice?.toLocaleString()}</p>
                </div>
              </div>

              {selectedRes.insurance && (
                <div className="flex items-start gap-3">
                  <span className="text-neutral-400 mt-0.5 shrink-0 text-base">🛡️</span>
                  <div>
                    <p className="text-xs text-neutral-500">Sigurimi</p>
                    <p className="text-sm font-medium text-neutral-800">{selectedRes.insurance}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 pb-5">
              <button
                onClick={() => setSelectedRes(null)}
                className="w-full py-2 text-sm font-medium rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-colors cursor-pointer"
              >
                Mbyll
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
