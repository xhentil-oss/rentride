import React, { useState, useMemo } from "react";
import { CaretLeft, CaretRight, CaretDown, Info, X, Plus, PencilSimple, Trash, CalendarBlank } from "@phosphor-icons/react";
import { useQuery, useMutation } from "../../hooks/useApi";
import { TableSkeleton } from "../../components/ui/Skeleton";

const MONTHS_SHORT = ["Jan", "Shk", "Mar", "Pri", "Maj", "Qer", "Kor", "Gus", "Sht", "Tet", "Nën", "Dhj"];
const MONTHS_LONG = ["Janar", "Shkurt", "Mars", "Prill", "Maj", "Qershor", "Korrik", "Gusht", "Shtator", "Tetor", "Nëntor", "Dhjetor"];
const CATEGORIES = ["Ekonomike", "SUV", "Luksoze", "Familjare", "Sportive", "Minivan"];

type RowType = "all" | "category" | "car";
interface Row {
  type: RowType;
  key: string;
  label: string;
  sublabel?: string;
  defaultPrice?: number;
  category?: string;
}

const DAY_MS = 86400000;

// A period rate carries explicit dates; a month rate does not.
const isPeriod = (r: any) => Boolean(r?.startDate && r?.endDate);

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// "2026-08-25" → "25 Gusht 2026"
function formatDay(key: string): string {
  const m = String(key || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return key;
  return `${Number(m[3])} ${MONTHS_LONG[Number(m[2]) - 1]} ${m[1]}`;
}

function daysBetween(start: string, end: string): number {
  const a = Date.parse(`${start}T00:00:00Z`);
  const b = Date.parse(`${end}T00:00:00Z`);
  if (isNaN(a) || isNaN(b)) return 0;
  return Math.round((b - a) / DAY_MS) + 1; // inclusive
}

function buildRow(type: RowType, value?: string, car?: any): Row {
  if (type === "all") return { type, key: "all", label: "✦ Të gjitha makinat", sublabel: "Çmim bazë global" };
  if (type === "category") return { type, key: `category:${value}`, label: value!, sublabel: "Zbatohet mbi makina pa çmim specifik" };
  return {
    type, key: `car:${car.id}`, label: `${car.brand} ${car.model}`,
    sublabel: `${car.category} — Bazë €${car.pricePerDay}/ditë`,
    defaultPrice: car.pricePerDay, category: car.category,
  };
}

// "all" | "category:SUV" | "car:<id>" ⇄ { appliesTo, appliesToValue }
function parseScope(scope: string): { appliesTo: string; appliesToValue?: string } {
  if (scope.startsWith("category:")) return { appliesTo: "category", appliesToValue: scope.slice(9) };
  if (scope.startsWith("car:")) return { appliesTo: "car", appliesToValue: scope.slice(4) };
  return { appliesTo: "all" };
}
const scopeKeyOf = (r: any) => (r.appliesTo === "all" ? "all" : `${r.appliesTo}:${r.appliesToValue}`);

interface PeriodForm {
  ids: string[];      // rows being replaced when editing a group; empty when creating
  startDate: string;
  endDate: string;
  scopes: string[];   // ["all"] or any mix of "category:X" / "car:<id>"
  pricePerDay: string;
  label: string;
}
const emptyPeriodForm = (): PeriodForm => ({ ids: [], startDate: "", endDate: "", scopes: ["all"], pricePerDay: "", label: "" });

// Rows created together share these four values, which is what makes them one
// group in the list — no extra column needed to tie them.
const groupKeyOf = (r: any) => `${r.startDate}|${r.endDate}|${Number(r.pricePerDay)}|${r.label ?? ""}`;

// ── Scope picker ─────────────────────────────────────────────
// One price often covers several cars, so this replaces the single-choice
// dropdown: pick "all", or any mix of categories and individual cars.
function ScopePicker({
  value, onChange, cars, disabled,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  cars: any[];
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const boxRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onDocDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const isAll = value.length === 1 && value[0] === "all";

  const toggle = (key: string) => {
    if (key === "all") { onChange(["all"]); return; }
    // "All" and a narrower pick are mutually exclusive — the narrower one wins.
    const base = value.filter(v => v !== "all");
    onChange(base.includes(key) ? base.filter(v => v !== key) : [...base, key]);
  };

  const summary = () => {
    if (isAll) return "Të gjitha makinat";
    const cats = value.filter(v => v.startsWith("category:")).map(v => v.slice(9));
    const carCount = value.filter(v => v.startsWith("car:")).length;
    if (!cats.length && !carCount) return "Asnjë zgjedhje";
    const parts: string[] = [];
    if (cats.length) parts.push(cats.length <= 2 ? cats.join(", ") : `${cats.length} kategori`);
    if (carCount) parts.push(`${carCount} ${carCount === 1 ? "makinë" : "makina"}`);
    return parts.join(" + ");
  };

  const q = query.trim().toLowerCase();
  const shownCars = q
    ? cars.filter(c => `${c.brand} ${c.model} ${c.category}`.toLowerCase().includes(q))
    : cars;

  const allCarKeys = shownCars.map(c => `car:${c.id}`);
  const allShownSelected = allCarKeys.length > 0 && allCarKeys.every(k => value.includes(k));

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 border border-border rounded-lg text-sm bg-white text-left cursor-pointer hover:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:opacity-50"
      >
        <span className={isAll || value.length ? "text-neutral-900" : "text-neutral-400"}>{summary()}</span>
        <CaretDown size={14} className="text-neutral-400 shrink-0" />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full min-w-[280px] bg-white border border-border rounded-lg shadow-lg max-h-[22rem] overflow-y-auto">
          <label className="flex items-center gap-2 px-3 py-2.5 hover:bg-neutral-50 cursor-pointer border-b border-border">
            <input type="checkbox" checked={isAll} onChange={() => toggle("all")} className="cursor-pointer" />
            <span className="text-sm font-medium text-primary">Të gjitha makinat</span>
          </label>

          <p className="px-3 pt-3 pb-1 text-[11px] font-medium text-neutral-400 uppercase tracking-wide">Kategoritë</p>
          {CATEGORIES.map(c => {
            const key = `category:${c}`;
            return (
              <label key={key} className="flex items-center gap-2 px-3 py-1.5 hover:bg-neutral-50 cursor-pointer">
                <input type="checkbox" checked={value.includes(key)} onChange={() => toggle(key)} className="cursor-pointer" />
                <span className="text-sm text-neutral-700">{c}</span>
              </label>
            );
          })}

          <div className="px-3 pt-3 pb-1 flex items-center justify-between gap-2">
            <p className="text-[11px] font-medium text-neutral-400 uppercase tracking-wide">Makinat</p>
            {shownCars.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const base = value.filter(v => v !== "all" && !allCarKeys.includes(v));
                  onChange(allShownSelected ? base : [...base, ...allCarKeys]);
                }}
                className="text-[11px] text-primary hover:underline cursor-pointer bg-transparent border-0 p-0"
              >
                {allShownSelected ? "Hiq të gjitha" : q ? "Zgjidh rezultatet" : "Zgjidh të gjitha"}
              </button>
            )}
          </div>
          <div className="px-3 pb-1.5">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Kërko markë ose model…"
              className="w-full px-2.5 py-1.5 border border-border rounded-md text-xs focus:outline-none focus:border-primary"
            />
          </div>
          {shownCars.length === 0 ? (
            <p className="px-3 py-2 text-xs text-neutral-400">Asnjë makinë nuk përputhet.</p>
          ) : shownCars.map(c => {
            const key = `car:${c.id}`;
            return (
              <label key={key} className="flex items-center gap-2 px-3 py-1.5 hover:bg-neutral-50 cursor-pointer">
                <input type="checkbox" checked={value.includes(key)} onChange={() => toggle(key)} className="cursor-pointer" />
                <span className="text-sm text-neutral-700">{c.brand} {c.model}</span>
                <span className="text-xs text-neutral-400 ml-auto">{c.category}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AdminMonthlyRates() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [activeTab, setActiveTab] = useState<"categories" | "cars">("categories");
  const [editCell, setEditCell] = useState<{ rowKey: string; month: number; value: string } | null>(null);
  const [periodForm, setPeriodForm] = useState<PeriodForm | null>(null);
  const [periodError, setPeriodError] = useState<string | null>(null);
  const [savingPeriod, setSavingPeriod] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const { data: rawRates, isPending: ratesLoading, refetch } = useQuery("MonthlyRate");
  const { data: carsData, isPending: carsLoading } = useQuery("Car");
  const { create, remove } = useMutation("MonthlyRate");
  const { create: saveBulk } = useMutation("MonthlyRateBulk");

  const rates: any[] = rawRates ?? [];
  const cars: any[] = carsData ?? [];

  // The month matrix only ever reads whole-month rates; periods live in their own table.
  const monthRates = useMemo(() => rates.filter(r => !isPeriod(r)), [rates]);
  const periodRates = useMemo(
    () => rates.filter(isPeriod).sort((a, b) => String(a.startDate).localeCompare(String(b.startDate))),
    [rates]
  );

  // Rows that share dates + price + label were created as one action, so the
  // list shows them as one entry instead of repeating the same window N times.
  const periodGroups = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const r of periodRates) {
      const key = groupKeyOf(r);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return Array.from(map.values())
      .sort((a, b) => String(a[0].startDate).localeCompare(String(b[0].startDate)));
  }, [periodRates]);

  const scopeLabel = React.useCallback((r: any): string => {
    if (r.appliesTo === "category") return r.appliesToValue;
    if (r.appliesTo === "car") {
      const car = cars.find(c => c.id === r.appliesToValue);
      return car ? `${car.brand} ${car.model}` : "Makinë e fshirë";
    }
    return "Të gjitha makinat";
  }, [cars]);

  // Collapses a group into one readable line: "SUV + 4 makina".
  const groupScopeSummary = React.useCallback((group: any[]): string => {
    if (group.some(r => r.appliesTo === "all")) return "Të gjitha makinat";
    const cats = group.filter(r => r.appliesTo === "category").map(r => r.appliesToValue);
    const carCount = group.filter(r => r.appliesTo === "car").length;
    const parts: string[] = [];
    if (cats.length) parts.push(cats.length <= 2 ? cats.join(", ") : `${cats.length} kategori`);
    if (carCount) parts.push(`${carCount} ${carCount === 1 ? "makinë" : "makina"}`);
    return parts.join(" + ") || "—";
  }, []);

  // Find month rate for a given row/month/year
  function findRate(rowKey: string, month: number): any | null {
    const [type, ...rest] = rowKey.split(":");
    const value = rest.join(":");
    return monthRates.find(r =>
      r.month === month &&
      (r.year === year || r.year === null) &&
      r.appliesTo === type &&
      (type === "all" ? true : r.appliesToValue === value)
    ) ?? null;
  }

  // Get display info: own rate, inherited, or default
  function getCellInfo(rowKey: string, month: number, row: Row): {
    price: string; rateId: string | null; source: "own" | "inherited" | "default";
  } {
    const own = findRate(rowKey, month);
    if (own) return { price: String(own.pricePerDay), rateId: own.id, source: "own" };

    if (rowKey.startsWith("car:")) {
      const cat = row.category;
      if (cat) {
        const catRate = findRate(`category:${cat}`, month);
        if (catRate) return { price: String(catRate.pricePerDay), rateId: null, source: "inherited" };
      }
      const allRate = findRate("all", month);
      if (allRate) return { price: String(allRate.pricePerDay), rateId: null, source: "inherited" };
    } else if (rowKey.startsWith("category:")) {
      const allRate = findRate("all", month);
      if (allRate) return { price: String(allRate.pricePerDay), rateId: null, source: "inherited" };
    }

    return { price: row.defaultPrice ? String(row.defaultPrice) : "", rateId: null, source: "default" };
  }

  // Months of the displayed year that a period rate overrides for this row's scope.
  // Flagged in the matrix so a cell price is never read as the final word.
  const overriddenMonths = useMemo(() => {
    const map = new Map<string, Set<number>>();
    for (const p of periodRates) {
      const key = scopeKeyOf(p);
      const [sy, sm] = String(p.startDate).split("-").map(Number);
      const [ey, em] = String(p.endDate).split("-").map(Number);
      for (let y = sy; y <= ey; y += 1) {
        if (y !== year) continue;
        const from = y === sy ? sm : 1;
        const to = y === ey ? em : 12;
        if (!map.has(key)) map.set(key, new Set());
        for (let m = from; m <= to; m += 1) map.get(key)!.add(m);
      }
    }
    return map;
  }, [periodRates, year]);

  function isMonthOverridden(rowKey: string, month: number, row: Row): boolean {
    // Mirror the resolver: walk scopes most-specific first, and stop at the one
    // that decides. A broader period only reaches this row when no nearer scope
    // has priced the month at all.
    const keys = [rowKey];
    if (rowKey.startsWith("car:") && row.category) keys.push(`category:${row.category}`);
    if (rowKey !== "all") keys.push("all");
    for (const key of keys) {
      if (overriddenMonths.get(key)?.has(month)) return true; // period wins here
      if (findRate(key, month)) return false;                 // month rate wins here
    }
    return false;
  }

  // Color coding: relative to other months in the same row
  function getCellColor(price: number, rowKey: string, row: Row): string {
    const allPrices = Array.from({ length: 12 }, (_, i) => {
      const { price: p } = getCellInfo(rowKey, i + 1, row);
      return parseFloat(p) || 0;
    }).filter(p => p > 0);
    if (allPrices.length < 2) return "";
    const min = Math.min(...allPrices);
    const max = Math.max(...allPrices);
    if (max === min) return "";
    const ratio = (price - min) / (max - min);
    if (ratio <= 0.33) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (ratio <= 0.66) return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-red-50 text-red-700 border-red-200";
  }

  const categoryRows: Row[] = [
    buildRow("all"),
    ...CATEGORIES.map(c => buildRow("category", c)),
  ];

  const carRows: Row[] = cars.map(c => buildRow("car", undefined, c));
  const activeRows = activeTab === "categories" ? categoryRows : carRows;

  const handleCellClick = (row: Row, month: number) => {
    const { price } = getCellInfo(row.key, month, row);
    setEditCell({ rowKey: row.key, month, value: price });
  };

  const handleSave = async () => {
    if (!editCell) return;
    const { rowKey, month, value } = editCell;
    setEditCell(null);
    const price = parseFloat(value);
    if (!value || isNaN(price) || price <= 0) return;

    const { appliesTo, appliesToValue } = parseScope(rowKey);
    await create({ year, month, appliesTo, appliesToValue, pricePerDay: price });
    await refetch();
  };

  const handleDelete = async (rateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await remove(rateId);
    await refetch();
  };

  // ── Period rates ──────────────────────────────────────────
  const openNewPeriod = () => { setPeriodError(null); setPeriodForm(emptyPeriodForm()); };

  // Editing works on the whole group, so every scope in it comes back into the picker.
  const openEditPeriod = (group: any[]) => {
    setPeriodError(null);
    const first = group[0];
    setPeriodForm({
      ids: group.map(r => r.id),
      startDate: first.startDate,
      endDate: first.endDate,
      scopes: group.map(scopeKeyOf),
      pricePerDay: String(first.pricePerDay),
      label: first.label ?? "",
    });
  };

  const savePeriod = async () => {
    if (!periodForm) return;
    const { ids, startDate, endDate, scopes, pricePerDay, label } = periodForm;
    const price = parseFloat(pricePerDay);

    if (!startDate || !endDate) return setPeriodError("Zgjidh datën e fillimit dhe të mbarimit.");
    if (endDate < startDate) return setPeriodError("Data e mbarimit duhet të jetë e njëjtë ose pas datës së fillimit.");
    if (!pricePerDay || isNaN(price) || price <= 0) return setPeriodError("Vendos një çmim pozitiv për ditë.");
    if (!scopes.length) return setPeriodError("Zgjidh të paktën një makinë ose kategori.");

    setSavingPeriod(true);
    try {
      // One transactional call: replaces the edited group and writes the new set,
      // so a failure can't leave half the cars priced.
      await saveBulk({
        startDate,
        endDate,
        pricePerDay: price,
        label: label.trim() || null,
        scopes: scopes.map(parseScope),
        replaceIds: ids,
      });
      setPeriodForm(null);
      setPeriodError(null);
      await refetch();
    } catch (err: any) {
      setPeriodError(err?.message || "Ruajtja dështoi.");
    } finally {
      setSavingPeriod(false);
    }
  };

  const deletePeriodGroup = async (group: any[]) => {
    for (const r of group) await remove(r.id);
    await refetch();
  };

  const periodStatus = (r: any): { text: string; cls: string } => {
    const today = todayKey();
    if (r.endDate < today) return { text: "Përfundoi", cls: "bg-neutral-100 text-neutral-500" };
    if (r.startDate > today) return { text: "E ardhshme", cls: "bg-blue-50 text-blue-600" };
    return { text: "Aktive", cls: "bg-emerald-50 text-emerald-700" };
  };

  const stats = useMemo(() => {
    const yearMonthRates = monthRates.filter(r => r.year === year || r.year === null);
    const prices = yearMonthRates.map(r => Number(r.pricePerDay)).filter(Number.isFinite);
    if (!prices.length) return { count: 0, avg: null, min: null, max: null, periods: periodGroups.length };
    return {
      count: yearMonthRates.length,
      avg: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
      min: Math.min(...prices),
      max: Math.max(...prices),
      periods: periodGroups.length,
    };
  }, [monthRates, periodGroups, year]);

  const currentMonth = new Date().getMonth() + 1;

  const inputCls = "w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary";
  const labelCls = "block text-xs font-medium text-neutral-500 mb-1.5";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-medium text-neutral-900">Çmimet Mujore</h1>
          <p className="text-neutral-500 text-sm mt-1">Vendos çmime specifike për çdo muaj ose për një periudhë të zgjedhur datash</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-border rounded-lg px-3 py-2 shadow-sm">
          <button onClick={() => setYear(y => y - 1)} className="p-1 rounded hover:bg-neutral-100 cursor-pointer transition-colors text-neutral-500">
            <CaretLeft size={16} weight="bold" />
          </button>
          <span className="text-sm font-bold text-neutral-800 min-w-[3rem] text-center tabular-nums">{year}</span>
          <button onClick={() => setYear(y => y + 1)} className="p-1 rounded hover:bg-neutral-100 cursor-pointer transition-colors text-neutral-500">
            <CaretRight size={16} weight="bold" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {[
          { label: "Çmime mujore", value: stats.count || "0", color: "text-primary" },
          { label: "Periudha", value: stats.periods || "0", color: "text-indigo-600" },
          { label: "Mesatarja", value: stats.avg ? `€${stats.avg}` : "—", color: "text-neutral-800" },
          { label: "Min muajor", value: stats.min ? `€${stats.min}` : "—", color: "text-emerald-600" },
          { label: "Max muajor", value: stats.max ? `€${stats.max}` : "—", color: "text-red-600" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-lg border border-border p-4">
            <p className="text-xs text-neutral-500 mb-1">{s.label}</p>
            <p className={`text-2xl font-semibold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Legend + Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4 text-xs text-neutral-500 flex-wrap">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-100 inline-block border border-emerald-200" /> Sezon i ulët</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-100 inline-block border border-amber-200" /> Mesatar</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-100 inline-block border border-red-200" /> Peak</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border border-dashed border-neutral-300 inline-block bg-white" /> E trashëguar / Default</span>
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block" /> Prekur nga një periudhë</span>
        </div>
        <div className="flex gap-1 bg-neutral-100 rounded-lg p-1">
          {(["categories", "cars"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer
                ${activeTab === tab ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700"}`}
            >
              {tab === "categories" ? "Kategoritë" : "Makinat individuale"}
            </button>
          ))}
        </div>
      </div>

      {/* Matrix */}
      <div className="bg-white rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-neutral-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wide min-w-[200px] sticky left-0 bg-neutral-50 z-10">
                  {activeTab === "categories" ? "Kategoria" : "Makina"}
                </th>
                {MONTHS_SHORT.map((m, i) => (
                  <th
                    key={m}
                    className={`text-center px-1 py-3 text-xs font-medium uppercase tracking-wide min-w-[65px]
                      ${i + 1 === currentMonth && year === new Date().getFullYear() ? "text-primary bg-primary/5" : "text-neutral-500"}`}
                  >
                    {m}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(ratesLoading || carsLoading) ? (
                <TableSkeleton rows={activeTab === "categories" ? 7 : 8} columns={13} />
              ) : activeRows.map(row => (
                <tr key={row.key} className="border-b border-border last:border-0 hover:bg-neutral-50/50 transition-colors">
                  <td className="px-4 py-2.5 sticky left-0 bg-white z-10 border-r border-border/50">
                    <p className={`text-sm font-medium ${row.type === "all" ? "text-primary" : "text-neutral-800"}`}>{row.label}</p>
                    {row.sublabel && <p className="text-xs text-neutral-400 mt-0.5">{row.sublabel}</p>}
                  </td>
                  {Array.from({ length: 12 }, (_, i) => {
                    const month = i + 1;
                    const isEditing = editCell?.rowKey === row.key && editCell?.month === month;
                    const { price, rateId, source } = getCellInfo(row.key, month, row);
                    const priceNum = parseFloat(price) || 0;
                    const colorCls = source === "own" && priceNum > 0 ? getCellColor(priceNum, row.key, row) : "";
                    const isCurrentMonth = month === currentMonth && year === new Date().getFullYear();
                    const overridden = isMonthOverridden(row.key, month, row);

                    return (
                      <td key={month} className={`px-0.5 py-1 text-center ${isCurrentMonth ? "bg-primary/3" : ""}`}>
                        {isEditing ? (
                          <input
                            type="number"
                            min="1"
                            step="1"
                            autoFocus
                            value={editCell.value}
                            onChange={e => setEditCell(prev => prev ? { ...prev, value: e.target.value } : null)}
                            onKeyDown={e => {
                              if (e.key === "Enter") handleSave();
                              if (e.key === "Escape") setEditCell(null);
                            }}
                            onBlur={handleSave}
                            className="w-14 px-1 py-1.5 border-2 border-primary rounded text-xs text-center focus:outline-none bg-white shadow-md"
                          />
                        ) : (
                          <button
                            onClick={() => handleCellClick(row, month)}
                            title={
                              overridden
                                ? "Disa ditë të këtij muaji mbulohen nga një periudhë me çmim të veçantë"
                                : source === "inherited" ? "Trashëguar — klik për të vendosur çmim specifik"
                                : source === "own" ? "Klik për të ndryshuar" : "Klik për të vendosur çmim"
                            }
                            className={`relative w-full px-1 py-1.5 rounded text-xs font-medium transition-all cursor-pointer group
                              hover:ring-2 hover:ring-primary/30 hover:shadow-sm
                              ${source === "own"
                                ? `border ${colorCls || "bg-blue-50 text-blue-700 border-blue-200"}`
                                : source === "inherited"
                                ? "text-neutral-300 border border-dashed border-neutral-200 hover:text-neutral-500"
                                : "text-neutral-200 border border-dashed border-neutral-100 hover:bg-neutral-50 hover:text-neutral-400"
                              }`}
                          >
                            {price ? `€${price}` : <span className="text-neutral-200">—</span>}
                            {overridden && (
                              <span className="absolute top-0.5 left-0.5 w-1.5 h-1.5 rounded-full bg-indigo-500" />
                            )}
                            {/* Delete button on hover for own rates */}
                            {source === "own" && rateId && (
                              <span
                                onClick={(e) => handleDelete(rateId, e)}
                                className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] items-center justify-center hidden group-hover:flex cursor-pointer hover:bg-red-600 shadow-sm z-10"
                              >
                                <X size={8} weight="bold" />
                              </span>
                            )}
                          </button>
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

      {/* ── Period rates ────────────────────────────────────── */}
      <div className="bg-white rounded-lg border border-border overflow-hidden">
        <div className="flex items-start justify-between gap-4 flex-wrap px-4 py-3.5 border-b border-border">
          <div>
            <h2 className="text-base font-medium text-neutral-900 flex items-center gap-2">
              <CalendarBlank size={18} className="text-indigo-500" />
              Periudha me çmim të veçantë
            </h2>
            <p className="text-xs text-neutral-500 mt-1">
              Çmim për një interval datash — p.sh. 25 Gusht → 10 Shtator. Ka përparësi mbi çmimin mujor të <strong>të njëjtit nivel</strong>.
            </p>
          </div>
          <button
            onClick={openNewPeriod}
            className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer"
          >
            <Plus size={15} weight="bold" /> Shto periudhë
          </button>
        </div>

        {/* Create / edit form */}
        {periodForm && (
          <div className="px-4 py-4 bg-neutral-50 border-b border-border">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <label className={labelCls}>Nga data</label>
                <input
                  type="date"
                  value={periodForm.startDate}
                  onChange={e => setPeriodForm(f => f && { ...f, startDate: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Deri më datë</label>
                <input
                  type="date"
                  min={periodForm.startDate || undefined}
                  value={periodForm.endDate}
                  onChange={e => setPeriodForm(f => f && { ...f, endDate: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Zbatohet për</label>
                <ScopePicker
                  value={periodForm.scopes}
                  onChange={next => setPeriodForm(f => f && { ...f, scopes: next })}
                  cars={cars}
                  disabled={savingPeriod}
                />
              </div>
              <div>
                <label className={labelCls}>Çmimi €/ditë</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="p.sh. 75"
                  value={periodForm.pricePerDay}
                  onChange={e => setPeriodForm(f => f && { ...f, pricePerDay: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Emërtim <span className="text-neutral-300">(opsional)</span></label>
                <input
                  type="text"
                  placeholder="p.sh. Fundi i sezonit"
                  value={periodForm.label}
                  onChange={e => setPeriodForm(f => f && { ...f, label: e.target.value })}
                  className={inputCls}
                />
              </div>
            </div>

            {periodForm.startDate && periodForm.endDate && periodForm.endDate >= periodForm.startDate && (
              <p className="text-xs text-neutral-500 mt-3">
                {formatDay(periodForm.startDate)} → {formatDay(periodForm.endDate)} ·{" "}
                <strong>{daysBetween(periodForm.startDate, periodForm.endDate)} ditë</strong>
                {periodForm.pricePerDay && !isNaN(parseFloat(periodForm.pricePerDay)) && (
                  <> · totali për gjithë periudhën: <strong>€{daysBetween(periodForm.startDate, periodForm.endDate) * parseFloat(periodForm.pricePerDay)}</strong></>
                )}
                {periodForm.scopes.length > 1 && (
                  <> · zbatohet mbi <strong>{periodForm.scopes.length} zgjedhje</strong></>
                )}
              </p>
            )}

            {periodError && <p className="text-xs text-red-600 mt-3">{periodError}</p>}

            <div className="flex gap-2 mt-4">
              <button
                onClick={savePeriod}
                disabled={savingPeriod}
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
              >
                {savingPeriod ? "Duke ruajtur…" : periodForm.ids.length ? "Ruaj ndryshimet" : "Shto periudhën"}
              </button>
              <button
                onClick={() => { setPeriodForm(null); setPeriodError(null); }}
                className="px-4 py-2 border border-border rounded-lg text-sm font-medium text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                Anulo
              </button>
            </div>
          </div>
        )}

        {/* List */}
        {ratesLoading ? (
          <div className="p-4"><TableSkeleton rows={3} columns={5} /></div>
        ) : periodGroups.length === 0 ? (
          <p className="px-4 py-8 text-sm text-neutral-400 text-center">
            Ende s'ka periudha. Shto një për të vendosur çmim mbi një interval datash.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-neutral-50">
                  {["Periudha", "Ditë", "Zbatohet për", "Çmimi", "Statusi", ""].map((h, i) => (
                    <th key={i} className={`px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wide ${i === 1 || i === 3 ? "text-right" : "text-left"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {periodGroups.map(group => {
                  const first = group[0];
                  const status = periodStatus(first);
                  const key = groupKeyOf(first);
                  const expanded = expandedGroup === key;
                  return (
                    <React.Fragment key={key}>
                      <tr className="border-b border-border last:border-0 hover:bg-neutral-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-neutral-800">
                            {formatDay(first.startDate)} <span className="text-neutral-400">→</span> {formatDay(first.endDate)}
                          </p>
                          {first.label && <p className="text-xs text-neutral-400 mt-0.5">{first.label}</p>}
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-600 text-right tabular-nums">
                          {daysBetween(first.startDate, first.endDate)}
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-600">
                          {group.length === 1 ? scopeLabel(first) : (
                            <button
                              onClick={() => setExpandedGroup(expanded ? null : key)}
                              className="flex items-center gap-1.5 text-primary hover:underline cursor-pointer bg-transparent border-0 p-0 text-sm"
                            >
                              {groupScopeSummary(group)}
                              <CaretDown size={12} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-neutral-900 text-right tabular-nums">
                          €{Number(first.pricePerDay)}<span className="text-xs font-normal text-neutral-400">/ditë</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${status.cls}`}>{status.text}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditPeriod(group)}
                              title={group.length > 1 ? `Ndrysho të ${group.length}` : "Ndrysho"}
                              className="p-1.5 rounded hover:bg-neutral-100 text-neutral-500 hover:text-neutral-800 transition-colors cursor-pointer"
                            >
                              <PencilSimple size={15} />
                            </button>
                            <button
                              onClick={() => deletePeriodGroup(group)}
                              title={group.length > 1 ? `Fshi të ${group.length}` : "Fshi"}
                              className="p-1.5 rounded hover:bg-red-50 text-neutral-400 hover:text-red-600 transition-colors cursor-pointer"
                            >
                              <Trash size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expanded && (
                        <tr className="border-b border-border bg-neutral-50/60">
                          <td colSpan={6} className="px-4 py-3">
                            <div className="flex flex-wrap gap-1.5">
                              {group.map(r => (
                                <span key={r.id} className="inline-block px-2 py-0.5 bg-white border border-border rounded text-xs text-neutral-600">
                                  {scopeLabel(r)}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info box */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-700">
          <p className="font-semibold mb-1.5">Si funksionojnë çmimet:</p>
          <ol className="list-decimal ml-4 space-y-1">
            <li><strong>Kliko</strong> mbi çdo qelizë për të vendosur çmimin e ditës (€/ditë) për atë muaj të plotë</li>
            <li><strong>Periudhat</strong> mbulojnë një interval datash (p.sh. 25 Gusht → 10 Shtator)</li>
            <li><strong>Prioriteti:</strong> së pari niveli — Makina specifike {">"} Kategoria {">"} Të gjitha makinat; brenda të njëjtit nivel, Periudha {">"} Muaji</li>
            <li>Një periudhë globale <strong>nuk</strong> shtyp çmimin e vendosur mbi një makinë ose kategori — për ta ulur atë, vendos periudhë mbi të njëjtin nivel</li>
            <li>Kur dy periudha mbivendosen në të njëjtin nivel, fiton ajo më e ngushta</li>
            <li>Çmimi llogaritet <strong>ditë për ditë</strong> — një rezervim që kalon nga një periudhë/muaj në tjetrin paguan çmimin e secilës ditë</li>
            <li>Nëse asnjë çmim nuk mbulon një ditë, përdoret çmimi bazë i makinës</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
