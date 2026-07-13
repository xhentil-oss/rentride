import React, { useState, useMemo, useRef } from "react";
import {
  CurrencyDollar, Receipt, ArrowDown, Clock, DownloadSimple, Plus,
  MagnifyingGlass, CheckCircle, XCircle, Warning, CaretDown, FilePdf,
  FileXls, Eye, X, Buildings, User, Calendar, Car, Printer,
  ArrowUp, Coins, ChartBar, TrendUp, Tag,
} from "@phosphor-icons/react";
import { useQuery, useMutation, useLazyQuery } from "../../hooks/useApi";

type InvoiceStatus = "Paguar" | "Pa paguar" | "Vonuar" | "Anuluar";
type DepositStatus = "Mbajtur" | "Kthyer" | "Pjesërisht";
type Tab = "invoice" | "deposits" | "latefees" | "reports";

interface LocalInvoice {
  id: string;
  invoiceNo: string;
  reservationId: string;
  customerId: string;
  customerName: string;
  carName: string;
  issueDate: string;
  dueDate: string;
  days: number;
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  status: InvoiceStatus;
  notes: string;
}

interface LateFee {
  id: string;
  reservationId: string;
  customerName: string;
  carName: string;
  scheduledReturn: string;
  actualReturn: string;
  daysLate: number;
  dailyRate: number;
  feeAmount: number;
  paid: boolean;
}


function fmt(n: number) {
  return n.toLocaleString("sq-AL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function statusColor(s: InvoiceStatus) {
  if (s === "Paguar") return "bg-success/10 text-success border border-success/20";
  if (s === "Vonuar") return "bg-error/10 text-error border border-error/20";
  if (s === "Anuluar") return "bg-neutral-100 text-neutral-500 border border-neutral-200";
  return "bg-warning/10 text-warning border border-warning/20";
}

function depositColor(s: DepositStatus) {
  if (s === "Kthyer") return "bg-success/10 text-success border border-success/20";
  if (s === "Pjesërisht") return "bg-warning/10 text-warning border border-warning/20";
  return "bg-primary/10 text-primary border border-primary/20";
}

function StatCard({ icon, label, value, sub, color, trend }: { icon: React.ReactNode; label: string; value: string; sub?: string; color: string; trend?: { pct: number; positive: boolean } }) {
  return (
    <div className="bg-white rounded-xl border border-border p-5 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-neutral-500 font-medium uppercase tracking-wide truncate">{label}</p>
        <p className="text-2xl font-bold text-neutral-900 mt-0.5 truncate">{value}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {sub && <p className="text-xs text-neutral-400">{sub}</p>}
          {trend && (
            <span className={`text-xs font-medium flex items-center gap-0.5 ${trend.positive ? "text-success" : "text-error"}`}>
              {trend.positive ? <ArrowUp size={11} weight="bold" /> : <ArrowDown size={11} weight="bold" />}{trend.pct}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminFinance() {
  const { data: reservations } = useQuery("Reservation");
  const { data: sdkCustomers } = useQuery("Customer");
  const { data: sdkCars } = useQuery("Car");
  const { data: sdkDeposits, refetch: refetchDeposits } = useQuery("Deposit", { orderBy: { createdAt: "desc" } });
  const { update: updateDeposit } = useMutation("Deposit");

  const [activeTab, setActiveTab] = useState<Tab>("invoice");
  const [searchInv, setSearchInv] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("Të gjitha");
  const [selectedInvoice, setSelectedInvoice] = useState<LocalInvoice | null>(null);
  const [showNewInvoice, setShowNewInvoice] = useState(false);
  const [reportGroup, setReportGroup] = useState<"month" | "car" | "category">("month");
  const [paidFeeIds, setPaidFeeIds] = useState<Set<string>>(new Set());
  const [depositFilter, setDepositFilter] = useState<string>("Të gjitha");
  const printRef = useRef<HTMLDivElement>(null);

  // Build invoices from SDK reservations
  const invoices: LocalInvoice[] = useMemo(() => {
    return (reservations ?? []).map((r, i) => {
      // Biznes pa TVSH: totali = çmimi i rezervimit, asnjë taksë e shtuar.
      const subtotal = Number(r.totalPrice || 0);
      const vatAmount = 0;
      const total = subtotal;
      const statusMap: Record<string, InvoiceStatus> = { Completed: "Paguar", Active: "Paguar", Confirmed: "Pa paguar", Pending: "Pa paguar", Cancelled: "Anuluar" };
      const status: InvoiceStatus = statusMap[r.status] ?? "Pa paguar";
      const customer = (sdkCustomers ?? []).find(c => c.id === r.customerId);
      const car = (sdkCars ?? []).find(c => c.id === r.carId);
      return {
        id: `inv-${r.id}`,
        invoiceNo: `INV-2024-${String(i + 1).padStart(3, "0")}`,
        reservationId: r.id,
        customerId: r.customerId,
        customerName: customer?.name ?? r.customerId,
        carName: car ? `${car.brand} ${car.model}` : r.carId,
        issueDate: new Date(r.createdAt).toLocaleDateString("sq-AL"),
        dueDate: new Date(r.startDate).toLocaleDateString("sq-AL"),
        days: Math.max(1, Math.ceil((new Date(r.endDate).getTime() - new Date(r.startDate).getTime()) / (1000 * 60 * 60 * 24))),
        subtotal, vatRate: 0, vatAmount, total, status, notes: r.notes ?? "",
      };
    });
  }, [reservations, sdkCustomers, sdkCars]);

  const [localInvoices, setLocalInvoices] = useState<LocalInvoice[]>([]);
  const allInvoices = useMemo(() => [...invoices, ...localInvoices], [invoices, localInvoices]);

  // Compute late fees dynamically: reservations where endDate is in the past and status is Active or Confirmed
  const dynamicLateFees = useMemo<LateFee[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return (reservations ?? [])
      .filter(r => {
        if (r.status === "Cancelled" || r.status === "Completed") return false;
        const end = new Date(r.endDate);
        end.setHours(0, 0, 0, 0);
        return end < today;
      })
      .map(r => {
        const end = new Date(r.endDate);
        end.setHours(0, 0, 0, 0);
        const daysLate = Math.max(1, Math.ceil((today.getTime() - end.getTime()) / (1000 * 60 * 60 * 24)));
        const customer = (sdkCustomers ?? []).find(c => c.id === r.customerId);
        const car = (sdkCars ?? []).find(c => c.id === r.carId);
        const dailyRate = car?.pricePerDay ?? 0;
        return {
          id: `lf-${r.id}`,
          reservationId: r.id,
          customerName: customer?.name ?? customer?.firstName ?? (r.customerId ?? "").slice(0, 8),
          carName: car ? `${car.brand} ${car.model}` : (r.carId ?? "").slice(0, 8),
          scheduledReturn: new Date(r.endDate).toLocaleDateString("sq-AL"),
          actualReturn: today.toLocaleDateString("sq-AL"),
          daysLate,
          dailyRate,
          feeAmount: daysLate * dailyRate,
          paid: paidFeeIds.has(`lf-${r.id}`),
        };
      });
  }, [reservations, sdkCustomers, sdkCars, paidFeeIds]);

  const totalRevenue = useMemo(() => allInvoices.filter(i => i.status === "Paguar").reduce((a, b) => a + Number(b.total || 0), 0), [allInvoices]);
  const pendingAmount = useMemo(() => allInvoices.filter(i => i.status === "Pa paguar").reduce((a, b) => a + Number(b.total || 0), 0), [allInvoices]);
  const overdueAmount = useMemo(() => allInvoices.filter(i => i.status === "Vonuar").reduce((a, b) => a + Number(b.total || 0), 0), [allInvoices]);
  const heldDeposits = useMemo(() => (sdkDeposits ?? []).filter(d => d.status === "Mbajtur").reduce((a, b) => a + b.amount, 0), [sdkDeposits]);
  const lateFeeTotal = useMemo(() => dynamicLateFees.reduce((a, b) => a + b.feeAmount, 0), [dynamicLateFees]);
  const lateFeeUnpaid = useMemo(() => dynamicLateFees.filter(l => !l.paid).reduce((a, b) => a + b.feeAmount, 0), [dynamicLateFees]);

  const filteredInvoices = useMemo(() => {
    return allInvoices.filter(inv => {
      const matchSearch = inv.customerName.toLowerCase().includes(searchInv.toLowerCase()) || inv.invoiceNo.toLowerCase().includes(searchInv.toLowerCase()) || inv.carName.toLowerCase().includes(searchInv.toLowerCase());
      const matchStatus = filterStatus === "Të gjitha" || inv.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [searchInv, filterStatus, allInvoices]);

  const filteredDeposits = useMemo(() => {
    const deps = sdkDeposits ?? [];
    return depositFilter === "Të gjitha" ? deps : deps.filter(d => d.status === depositFilter);
  }, [depositFilter, sdkDeposits]);

  const exportCSV = () => {
    const rows = [
      ["Nr. Faturës","Klienti","Makina","Data lëshimit","Data maturimit","Ditë","Totali (€)","Statusi"],
      ...allInvoices.map(i => [i.invoiceNo, i.customerName, i.carName, i.issueDate, i.dueDate, String(i.days), fmt(i.total), i.status]),
    ];
    const csv = "\uFEFF" + rows.map(r => r.map(cell => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `financat_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "invoice", label: "Faturat", count: allInvoices.length },
    { id: "deposits", label: "Depozitat", count: (sdkDeposits ?? []).length },
    { id: "latefees", label: "Vonesa", count: dynamicLateFees.filter(l => !l.paid).length },
    { id: "reports", label: "Raportet" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Financat</h1>
          <p className="text-sm text-neutral-500 mt-0.5">Faturat, depozitat, vonesat dhe raportet</p>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-2 bg-success text-white text-sm px-4 py-2.5 rounded-xl hover:bg-success/90 transition-colors cursor-pointer font-medium shadow-sm">
          <FileXls size={16} weight="bold" />Eksporto Excel
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<CurrencyDollar size={20} weight="bold" className="text-success" />} label="Të ardhura totale" value={`€${fmt(totalRevenue)}`} color="bg-success/10" trend={{ pct: 12, positive: true }} />
        <StatCard icon={<Receipt size={20} weight="bold" className="text-warning" />} label="Pa paguar" value={`€${fmt(pendingAmount)}`} sub={`${allInvoices.filter(i => i.status === "Pa paguar").length} fatura`} color="bg-warning/10" />
          <StatCard icon={<Warning size={20} weight="bold" className="text-error" />} label="Vonuar / Gjoba" value={`€${fmt(overdueAmount + lateFeeUnpaid)}`} sub={`${allInvoices.filter(i => i.status === "Vonuar").length} fatura + ${dynamicLateFees.filter(l => !l.paid).length} vonesa`} color="bg-error/10" />
        <StatCard icon={<Coins size={20} weight="bold" className="text-primary" />} label="Depozita mbajtura" value={`€${fmt(heldDeposits)}`} sub={`${(sdkDeposits ?? []).filter(d => d.status === "Mbajtur").length} aktive`} color="bg-primary/10" />
      </div>

      <div className="flex gap-1 bg-neutral-100 p-1 rounded-xl w-fit flex-wrap">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} className={`text-sm font-medium px-4 py-2 rounded-lg transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${activeTab === t.id ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700"}`}>
            {t.label}
            {t.count !== undefined && t.count > 0 && <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${activeTab === t.id ? "bg-primary/10 text-primary" : "bg-neutral-200 text-neutral-500"}`}>{t.count}</span>}
          </button>
        ))}
      </div>

      {activeTab === "invoice" && (
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border">
            <div className="relative flex-1 min-w-48">
              <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input value={searchInv} onChange={(e) => setSearchInv(e.target.value)} placeholder="Kërko faturë, klient, makinë..." className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white" />
            </div>
            <div className="relative">
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="appearance-none text-sm border border-border rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white cursor-pointer">
                {["Të gjitha","Paguar","Pa paguar","Vonuar","Anuluar"].map(s => <option key={s}>{s}</option>)}
              </select>
              <CaretDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            </div>
            <span className="text-xs text-neutral-400">{filteredInvoices.length} fatura</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-neutral-50 text-neutral-500 text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3 font-medium">Nr. Faturës</th>
                  <th className="text-left px-4 py-3 font-medium">Klienti</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Makina</th>
                  <th className="text-right px-4 py-3 font-medium">Totali</th>
                  <th className="text-center px-4 py-3 font-medium">Statusi</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredInvoices.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-neutral-400 text-sm">Nuk u gjet asnjë faturë</td></tr>
                ) : filteredInvoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-4 py-3"><span className="font-mono text-xs text-primary font-medium">{inv.invoiceNo}</span></td>
                    <td className="px-4 py-3 font-medium text-neutral-800">{inv.customerName}</td>
                    <td className="px-4 py-3 text-neutral-600 hidden md:table-cell">{inv.carName}</td>
                    <td className="px-4 py-3 text-right font-semibold text-neutral-900">€{fmt(inv.total)}</td>
                    <td className="px-4 py-3 text-center"><span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor(inv.status)}`}>{inv.status}</span></td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setSelectedInvoice(inv)} className="p-1.5 rounded-lg text-neutral-400 hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"><Eye size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "deposits" && (
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold text-neutral-800">Menaxhimi i Depozitave</h3>
            <div className="relative">
              <select value={depositFilter} onChange={(e) => setDepositFilter(e.target.value)} className="appearance-none text-xs border border-border rounded-lg px-3 py-1.5 pr-7 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white cursor-pointer">
                {["Të gjitha","Mbajtur","Kthyer","Pjesërisht"].map(s => <option key={s}>{s}</option>)}
              </select>
              <CaretDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-neutral-50 text-neutral-500 text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3 font-medium">Klienti</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Rezervimi</th>
                  <th className="text-right px-4 py-3 font-medium">Shuma</th>
                  <th className="text-center px-4 py-3 font-medium">Statusi</th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Shënim</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredDeposits.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-10 text-neutral-400 text-sm">Nuk ka depozita</td></tr>
                ) : filteredDeposits.map(d => {
                  const customer = (sdkCustomers ?? []).find(c => c.id === d.customerId);
                  const customerName = customer?.name ?? customer?.firstName ?? (d.customerId ?? "").slice(0, 8);
                  return (
                    <tr key={d.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-neutral-800">{customerName}</td>
                      <td className="px-4 py-3 text-neutral-500 font-mono text-xs hidden md:table-cell">#{(d.reservationId ?? "").slice(0, 8)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-neutral-900">€{fmt(d.amount)}</td>
                      <td className="px-4 py-3 text-center"><span className={`text-xs font-medium px-2.5 py-1 rounded-full ${depositColor(d.status as DepositStatus)}`}>{d.status}</span></td>
                      <td className="px-4 py-3 text-neutral-400 text-xs hidden lg:table-cell">{d.note || "—"}</td>
                      <td className="px-4 py-3 text-right">
                        {d.status === "Mbajtur" && (
                          <button onClick={() => updateDeposit(d.id, { status: "Kthyer", returnDate: new Date() }).then(() => refetchDeposits())} className="text-xs text-success border border-success/30 bg-success/5 px-2 py-1 rounded-lg hover:bg-success/10 cursor-pointer font-medium transition-colors">Kthe</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "latefees" && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-error/20 bg-error/5 p-4">
              <p className="text-xs font-semibold text-error/70 uppercase tracking-wide">Total gjoba</p>
              <p className="text-xl font-bold text-error mt-1">€{fmt(lateFeeTotal)}</p>
            </div>
            <div className="rounded-xl border border-success/20 bg-success/5 p-4">
              <p className="text-xs font-semibold text-success/70 uppercase tracking-wide">Paguar</p>
              <p className="text-xl font-bold text-success mt-1">€{fmt(dynamicLateFees.filter(l => l.paid).reduce((a, b) => a + b.feeAmount, 0))}</p>
            </div>
            <div className="rounded-xl border border-warning/20 bg-warning/5 p-4">
              <p className="text-xs font-semibold text-warning/70 uppercase tracking-wide">Pa paguar</p>
              <p className="text-xl font-bold text-warning mt-1">€{fmt(lateFeeUnpaid)}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-neutral-50 text-neutral-500 text-xs uppercase tracking-wide">
                    <th className="text-left px-4 py-3 font-medium">Klienti</th>
                    <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Makina</th>
                    <th className="text-center px-4 py-3 font-medium">Ditë vonë</th>
                    <th className="text-right px-4 py-3 font-medium">Gjobë</th>
                    <th className="text-center px-4 py-3 font-medium">Paguar</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {dynamicLateFees.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-12 text-neutral-400 text-sm">Nuk ka vonesa aktive — të gjitha rezervimet janë brenda afatit</td></tr>
                  ) : dynamicLateFees.map(lf => (
                    <tr key={lf.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-neutral-800">{lf.customerName}</p>
                        <p className="text-xs text-neutral-400 mt-0.5">Kthim: {lf.scheduledReturn}</p>
                      </td>
                      <td className="px-4 py-3 text-neutral-600 hidden md:table-cell">{lf.carName}</td>
                      <td className="px-4 py-3 text-center"><span className="bg-error/10 text-error font-bold text-xs px-2 py-0.5 rounded-full border border-error/20">+{lf.daysLate}d</span></td>
                      <td className="px-4 py-3 text-right">
                        <p className="font-semibold text-error">€{fmt(lf.feeAmount)}</p>
                        <p className="text-xs text-neutral-400">€{fmt(lf.dailyRate)}/ditë</p>
                      </td>
                      <td className="px-4 py-3 text-center">{lf.paid ? <CheckCircle size={18} weight="fill" className="text-success mx-auto" /> : <XCircle size={18} weight="fill" className="text-error mx-auto" />}</td>
                      <td className="px-4 py-3 text-right">{!lf.paid && <button onClick={() => setPaidFeeIds(prev => new Set([...prev, lf.id]))} className="text-xs text-success border border-success/30 bg-success/5 px-2 py-1 rounded-lg hover:bg-success/10 cursor-pointer font-medium transition-colors">Shëno paguar</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "reports" && (
        <div className="bg-white rounded-xl border border-border p-6">
          <h3 className="font-semibold text-neutral-800 mb-4">Pasqyra financiare</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Të ardhura totale", value: `€${fmt(totalRevenue)}` },
              { label: "Gjoba vonesa (aktive)", value: `€${fmt(lateFeeTotal)}` },
            ].map(k => (
              <div key={k.label} className="bg-neutral-50 rounded-xl border border-border p-4">
                <p className="text-xs text-neutral-400">{k.label}</p>
                <p className="font-bold text-neutral-900 text-lg mt-1">{k.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}


      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 backdrop-blur-sm p-4 print:bg-white print:p-0 print:relative print:inset-auto" onClick={() => setSelectedInvoice(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden invoice-printable print:shadow-none print:max-w-full print:rounded-none print:overflow-visible" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-primary p-6 text-white flex items-start justify-between print:bg-white print:text-neutral-900 print:border-b-2 print:border-neutral-900">
              <div>
                <p className="text-xs opacity-70 uppercase tracking-widest mb-1 print:opacity-100">Faturë Zyrtare</p>
                <p className="text-2xl font-bold">{selectedInvoice.invoiceNo}</p>
              </div>
              <div className="flex items-center gap-2 print:hidden">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-medium transition-colors cursor-pointer"
                >
                  <Printer size={14} weight="bold" />Printo
                </button>
                <button onClick={() => setSelectedInvoice(null)} className="p-2 rounded-lg hover:bg-white/20 transition-colors cursor-pointer"><X size={18} weight="bold" /></button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-neutral-400 text-xs mb-1">Klienti</p>
                  <p className="font-semibold text-neutral-800">{selectedInvoice.customerName}</p>
                </div>
                <div>
                  <p className="text-neutral-400 text-xs mb-1">Makina</p>
                  <p className="font-semibold text-neutral-800">{selectedInvoice.carName}</p>
                </div>
                <div>
                  <p className="text-neutral-400 text-xs mb-1">Data e lëshimit</p>
                  <p className="font-semibold text-neutral-800">{selectedInvoice.issueDate}</p>
                </div>
                <div>
                  <p className="text-neutral-400 text-xs mb-1">Afati</p>
                  <p className="font-semibold text-neutral-800">{selectedInvoice.dueDate}</p>
                </div>
              </div>
              <div className="border-t border-dashed border-border pt-4 space-y-2 text-sm">
                <div className="flex justify-between text-neutral-600"><span>Ditë qiraje</span><span>{selectedInvoice.days}</span></div>
                <div className="flex justify-between font-bold text-neutral-900 text-base border-t border-border pt-2 mt-2"><span>TOTALI</span><span>€{fmt(selectedInvoice.total)}</span></div>
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColor(selectedInvoice.status)}`}>{selectedInvoice.status}</span>
                <span className="text-xs text-neutral-400 hidden print:block">Rent Ride · rentride.al · +355 69 81 45 803</span>
              </div>
            </div>
          </div>
          {/* Print-only CSS: hide everything except the invoice modal */}
          <style>{`
            @media print {
              body * { visibility: hidden; }
              .invoice-printable, .invoice-printable * { visibility: visible; }
              .invoice-printable { position: absolute; left: 0; top: 0; width: 100%; }
              @page { size: A4; margin: 1.5cm; }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
