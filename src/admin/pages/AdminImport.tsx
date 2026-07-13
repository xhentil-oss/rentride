import React, { useMemo, useRef, useState } from "react";
import { useQuery, fetchWithRefresh } from "../../hooks/useApi";
import { UploadSimple, CheckCircle, WarningCircle, ArrowRight, SpinnerGap, Car } from "@phosphor-icons/react";

// ─── VikRentCar CSV import (one-time migration) ────────────────────────────
// Reads a VikRentCar order export, parses the single-blob "Customer Info"
// column, lets the admin map each distinct vehicle name to a real car, then
// POSTs normalized rows to /api/reservations/import (dedup by import_ref).

interface CarRow { id: string; brand: string; model: string; }

interface ParsedRow {
  importRef: string;
  vehicle: string;          // e.g. "Fiat Tipo" (", or similar" stripped)
  startDate: string; startTime: string;   // YYYY-MM-DD, HH:mm
  endDate: string; endTime: string;
  pickup: string; dropoff: string;
  status: string; total: number; totalPaid: number;
  customer: { name: string; firstName: string; lastName: string; email: string; phone: string; country: string; address: string; city: string; zip: string };
  dob: string; flightNumber: string; notes: string;
  _error?: string;
}

// Minimal RFC-4180-ish CSV parser (handles quoted fields, "" escapes, newlines-in-quotes)
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let field = "", row: string[] = [], inQuotes = false;
  // strip BOM
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") { row.push(field); field = ""; }
      else if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else if (ch === "\r") { /* ignore */ }
      else field += ch;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

const CUST_LABELS = ["Last Name", "Name", "e-Mail", "Phone", "Address", "Zip Code", "City", "Country", "Date of Birth", "Flight Number", "Notes"];
function parseCustomerInfo(blob: string) {
  const out: Record<string, string> = {};
  const re = new RegExp(`(${CUST_LABELS.join("|")})\\s*:`, "g");
  const marks: { key: string; start: number; end: number }[] = [];
  let m;
  while ((m = re.exec(blob)) !== null) marks.push({ key: m[1], start: m.index, end: m.index + m[0].length });
  for (let i = 0; i < marks.length; i++) {
    const valEnd = i + 1 < marks.length ? marks[i + 1].start : blob.length;
    out[marks[i].key] = blob.slice(marks[i].end, valEnd).trim();
  }
  return out;
}

// "01/04/2026 08:00" → { date: "2026-04-01", time: "08:00" }
function parseDateTime(s: string): { date: string; time: string } {
  const t = (s || "").trim();
  const [datePart, timePart = "00:00"] = t.split(/\s+/);
  const dm = datePart.split(/[/.]/);
  if (dm.length === 3 && dm[2].length === 4) {
    const [dd, mm, yyyy] = dm;
    return { date: `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`, time: timePart.slice(0, 5) };
  }
  return { date: "", time: timePart.slice(0, 5) };
}

const norm = (s: string) => s.toLowerCase().replace(/\bor similar\b/g, "").replace(/[^a-z0-9]/g, "").trim();

export default function AdminImport() {
  const { data: carsRaw } = useQuery("Car");
  const cars: CarRow[] = Array.isArray(carsRaw) ? carsRaw : [];

  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [mapping, setMapping] = useState<Record<string, string>>({}); // vehicle → carId
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);
  const [parseError, setParseError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const distinctVehicles = useMemo(() => Array.from(new Set(rows.map((r) => r.vehicle).filter(Boolean))).sort(), [rows]);

  const autoMap = (vehicles: string[]) => {
    const map: Record<string, string> = {};
    for (const v of vehicles) {
      const nv = norm(v);
      const hit = cars.find((c) => { const nc = norm(`${c.brand} ${c.model}`); return nc === nv || nc.includes(nv) || nv.includes(nc); });
      if (hit) map[v] = hit.id;
    }
    return map;
  };

  const handleFile = async (file: File) => {
    setResult(null); setParseError(""); setRows([]);
    setFileName(file.name);
    try {
      const text = await file.text();
      const grid = parseCSV(text);
      if (grid.length < 2) { setParseError("Skedari duket bosh ose pa rreshta."); return; }
      const header = grid[0].map((h) => h.trim().toLowerCase());
      const col = (name: string) => header.indexOf(name.toLowerCase());
      const ci = {
        id: col("ID"), pickup: col("Pickup Date"), drop: col("Drop Off Date"), vehicle: col("Vehicle"),
        ploc: col("Pickup Location"), dloc: col("Drop Off Location"), cust: col("Customer Info"),
        status: col("Status"), total: col("Total"), paid: col("Total Paid"),
      };
      if (ci.pickup < 0 || ci.vehicle < 0 || ci.cust < 0) {
        setParseError("Kolonat e pritura nuk u gjetën (Pickup Date / Vehicle / Customer Info). A është ky eksporti i VikRentCar?");
        return;
      }
      const parsed: ParsedRow[] = grid.slice(1).map((cells) => {
        const g = (idx: number) => (idx >= 0 ? (cells[idx] || "").trim() : "");
        const pk = parseDateTime(g(ci.pickup));
        const dp = parseDateTime(g(ci.drop));
        const info = parseCustomerInfo(g(ci.cust));
        const firstName = info["Name"] || "";
        const lastName = info["Last Name"] || "";
        const vehicle = g(ci.vehicle).replace(/\s*or similar\s*$/i, "").trim();
        const row: ParsedRow = {
          importRef: g(ci.id),
          vehicle,
          startDate: pk.date, startTime: pk.time,
          endDate: dp.date, endTime: dp.time,
          pickup: g(ci.ploc), dropoff: g(ci.dloc),
          status: g(ci.status) || "Confirmed",
          total: parseFloat(g(ci.total)) || 0,
          totalPaid: parseFloat(g(ci.paid)) || 0,
          customer: {
            name: `${firstName} ${lastName}`.trim(),
            firstName, lastName,
            email: (info["e-Mail"] || "").toLowerCase(),
            phone: info["Phone"] || "",
            country: info["Country"] || "",
            address: info["Address"] || "", city: info["City"] || "", zip: info["Zip Code"] || "",
          },
          dob: info["Date of Birth"] || "",
          flightNumber: info["Flight Number"] || "",
          notes: info["Notes"] || "",
        };
        if (!row.startDate || !row.endDate) row._error = "Datë e palexueshme";
        return row;
      });
      setRows(parsed);
      setMapping(autoMap(Array.from(new Set(parsed.map((r) => r.vehicle).filter(Boolean)))));
    } catch (e: any) {
      setParseError("Nuk u lexua dot skedari: " + (e?.message || e));
    }
  };

  const unmapped = distinctVehicles.filter((v) => !mapping[v]);
  const validRows = rows.filter((r) => !r._error && mapping[r.vehicle]);

  const runImport = async () => {
    setImporting(true); setResult(null);
    try {
      const payload = {
        source: "VikRentCar",
        rows: validRows.map((r) => ({
          importRef: r.importRef,
          carId: mapping[r.vehicle],
          startDate: r.startDate, startTime: r.startTime, endDate: r.endDate, endTime: r.endTime,
          pickup: r.pickup, dropoff: r.dropoff, status: r.status, total: r.total, totalPaid: r.totalPaid,
          flightNumber: r.flightNumber, notes: r.notes, dob: r.dob,
          customer: r.customer,
        })),
      };
      const res = await fetchWithRefresh("/api/reservations/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) { setResult({ created: 0, skipped: 0, errors: [json.error || `HTTP ${res.status}`] }); }
      else setResult(json);
    } catch (e: any) {
      setResult({ created: 0, skipped: 0, errors: [e?.message || "Gabim rrjeti"] });
    } finally { setImporting(false); }
  };

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-neutral-900">Importo rezervime</h1>
        <p className="text-sm text-neutral-500 mt-1">Ngarko një eksport CSV nga VikRentCar. Rezervimet e importuara nuk dublikohen (dedup sipas ID-së).</p>
      </div>

      {/* Upload */}
      <div className="bg-white rounded-xl border border-border p-6 mb-4">
        <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        <button type="button" onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer">
          <UploadSimple size={16} weight="bold" /> Zgjidh skedarin CSV
        </button>
        {fileName && <span className="ml-3 text-sm text-neutral-600">{fileName} — {rows.length} rreshta</span>}
        {parseError && <p className="mt-3 text-sm text-error flex items-center gap-1.5"><WarningCircle size={15} weight="fill" /> {parseError}</p>}
      </div>

      {rows.length > 0 && (
        <>
          {/* Car mapping */}
          <div className="bg-white rounded-xl border border-border p-6 mb-4">
            <h2 className="text-sm font-semibold text-neutral-900 flex items-center gap-2 mb-1"><Car size={16} weight="duotone" className="text-primary" /> Mapimi i makinave</h2>
            <p className="text-xs text-neutral-500 mb-4">Lidh çdo makinë nga VikRentCar me një makinë tënden. Rreshtat me makinë të pamapuar nuk importohen.</p>
            <div className="space-y-2">
              {distinctVehicles.map((v) => (
                <div key={v} className="flex items-center gap-3">
                  <span className="text-sm text-neutral-700 w-56 shrink-0 truncate">{v}</span>
                  <ArrowRight size={14} className="text-neutral-400 shrink-0" />
                  <select value={mapping[v] || ""} onChange={(e) => setMapping((m) => ({ ...m, [v]: e.target.value }))}
                    className={`flex-1 px-3 py-2 text-sm border rounded-lg outline-none focus:border-primary ${mapping[v] ? "border-border" : "border-amber-400 bg-amber-50"}`}>
                    <option value="">— Zgjidh makinën —</option>
                    {cars.map((c) => <option key={c.id} value={c.id}>{`${c.brand} ${c.model}`}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Summary + import */}
          <div className="bg-white rounded-xl border border-border p-6 mb-4">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm mb-4">
              <span className="text-neutral-700">Gjithsej: <strong>{rows.length}</strong></span>
              <span className="text-emerald-600">Gati për import: <strong>{validRows.length}</strong></span>
              {unmapped.length > 0 && <span className="text-amber-600">Makina të pamapuara: <strong>{unmapped.length}</strong></span>}
              {rows.some((r) => r._error) && <span className="text-error">Me gabim: <strong>{rows.filter((r) => r._error).length}</strong></span>}
            </div>
            <button type="button" disabled={importing || validRows.length === 0} onClick={runImport}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
              {importing ? <><SpinnerGap size={16} className="animate-spin" /> Duke importuar…</> : <>Importo {validRows.length} rezervime</>}
            </button>
          </div>

          {/* Result */}
          {result && (
            <div className={`rounded-xl border p-6 mb-4 ${result.errors.length && !result.created ? "border-error/40 bg-error/5" : "border-emerald-200 bg-emerald-50"}`}>
              <p className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
                <CheckCircle size={18} weight="fill" className="text-emerald-600" />
                {result.created} të reja · {result.skipped} kaluar (dublikatë) · {result.errors.length} gabime
              </p>
              {result.errors.length > 0 && (
                <ul className="mt-3 text-xs text-neutral-600 list-disc pl-5 space-y-0.5 max-h-48 overflow-y-auto">
                  {result.errors.slice(0, 100).map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              )}
            </div>
          )}

          {/* Preview */}
          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <div className="px-4 py-3 border-b border-border text-sm font-semibold text-neutral-900">Parapamje (30 të parat)</div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-neutral-50 text-neutral-500">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">ID</th>
                    <th className="text-left px-3 py-2 font-medium">Klienti</th>
                    <th className="text-left px-3 py-2 font-medium">Makina → e jona</th>
                    <th className="text-left px-3 py-2 font-medium">Marrja</th>
                    <th className="text-left px-3 py-2 font-medium">Kthimi</th>
                    <th className="text-right px-3 py-2 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {rows.slice(0, 30).map((r, i) => {
                    const mapped = cars.find((c) => c.id === mapping[r.vehicle]);
                    return (
                      <tr key={i} className={r._error ? "bg-error/5" : !mapping[r.vehicle] ? "bg-amber-50" : ""}>
                        <td className="px-3 py-2 text-neutral-500">{r.importRef}</td>
                        <td className="px-3 py-2"><div className="font-medium text-neutral-800">{r.customer.name || "—"}</div><div className="text-neutral-400">{r.customer.email}</div></td>
                        <td className="px-3 py-2 text-neutral-600">{r.vehicle} <span className="text-neutral-400">→</span> {mapped ? `${mapped.brand} ${mapped.model}` : <span className="text-amber-600">e pamapuar</span>}</td>
                        <td className="px-3 py-2 text-neutral-600">{r.startDate} {r.startTime}</td>
                        <td className="px-3 py-2 text-neutral-600">{r.endDate} {r.endTime}</td>
                        <td className="px-3 py-2 text-right text-neutral-700">€{r.total.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
