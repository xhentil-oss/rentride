import React, { useState, useMemo } from "react";
import {
  Plus, X, Check, Pencil, Trash, ToggleLeft, ToggleRight,
  Tag, Lightning, Bird, Timer, CalendarBlank, Sun, MagnifyingGlass,
  Warning, Info, ArrowUp, ArrowDown,
} from "@phosphor-icons/react";
import { useQuery, useMutation } from "../../hooks/useApi";
import { RULE_TYPE_LABELS, ruleConditionSummary } from "../../lib/pricingRules";
import { EmptyState } from "../../components/ui/EmptyState";
import { useBulkSelection } from "../../hooks/useBulkSelection";
import BulkActionBar, { BulkCheckbox } from "../components/BulkActionBar";
import { useActivityLog } from "../../hooks/useActivityLog";

interface RuleForm {
  name: string;
  type: string;
  direction: "discount" | "surcharge";
  discountType: "percent" | "fixed";
  discountValue: number;
  startDate: string;
  endDate: string;
  minDays: string;
  maxDays: string;
  advanceBookingDays: string;
  lastMinuteHours: string;
  promoCode: string;
  applicableTo: string;
  priority: number;
  description: string;
  maxUsages: string;
  isActive: boolean;
}

const emptyForm: RuleForm = {
  name: "", type: "seasonal", direction: "discount", discountType: "percent", discountValue: 10,
  startDate: "", endDate: "", minDays: "", maxDays: "",
  advanceBookingDays: "", lastMinuteHours: "", promoCode: "",
  applicableTo: "all", priority: 50, description: "", maxUsages: "", isActive: true,
};

const RULE_TYPE_ICONS: Record<string, React.ReactNode> = {
  seasonal:       <CalendarBlank size={16} weight="bold" />,
  early_bird:     <Bird size={16} weight="bold" />,
  last_minute:    <Lightning size={16} weight="bold" />,
  promo_code:     <Tag size={16} weight="bold" />,
  length_of_stay: <Timer size={16} weight="bold" />,
  weekend:        <Sun size={16} weight="bold" />,
  min_duration:   <Warning size={16} weight="bold" />,
};

const CAR_CATEGORIES = ["Ekonomike", "SUV", "Luksoze", "Familjare", "Sportive", "Minivan"];

export default function AdminPricingRules() {
  const { data: rules, isPending, refetch } = useQuery("PricingRuleAdmin", { orderBy: { priority: "desc" } });
  const { data: cars } = useQuery("Car");
  const { create, update, remove, isPending: isMutating } = useMutation("PricingRule");
  const log = useActivityLog();

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<RuleForm>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof RuleForm, string>>>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [bulkConfirm, setBulkConfirm] = useState<null | "delete" | "activate" | "deactivate">(null);

  const today = new Date();
  const allRules = rules ?? [];

  const filtered = useMemo(() => {
    return allRules.filter((r) => {
      if (filterType && r.type !== filterType) return false;
      if (search) {
        const q = search.toLowerCase();
        return r.name.toLowerCase().includes(q) || (r.description ?? "").toLowerCase().includes(q) || (r.promoCode ?? "").toLowerCase().includes(q);
      }
      return true;
    });
  }, [allRules, filterType, search]);

  const stats = useMemo(() => {
    const active = allRules.filter((r) => r.isActive && r.endDate && new Date(r.endDate) >= today && r.startDate && new Date(r.startDate) <= today);
    const expiring = allRules.filter((r) => {
      if (!r.endDate) return false;
      const end = new Date(r.endDate);
      const diff = (end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
      return r.isActive && diff >= 0 && diff <= 7;
    });
    const expired = allRules.filter((r) => r.endDate && new Date(r.endDate) < today);
    return { total: allRules.length, active: active.length, expiring: expiring.length, expired: expired.length };
  }, [allRules, today]);

  function getRuleStatus(rule: typeof allRules[0]) {
    const now = today;
    if (!rule.isActive) return { label: "Çaktivizuar", color: "bg-neutral-100 text-neutral-500 border-neutral-200" };
    if (!rule.endDate) return { label: "Aktive", color: "bg-green-100 text-green-700 border-green-200" };
    const start = new Date(rule.startDate);
    const end = new Date(rule.endDate);
    if (end < now) return { label: "Skaduar", color: "bg-red-100 text-red-600 border-red-200" };
    if (start > now) return { label: "E ardhshme", color: "bg-blue-100 text-blue-600 border-blue-200" };
    const daysLeft = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 7) return { label: `Skadon në ${daysLeft}d`, color: "bg-amber-100 text-amber-700 border-amber-200" };
    return { label: "Aktive", color: "bg-green-100 text-green-700 border-green-200" };
  }

  function openNew() {
    setEditId(null);
    setForm(emptyForm);
    setErrors({});
    setShowForm(true);
  }

  function openEdit(rule: typeof allRules[0]) {
    setEditId(rule.id);
    setForm({
      name: rule.name,
      type: rule.type,
      direction: (rule.direction ?? "discount") as "discount" | "surcharge",
      discountType: rule.discountType as "percent" | "fixed",
      discountValue: rule.discountValue,
      startDate: rule.startDate ? new Date(rule.startDate).toISOString().split("T")[0] : "",
      endDate: rule.endDate ? new Date(rule.endDate).toISOString().split("T")[0] : "",
      minDays: rule.minDays?.toString() ?? "",
      maxDays: rule.maxDays?.toString() ?? "",
      advanceBookingDays: rule.advanceBookingDays?.toString() ?? "",
      lastMinuteHours: rule.lastMinuteHours?.toString() ?? "",
      promoCode: rule.promoCode ?? "",
      applicableTo: rule.applicableTo,
      priority: rule.priority,
      description: rule.description ?? "",
      maxUsages: rule.maxUsages?.toString() ?? "",
      isActive: rule.isActive,
    });
    setErrors({});
    setShowForm(true);
  }

  function validate(): boolean {
    const e: Partial<Record<keyof RuleForm, string>> = {};
    if (!form.name.trim()) e.name = "Emri është i detyrueshëm";
    if (form.type !== "min_duration") {
      if (!form.startDate) e.startDate = "Data e fillimit është e detyrueshme";
      if (!form.endDate) e.endDate = "Data e mbarimit është e detyrueshme";
      if (form.startDate && form.endDate && new Date(form.startDate) >= new Date(form.endDate)) {
        e.endDate = "Data e mbarimit duhet të jetë pas fillimit";
      }
      if (form.discountValue <= 0) e.discountValue = "Vlera duhet të jetë > 0";
      if (form.discountType === "percent" && form.discountValue > 100) e.discountValue = "Përqindja nuk mund të jetë > 100";
    }
    if (form.type === "early_bird" && !form.advanceBookingDays) e.advanceBookingDays = "Vendosni ditët";
    if (form.type === "last_minute" && !form.lastMinuteHours) e.lastMinuteHours = "Vendosni orët";
    if (form.type === "promo_code" && !form.promoCode.trim()) e.promoCode = "Vendosni kodin";
    if (form.type === "min_duration" && (!form.minDays || Number(form.minDays) < 1)) e.minDays = "Vendosni numrin minimal të ditëve";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    const payload = {
      name: form.name.trim(),
      type: form.type,
      direction: form.direction,
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      minDays: form.minDays ? Number(form.minDays) : undefined,
      maxDays: form.maxDays ? Number(form.maxDays) : undefined,
      advanceBookingDays: form.advanceBookingDays ? Number(form.advanceBookingDays) : undefined,
      lastMinuteHours: form.lastMinuteHours ? Number(form.lastMinuteHours) : undefined,
      promoCode: form.promoCode.trim() || undefined,
      applicableTo: form.applicableTo,
      priority: Number(form.priority),
      description: form.description.trim() || undefined,
      maxUsages: form.maxUsages ? Number(form.maxUsages) : undefined,
      isActive: form.isActive,
      usageCount: 0,
    };
    try {
      if (editId) {
        await update(editId, payload);
        await log("UPDATE", "PricingRule", editId, `Rregull i çmimit u ndryshua: ${form.name}`);
      } else {
        const created = await create(payload);
        await log("CREATE", "PricingRule", created.id, `Rregull i ri çmimi: ${form.name} (${form.type}, ${form.direction === "surcharge" ? "+" : "-"}${form.discountValue}${form.discountType === "percent" ? "%" : "€"})`);
      }
      await refetch();
      setShowForm(false);
      setEditId(null);
      setForm(emptyForm);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleToggle(rule: typeof allRules[0]) {
    try {
      await update(rule.id, { isActive: !rule.isActive });
      await log("UPDATE", "PricingRule", rule.id, `${rule.isActive ? "Çaktivizuar" : "Aktivizuar"}: ${rule.name}`);
      await refetch();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDelete(id: string) {
    try {
      const rule = allRules.find((r) => r.id === id);
      await remove(id);
      await log("DELETE", "PricingRule", id, `Rregull i çmimit u fshi: ${rule?.name ?? id}`);
      await refetch();
      setDeleteConfirmId(null);
    } catch (err) {
      console.error(err);
    }
  }

  const typeOptions = Object.entries(RULE_TYPE_LABELS).map(([value, meta]) => ({
    value,
    label: `${meta.emoji} ${meta.label}`,
  }));

  const bulk = useBulkSelection(filtered);

  const handleBulkDelete = async () => {
    const items = bulk.getSelectedItems();
    try {
      await Promise.all(items.map((r) => remove(r.id)));
      await Promise.all(items.map((r) => log("DELETE", "PricingRule", r.id, `Rregull i çmimit u fshi: ${r.name}`)));
      bulk.clear();
      setBulkConfirm(null);
      await refetch();
    } catch (err) { console.error(err); }
  };

  const handleBulkActive = async (active: boolean) => {
    const items = bulk.getSelectedItems();
    try {
      await Promise.all(items.map((r) => update(r.id, { isActive: active })));
      await Promise.all(items.map((r) => log("UPDATE", "PricingRule", r.id, `${active ? "Aktivizuar" : "Çaktivizuar"}: ${r.name}`)));
      bulk.clear();
      setBulkConfirm(null);
      await refetch();
    } catch (err) { console.error(err); }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium text-neutral-900">Ofertat & Çmimet</h1>
          <p className="text-neutral-500 text-sm mt-1">Krijo dhe menaxho rregullat e çmimeve si Booking.com</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer whitespace-nowrap"
        >
          <Plus size={18} weight="bold" /> Rregull i ri
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Gjithsej rregulla", value: stats.total, color: "text-neutral-800", bg: "bg-white" },
          { label: "Aktive tani", value: stats.active, color: "text-green-700", bg: "bg-green-50" },
          { label: "Skadon së shpejti", value: stats.expiring, color: "text-amber-700", bg: "bg-amber-50", icon: stats.expiring > 0 ? <Warning size={16} weight="bold" /> : null },
          { label: "Skaduar", value: stats.expired, color: "text-red-600", bg: "bg-red-50" },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-lg border border-border p-4`}>
            <div className={`text-2xl font-semibold ${s.color} flex items-center gap-2`}>
              {s.value}
              {s.icon}
            </div>
            <p className="text-xs text-neutral-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
          <input
            type="text"
            placeholder="Kërko rregull..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary w-56"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterType("")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${filterType === "" ? "bg-primary text-primary-foreground border-primary" : "bg-white text-neutral-700 border-border hover:border-primary hover:text-primary"}`}
          >
            Të gjitha
          </button>
          {typeOptions.map((t) => (
            <button
              key={t.value}
              onClick={() => setFilterType(t.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${filterType === t.value ? "bg-primary text-primary-foreground border-primary" : "bg-white text-neutral-700 border-border hover:border-primary hover:text-primary"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <BulkActionBar
        selectedCount={bulk.selectedCount}
        onClear={bulk.clear}
        itemLabel="rregull"
        actions={[
          { label: "Aktivizo", icon: ToggleRight, variant: "success", onClick: () => setBulkConfirm("activate"), disabled: isMutating },
          { label: "Çaktivizo", icon: ToggleLeft, variant: "warning", onClick: () => setBulkConfirm("deactivate"), disabled: isMutating },
          { label: "Fshi", icon: Trash, variant: "danger", onClick: () => setBulkConfirm("delete"), disabled: isMutating },
        ]}
      />

      {filtered.length > 0 && (
        <label className="flex items-center gap-2 text-xs text-neutral-500 cursor-pointer">
          <BulkCheckbox
            checked={bulk.isAllSelected}
            indeterminate={bulk.isSomeSelected}
            onChange={bulk.toggleAll}
            ariaLabel="Zgjidh të gjitha rregullat"
          />
          Zgjidh të gjitha ({filtered.length})
        </label>
      )}

      {/* Rules List */}
      <div className="space-y-3">
        {isPending ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-border p-5 animate-pulse">
              <div className="h-4 bg-neutral-200 rounded w-1/3 mb-3" />
              <div className="h-3 bg-neutral-100 rounded w-2/3" />
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-lg border border-border">
            <EmptyState
              type="search"
              title={search || filterType ? "Asnjë rregull nuk u gjet" : "Nuk ka rregulla ende"}
              description={search || filterType ? "Provoni kritere të tjera kërkimi" : "Krijoni rregullin e parë të çmimeve duke klikuar butonin '+ Rregull i ri'"}
              actionLabel={!search && !filterType ? "Shto rregullin e parë" : undefined}
              onAction={!search && !filterType ? openNew : undefined}
            />
          </div>
        ) : (
          filtered.map((rule) => {
            const meta = RULE_TYPE_LABELS[rule.type] ?? { label: rule.type, emoji: "🏷️", color: "bg-neutral-100 text-neutral-600 border-neutral-200" };
            const status = getRuleStatus(rule);
            const isExpired = rule.endDate ? new Date(rule.endDate) < today : false;

            return (
              <div
                key={rule.id}
                className={`bg-white rounded-xl border transition-all duration-200 ${bulk.isSelected(rule.id) ? "border-primary/50 bg-primary/5" : rule.isActive && !isExpired ? "border-border hover:border-primary/30 hover:shadow-sm" : "border-border opacity-70"}`}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="pt-1">
                        <BulkCheckbox
                          checked={bulk.isSelected(rule.id)}
                          onChange={() => bulk.toggleOne(rule.id)}
                          ariaLabel={`Zgjidh ${rule.name}`}
                        />
                      </div>
                      {/* Type Icon */}
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 border ${meta.color}`}>
                        {RULE_TYPE_ICONS[rule.type] ?? <Tag size={16} weight="bold" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="text-sm font-semibold text-neutral-900">{rule.name}</h3>
                          <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${meta.color}`}>
                            {meta.emoji} {meta.label}
                          </span>
                          <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${status.color}`}>
                            {status.label}
                          </span>
                        </div>

                        <p className="text-xs text-neutral-500 mb-2">{ruleConditionSummary(rule)}</p>

                        {rule.description && (
                          <p className="text-xs text-neutral-400 italic mb-2">{rule.description}</p>
                        )}

                        <div className="flex flex-wrap items-center gap-3">
                          {/* Discount / min-duration badge */}
                          {rule.type === "min_duration" ? (
                            <div className="flex items-center gap-1 rounded-lg px-3 py-1.5 border bg-red-50 border-red-200 text-red-700">
                              <span className="text-base font-bold">⏱️ Min. {rule.minDays} ditë</span>
                            </div>
                          ) : (
                            <div className={`flex items-center gap-1 rounded-lg px-3 py-1.5 border ${rule.direction === "surcharge" ? "bg-red-50 border-red-200 text-red-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"}`}>
                              <span className="text-base font-bold">
                                {rule.direction === "surcharge"
                                  ? (rule.discountType === "percent" ? `+${rule.discountValue}%` : `+€${rule.discountValue}`)
                                  : (rule.discountType === "percent" ? `-${rule.discountValue}%` : `-€${rule.discountValue}`)}
                              </span>
                            </div>
                          )}

                          {/* Applicability */}
                          <div className="text-xs text-neutral-500 flex items-center gap-1">
                            <span>
                              {rule.applicableTo === "all"
                                ? "🚗 Të gjitha makinat"
                                : rule.applicableTo.startsWith("category:")
                                ? `📂 ${rule.applicableTo.replace("category:", "")}`
                                : `🔑 Makinë specifike`}
                            </span>
                          </div>

                          {/* Priority */}
                          <div className="flex items-center gap-1 text-xs text-neutral-400">
                            <ArrowUp size={12} className="text-neutral-400" />
                            <span>P{rule.priority}</span>
                          </div>

                          {/* Promo code */}
                          {rule.promoCode && (
                            <div className="text-xs font-mono bg-purple-50 border border-purple-200 text-purple-700 px-2 py-0.5 rounded">
                              {rule.promoCode}
                            </div>
                          )}

                          {/* Usage */}
                          {rule.maxUsages && rule.maxUsages > 0 && (
                            <div className="text-xs text-neutral-400">
                              {rule.usageCount ?? 0}/{rule.maxUsages} përdorime
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleToggle(rule)}
                        disabled={isMutating}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${rule.isActive ? "text-green-600 hover:bg-green-50" : "text-neutral-400 hover:bg-neutral-100"}`}
                        title={rule.isActive ? "Çaktivizo" : "Aktivizo"}
                      >
                        {rule.isActive
                          ? <ToggleRight size={24} weight="fill" />
                          : <ToggleLeft size={24} weight="regular" />}
                      </button>
                      <button
                        onClick={() => openEdit(rule)}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-primary hover:bg-secondary transition-colors cursor-pointer"
                        title="Ndrysho"
                      >
                        <Pencil size={16} weight="regular" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(rule.id)}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-error hover:bg-error/10 transition-colors cursor-pointer"
                        title="Fshi"
                      >
                        <Trash size={16} weight="regular" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {bulkConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-neutral-900/55" onClick={() => setBulkConfirm(null)} />
          <div className="relative bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-medium text-neutral-900 mb-2">
              {bulkConfirm === "delete" ? "Fshi rregullat" : bulkConfirm === "activate" ? "Aktivizo rregullat" : "Çaktivizo rregullat"}
            </h3>
            <p className="text-sm text-neutral-500 mb-6">
              {bulkConfirm === "delete" ? `${bulk.selectedCount} rregulla do të fshihen.` : `Statusi i ${bulk.selectedCount} rregullave do të ndryshojë.`}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setBulkConfirm(null)} className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-border text-neutral-700 hover:bg-secondary cursor-pointer">Anulo</button>
              <button
                onClick={() => {
                  if (bulkConfirm === "delete") handleBulkDelete();
                  else handleBulkActive(bulkConfirm === "activate");
                }}
                disabled={isMutating}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 cursor-pointer disabled:opacity-50 ${bulkConfirm === "delete" ? "bg-error text-white" : "bg-primary text-primary-foreground"}`}
              >
                {bulkConfirm === "delete" ? "Po, fshi" : "Po, vazhdo"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog">
          <div className="absolute inset-0 bg-neutral-900/55" onClick={() => setDeleteConfirmId(null)} />
          <div className="relative bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Warning size={20} weight="bold" className="text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900">Fshi rregullin?</h3>
                <p className="text-sm text-neutral-500">Ky veprim nuk mund të kthehet mbrapsht.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirmId(null)} className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-border text-neutral-700 hover:bg-secondary cursor-pointer">Anulo</button>
              <button onClick={() => handleDelete(deleteConfirmId)} disabled={isMutating} className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-error text-white hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50">Fshi</button>
            </div>
          </div>
        </div>
      )}

      {/* Form Drawer */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-neutral-900/55" onClick={() => setShowForm(false)} />
          <div className="relative bg-white w-full max-w-lg h-full overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-border px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="text-lg font-medium text-neutral-900">
                  {editId ? "Ndrysho rregullin" : "Rregull i ri çmimi"}
                </h2>
                <p className="text-sm text-neutral-500">
                  {editId ? "Modifiko parametrat e ofertës" : "Konfiguro ofertën e re si Booking.com"}
                </p>
              </div>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-md text-neutral-500 hover:bg-secondary cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Emri i ofertës *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder='p.sh. "Ofertë Verore 2025" ose "Early Bird -15%"'
                  className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${errors.name ? "border-error" : "border-border"}`}
                />
                {errors.name && <p className="text-xs text-error mt-1">{errors.name}</p>}
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Lloji i rregullit *</label>
                <div className="grid grid-cols-2 gap-2">
                  {typeOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, type: opt.value }))}
                      className={`px-3 py-2.5 rounded-lg text-sm font-medium border transition-colors cursor-pointer text-left ${form.type === opt.value ? "bg-primary text-primary-foreground border-primary" : "bg-white text-neutral-700 border-border hover:border-primary"}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Context info per type */}
                <div className="mt-2 p-3 bg-secondary/50 rounded-lg border border-border">
                  <div className="flex items-start gap-2 text-xs text-neutral-600">
                    <Info size={14} className="flex-shrink-0 mt-0.5 text-primary" />
                    <span>
                      {form.type === "seasonal" && "Zbatohet automatikisht kur rezervimi bie brenda periudhës sezonale."}
                      {form.type === "early_bird" && "Zbatohet kur klienti rezervon X ditë përpara marrjes."}
                      {form.type === "last_minute" && "Zbatohet kur rezervimi bëhet brenda X orëve para marrjes."}
                      {form.type === "promo_code" && "Klienti fut kodin promocional gjatë rezervimit."}
                      {form.type === "length_of_stay" && "Zbatohet kur numri i ditëve është brenda intervalit."}
                      {form.type === "weekend" && "Zbatohet kur marrja e makinës fillon të premten ose të shtunën."}
                      {form.type === "min_duration" && "Bllokon rezervimin nëse klienti zgjedh më pak ditë se minimumi i vendosur. Datat janë opsionale."}
                    </span>
                  </div>
                </div>
              </div>

              {/* Direction & Discount — hidden for min_duration */}
              {form.type !== "min_duration" && (<>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Lloji i efektit *</label>
                <div className="flex border border-border rounded-lg overflow-hidden">
                  <button type="button" onClick={() => setForm(f => ({ ...f, direction: "discount" }))} className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer ${form.direction === "discount" ? "bg-emerald-600 text-white" : "bg-white text-neutral-700 hover:bg-secondary"}`}>
                    ↓ Ulje çmimi
                  </button>
                  <button type="button" onClick={() => setForm(f => ({ ...f, direction: "surcharge" }))} className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer ${form.direction === "surcharge" ? "bg-red-500 text-white" : "bg-white text-neutral-700 hover:bg-secondary"}`}>
                    ↑ Rritje çmimi
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">{form.direction === "surcharge" ? "Rritja *" : "Zbritja *"}</label>
                <div className="flex gap-2">
                  <div className="flex border border-border rounded-lg overflow-hidden">
                    {(["percent", "fixed"] as const).map((dt) => (
                      <button
                        key={dt}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, discountType: dt }))}
                        className={`px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer ${form.discountType === dt ? "bg-primary text-primary-foreground" : "bg-white text-neutral-700 hover:bg-secondary"}`}
                      >
                        {dt === "percent" ? "% Përqindje" : "€ Fikse"}
                      </button>
                    ))}
                  </div>
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm font-medium">
                      {form.discountType === "percent" ? "%" : "€"}
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={form.discountType === "percent" ? 100 : undefined}
                      value={form.discountValue}
                      onChange={(e) => setForm((f) => ({ ...f, discountValue: Number(e.target.value) }))}
                      className={`w-full pl-8 pr-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${errors.discountValue ? "border-error" : "border-border"}`}
                    />
                  </div>
                </div>
                {errors.discountValue && <p className="text-xs text-error mt-1">{errors.discountValue}</p>}
              </div>
              </>)}

              {/* Dates — optional for min_duration */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                    Data e fillimit {form.type === "min_duration" ? <span className="text-neutral-400 font-normal">(opsionale)</span> : "*"}
                  </label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => { const newStart = e.target.value; setForm((f) => ({ ...f, startDate: newStart, endDate: f.endDate && f.endDate < newStart ? "" : f.endDate })); }}
                    className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${errors.startDate ? "border-error" : "border-border"}`}
                  />
                  {errors.startDate && <p className="text-xs text-error mt-1">{errors.startDate}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                    Data e skadimit {form.type === "min_duration" ? <span className="text-neutral-400 font-normal">(opsionale)</span> : "*"}
                  </label>
                  <input
                    type="date"
                    value={form.endDate}
                    min={form.startDate}
                    onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                    className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${errors.endDate ? "border-error" : "border-border"}`}
                  />
                  {errors.endDate && <p className="text-xs text-error mt-1">{errors.endDate}</p>}
                </div>
              </div>

              {/* min_duration specific field */}
              {form.type === "min_duration" && (
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                    Minimum ditë rezervimi *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      value={form.minDays}
                      onChange={(e) => setForm((f) => ({ ...f, minDays: e.target.value }))}
                      placeholder="p.sh. 3"
                      className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${errors.minDays ? "border-error" : "border-border"}`}
                    />
                    {form.minDays && Number(form.minDays) > 0 && (
                      <p className="text-xs text-neutral-500 mt-1.5">
                        Klientët duhet të rezervojnë të paktën <strong>{form.minDays} ditë</strong> për të vazhduar me checkout.
                      </p>
                    )}
                  </div>
                  {errors.minDays && <p className="text-xs text-error mt-1">{errors.minDays}</p>}
                </div>
              )}

              {/* Type-specific fields */}
              {form.type === "early_bird" && (
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                    Rezervo të paktën <span className="text-primary font-semibold">{form.advanceBookingDays || "?"}</span> ditë para marrjes *
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={form.advanceBookingDays}
                    onChange={(e) => setForm((f) => ({ ...f, advanceBookingDays: e.target.value }))}
                    placeholder="p.sh. 14"
                    className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${errors.advanceBookingDays ? "border-error" : "border-border"}`}
                  />
                  {errors.advanceBookingDays && <p className="text-xs text-error mt-1">{errors.advanceBookingDays}</p>}
                </div>
              )}

              {form.type === "last_minute" && (
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                    Brenda <span className="text-primary font-semibold">{form.lastMinuteHours || "?"}</span> orëve para marrjes *
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={form.lastMinuteHours}
                    onChange={(e) => setForm((f) => ({ ...f, lastMinuteHours: e.target.value }))}
                    placeholder="p.sh. 48"
                    className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${errors.lastMinuteHours ? "border-error" : "border-border"}`}
                  />
                  {errors.lastMinuteHours && <p className="text-xs text-error mt-1">{errors.lastMinuteHours}</p>}
                </div>
              )}

              {form.type === "promo_code" && (
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">Kodi promocional *</label>
                  <input
                    type="text"
                    value={form.promoCode}
                    onChange={(e) => setForm((f) => ({ ...f, promoCode: e.target.value.toUpperCase() }))}
                    placeholder="p.sh. VEROR25"
                    className={`w-full px-3 py-2.5 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${errors.promoCode ? "border-error" : "border-border"}`}
                  />
                  {errors.promoCode && <p className="text-xs text-error mt-1">{errors.promoCode}</p>}
                </div>
              )}

              {form.type === "length_of_stay" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">Minimum ditë</label>
                    <input
                      type="number"
                      min={1}
                      value={form.minDays}
                      onChange={(e) => setForm((f) => ({ ...f, minDays: e.target.value }))}
                      placeholder="p.sh. 7"
                      className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">Maksimum ditë</label>
                    <input
                      type="number"
                      min={1}
                      value={form.maxDays}
                      onChange={(e) => setForm((f) => ({ ...f, maxDays: e.target.value }))}
                      placeholder="p.sh. 30"
                      className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                </div>
              )}

              {/* Applicable To */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Zbatohet për</label>
                <select
                  value={form.applicableTo}
                  onChange={(e) => setForm((f) => ({ ...f, applicableTo: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="all">🚗 Të gjitha makinat</option>
                  {CAR_CATEGORIES.map((cat) => (
                    <option key={cat} value={`category:${cat}`}>📂 Kategoria: {cat}</option>
                  ))}
                  {(cars ?? []).map((car) => (
                    <option key={car.id} value={car.id}>🔑 {car.brand} {car.model} ({car.year})</option>
                  ))}
                </select>
              </div>

              {/* Priority & Max Usages */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                    Prioriteti (0–100)
                    <span className="ml-1 text-xs text-neutral-400">i lartë = zbatohet i pari</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={form.priority}
                    onChange={(e) => setForm((f) => ({ ...f, priority: Number(e.target.value) }))}
                    className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                    Maks. përdorime
                    <span className="ml-1 text-xs text-neutral-400">0 = pa limit</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.maxUsages}
                    onChange={(e) => setForm((f) => ({ ...f, maxUsages: e.target.value }))}
                    placeholder="0"
                    className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Shënime të brendshme</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Shënime për stafin (nuk shfaqen te klienti)"
                  rows={2}
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                />
              </div>

              {/* Active toggle */}
              <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg border border-border">
                <div>
                  <p className="text-sm font-medium text-neutral-800">Aktivizo rregullin</p>
                  <p className="text-xs text-neutral-500">Nëse çaktivizuar, rregulli nuk do të zbatohet</p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
                  className="cursor-pointer"
                >
                  {form.isActive
                    ? <ToggleRight size={36} weight="fill" className="text-green-500" />
                    : <ToggleLeft size={36} weight="regular" className="text-neutral-400" />}
                </button>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-border px-6 py-4 flex gap-3">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-border text-neutral-700 hover:bg-secondary cursor-pointer">
                Anulo
              </button>
              <button onClick={handleSave} disabled={isMutating} className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2">
                <Check size={16} weight="bold" />
                {editId ? "Ruaj ndryshimet" : "Krijo rregullin"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
