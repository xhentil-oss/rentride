import React, { lazy, Suspense, useMemo, useState, useEffect } from "react";
import { FileCsv, FilePdf, Users, Eye, Globe } from "@phosphor-icons/react";
import { revenueData, bookingsBySource, topCars } from "../../data/mockData";
import { useQuery } from "../../hooks/useApi";
import { formatLocalDate } from "../../lib/dateHelpers";

// recharts is ~117KB gzipped. Code-split so reports header + CSV buttons render
// instantly while charts stream in.
const RevenueChart = lazy(() => import("../components/ReportsCharts").then((m) => ({ default: m.RevenueChart })));
const BookingsChart = lazy(() => import("../components/ReportsCharts").then((m) => ({ default: m.BookingsChart })));
const SourcePieChart = lazy(() => import("../components/ReportsCharts").then((m) => ({ default: m.SourcePieChart })));

function ChartSkeleton({ height = 240 }: { height?: number }) {
  return (
    <div className="bg-neutral-50 rounded-lg animate-pulse" style={{ height }} />
  );
}

function downloadCSV(data: object[], filename: string) {
  if (!data.length) return;
  const keys = Object.keys(data[0]);
  const csv = [keys.join(","), ...data.map((row) => keys.map((k) => JSON.stringify((row as any)[k] ?? "")).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function printReport() {
  window.print();
}

// Analytics helpers
const EVENT_LABELS: Record<string, string> = {
  select_pickup: "Zgjedhje vendi (marrje)",
  select_dropoff: "Zgjedhje vendi (kthim)",
  view_car: "Hapje makine",
  begin_checkout: "Fillim rezervimi",
  whatsapp_click: "Klik WhatsApp",
  phone_click: "Klik telefon",
  reservation: "Rezervim i përfunduar",
};
const eventLabel = (name: string) => EVENT_LABELS[name] || name;
// ISO country code → flag emoji (AL → 🇦🇱)
const countryFlag = (cc: string) =>
  /^[A-Za-z]{2}$/.test(cc)
    ? cc.toUpperCase().replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)))
    : "🏳️";

const COUNTRY_NAMES: Record<string, string> = {
  AL: "Shqipëri", XK: "Kosovë", MK: "Maqedoni", IT: "Itali", DE: "Gjermani",
  GB: "Britani", US: "SHBA", FR: "Francë", ES: "Spanjë", GR: "Greqi",
  CH: "Zvicër", AT: "Austri", NL: "Holandë", BE: "Belgjikë", SE: "Suedi",
  TR: "Turqi", ME: "Mali i Zi", RS: "Serbi", PL: "Poloni", CZ: "Çeki",
};
const countryName = (cc: string) => COUNTRY_NAMES[cc?.toUpperCase()] || cc;

export default function AdminReports() {
  const { data: reservations } = useQuery("Reservation");
  const { data: customers } = useQuery("Customer");
  const { data: cars } = useQuery("Car");
  const { data: invoices } = useQuery("Invoice");

  // ── First-party visitor analytics ──────────────────────────────────────────
  type AnalyticsSummary = {
    days: number;
    pageviews: number;
    visitors: number;
    byCountry: { country: string; visitors: number }[];
    byEvent: { name: string; count: number }[];
    topPages: { path: string; views: number }[];
  };
  const [analyticsRange, setAnalyticsRange] = useState<string>("30");
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    setAnalyticsLoading(true);
    const token = localStorage.getItem("rct_token");
    const qs = analyticsRange === "today" ? "range=today" : `days=${analyticsRange}`;
    fetch(`/api/analytics/summary?${qs}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (!cancelled) setAnalytics(j); })
      .catch(() => { if (!cancelled) setAnalytics(null); })
      .finally(() => { if (!cancelled) setAnalyticsLoading(false); });
    return () => { cancelled = true; };
  }, [analyticsRange]);
  const maxCountry = Math.max(...(analytics?.byCountry ?? []).map((c) => c.visitors), 1);

  // Live revenue grouped by month
  const liveRevenueData = useMemo(() => {
    if (!reservations?.length) return revenueData;
    const map: Record<string, { revenue: number; bookings: number }> = {};
    (reservations ?? []).forEach((r: any) => {
      // Parse YYYY-MM-DD as local date to avoid timezone shift.
      const match = String(r.startDate || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
      const d = match
        ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
        : new Date(r.startDate);
      const key = d.toLocaleDateString("sq-AL", { month: "short", year: "2-digit" });
      if (!map[key]) map[key] = { revenue: 0, bookings: 0 };
      map[key].revenue += Number(r.totalPrice ?? 0);
      map[key].bookings += 1;
    });
    const result = Object.entries(map).map(([month, v]) => ({ month, ...v }));
    return result.length ? result : revenueData;
  }, [reservations]);

  // Live source breakdown
  const liveSourceData = useMemo(() => {
    if (!reservations?.length) return bookingsBySource;
    const map: Record<string, number> = {};
    (reservations ?? []).forEach((r: any) => { map[r.source ?? "Web"] = (map[r.source ?? "Web"] ?? 0) + 1; });
    const total = Object.values(map).reduce((a, b) => a + b, 0);
    return Object.entries(map).map(([source, count]) => ({ source, count: Math.round((count / total) * 100) }));
  }, [reservations]);

  // O(n) lookup map instead of O(n²) cars.find() per reservation row.
  const carMap = useMemo(
    () => new Map<string, any>((cars ?? []).map((c: any) => [c.id, c])),
    [cars],
  );
  const customerMap = useMemo(
    () => new Map<string, any>((customers ?? []).map((c: any) => [c.id, c])),
    [customers],
  );

  // Live top cars
  const liveTopCars = useMemo(() => {
    if (!reservations?.length) return topCars;
    const map: Record<string, { name: string; bookings: number; revenue: number }> = {};
    (reservations ?? []).forEach((r: any) => {
      const car = carMap.get(r.carId);
      const name = car ? `${car.brand} ${car.model}` : r.carId;
      if (!map[r.carId]) map[r.carId] = { name, bookings: 0, revenue: 0 };
      map[r.carId].bookings += 1;
      map[r.carId].revenue += Number(r.totalPrice ?? 0);
    });
    return Object.values(map).sort((a, b) => b.bookings - a.bookings).slice(0, 5);
  }, [reservations, carMap]);

  const maxBookings = Math.max(...liveTopCars.map((c) => c.bookings), 1);

  const exportReservationsCSV = () => {
    const rows = (reservations ?? []).map((r: any) => {
      const customer = customerMap.get(r.customerId);
      const car = carMap.get(r.carId);
      return {
        ID: r.id,
        Klienti: customer?.name ?? r.customerId,
        Makina: car ? `${car.brand} ${car.model}` : r.carId,
        "Data e nisjes": formatLocalDate(r.startDate),
        "Data e kthimit": formatLocalDate(r.endDate),
        Statusi: r.status,
        "Çmimi total": `€${r.totalPrice}`,
        Burimi: r.source,
      };
    });
    downloadCSV(rows, `rezervime_${new Date().toISOString().split("T")[0]}.csv`);
  };

  const exportInvoicesCSV = () => {
    const rows = (invoices ?? []).map((inv: any) => ({
      "Nr. Faturës": inv.invoiceNo,
      "Rezervimi ID": inv.reservationId,
      "Shuma": `€${inv.amount}`,
      "Statusi": inv.status,
      "Afati": formatLocalDate(inv.dueDate),
    }));
    downloadCSV(rows, `faturat_${new Date().toISOString().split("T")[0]}.csv`);
  };

  return (
    <div className="space-y-6 print:p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-medium text-neutral-900">Raportet</h1>
          <p className="text-neutral-500 text-sm mt-1">Analiza e performancës dhe të ardhurave</p>
        </div>
        <div className="flex gap-2 flex-wrap print:hidden">
          <button onClick={exportReservationsCSV} className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium border border-border text-neutral-700 bg-white hover:bg-secondary transition-colors cursor-pointer">
            <FileCsv size={16} weight="regular" />Rezervimet CSV
          </button>
          <button onClick={exportInvoicesCSV} className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium border border-border text-neutral-700 bg-white hover:bg-secondary transition-colors cursor-pointer">
            <FileCsv size={16} weight="regular" />Faturat CSV
          </button>
          <button onClick={printReport} className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium bg-gradient-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer">
            <FilePdf size={16} weight="regular" />Printo / PDF
          </button>
        </div>
      </div>

      {/* ── Visitors (first-party analytics) ───────────────────────────── */}
      <div className="bg-white rounded-lg border border-border p-6">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
          <h2 className="text-base font-medium text-neutral-900 flex items-center gap-2">
            <Users size={18} weight="duotone" className="text-primary" />
            Vizitorët
          </h2>
          <div className="flex gap-1 print:hidden">
            {[
              { key: "today", label: "Sot" },
              { key: "7", label: "7 ditë" },
              { key: "30", label: "30 ditë" },
              { key: "90", label: "90 ditë" },
            ].map((opt) => (
              <button
                key={opt.key}
                onClick={() => setAnalyticsRange(opt.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer border-0 ${
                  analyticsRange === opt.key ? "bg-primary/10 text-primary" : "text-neutral-500 hover:bg-neutral-100 bg-transparent"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {analyticsLoading ? (
          <ChartSkeleton height={120} />
        ) : !analytics || (analytics.pageviews === 0 && analytics.visitors === 0) ? (
          <p className="text-sm text-neutral-400 italic py-6 text-center">
            Ende nuk ka të dhëna vizitash. Të dhënat fillojnë të mblidhen pasi të publikohet ky version.
          </p>
        ) : (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="rounded-lg border border-border p-4">
                <div className="flex items-center gap-1.5 text-xs text-neutral-500 mb-1"><Users size={14} weight="regular" />Vizitorë</div>
                <p className="text-2xl font-semibold text-neutral-900">{analytics.visitors.toLocaleString()}</p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <div className="flex items-center gap-1.5 text-xs text-neutral-500 mb-1"><Eye size={14} weight="regular" />Shikime faqesh</div>
                <p className="text-2xl font-semibold text-neutral-900">{analytics.pageviews.toLocaleString()}</p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <div className="flex items-center gap-1.5 text-xs text-neutral-500 mb-1"><Globe size={14} weight="regular" />Shtete</div>
                <p className="text-2xl font-semibold text-neutral-900">{analytics.byCountry.length}</p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <div className="flex items-center gap-1.5 text-xs text-neutral-500 mb-1">Rezervime (event)</div>
                <p className="text-2xl font-semibold text-neutral-900">{analytics.byEvent.find((e) => e.name === "reservation")?.count ?? 0}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Countries */}
              <div>
                <h3 className="text-sm font-semibold text-neutral-700 mb-3">Sipas shtetit</h3>
                {analytics.byCountry.length === 0 ? (
                  <p className="text-xs text-neutral-400 italic">Pa të dhëna geolocation ende.</p>
                ) : (
                  <div className="space-y-2.5">
                    {analytics.byCountry.map((c) => (
                      <div key={c.country} className="flex items-center gap-2">
                        <span className="text-base leading-none">{countryFlag(c.country)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between mb-0.5">
                            <span className="text-xs font-medium text-neutral-700 truncate">{countryName(c.country)}</span>
                            <span className="text-xs text-neutral-500">{c.visitors}</span>
                          </div>
                          <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-primary rounded-full" style={{ width: `${(c.visitors / maxCountry) * 100}%` }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Events / actions */}
              <div>
                <h3 className="text-sm font-semibold text-neutral-700 mb-3">Veprimet</h3>
                {analytics.byEvent.length === 0 ? (
                  <p className="text-xs text-neutral-400 italic">Asnjë veprim i regjistruar.</p>
                ) : (
                  <div className="space-y-2">
                    {analytics.byEvent.map((e) => (
                      <div key={e.name} className="flex items-center justify-between text-sm">
                        <span className="text-neutral-700">{eventLabel(e.name)}</span>
                        <span className="font-semibold text-neutral-900">{e.count.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Top pages */}
              <div>
                <h3 className="text-sm font-semibold text-neutral-700 mb-3">Faqet më të vizituara</h3>
                {analytics.topPages.length === 0 ? (
                  <p className="text-xs text-neutral-400 italic">Pa të dhëna.</p>
                ) : (
                  <div className="space-y-2">
                    {analytics.topPages.map((p) => (
                      <div key={p.path} className="flex items-center justify-between text-sm gap-2">
                        <span className="text-neutral-700 truncate" title={p.path}>{p.path}</span>
                        <span className="font-semibold text-neutral-900 shrink-0">{p.views.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-border p-6">
          <h2 className="text-base font-medium text-neutral-900 mb-4">Të ardhurat mujore (€)</h2>
          <Suspense fallback={<ChartSkeleton />}>
            <RevenueChart data={liveRevenueData} />
          </Suspense>
        </div>

        <div className="bg-white rounded-lg border border-border p-6">
          <h2 className="text-base font-medium text-neutral-900 mb-4">Rezervimet mujore</h2>
          <Suspense fallback={<ChartSkeleton />}>
            <BookingsChart data={liveRevenueData} />
          </Suspense>
        </div>

        <div className="bg-white rounded-lg border border-border p-6">
          <h2 className="text-base font-medium text-neutral-900 mb-4">Rezervimet sipas burimit</h2>
          <Suspense fallback={<ChartSkeleton height={200} />}>
            <SourcePieChart data={liveSourceData} />
          </Suspense>
        </div>

        <div className="bg-white rounded-lg border border-border p-6">
          <h2 className="text-base font-medium text-neutral-900 mb-4">Makinat më të rezervuara</h2>
          <div className="space-y-3">
            {liveTopCars.map((car, i) => (
              <div key={car.name} className="flex items-center gap-3">
                <span className="text-xs font-medium text-neutral-400 w-4">{i + 1}</span>
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-neutral-800">{car.name}</span>
                    <span className="text-xs text-neutral-500">{car.bookings} rez.</span>
                  </div>
                  <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-primary rounded-full" style={{ width: `${(car.bookings / maxBookings) * 100}%` }} />
                  </div>
                </div>
                <span className="text-sm font-medium text-neutral-800 w-20 text-right">€{car.revenue.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
