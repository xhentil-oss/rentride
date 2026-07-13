import React, { useState, useMemo } from "react";
import {
  Plus, X, Check, Pencil, Trash, ToggleLeft, ToggleRight,
  Shield, MapPin, Crown, Warning, MagnifyingGlass, ArrowUp, ArrowDown,
} from "@phosphor-icons/react";
import { useQuery, useMutation } from "../../hooks/useApi";
import { EmptyState } from "../../components/ui/EmptyState";
import { useBulkSelection } from "../../hooks/useBulkSelection";
import BulkActionBar, { BulkCheckbox } from "../components/BulkActionBar";
import { useActivityLog } from "../../hooks/useActivityLog";

type Category = "insurance" | "equipment" | "service" | "addon";
type PriceType = "per_day" | "per_rental" | "one_time";

interface ExtraRecord {
  id: string;
  code: string;
  nameSq: string;
  nameEn: string;
  descriptionSq?: string | null;
  descriptionEn?: string | null;
  category: Category;
  price: number;
  priceType: PriceType;
  icon?: string | null;
  maxQuantity: number;
  isActive: boolean;
  sortOrder: number;
}

interface ExtraForm {
  code: string;
  nameSq: string;
  nameEn: string;
  descriptionSq: string;
  descriptionEn: string;
  category: Category;
  price: number;
  priceType: PriceType;
  icon: string;
  maxQuantity: number;
  isActive: boolean;
  sortOrder: number;
}

const emptyForm: ExtraForm = {
  code: "", nameSq: "", nameEn: "", descriptionSq: "", descriptionEn: "",
  category: "equipment", price: 0, priceType: "per_day", icon: "",
  maxQuantity: 1, isActive: true, sortOrder: 0,
};

const CATEGORIES: { value: Category; label: string; emoji: string; color: string; icon: React.ReactNode }[] = [
  { value: "insurance", label: "Sigurim",    emoji: "🛡️", color: "bg-blue-100 text-blue-700 border-blue-200",       icon: <Shield size={16} weight="bold" /> },
  { value: "equipment", label: "Pajisje",    emoji: "🎒", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: <Crown size={16} weight="bold" /> },
  { value: "service",   label: "Shërbime",   emoji: "🌍", color: "bg-purple-100 text-purple-700 border-purple-200",   icon: <MapPin size={16} weight="bold" /> },
  { value: "addon",     label: "Shtesa",     emoji: "✨", color: "bg-amber-100 text-amber-700 border-amber-200",       icon: <Plus size={16} weight="bold" /> },
];

const PRICE_TYPES: { value: PriceType; label: string; desc: string }[] = [
  { value: "per_day",    label: "Për ditë",        desc: "Shumëzohet me numrin e ditëve të rezervimit" },
  { value: "per_rental", label: "Për rezervim",    desc: "Tarifë e fiksuar e gjithë rezervimit" },
  { value: "one_time",   label: "Një herë",        desc: "Pagesë një herë (p.sh. dorëzim, karburant)" },
];

function priceLabel(price: number, priceType: PriceType): string {
  if (price === 0) return "Falas";
  switch (priceType) {
    case "per_day":    return `€${price}/ditë`;
    case "per_rental": return `€${price}/rezervim`;
    case "one_time":   return `€${price}`;
  }
}

export default function AdminExtras() {
  const { data, isPending, refetch } = useQuery("ExtraAdmin");
  const { create, update, remove, isPending: isMutating } = useMutation("Extra");
  const log = useActivityLog();

  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<Category | "">("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ExtraForm>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof ExtraForm, string>>>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [bulkConfirm, setBulkConfirm] = useState<null | "delete" | "activate" | "deactivate">(null);

  const all = (data ?? []) as ExtraRecord[];

  const filtered = useMemo(() => {
    return all.filter((e) => {
      if (filterCat && e.category !== filterCat) return false;
      if (search) {
        const q = search.toLowerCase();
        return e.code.toLowerCase().includes(q) || e.nameSq.toLowerCase().includes(q) || e.nameEn.toLowerCase().includes(q);
      }
      return true;
    });
  }, [all, search, filterCat]);

  const grouped = useMemo(() => {
    const map = new Map<Category, ExtraRecord[]>();
    for (const c of CATEGORIES) map.set(c.value, []);
    for (const e of filtered) {
      const list = map.get(e.category) ?? [];
      list.push(e);
      map.set(e.category, list);
    }
    return map;
  }, [filtered]);

  const stats = useMemo(() => ({
    total: all.length,
    active: all.filter((e) => e.isActive).length,
    insurance: all.filter((e) => e.category === "insurance" && e.isActive).length,
    services: all.filter((e) => e.category === "service" && e.isActive).length,
  }), [all]);

  const bulk = useBulkSelection(filtered);

  const handleBulkDelete = async () => {
    const items = bulk.getSelectedItems();
    try {
      await Promise.all(items.map((e) => remove(e.id)));
      await Promise.all(items.map((e) => log("DELETE", "Extra", e.id, `Extra u fshi: ${e.nameSq}`)));
      bulk.clear();
      setBulkConfirm(null);
      await refetch();
    } catch (err) { console.error(err); }
  };

  const handleBulkActive = async (active: boolean) => {
    const items = bulk.getSelectedItems();
    try {
      await Promise.all(items.map((e) => update(e.id, {
        code: e.code, nameSq: e.nameSq, nameEn: e.nameEn,
        descriptionSq: e.descriptionSq, descriptionEn: e.descriptionEn,
        category: e.category, price: e.price, priceType: e.priceType,
        icon: e.icon, maxQuantity: e.maxQuantity, isActive: active, sortOrder: e.sortOrder,
      })));
      await Promise.all(items.map((e) => log("UPDATE", "Extra", e.id, `${active ? "Aktivizuar" : "Çaktivizuar"}: ${e.nameSq}`)));
      bulk.clear();
      setBulkConfirm(null);
      await refetch();
    } catch (err) { console.error(err); }
  };

  function openNew() {
    setEditId(null);
    setForm(emptyForm);
    setErrors({});
    setShowForm(true);
  }

  function openEdit(e: ExtraRecord) {
    setEditId(e.id);
    setForm({
      code: e.code,
      nameSq: e.nameSq,
      nameEn: e.nameEn,
      descriptionSq: e.descriptionSq ?? "",
      descriptionEn: e.descriptionEn ?? "",
      category: e.category,
      price: Number(e.price),
      priceType: e.priceType,
      icon: e.icon ?? "",
      maxQuantity: e.maxQuantity,
      isActive: e.isActive,
      sortOrder: e.sortOrder,
    });
    setErrors({});
    setShowForm(true);
  }

  function validate(): boolean {
    const e: Partial<Record<keyof ExtraForm, string>> = {};
    if (!form.code.trim()) e.code = "Kodi është i detyrueshëm";
    if (!/^[a-z0-9_]+$/.test(form.code.trim())) e.code = "Vetëm shkronja të vogla, numra dhe _";
    if (!form.nameSq.trim()) e.nameSq = "Emri (SQ) është i detyrueshëm";
    if (!form.nameEn.trim()) e.nameEn = "Emri (EN) është i detyrueshëm";
    if (form.price < 0) e.price = "Çmimi nuk mund të jetë negativ";
    if (form.maxQuantity < 1) e.maxQuantity = "Sasia minimale është 1";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    const payload = {
      code: form.code.trim(),
      nameSq: form.nameSq.trim(),
      nameEn: form.nameEn.trim(),
      descriptionSq: form.descriptionSq.trim() || undefined,
      descriptionEn: form.descriptionEn.trim() || undefined,
      category: form.category,
      price: Number(form.price),
      priceType: form.priceType,
      icon: form.icon.trim() || undefined,
      maxQuantity: Number(form.maxQuantity),
      isActive: form.isActive,
      sortOrder: Number(form.sortOrder),
    };
    try {
      if (editId) {
        await update(editId, payload);
        await log("UPDATE", "Extra", editId, `Extra u ndryshua: ${form.nameSq}`);
      } else {
        const created = await create(payload);
        await log("CREATE", "Extra", created.id, `Extra i ri: ${form.nameSq} (${form.category}, €${form.price})`);
      }
      await refetch();
      setShowForm(false);
      setEditId(null);
      setForm(emptyForm);
    } catch (err: any) {
      console.error(err);
      if (String(err?.message || "").includes("ekziston")) {
        setErrors({ code: "Kodi ekziston tashmë" });
      }
    }
  }

  async function handleToggle(extra: ExtraRecord) {
    try {
      await update(extra.id, {
        code: extra.code,
        nameSq: extra.nameSq,
        nameEn: extra.nameEn,
        descriptionSq: extra.descriptionSq,
        descriptionEn: extra.descriptionEn,
        category: extra.category,
        price: extra.price,
        priceType: extra.priceType,
        icon: extra.icon,
        maxQuantity: extra.maxQuantity,
        isActive: !extra.isActive,
        sortOrder: extra.sortOrder,
      });
      await log("UPDATE", "Extra", extra.id, `${extra.isActive ? "Çaktivizuar" : "Aktivizuar"}: ${extra.nameSq}`);
      await refetch();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDelete(id: string) {
    try {
      const e = all.find((x) => x.id === id);
      await remove(id);
      await log("DELETE", "Extra", id, `Extra u çaktivizua: ${e?.nameSq ?? id}`);
      await refetch();
      setDeleteConfirmId(null);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium text-neutral-900">Extras & Sigurime</h1>
          <p className="text-neutral-500 text-sm mt-1">Menaxho sigurimet, pajisjet dhe shërbimet shtesë që klientët mund të shtojnë në rezervim</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer whitespace-nowrap"
        >
          <Plus size={18} weight="bold" /> Extra i ri
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Gjithsej", value: stats.total, color: "text-neutral-800", bg: "bg-white" },
          { label: "Aktive", value: stats.active, color: "text-green-700", bg: "bg-green-50" },
          { label: "Sigurime", value: stats.insurance, color: "text-blue-700", bg: "bg-blue-50" },
          { label: "Shërbime", value: stats.services, color: "text-purple-700", bg: "bg-purple-50" },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-lg border border-border p-4`}>
            <div className={`text-2xl font-semibold ${s.color}`}>{s.value}</div>
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
            placeholder="Kërko extra (kod, emër)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary w-64"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterCat("")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${filterCat === "" ? "bg-primary text-primary-foreground border-primary" : "bg-white text-neutral-700 border-border hover:border-primary hover:text-primary"}`}
          >
            Të gjitha
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setFilterCat(c.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${filterCat === c.value ? "bg-primary text-primary-foreground border-primary" : "bg-white text-neutral-700 border-border hover:border-primary hover:text-primary"}`}
            >
              {c.emoji} {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grouped list */}
      {isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-border p-5 animate-pulse">
              <div className="h-4 bg-neutral-200 rounded w-1/3 mb-3" />
              <div className="h-3 bg-neutral-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-lg border border-border">
          <EmptyState
            type="search"
            title={search || filterCat ? "Asnjë extra nuk u gjet" : "Nuk ka extras ende"}
            description={search || filterCat ? "Provoni kritere të tjera kërkimi" : "Krijoni extra-n e parë"}
            actionLabel={!search && !filterCat ? "Shto extra" : undefined}
            onAction={!search && !filterCat ? openNew : undefined}
          />
        </div>
      ) : (
        <>
        <BulkActionBar
          selectedCount={bulk.selectedCount}
          onClear={bulk.clear}
          itemLabel="extra"
          actions={[
            { label: "Aktivizo", icon: ToggleRight, variant: "success", onClick: () => setBulkConfirm("activate"), disabled: isMutating },
            { label: "Çaktivizo", icon: ToggleLeft, variant: "warning", onClick: () => setBulkConfirm("deactivate"), disabled: isMutating },
            { label: "Fshi", icon: Trash, variant: "danger", onClick: () => setBulkConfirm("delete"), disabled: isMutating },
          ]}
        />

        <label className="flex items-center gap-2 text-xs text-neutral-500 cursor-pointer">
          <BulkCheckbox
            checked={bulk.isAllSelected}
            indeterminate={bulk.isSomeSelected}
            onChange={bulk.toggleAll}
            ariaLabel="Zgjidh të gjitha extras"
          />
          Zgjidh të gjitha ({filtered.length})
        </label>

        <div className="space-y-6">
          {CATEGORIES.filter((c) => (grouped.get(c.value) ?? []).length > 0).map((cat) => {
            const items = grouped.get(cat.value) ?? [];
            return (
              <div key={cat.value}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-xs px-2 py-1 rounded-full border font-medium ${cat.color}`}>
                    {cat.emoji} {cat.label}
                  </span>
                  <span className="text-xs text-neutral-400">{items.length}</span>
                </div>
                <div className="space-y-2">
                  {items.map((e) => (
                    <div
                      key={e.id}
                      className={`bg-white rounded-lg border transition-all ${bulk.isSelected(e.id) ? "border-primary/50 bg-primary/5" : e.isActive ? "border-border hover:border-primary/30 hover:shadow-sm" : "border-border opacity-60"}`}
                    >
                      <div className="p-4 flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="pt-1">
                            <BulkCheckbox
                              checked={bulk.isSelected(e.id)}
                              onChange={() => bulk.toggleOne(e.id)}
                              ariaLabel={`Zgjidh ${e.nameSq}`}
                            />
                          </div>
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 border ${cat.color}`}>
                            {cat.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <h3 className="text-sm font-semibold text-neutral-900">{e.nameSq}</h3>
                              <span className="text-xs text-neutral-400 font-mono">{e.code}</span>
                              {!e.isActive && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-500 border border-neutral-200 font-medium">
                                  Çaktivizuar
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-neutral-500 mb-1">EN: {e.nameEn}</p>
                            {e.descriptionSq && (
                              <p className="text-xs text-neutral-400 italic mt-1 line-clamp-1">{e.descriptionSq}</p>
                            )}
                            <div className="flex flex-wrap items-center gap-3 mt-2">
                              <div className="rounded-lg px-2.5 py-1 border bg-emerald-50 border-emerald-200 text-emerald-700">
                                <span className="text-sm font-bold">{priceLabel(Number(e.price), e.priceType)}</span>
                              </div>
                              {e.maxQuantity > 1 && (
                                <span className="text-xs text-neutral-500">Max sasi: {e.maxQuantity}</span>
                              )}
                              <span className="flex items-center gap-1 text-xs text-neutral-400">
                                {e.sortOrder >= 0 ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
                                P{e.sortOrder}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => handleToggle(e)}
                            disabled={isMutating}
                            className={`p-1.5 rounded-lg cursor-pointer transition-colors ${e.isActive ? "text-green-600 hover:bg-green-50" : "text-neutral-400 hover:bg-neutral-100"}`}
                            title={e.isActive ? "Çaktivizo" : "Aktivizo"}
                          >
                            {e.isActive ? <ToggleRight size={22} weight="fill" /> : <ToggleLeft size={22} />}
                          </button>
                          <button
                            onClick={() => openEdit(e)}
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-primary hover:bg-secondary transition-colors cursor-pointer"
                            title="Ndrysho"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(e.id)}
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-error hover:bg-error/10 transition-colors cursor-pointer"
                            title="Çaktivizo"
                          >
                            <Trash size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        </>
      )}

      {bulkConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-neutral-900/55" onClick={() => setBulkConfirm(null)} />
          <div className="relative bg-white rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-medium text-neutral-900 mb-2">
              {bulkConfirm === "delete" ? "Fshi extras" : bulkConfirm === "activate" ? "Aktivizo extras" : "Çaktivizo extras"}
            </h3>
            <p className="text-sm text-neutral-500 mb-6">
              {bulkConfirm === "delete" ? `${bulk.selectedCount} extra do të fshihen.` : `Statusi i ${bulk.selectedCount} extras do të ndryshojë.`}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setBulkConfirm(null)} className="flex-1 py-2.5 rounded-md text-sm font-medium border border-border text-neutral-700 hover:bg-secondary cursor-pointer">Anulo</button>
              <button
                onClick={() => {
                  if (bulkConfirm === "delete") handleBulkDelete();
                  else handleBulkActive(bulkConfirm === "activate");
                }}
                disabled={isMutating}
                className={`flex-1 py-2.5 rounded-md text-sm font-medium hover:opacity-90 cursor-pointer disabled:opacity-50 ${bulkConfirm === "delete" ? "bg-error text-error-foreground" : "bg-primary text-primary-foreground"}`}
              >
                {bulkConfirm === "delete" ? "Po, fshi" : "Po, vazhdo"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog">
          <div className="absolute inset-0 bg-neutral-900/55" onClick={() => setDeleteConfirmId(null)} />
          <div className="relative bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Warning size={20} weight="bold" className="text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900">Çaktivizo extra-n?</h3>
                <p className="text-sm text-neutral-500">Nuk fshihet plotësisht — rezervimet e vjetra ruajnë lidhjen.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirmId(null)} className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-border text-neutral-700 hover:bg-secondary cursor-pointer">Anulo</button>
              <button onClick={() => handleDelete(deleteConfirmId)} disabled={isMutating} className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-error text-white hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50">Çaktivizo</button>
            </div>
          </div>
        </div>
      )}

      {/* Form drawer */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-neutral-900/55" onClick={() => setShowForm(false)} />
          <div className="relative bg-white w-full max-w-lg h-full overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-border px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="text-lg font-medium text-neutral-900">{editId ? "Ndrysho extra-n" : "Extra i ri"}</h2>
                <p className="text-sm text-neutral-500">{editId ? "Modifiko parametrat" : "Shto një opsion të ri për klientët"}</p>
              </div>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-md text-neutral-500 hover:bg-secondary cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Kategoria *</label>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, category: c.value }))}
                      className={`px-3 py-2.5 rounded-lg text-sm font-medium border transition-colors cursor-pointer text-left ${form.category === c.value ? "bg-primary text-primary-foreground border-primary" : "bg-white text-neutral-700 border-border hover:border-primary"}`}
                    >
                      {c.emoji} {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Code + sort_order */}
              <div className="grid grid-cols-[2fr_1fr] gap-3">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">Kodi (slug) *</label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") }))}
                    placeholder="p.sh. eq_gps"
                    className={`w-full px-3 py-2.5 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${errors.code ? "border-error" : "border-border"}`}
                  />
                  {errors.code && <p className="text-xs text-error mt-1">{errors.code}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">Renditja</label>
                  <input
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
                    className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              {/* Names */}
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">Emri (Shqip) *</label>
                  <input
                    type="text"
                    value={form.nameSq}
                    onChange={(e) => setForm((f) => ({ ...f, nameSq: e.target.value }))}
                    placeholder="p.sh. Navigator GPS"
                    className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${errors.nameSq ? "border-error" : "border-border"}`}
                  />
                  {errors.nameSq && <p className="text-xs text-error mt-1">{errors.nameSq}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">Emri (English) *</label>
                  <input
                    type="text"
                    value={form.nameEn}
                    onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))}
                    placeholder="e.g. GPS Navigator"
                    className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${errors.nameEn ? "border-error" : "border-border"}`}
                  />
                  {errors.nameEn && <p className="text-xs text-error mt-1">{errors.nameEn}</p>}
                </div>
              </div>

              {/* Descriptions */}
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">Përshkrim (Shqip)</label>
                  <textarea
                    value={form.descriptionSq}
                    onChange={(e) => setForm((f) => ({ ...f, descriptionSq: e.target.value }))}
                    rows={2}
                    placeholder="Përshkrim i shkurtër për klientin"
                    className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">Description (English)</label>
                  <textarea
                    value={form.descriptionEn}
                    onChange={(e) => setForm((f) => ({ ...f, descriptionEn: e.target.value }))}
                    rows={2}
                    placeholder="Short customer-facing description"
                    className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                  />
                </div>
              </div>

              {/* Price + type */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Çmimi & Mënyra e tarifimit *</label>
                <div className="grid grid-cols-[1fr_2fr] gap-3 mb-2">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm font-medium">€</span>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={form.price}
                      onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))}
                      className={`w-full pl-7 pr-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${errors.price ? "border-error" : "border-border"}`}
                    />
                  </div>
                  <select
                    value={form.priceType}
                    onChange={(e) => setForm((f) => ({ ...f, priceType: e.target.value as PriceType }))}
                    className="px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    {PRICE_TYPES.map((pt) => (
                      <option key={pt.value} value={pt.value}>{pt.label}</option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-neutral-500">
                  {PRICE_TYPES.find((pt) => pt.value === form.priceType)?.desc}
                </p>
                {errors.price && <p className="text-xs text-error mt-1">{errors.price}</p>}
              </div>

              {/* Max quantity + icon */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">Sasi maksimale</label>
                  <input
                    type="number"
                    min={1}
                    value={form.maxQuantity}
                    onChange={(e) => setForm((f) => ({ ...f, maxQuantity: Number(e.target.value) }))}
                    className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${errors.maxQuantity ? "border-error" : "border-border"}`}
                  />
                  {errors.maxQuantity && <p className="text-xs text-error mt-1">{errors.maxQuantity}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">Ikona (opsionale)</label>
                  <input
                    type="text"
                    value={form.icon}
                    onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
                    placeholder="map, baby, shield, wifi..."
                    className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              {/* Active toggle */}
              <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg border border-border">
                <div>
                  <p className="text-sm font-medium text-neutral-800">Aktiv (i dukshëm për klientët)</p>
                  <p className="text-xs text-neutral-500">Nëse çaktivizuar, klientët nuk e shohin në formë</p>
                </div>
                <button type="button" onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))} className="cursor-pointer">
                  {form.isActive ? <ToggleRight size={36} weight="fill" className="text-green-500" /> : <ToggleLeft size={36} className="text-neutral-400" />}
                </button>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-border px-6 py-4 flex gap-3">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-border text-neutral-700 hover:bg-secondary cursor-pointer">Anulo</button>
              <button onClick={handleSave} disabled={isMutating} className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2">
                <Check size={16} weight="bold" />
                {editId ? "Ruaj" : "Krijo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
