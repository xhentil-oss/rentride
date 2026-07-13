import React, { useState } from "react";
import { useQuery, useMutation } from "../../hooks/useApi";
import {
  Wrench,
  Shield,
  Certificate,
  GasPump,
  Warning,
  Car,
  Plus,
  X,
  CheckCircle,
  Clock,
  MapPin,
  Camera,
  Trash,
  PencilSimple,
  WarningCircle,
  ArrowClockwise,
  Gauge,
  CurrencyDollar,
  CalendarBlank,
  Eye,
} from "@phosphor-icons/react";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (d?: Date | string | null) => {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("sq-AL", { day: "2-digit", month: "short", year: "numeric" });
};

const daysUntil = (d?: Date | string | null): number => {
  if (!d) return 9999;
  const date = typeof d === "string" ? new Date(d) : d;
  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
};

const statusColor: Record<string, string> = {
  Scheduled: "bg-blue-100 text-blue-700",
  "In Progress": "bg-yellow-100 text-yellow-700",
  Completed: "bg-green-100 text-green-700",
  Overdue: "bg-red-100 text-red-700",
  Active: "bg-green-100 text-green-700",
  "Expiring Soon": "bg-orange-100 text-orange-700",
  Expired: "bg-red-100 text-red-700",
  Valid: "bg-green-100 text-green-700",
  Reported: "bg-blue-100 text-blue-700",
  "Under Review": "bg-yellow-100 text-yellow-700",
  "Repair Scheduled": "bg-orange-100 text-orange-700",
  Repaired: "bg-green-100 text-green-700",
  Closed: "bg-neutral-100 text-neutral-600",
  Minor: "bg-yellow-100 text-yellow-700",
  Moderate: "bg-orange-100 text-orange-700",
  Major: "bg-red-100 text-red-700",
  "Total Loss": "bg-red-200 text-red-900",
};

function Badge({ label }: { label: string }) {
  const cls = statusColor[label] ?? "bg-neutral-100 text-neutral-600";
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{label}</span>;
}

const TABS = [
  { id: "maintenance", label: "Mirëmbajtja", icon: Wrench },
  { id: "insurance", label: "Sigurimi", icon: Shield },
  { id: "registration", label: "Regjistrimi", icon: Certificate },
  { id: "fuel", label: "Karburanti", icon: GasPump },
  { id: "damage", label: "Dëmtimet", icon: Warning },
];

// ─── Maintenance Tab ──────────────────────────────────────────────────────────
function MaintenanceTab({ cars }: { cars: any[] }) {
  const { data: records = [], isPending, refetch } = useQuery("MaintenanceRecord", { orderBy: { scheduledDate: "asc" } });
  const { create, update, remove, isPending: mut } = useMutation("MaintenanceRecord");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ carId: "", type: "Oil Change", status: "Scheduled", scheduledDate: "", cost: "", mechanicName: "", notes: "", mileageAtService: "", nextServiceMileage: "" });

  const carName = (id: string) => { const c = cars.find(x => x.id === id); return c ? `${c.brand} ${c.model}` : id; };

  const openNew = () => { setEditing(null); setForm({ carId: "", type: "Oil Change", status: "Scheduled", scheduledDate: "", cost: "", mechanicName: "", notes: "", mileageAtService: "", nextServiceMileage: "" }); setOpen(true); };
  const openEdit = (r: any) => { setEditing(r); setForm({ carId: r.carId, type: r.type, status: r.status, scheduledDate: r.scheduledDate ? new Date(r.scheduledDate).toISOString().slice(0, 10) : "", cost: r.cost ?? "", mechanicName: r.mechanicName ?? "", notes: r.notes ?? "", mileageAtService: r.mileageAtService ?? "", nextServiceMileage: r.nextServiceMileage ?? "" }); setOpen(true); };

  const save = async () => {
    const payload = { carId: form.carId, type: form.type, status: form.status, scheduledDate: new Date(form.scheduledDate), cost: form.cost ? Number(form.cost) : undefined, mechanicName: form.mechanicName || undefined, notes: form.notes || undefined, mileageAtService: form.mileageAtService ? Number(form.mileageAtService) : undefined, nextServiceMileage: form.nextServiceMileage ? Number(form.nextServiceMileage) : undefined };
    if (editing) await update(editing.id, payload); else await create(payload);
    await refetch();
    setOpen(false);
  };

  const overdueCount = (records as any[]).filter(r => r.status === "Overdue").length;
  const scheduledCount = (records as any[]).filter(r => r.status === "Scheduled").length;

  return (
    <div>
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Gjithsej", value: (records as any[]).length, color: "text-neutral-800", bg: "bg-neutral-50" },
          { label: "Të planifikuara", value: scheduledCount, color: "text-blue-700", bg: "bg-blue-50" },
          { label: "Vonuara", value: overdueCount, color: "text-red-700", bg: "bg-red-50" },
          { label: "Të kryera", value: (records as any[]).filter(r => r.status === "Completed").length, color: "text-green-700", bg: "bg-green-50" },
        ].map(k => (
          <div key={k.label} className={`${k.bg} rounded-xl p-4`}>
            <p className="text-xs text-neutral-500 mb-1">{k.label}</p>
            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="flex justify-end mb-4">
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer">
          <Plus size={16} /> Shto
        </button>
      </div>

      {isPending ? (
        <div className="text-center py-12 text-neutral-400">Duke ngarkuar...</div>
      ) : (records as any[]).length === 0 ? (
        <div className="text-center py-16 text-neutral-400"><Wrench size={40} className="mx-auto mb-3 opacity-30" /><p>Nuk ka rekorde mirëmbajtjeje</p></div>
      ) : (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 border-b border-border">
              <tr>{["Makina", "Lloji", "Statusi", "Data e planif.", "Km", "Kosto", "Mekanik", ""].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(records as any[]).map(r => (
                <tr key={r.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3 font-medium text-neutral-800">{carName(r.carId)}</td>
                  <td className="px-4 py-3 text-neutral-600">{r.type}</td>
                  <td className="px-4 py-3"><Badge label={r.status} /></td>
                  <td className="px-4 py-3 text-neutral-600">{fmt(r.scheduledDate)}</td>
                  <td className="px-4 py-3 text-neutral-600">{r.mileageAtService ? `${r.mileageAtService.toLocaleString()} km` : "—"}</td>
                  <td className="px-4 py-3 text-neutral-600">{r.cost ? `€${r.cost}` : "—"}</td>
                  <td className="px-4 py-3 text-neutral-600">{r.mechanicName || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(r)} className="p-1.5 rounded hover:bg-neutral-100 text-neutral-500 cursor-pointer"><PencilSimple size={15} /></button>
                      <button onClick={() => remove(r.id).then(() => refetch())} className="p-1.5 rounded hover:bg-red-50 text-red-400 cursor-pointer"><Trash size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 m-4">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-lg">{editing ? "Ndrysho" : "Shto"} Mirëmbajtje</h3>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-neutral-100 cursor-pointer"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-neutral-600 mb-1">Makina</label>
                <select value={form.carId} onChange={e => setForm(f => ({ ...f, carId: e.target.value }))} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                  <option value="">Zgjidh makinen...</option>
                  {cars.map(c => <option key={c.id} value={c.id}>{c.brand} {c.model} ({c.year})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Lloji</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                  {["Oil Change", "Tire Rotation", "Brake Service", "Full Service", "Technical Inspection", "Other"].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Statusi</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                  {["Scheduled", "In Progress", "Completed", "Overdue"].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Data e planifikuar</label>
                <input type="date" value={form.scheduledDate} onChange={e => setForm(f => ({ ...f, scheduledDate: e.target.value }))} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Kosto (€)</label>
                <input type="number" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))} placeholder="0" className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Km aktual</label>
                <input type="number" value={form.mileageAtService} onChange={e => setForm(f => ({ ...f, mileageAtService: e.target.value }))} placeholder="0" className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Km shërbimi tjetër</label>
                <input type="number" value={form.nextServiceMileage} onChange={e => setForm(f => ({ ...f, nextServiceMileage: e.target.value }))} placeholder="0" className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-neutral-600 mb-1">Mekanik / Servis</label>
                <input type="text" value={form.mechanicName} onChange={e => setForm(f => ({ ...f, mechanicName: e.target.value }))} placeholder="Emri i mekanikut" className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-neutral-600 mb-1">Shënime</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setOpen(false)} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm hover:bg-neutral-50 cursor-pointer">Anulo</button>
              <button onClick={save} disabled={!form.carId || !form.scheduledDate || mut} className="flex-1 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 cursor-pointer">
                {mut ? "Duke ruajtur..." : "Ruaj"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Insurance Tab ────────────────────────────────────────────────────────────
function InsuranceTab({ cars }: { cars: any[] }) {
  const { data: records = [], isPending, refetch } = useQuery("InsuranceRecord", { orderBy: { expiryDate: "asc" } });
  const { create, update, remove, isPending: mut } = useMutation("InsuranceRecord");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ carId: "", provider: "", policyNumber: "", startDate: "", expiryDate: "", cost: "", type: "Third Party", status: "Active" });

  const carName = (id: string) => { const c = cars.find(x => x.id === id); return c ? `${c.brand} ${c.model}` : id; };

  const openNew = () => { setEditing(null); setForm({ carId: "", provider: "", policyNumber: "", startDate: "", expiryDate: "", cost: "", type: "Third Party", status: "Active" }); setOpen(true); };
  const openEdit = (r: any) => {
    setEditing(r);
    setForm({ carId: r.carId, provider: r.provider, policyNumber: r.policyNumber, startDate: r.startDate ? new Date(r.startDate).toISOString().slice(0, 10) : "", expiryDate: r.expiryDate ? new Date(r.expiryDate).toISOString().slice(0, 10) : "", cost: r.cost ?? "", type: r.type, status: r.status });
    setOpen(true);
  };

  const save = async () => {
    const payload = { carId: form.carId, provider: form.provider, policyNumber: form.policyNumber, startDate: new Date(form.startDate), expiryDate: new Date(form.expiryDate), cost: Number(form.cost), type: form.type, status: form.status };
    if (editing) await update(editing.id, payload); else await create(payload);
    await refetch();
    setOpen(false);
  };

  const expiringSoon = (records as any[]).filter(r => { const d = daysUntil(r.expiryDate); return d >= 0 && d <= 30; }).length;
  const expired = (records as any[]).filter(r => daysUntil(r.expiryDate) < 0).length;

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Gjithsej", value: (records as any[]).length, color: "text-neutral-800", bg: "bg-neutral-50" },
          { label: "Aktive", value: (records as any[]).filter(r => daysUntil(r.expiryDate) > 30).length, color: "text-green-700", bg: "bg-green-50" },
          { label: "Skadon brenda 30 ditëve", value: expiringSoon, color: "text-orange-700", bg: "bg-orange-50" },
          { label: "Skaduar", value: expired, color: "text-red-700", bg: "bg-red-50" },
        ].map(k => (
          <div key={k.label} className={`${k.bg} rounded-xl p-4`}>
            <p className="text-xs text-neutral-500 mb-1">{k.label}</p>
            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {expiringSoon > 0 && (
        <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-xl flex items-center gap-2 text-orange-700 text-sm">
          <WarningCircle size={18} weight="fill" />
          <strong>{expiringSoon} policia</strong> skadojnë brenda 30 ditëve — kontrolloji!
        </div>
      )}

      <div className="flex justify-end mb-4">
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer">
          <Plus size={16} /> Shto
        </button>
      </div>

      {isPending ? (
        <div className="text-center py-12 text-neutral-400">Duke ngarkuar...</div>
      ) : (records as any[]).length === 0 ? (
        <div className="text-center py-16 text-neutral-400"><Shield size={40} className="mx-auto mb-3 opacity-30" /><p>Nuk ka rekorde sigurimi</p></div>
      ) : (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 border-b border-border">
              <tr>{["Makina", "Kompania", "Polica Nr.", "Lloji", "Skadon", "Ditë mbetur", "Kosto", "Statusi", ""].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(records as any[]).map(r => {
                const days = daysUntil(r.expiryDate);
                const alertCls = days < 0 ? "bg-red-50" : days <= 30 ? "bg-orange-50" : "";
                return (
                  <tr key={r.id} className={`hover:bg-neutral-50 ${alertCls}`}>
                    <td className="px-4 py-3 font-medium">{carName(r.carId)}</td>
                    <td className="px-4 py-3 text-neutral-600">{r.provider}</td>
                    <td className="px-4 py-3 text-neutral-500 font-mono text-xs">{r.policyNumber}</td>
                    <td className="px-4 py-3 text-neutral-600">{r.type}</td>
                    <td className="px-4 py-3 text-neutral-600">{fmt(r.expiryDate)}</td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${days < 0 ? "text-red-600" : days <= 30 ? "text-orange-600" : "text-green-600"}`}>
                        {days < 0 ? `${Math.abs(days)} ditë skaduar` : `${days} ditë`}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-neutral-600">€{r.cost}</td>
                    <td className="px-4 py-3"><Badge label={days < 0 ? "Expired" : days <= 30 ? "Expiring Soon" : "Active"} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(r)} className="p-1.5 rounded hover:bg-neutral-100 text-neutral-500 cursor-pointer"><PencilSimple size={15} /></button>
                        <button onClick={() => remove(r.id).then(() => refetch())} className="p-1.5 rounded hover:bg-red-50 text-red-400 cursor-pointer"><Trash size={15} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 m-4">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-lg">{editing ? "Ndrysho" : "Shto"} Siguracion</h3>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-neutral-100 cursor-pointer"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-neutral-600 mb-1">Makina</label>
                <select value={form.carId} onChange={e => setForm(f => ({ ...f, carId: e.target.value }))} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                  <option value="">Zgjidh makinen...</option>
                  {cars.map(c => <option key={c.id} value={c.id}>{c.brand} {c.model} ({c.year})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Kompania</label>
                <input type="text" value={form.provider} onChange={e => setForm(f => ({ ...f, provider: e.target.value }))} placeholder="p.sh. Sigal" className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Nr. Policës</label>
                <input type="text" value={form.policyNumber} onChange={e => setForm(f => ({ ...f, policyNumber: e.target.value }))} placeholder="POL-001" className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Data e fillimit</label>
                <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Data e skadimit</label>
                <input type="date" value={form.expiryDate} onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Lloji</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                  {["Third Party", "Comprehensive", "Premium"].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Kosto (€)</label>
                <input type="number" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))} placeholder="0" className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setOpen(false)} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm hover:bg-neutral-50 cursor-pointer">Anulo</button>
              <button onClick={save} disabled={!form.carId || !form.provider || !form.expiryDate || mut} className="flex-1 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 cursor-pointer">
                {mut ? "Duke ruajtur..." : "Ruaj"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Registration Tab ─────────────────────────────────────────────────────────
function RegistrationTab({ cars }: { cars: any[] }) {
  const { data: records = [], isPending, refetch } = useQuery("RegistrationRecord", { orderBy: { expiryDate: "asc" } });
  const { create, update, remove, isPending: mut } = useMutation("RegistrationRecord");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ carId: "", plateNumber: "", expiryDate: "", renewalCost: "", status: "Valid", notes: "" });

  const carName = (id: string) => { const c = cars.find(x => x.id === id); return c ? `${c.brand} ${c.model}` : id; };
  const openNew = () => { setEditing(null); setForm({ carId: "", plateNumber: "", expiryDate: "", renewalCost: "", status: "Valid", notes: "" }); setOpen(true); };
  const openEdit = (r: any) => { setEditing(r); setForm({ carId: r.carId, plateNumber: r.plateNumber, expiryDate: r.expiryDate ? new Date(r.expiryDate).toISOString().slice(0, 10) : "", renewalCost: r.renewalCost ?? "", status: r.status, notes: r.notes ?? "" }); setOpen(true); };

  const save = async () => {
    const payload = { carId: form.carId, plateNumber: form.plateNumber, expiryDate: new Date(form.expiryDate), renewalCost: form.renewalCost ? Number(form.renewalCost) : undefined, status: form.status, notes: form.notes || undefined };
    if (editing) await update(editing.id, payload); else await create(payload);
    await refetch();
    setOpen(false);
  };

  const expiringSoon = (records as any[]).filter(r => { const d = daysUntil(r.expiryDate); return d >= 0 && d <= 30; }).length;

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {[
          { label: "Gjithsej", value: (records as any[]).length, color: "text-neutral-800", bg: "bg-neutral-50" },
          { label: "Skadon ≤ 30 ditë", value: expiringSoon, color: "text-orange-700", bg: "bg-orange-50" },
          { label: "Skaduar", value: (records as any[]).filter(r => daysUntil(r.expiryDate) < 0).length, color: "text-red-700", bg: "bg-red-50" },
        ].map(k => (
          <div key={k.label} className={`${k.bg} rounded-xl p-4`}>
            <p className="text-xs text-neutral-500 mb-1">{k.label}</p>
            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="flex justify-end mb-4">
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer">
          <Plus size={16} /> Shto
        </button>
      </div>

      {isPending ? (
        <div className="text-center py-12 text-neutral-400">Duke ngarkuar...</div>
      ) : (records as any[]).length === 0 ? (
        <div className="text-center py-16 text-neutral-400"><Certificate size={40} className="mx-auto mb-3 opacity-30" /><p>Nuk ka rekorde regjistrimi</p></div>
      ) : (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 border-b border-border">
              <tr>{["Makina", "Targa", "Skadon", "Ditë mbetur", "Kosto rinovimi", "Statusi", ""].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(records as any[]).map(r => {
                const days = daysUntil(r.expiryDate);
                return (
                  <tr key={r.id} className={`hover:bg-neutral-50 ${days < 0 ? "bg-red-50" : days <= 30 ? "bg-orange-50" : ""}`}>
                    <td className="px-4 py-3 font-medium">{carName(r.carId)}</td>
                    <td className="px-4 py-3 font-mono font-semibold text-neutral-700">{r.plateNumber}</td>
                    <td className="px-4 py-3 text-neutral-600">{fmt(r.expiryDate)}</td>
                    <td className="px-4 py-3"><span className={`font-semibold ${days < 0 ? "text-red-600" : days <= 30 ? "text-orange-600" : "text-green-600"}`}>{days < 0 ? `${Math.abs(days)} ditë skaduar` : `${days} ditë`}</span></td>
                    <td className="px-4 py-3 text-neutral-600">{r.renewalCost ? `€${r.renewalCost}` : "—"}</td>
                    <td className="px-4 py-3"><Badge label={days < 0 ? "Expired" : days <= 30 ? "Expiring Soon" : "Valid"} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(r)} className="p-1.5 rounded hover:bg-neutral-100 text-neutral-500 cursor-pointer"><PencilSimple size={15} /></button>
                        <button onClick={() => remove(r.id).then(() => refetch())} className="p-1.5 rounded hover:bg-red-50 text-red-400 cursor-pointer"><Trash size={15} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 m-4">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-lg">{editing ? "Ndrysho" : "Shto"} Regjistrim</h3>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-neutral-100 cursor-pointer"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-neutral-600 mb-1">Makina</label>
                <select value={form.carId} onChange={e => setForm(f => ({ ...f, carId: e.target.value }))} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                  <option value="">Zgjidh makinen...</option>
                  {cars.map(c => <option key={c.id} value={c.id}>{c.brand} {c.model} ({c.year})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Targa</label>
                <input type="text" value={form.plateNumber} onChange={e => setForm(f => ({ ...f, plateNumber: e.target.value }))} placeholder="AA 000 BB" className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono uppercase" />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Data e skadimit</label>
                <input type="date" value={form.expiryDate} onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Kosto rinovimi (€)</label>
                <input type="number" value={form.renewalCost} onChange={e => setForm(f => ({ ...f, renewalCost: e.target.value }))} placeholder="0" className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-neutral-600 mb-1">Shënime</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setOpen(false)} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm hover:bg-neutral-50 cursor-pointer">Anulo</button>
              <button onClick={save} disabled={!form.carId || !form.plateNumber || !form.expiryDate || mut} className="flex-1 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 cursor-pointer">
                {mut ? "Duke ruajtur..." : "Ruaj"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Fuel Tab ─────────────────────────────────────────────────────────────────
function FuelTab({ cars }: { cars: any[] }) {
  const { data: records = [], isPending, refetch } = useQuery("FuelLog", { orderBy: { date: "desc" } });
  const { create, remove, isPending: mut } = useMutation("FuelLog");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ carId: "", date: new Date().toISOString().slice(0, 10), liters: "", pricePerLiter: "", mileage: "", fuelType: "Benzinë", station: "", notes: "" });

  const carName = (id: string) => { const c = cars.find(x => x.id === id); return c ? `${c.brand} ${c.model}` : id; };
  const totalCost = form.liters && form.pricePerLiter ? (Number(form.liters) * Number(form.pricePerLiter)).toFixed(2) : "0.00";

  const totalLiters = (records as any[]).reduce((s: number, r: any) => s + (Number(r.liters) || 0), 0);
  const totalSpent = (records as any[]).reduce((s: number, r: any) => s + (Number(r.totalCost) || 0), 0);

  const save = async () => {
    await create({ carId: form.carId, date: new Date(form.date), liters: Number(form.liters), pricePerLiter: Number(form.pricePerLiter), totalCost: Number(totalCost), mileage: Number(form.mileage), fuelType: form.fuelType, station: form.station || undefined, notes: form.notes || undefined });
    await refetch();
    setOpen(false);
    setForm({ carId: "", date: new Date().toISOString().slice(0, 10), liters: "", pricePerLiter: "", mileage: "", fuelType: "Benzinë", station: "", notes: "" });
  };

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Karburantime", value: (records as any[]).length, color: "text-neutral-800", bg: "bg-neutral-50" },
          { label: "Litër gjithsej", value: totalLiters.toFixed(0) + " L", color: "text-blue-700", bg: "bg-blue-50" },
          { label: "Shpenzuar gjithsej", value: `€${totalSpent.toFixed(0)}`, color: "text-red-700", bg: "bg-red-50" },
          { label: "Çmim mesatar/L", value: totalLiters > 0 ? `€${(totalSpent / totalLiters).toFixed(2)}` : "—", color: "text-green-700", bg: "bg-green-50" },
        ].map(k => (
          <div key={k.label} className={`${k.bg} rounded-xl p-4`}>
            <p className="text-xs text-neutral-500 mb-1">{k.label}</p>
            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="flex justify-end mb-4">
        <button onClick={() => setOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer">
          <Plus size={16} /> Shto karburantim
        </button>
      </div>

      {isPending ? (
        <div className="text-center py-12 text-neutral-400">Duke ngarkuar...</div>
      ) : (records as any[]).length === 0 ? (
        <div className="text-center py-16 text-neutral-400"><GasPump size={40} className="mx-auto mb-3 opacity-30" /><p>Nuk ka regjistrime karburanti</p></div>
      ) : (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 border-b border-border">
              <tr>{["Makina", "Data", "Litër", "€/L", "Gjithsej", "Km", "Llojet", "Stacioni", ""].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(records as any[]).map(r => (
                <tr key={r.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3 font-medium">{carName(r.carId)}</td>
                  <td className="px-4 py-3 text-neutral-600">{fmt(r.date)}</td>
                  <td className="px-4 py-3 text-neutral-700 font-semibold">{r.liters} L</td>
                  <td className="px-4 py-3 text-neutral-600">€{r.pricePerLiter}</td>
                  <td className="px-4 py-3 font-semibold text-red-600">€{r.totalCost}</td>
                  <td className="px-4 py-3 text-neutral-600">{r.mileage?.toLocaleString()} km</td>
                  <td className="px-4 py-3"><span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">{r.fuelType}</span></td>
                  <td className="px-4 py-3 text-neutral-500">{r.station || "—"}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => remove(r.id).then(() => refetch())} className="p-1.5 rounded hover:bg-red-50 text-red-400 cursor-pointer"><Trash size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 m-4">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-lg">Shto karburantim</h3>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-neutral-100 cursor-pointer"><X size={18} /></button>
            </div>
            {form.liters && form.pricePerLiter && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                <strong>Kosto totale: €{totalCost}</strong>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-neutral-600 mb-1">Makina</label>
                <select value={form.carId} onChange={e => setForm(f => ({ ...f, carId: e.target.value }))} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                  <option value="">Zgjidh makinen...</option>
                  {cars.map(c => <option key={c.id} value={c.id}>{c.brand} {c.model}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Data</label>
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Lloji karburanti</label>
                <select value={form.fuelType} onChange={e => setForm(f => ({ ...f, fuelType: e.target.value }))} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                  {["Benzinë", "Naftë", "Hibrid"].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Litër</label>
                <input type="number" step="0.01" value={form.liters} onChange={e => setForm(f => ({ ...f, liters: e.target.value }))} placeholder="0.00" className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">€ / Litër</label>
                <input type="number" step="0.01" value={form.pricePerLiter} onChange={e => setForm(f => ({ ...f, pricePerLiter: e.target.value }))} placeholder="0.00" className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Km odometrit</label>
                <input type="number" value={form.mileage} onChange={e => setForm(f => ({ ...f, mileage: e.target.value }))} placeholder="0" className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Stacioni</label>
                <input type="text" value={form.station} onChange={e => setForm(f => ({ ...f, station: e.target.value }))} placeholder="Kastrati, Agip..." className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-neutral-600 mb-1">Shënime</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setOpen(false)} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm hover:bg-neutral-50 cursor-pointer">Anulo</button>
              <button onClick={save} disabled={!form.carId || !form.liters || !form.pricePerLiter || !form.mileage || mut} className="flex-1 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 cursor-pointer">
                {mut ? "Duke ruajtur..." : "Regjistro"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Damage Tab ───────────────────────────────────────────────────────────────
function DamageTab({ cars }: { cars: any[] }) {
  const { data: records = [], isPending, refetch } = useQuery("DamageReport", { orderBy: { reportDate: "desc" } });
  const { create, update, remove, isPending: mut } = useMutation("DamageReport");
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<any>(null);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ carId: "", reportDate: new Date().toISOString().slice(0, 10), description: "", severity: "Minor", status: "Reported", repairCost: "", photoUrls: "", reportedBy: "", notes: "" });

  const carName = (id: string) => { const c = cars.find(x => x.id === id); return c ? `${c.brand} ${c.model}` : id; };

  const openNew = () => { setEditing(null); setForm({ carId: "", reportDate: new Date().toISOString().slice(0, 10), description: "", severity: "Minor", status: "Reported", repairCost: "", photoUrls: "", reportedBy: "", notes: "" }); setOpen(true); };
  const openEdit = (r: any) => { setEditing(r); setForm({ carId: r.carId, reportDate: r.reportDate ? new Date(r.reportDate).toISOString().slice(0, 10) : "", description: r.description, severity: r.severity, status: r.status, repairCost: r.repairCost ?? "", photoUrls: r.photoUrls ?? "", reportedBy: r.reportedBy, notes: r.notes ?? "" }); setOpen(true); };

  const save = async () => {
    const payload = { carId: form.carId, reportDate: new Date(form.reportDate), description: form.description, severity: form.severity, status: form.status, repairCost: form.repairCost ? Number(form.repairCost) : undefined, photoUrls: form.photoUrls, reportedBy: form.reportedBy, notes: form.notes || undefined };
    if (editing) await update(editing.id, payload); else await create(payload);
    await refetch();
    setOpen(false);
  };

  const severityColors: Record<string, string> = { Minor: "bg-yellow-50 border-yellow-200", Moderate: "bg-orange-50 border-orange-200", Major: "bg-red-50 border-red-200", "Total Loss": "bg-red-100 border-red-400" };

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Gjithsej", value: (records as any[]).length, color: "text-neutral-800", bg: "bg-neutral-50" },
          { label: "Aktive", value: (records as any[]).filter(r => !["Repaired", "Closed"].includes(r.status)).length, color: "text-orange-700", bg: "bg-orange-50" },
          { label: "Nën riparim", value: (records as any[]).filter(r => r.status === "Repair Scheduled").length, color: "text-blue-700", bg: "bg-blue-50" },
          { label: "Kosto totale", value: `€${(records as any[]).reduce((s: number, r: any) => s + (r.repairCost || 0), 0).toLocaleString()}`, color: "text-red-700", bg: "bg-red-50" },
        ].map(k => (
          <div key={k.label} className={`${k.bg} rounded-xl p-4`}>
            <p className="text-xs text-neutral-500 mb-1">{k.label}</p>
            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="flex justify-end mb-4">
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer">
          <Plus size={16} /> Raport i ri
        </button>
      </div>

      {isPending ? (
        <div className="text-center py-12 text-neutral-400">Duke ngarkuar...</div>
      ) : (records as any[]).length === 0 ? (
        <div className="text-center py-16 text-neutral-400"><Warning size={40} className="mx-auto mb-3 opacity-30" /><p>Nuk ka raporte dëmtimi</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {(records as any[]).map(r => {
            const photos = r.photoUrls ? r.photoUrls.split(",").filter(Boolean) : [];
            return (
              <div key={r.id} className={`rounded-xl border p-4 ${severityColors[r.severity] ?? "bg-white border-border"}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-neutral-800">{carName(r.carId)}</p>
                    <p className="text-xs text-neutral-500">{fmt(r.reportDate)} · Raportuar nga: {r.reportedBy}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge label={r.severity} />
                    <Badge label={r.status} />
                  </div>
                </div>

                <p className="text-sm text-neutral-700 mb-3 line-clamp-2">{r.description}</p>

                {photos.length > 0 && (
                  <div className="flex gap-2 mb-3 flex-wrap">
                    {photos.slice(0, 3).map((url: string, i: number) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="w-16 h-16 rounded-lg bg-neutral-200 overflow-hidden flex items-center justify-center border border-border hover:opacity-80 transition-opacity">
                        <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      </a>
                    ))}
                    {photos.length > 3 && <div className="w-16 h-16 rounded-lg bg-neutral-200 flex items-center justify-center text-xs text-neutral-500 border border-border">+{photos.length - 3}</div>}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-red-600">{r.repairCost ? `€${r.repairCost}` : "Pa kosto"}</span>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setViewing(r)} className="p-1.5 rounded hover:bg-neutral-200 text-neutral-500 cursor-pointer"><Eye size={15} /></button>
                    <button onClick={() => openEdit(r)} className="p-1.5 rounded hover:bg-neutral-200 text-neutral-500 cursor-pointer"><PencilSimple size={15} /></button>
                    <button onClick={() => remove(r.id).then(() => refetch())} className="p-1.5 rounded hover:bg-red-100 text-red-400 cursor-pointer"><Trash size={15} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* View Modal */}
      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-lg">Raport Dëmtimi</h3>
              <button onClick={() => setViewing(null)} className="p-1.5 rounded-lg hover:bg-neutral-100 cursor-pointer"><X size={18} /></button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-neutral-500">Makina:</span> <strong>{carName(viewing.carId)}</strong></div>
                <div><span className="text-neutral-500">Data:</span> <strong>{fmt(viewing.reportDate)}</strong></div>
                <div><span className="text-neutral-500">Seriozieta:</span> <Badge label={viewing.severity} /></div>
                <div><span className="text-neutral-500">Statusi:</span> <Badge label={viewing.status} /></div>
                <div><span className="text-neutral-500">Raportuar nga:</span> <strong>{viewing.reportedBy}</strong></div>
                <div><span className="text-neutral-500">Kosto riparimit:</span> <strong className="text-red-600">{viewing.repairCost ? `€${viewing.repairCost}` : "—"}</strong></div>
              </div>
              <div><span className="text-neutral-500">Përshkrim:</span><p className="mt-1 text-neutral-800">{viewing.description}</p></div>
              {viewing.notes && <div><span className="text-neutral-500">Shënime:</span><p className="mt-1 text-neutral-600">{viewing.notes}</p></div>}
              {viewing.photoUrls && (
                <div>
                  <span className="text-neutral-500 block mb-2">Fotot:</span>
                  <div className="flex flex-wrap gap-3">
                    {viewing.photoUrls.split(",").filter(Boolean).map((url: string, i: number) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="w-24 h-24 rounded-lg bg-neutral-100 border border-border overflow-hidden hover:opacity-80 transition-opacity">
                        <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-lg">{editing ? "Ndrysho" : "Raport i ri"} Dëmtimi</h3>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-neutral-100 cursor-pointer"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-neutral-600 mb-1">Makina</label>
                <select value={form.carId} onChange={e => setForm(f => ({ ...f, carId: e.target.value }))} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                  <option value="">Zgjidh makinen...</option>
                  {cars.map(c => <option key={c.id} value={c.id}>{c.brand} {c.model}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Data e raportimit</label>
                <input type="date" value={form.reportDate} onChange={e => setForm(f => ({ ...f, reportDate: e.target.value }))} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Seriozieta</label>
                <select value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value }))} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                  {["Minor", "Moderate", "Major", "Total Loss"].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Statusi</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                  {["Reported", "Under Review", "Repair Scheduled", "Repaired", "Closed"].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Raportuar nga</label>
                <input type="text" value={form.reportedBy} onChange={e => setForm(f => ({ ...f, reportedBy: e.target.value }))} placeholder="Emri" className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Kosto riparimit (€)</label>
                <input type="number" value={form.repairCost} onChange={e => setForm(f => ({ ...f, repairCost: e.target.value }))} placeholder="0" className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-neutral-600 mb-1">Përshkrim i dëmtimit</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="Përshkruaj dëmtimin..." className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-neutral-600 mb-1">URL-et e fotove (të ndara me presje)</label>
                <div className="relative">
                  <Camera size={14} className="absolute left-3 top-3 text-neutral-400" />
                  <textarea value={form.photoUrls} onChange={e => setForm(f => ({ ...f, photoUrls: e.target.value }))} rows={2} placeholder="https://..., https://..." className="w-full border border-border rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
                </div>
                <p className="text-xs text-neutral-400 mt-1">Ngarko fotot tek shërbimi juaj të ruajtjes (Cloudinary, Imgur etj.) dhe fut URL-in këtu</p>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-neutral-600 mb-1">Shënime</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setOpen(false)} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm hover:bg-neutral-50 cursor-pointer">Anulo</button>
              <button onClick={save} disabled={!form.carId || !form.description || !form.reportedBy || mut} className="flex-1 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 cursor-pointer">
                {mut ? "Duke ruajtur..." : "Regjistro"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── GPS placeholder ──────────────────────────────────────────────────────────
function GPSTab({ cars }: { cars: any[] }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-20 h-20 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
        <MapPin size={36} className="text-blue-400" />
      </div>
      <h3 className="text-lg font-semibold text-neutral-700 mb-2">GPS Tracking</h3>
      <p className="text-neutral-500 max-w-sm mb-6">Integrimi GPS kërkon lidhje me një ofrues të jashtëm (p.sh. Trackimo, Teltonika). Kur të keni çelësin API, e aktivizojmë menjëherë.</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-lg">
        {cars.slice(0, 3).map(c => (
          <div key={c.id} className="bg-neutral-50 border border-border rounded-xl p-4 text-left">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-neutral-300"></div>
              <span className="text-xs font-medium text-neutral-500">Pa GPS</span>
            </div>
            <p className="font-medium text-sm text-neutral-800">{c.brand} {c.model}</p>
            <p className="text-xs text-neutral-400">{c.year}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminFleetManagement() {
  const [activeTab, setActiveTab] = useState("maintenance");
  const { data: cars = [], isPending: carsPending } = useQuery("Car");

  // Compute alerts for header badges
  const { data: insurances = [] } = useQuery("InsuranceRecord");
  const { data: registrations = [] } = useQuery("RegistrationRecord");
  const { data: maintenance = [] } = useQuery("MaintenanceRecord");

  const insuranceAlerts = (insurances as any[]).filter(r => daysUntil(r.expiryDate) <= 30).length;
  const registrationAlerts = (registrations as any[]).filter(r => daysUntil(r.expiryDate) <= 30).length;
  const maintenanceAlerts = (maintenance as any[]).filter(r => r.status === "Overdue").length;
  const totalAlerts = insuranceAlerts + registrationAlerts + maintenanceAlerts;

  const tabAlerts: Record<string, number> = {
    maintenance: maintenanceAlerts,
    insurance: insuranceAlerts,
    registration: registrationAlerts,
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Fleet Management</h1>
          <p className="text-sm text-neutral-500 mt-0.5">Mirëmbajtja, sigurimi, regjistrimi dhe gjurmimi i flotës</p>
        </div>
        {totalAlerts > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
            <WarningCircle size={18} weight="fill" />
            {totalAlerts} {totalAlerts === 1 ? "alarm" : "alarme"} aktive
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 bg-neutral-100 rounded-xl p-1 w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              activeTab === id
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            <Icon size={16} weight={activeTab === id ? "fill" : "regular"} />
            {label}
            {tabAlerts[id] > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
                {tabAlerts[id]}
              </span>
            )}
          </button>
        ))}
        <button
          onClick={() => setActiveTab("gps")}
          className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
            activeTab === "gps"
              ? "bg-white text-neutral-900 shadow-sm"
              : "text-neutral-500 hover:text-neutral-700"
          }`}
        >
          <MapPin size={16} weight={activeTab === "gps" ? "fill" : "regular"} />
          GPS
          <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 font-semibold">Soon</span>
        </button>
      </div>

      {carsPending ? (
        <div className="text-center py-20 text-neutral-400">Duke ngarkuar flotën...</div>
      ) : (
        <>
          {activeTab === "maintenance" && <MaintenanceTab cars={cars as any[]} />}
          {activeTab === "insurance" && <InsuranceTab cars={cars as any[]} />}
          {activeTab === "registration" && <RegistrationTab cars={cars as any[]} />}
          {activeTab === "fuel" && <FuelTab cars={cars as any[]} />}
          {activeTab === "damage" && <DamageTab cars={cars as any[]} />}
          {activeTab === "gps" && <GPSTab cars={cars as any[]} />}
        </>
      )}
    </div>
  );
}
