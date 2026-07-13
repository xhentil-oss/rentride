import React, { useState, useMemo } from "react";
import { CaretLeft, CaretRight, Info, X } from "@phosphor-icons/react";
import { useQuery, useMutation } from "../../hooks/useApi";
import { TableSkeleton } from "../../components/ui/Skeleton";

const MONTHS_SHORT = ["Jan", "Shk", "Mar", "Pri", "Maj", "Qer", "Kor", "Gus", "Sht", "Tet", "Nën", "Dhj"];
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

function buildRow(type: RowType, value?: string, car?: any): Row {
  if (type === "all") return { type, key: "all", label: "✦ Të gjitha makinat", sublabel: "Çmim bazë global" };
  if (type === "category") return { type, key: `category:${value}`, label: value!, sublabel: "Zbatohet mbi makina pa çmim specifik" };
  return {
    type, key: `car:${car.id}`, label: `${car.brand} ${car.model}`,
    sublabel: `${car.category} — Bazë €${car.pricePerDay}/ditë`,
    defaultPrice: car.pricePerDay, category: car.category,
  };
}

export default function AdminMonthlyRates() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [activeTab, setActiveTab] = useState<"categories" | "cars">("categories");
  const [editCell, setEditCell] = useState<{ rowKey: string; month: number; value: string } | null>(null);

  const { data: rawRates, isPending: ratesLoading, refetch } = useQuery("MonthlyRate");
  const { data: carsData, isPending: carsLoading } = useQuery("Car");
  const { create, remove } = useMutation("MonthlyRate");

  const rates: any[] = rawRates ?? [];
  const cars: any[] = carsData ?? [];

  // Find rate for a given row/month/year
  function findRate(rowKey: string, month: number): any | null {
    const [type, ...rest] = rowKey.split(":");
    const value = rest.join(":");
    return rates.find(r =>
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

    let appliesTo = "all";
    let appliesToValue: string | undefined;
    if (rowKey.startsWith("category:")) { appliesTo = "category"; appliesToValue = rowKey.slice(9); }
    else if (rowKey.startsWith("car:")) { appliesTo = "car"; appliesToValue = rowKey.slice(4); }

    await create({ year, month, appliesTo, appliesToValue, pricePerDay: price });
    await refetch();
  };

  const handleDelete = async (rateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await remove(rateId);
    await refetch();
  };

  const stats = useMemo(() => {
    const yearRates = rates.filter(r => r.year === year || r.year === null);
    const prices = yearRates.map(r => r.pricePerDay);
    if (!prices.length) return { count: 0, avg: null, min: null, max: null };
    return {
      count: yearRates.length,
      avg: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
      min: Math.min(...prices),
      max: Math.max(...prices),
    };
  }, [rates, year]);

  const currentMonth = new Date().getMonth() + 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-medium text-neutral-900">Çmimet Mujore</h1>
          <p className="text-neutral-500 text-sm mt-1">Vendos çmime specifike për çdo muaj — sipas kategorisë ose makinës</p>
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Çmime aktive", value: stats.count || "0", color: "text-primary" },
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
                            title={source === "inherited" ? "Trashëguar — klik për të vendosur çmim specifik" : source === "own" ? "Klik për të ndryshuar" : "Klik për të vendosur çmim"}
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

      {/* Info box */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-700">
          <p className="font-semibold mb-1.5">Si funksionojnë çmimet mujore:</p>
          <ol className="list-decimal ml-4 space-y-1">
            <li><strong>Kliko</strong> mbi çdo qelizë për të vendosur çmimin e ditës (€/ditë) për atë muaj</li>
            <li><strong>Prioriteti:</strong> Makina specifike {">"} Kategoria {">"} Të gjitha makinat</li>
            <li>Qelizat me <span className="italic">vijë të ndërprera</span> tregojnë çmim të trashëguar (nga kategoria ose global)</li>
            <li>Kur bëhet rezervimi, sistemi merr çmimin e muajit të nisjes automatikisht</li>
            <li>Nëse nuk ka çmim mujor, sistemi përdor çmimin bazë të makinës</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
