import React, { useState, useMemo } from "react";
import { CaretLeft, CaretRight, Info, X, Plus, PencilSimple, Trash, CalendarBlank } from "@phosphor-icons/react";
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
  id: string | null;
  startDate: string;
  endDate: string;
  scope: string;
  pricePerDay: string;
  label: string;
}
const emptyPeriodForm = (): PeriodForm => ({ id: null, startDate: "", endDate: "", scope: "all", pricePerDay: "", label: "" });

export default function AdminMonthlyRates() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [activeTab, setActiveTab] = useState<"categories" | "cars">("categories");
  const [editCell, setEditCell] = useState<{ rowKey: string; month: number; value: string } | null>(null);
  const [periodForm, setPeriodForm] = useState<PeriodForm | null>(null);
  const [periodError, setPeriodError] = useState<string | null>(null);
  const [savingPeriod, setSavingPeriod] = useState(false);

  const { data: rawRates, isPending: ratesLoading, refetch } = useQuery("MonthlyRate");
  const { data: carsData, isPending: carsLoading } = useQuery("Car");
  const { create, update, remove } = useMutation("MonthlyRate");

  const rates: any[] = rawRates ?? [];
  const cars: any[] = carsData ?? [];

  // The month matrix only ever reads whole-month rates; periods live in their own table.
  const monthRates = useMemo(() => rates.filter(r => !isPeriod(r)), [rates]);
  const periodRates = useMemo(
    () => rates.filter(isPeriod).sort((a, b) => String(a.startDate).localeCompare(String(b.startDate))),
    [rates]
  );

  const scopeLabel = React.useCallback((r: any): string => {
    if (r.appliesTo === "category") return r.appliesToValue;
    if (r.appliesTo === "car") {
      const car = cars.find(c => c.id === r.appliesToValue);
      return car ? `${car.brand} ${car.model}` : "Makinë e fshirë";
    }
    return "Të gjitha makinat";
  }, [cars]);

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
  const openEditPeriod = (r: any) => {
    setPeriodError(null);
    setPeriodForm({
      id: r.id,
      startDate: r.startDate,
      endDate: r.endDate,
      scope: scopeKeyOf(r),
      pricePerDay: String(r.pricePerDay),
      label: r.label ?? "",
    });
  };

  const savePeriod = async () => {
    if (!periodForm) return;
    const { id, startDate, endDate, scope, pricePerDay, label } = periodForm;
    const price = parseFloat(pricePerDay);

    if (!startDate || !endDate) return setPeriodError("Zgjidh datën e fillimit dhe të mbarimit.");
    if (endDate < startDate) return setPeriodError("Data e mbarimit duhet të jetë e njëjtë ose pas datës së fillimit.");
    if (!pricePerDay || isNaN(price) || price <= 0) return setPeriodError("Vendos një çmim pozitiv për ditë.");

    const payload = { ...parseScope(scope), startDate, endDate, pricePerDay: price, label: label.trim() || null };
    setSavingPeriod(true);
    try {
      if (id) await update(id, payload); else await create(payload);
      setPeriodForm(null);
      setPeriodError(null);
      await refetch();
    } catch (err: any) {
      setPeriodError(err?.message || "Ruajtja dështoi.");
    } finally {
      setSavingPeriod(false);
    }
  };

  const deletePeriod = async (id: string) => {
    await remove(id);
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
    if (!prices.length) return { count: 0, avg: null, min: null, max: null, periods: periodRates.length };
    return {
      count: yearMonthRates.length,
      avg: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
      min: Math.min(...prices),
      max: Math.max(...prices),
      periods: periodRates.length,
    };
  }, [monthRates, periodRates, year]);

  const currentMonth = new Date().getMonth() + 1;

  const scopeOptions = useMemo(() => [
    { value: "all", label: "Të gjitha makinat" },
    ...CATEGORIES.map(c => ({ value: `category:${c}`, label: `Kategoria — ${c}` })),
    ...cars.map(c => ({ value: `car:${c.id}`, label: `Makina — ${c.brand} ${c.model}` })),
  ], [cars]);

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
                <select
                  value={periodForm.scope}
                  onChange={e => setPeriodForm(f => f && { ...f, scope: e.target.value })}
                  className={inputCls}
                >
                  {scopeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
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
              </p>
            )}

            {periodError && <p className="text-xs text-red-600 mt-3">{periodError}</p>}

            <div className="flex gap-2 mt-4">
              <button
                onClick={savePeriod}
                disabled={savingPeriod}
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
              >
                {savingPeriod ? "Duke ruajtur…" : periodForm.id ? "Ruaj ndryshimet" : "Shto periudhën"}
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
        ) : periodRates.length === 0 ? (
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
                {periodRates.map(r => {
                  const status = periodStatus(r);
                  return (
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-neutral-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-neutral-800">
                          {formatDay(r.startDate)} <span className="text-neutral-400">→</span> {formatDay(r.endDate)}
                        </p>
                        {r.label && <p className="text-xs text-neutral-400 mt-0.5">{r.label}</p>}
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-600 text-right tabular-nums">
                        {daysBetween(r.startDate, r.endDate)}
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-600">{scopeLabel(r)}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-neutral-900 text-right tabular-nums">
                        €{Number(r.pricePerDay)}<span className="text-xs font-normal text-neutral-400">/ditë</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${status.cls}`}>{status.text}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditPeriod(r)}
                            title="Ndrysho"
                            className="p-1.5 rounded hover:bg-neutral-100 text-neutral-500 hover:text-neutral-800 transition-colors cursor-pointer"
                          >
                            <PencilSimple size={15} />
                          </button>
                          <button
                            onClick={() => deletePeriod(r.id)}
                            title="Fshi"
                            className="p-1.5 rounded hover:bg-red-50 text-neutral-400 hover:text-red-600 transition-colors cursor-pointer"
                          >
                            <Trash size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
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
