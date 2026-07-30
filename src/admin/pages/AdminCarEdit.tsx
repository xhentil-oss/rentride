import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, FloppyDisk, Trash, Star, X, Check, SpinnerGap, CarSimple, Warning, Images, UploadSimple } from "@phosphor-icons/react";
import { useQuery, useMutation } from "../../hooks/useApi";
import StatusBadge from "../../components/StatusBadge";
import { useActivityLog } from "../../hooks/useActivityLog";

type CarDraftForm = {
  brand: string;
  model: string;
  year: string;
  pricePerDay: string;
  category: string;
  status: string;
  transmission: string;
  fuel: string;
  seats: string;
  luggage: string;
  image: string;
  slug: string;
  featured: boolean;
  quantity: string;
  description: string;
};

export default function AdminCarEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: car, isPending } = useQuery("Car", id!);
  const { update, remove, isPending: isMutating } = useMutation("Car");
  const log = useActivityLog();

  const [form, setForm] = useState<CarDraftForm>({
    brand: "", model: "", year: "", pricePerDay: "", category: "Ekonomike",
    status: "Në dispozicion", transmission: "Automatike", fuel: "Benzinë",
    seats: "5", luggage: "2", image: "", slug: "", featured: false, quantity: "1", description: "",
  });
  const [saved, setSaved] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (car) {
      setForm({
        brand: car.brand,
        model: car.model,
        year: String(car.year),
        pricePerDay: String(car.pricePerDay),
        category: car.category,
        status: car.status,
        transmission: car.transmission,
        fuel: car.fuel,
        seats: String(car.seats),
        luggage: String(car.luggage),
        image: car.image,
        slug: car.slug,
        featured: car.featured,
        quantity: String(car.quantity ?? 1),
        description: car.description ?? '',
      });
    }
  }, [car]);

  const setField = (key: keyof CarDraftForm, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    if (!id) return;
    const draft = {
      brand: form.brand, model: form.model, year: Number(form.year),
      pricePerDay: Number(form.pricePerDay), category: form.category,
      status: form.status, transmission: form.transmission, fuel: form.fuel,
      seats: Number(form.seats), luggage: Number(form.luggage),
      image: form.image || "/placeholder-car.svg",
      slug: form.slug || `${form.brand}-${form.model}`.toLowerCase().replace(/\s+/g, "-"),
      featured: form.featured,
      quantity: Number(form.quantity) || 1,
      description: form.description || null,
    };
    try {
      await update(id, draft);
      await log("UPDATE", "Car", id, `Makinë e ndryshuar: ${form.brand} ${form.model} (${form.year})`);
      setSaved(true);
      setDirty(false);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { console.error(e); }
  };

  const handleDelete = async () => {
    if (!id || !car) return;
    try {
      await remove(id);
      await log("DELETE", "Car", id, `Makinë e fshirë: ${car.brand} ${car.model}`);
      navigate("/admin/flota");
    } catch (e) { console.error(e); }
  };

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <SpinnerGap size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!car) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
        <CarSimple size={48} className="text-neutral-300" />
        <p className="text-neutral-500">Makina nuk u gjet.</p>
        <Link to="/admin/flota" className="text-primary text-sm hover:underline">Kthehu te flota</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/flota"
            className="p-2 rounded-lg border border-border text-neutral-500 hover:bg-secondary transition-colors no-underline"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-medium text-neutral-900">
              {car.brand} {car.model}
            </h1>
            <p className="text-sm text-neutral-500 mt-0.5">
              {car.year} · <StatusBadge status={car.status} /> · ID: <span className="font-mono text-xs">{car.id.slice(0, 8)}…</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/makina/${car.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-lg border border-border text-sm text-neutral-600 hover:bg-secondary transition-colors no-underline"
          >
            Shiko faqen publike ↗
          </a>
          <button
            onClick={() => setDeleteConfirm(true)}
            className="px-4 py-2 rounded-lg border border-red-200 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
          >
            <Trash size={15} className="inline mr-1.5" />
            Fshi
          </button>
          <button
            onClick={handleSave}
            disabled={isMutating || !dirty}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium bg-gradient-primary text-white hover:opacity-90 disabled:opacity-40 transition-opacity cursor-pointer"
          >
            {isMutating ? <SpinnerGap size={15} className="animate-spin" /> : saved ? <Check size={15} weight="bold" /> : <FloppyDisk size={15} />}
            {saved ? "U ruajt!" : "Ruaj ndryshimet"}
          </button>
        </div>
      </div>

      {dirty && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm">
          <Warning size={16} weight="fill" />
          Keni ndryshime të pàruajtura — mos harroni të shtypni "Ruaj ndryshimet".
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: Preview */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <img
              src={form.image || car.image}
              alt={`${form.brand} ${form.model}`}
              className="w-full h-48 object-cover"
              onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder-car.svg"; }}
            />
            <div className="p-4">
              <h3 className="font-semibold text-neutral-900">{form.brand} {form.model}</h3>
              <p className="text-sm text-neutral-500 mt-0.5">{form.year} · {form.category}</p>
              <div className="flex items-center justify-between mt-3">
                <span className="text-xl font-bold text-primary">€{form.pricePerDay}<span className="text-xs font-normal text-neutral-400">/ditë</span></span>
                <StatusBadge status={form.status} />
              </div>
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={() => setField("featured", !form.featured)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                    form.featured
                      ? "bg-amber-100 text-amber-700 border border-amber-300"
                      : "bg-neutral-100 text-neutral-500 border border-neutral-200 hover:bg-amber-50 hover:text-amber-600"
                  }`}
                >
                  <Star size={13} weight={form.featured ? "fill" : "regular"} />
                  {form.featured ? "E zgjedhur (Featured)" : "Shto te të zgjedhurat"}
                </button>
              </div>
            </div>
          </div>

          {/* Quick stats */}
          <div className="bg-white rounded-xl border border-border p-4 space-y-3">
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Detaje të shpejta</p>
            {[
              { label: "Transmetimi", value: form.transmission },
              { label: "Karburanti", value: form.fuel },
              { label: "Vendesh", value: form.seats },
              { label: "Bagazhi", value: `${form.luggage} valixhe` },
              { label: "Sasia", value: form.quantity },
              { label: "Slug", value: form.slug },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-neutral-500">{label}</span>
                <span className="font-medium text-neutral-800 text-right max-w-[55%] truncate">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Form */}
        <div className="lg:col-span-2 space-y-5">

          {/* Section: Identiteti */}
          <div className="bg-white rounded-xl border border-border p-5">
            <p className="text-sm font-semibold text-neutral-700 mb-4 pb-3 border-b border-border">Identiteti i makinës</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Brand — combobox (zgjidh nga lista ose shkruaj çdo markë) */}
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1.5">Marka</label>
                <input
                  list="car-brand-list"
                  value={form.brand}
                  onChange={(e) => setField("brand", e.target.value)}
                  placeholder="Zgjidh ose shkruaj markën"
                  className="w-full px-3 py-2.5 rounded-lg border border-border text-sm text-neutral-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
                <datalist id="car-brand-list">
                  {["Volkswagen", "Skoda", "Fiat", "Audi", "Mercedes-Benz", "BMW", "Opel", "Toyota", "Hyundai", "Kia", "Renault", "Peugeot", "Citroën", "Ford", "Seat", "Dacia", "Porsche", "Range Rover", "Land Rover", "Jeep", "Nissan", "Volvo", "Mini", "Tesla", "Cupra"].map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
              </div>
              {/* Model — text */}
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1.5">Modeli</label>
                <input
                  type="text"
                  value={form.model}
                  onChange={(e) => setField("model", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-border text-sm text-neutral-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>
              {/* Year */}
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1.5">Viti</label>
                <input
                  type="number"
                  value={form.year}
                  onChange={(e) => setField("year", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-border text-sm text-neutral-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>
              {/* Price */}
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1.5">Çmimi / ditë (€)</label>
                <input
                  type="number"
                  value={form.pricePerDay}
                  onChange={(e) => setField("pricePerDay", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-border text-sm text-neutral-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1.5">Kategoria</label>
                <select
                  value={form.category}
                  onChange={(e) => setField("category", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-border text-sm text-neutral-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {["Ekonomike", "SUV", "Luksoze", "Familjare", "Automatike"].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1.5">Statusi</label>
                <select
                  value={form.status}
                  onChange={(e) => setField("status", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-border text-sm text-neutral-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="Në dispozicion">Në dispozicion</option>
                  <option value="I rezervuar">I rezervuar</option>
                  <option value="Në mirëmbajtje">Në mirëmbajtje</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1.5">Slug (URL)</label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => setField("slug", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-border text-sm text-neutral-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
          </div>

          {/* Section: Specifikimet teknike */}
          <div className="bg-white rounded-xl border border-border p-5">
            <p className="text-sm font-semibold text-neutral-700 mb-4 pb-3 border-b border-border">Specifikimet teknike</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1.5">Transmetimi</label>
                <select
                  value={form.transmission}
                  onChange={(e) => setField("transmission", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-border text-sm text-neutral-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="Automatike">Automatike</option>
                  <option value="Manuale">Manuale</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1.5">Karburanti</label>
                <select
                  value={form.fuel}
                  onChange={(e) => setField("fuel", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-border text-sm text-neutral-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="Benzinë">Benzinë</option>
                  <option value="Naftë">Naftë</option>
                  <option value="Hibrid">Hibrid</option>
                  <option value="Elektrik">Elektrik</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1.5">Numri i vendeve</label>
                <input
                  type="number"
                  min={2}
                  max={9}
                  value={form.seats}
                  onChange={(e) => setField("seats", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-border text-sm text-neutral-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1.5">Kapaciteti bagazhi (valixhe)</label>
                <input
                  type="number"
                  min={1}
                  max={6}
                  value={form.luggage}
                  onChange={(e) => setField("luggage", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-border text-sm text-neutral-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1.5">Sasia (sa copë identike)</label>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={form.quantity}
                  onChange={(e) => setField("quantity", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-border text-sm text-neutral-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
          </div>

          {/* Section: Përshkrimi */}
          <div className="bg-white rounded-xl border border-border p-5">
            <p className="text-sm font-semibold text-neutral-700 mb-4 pb-3 border-b border-border">Përshkrimi i makinës</p>
            <textarea
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              placeholder="Shkruani një përshkrim të detajuar për këtë makinë..."
              rows={5}
              className="w-full px-3 py-2.5 rounded-lg border border-border text-sm text-neutral-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-y"
            />
            <p className="text-xs text-neutral-400 mt-1.5">Përshkrimi shfaqet në faqen publike të makinës.</p>
          </div>

          {/* Section: Imazhi */}
          <div className="bg-white rounded-xl border border-border p-5">
            <p className="text-sm font-semibold text-neutral-700 mb-4 pb-3 border-b border-border">Imazhi kryesor</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1.5">URL e imazhit</label>
                <input
                  type="url"
                  value={form.image}
                  onChange={(e) => setField("image", e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2.5 rounded-lg border border-border text-sm text-neutral-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
                />
                <p className="text-xs text-neutral-400 mt-1.5">Futni URL-in e imazhit. Pamja paraprijëse pasqyrohet menjëherë në kolonën e majtë.</p>
              </div>
              <div className="flex gap-2">
                <Link
                  to="/admin/media"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-primary/30 bg-primary/5 text-sm text-primary font-medium hover:bg-primary/10 transition-colors no-underline"
                >
                  <Images size={15} />
                  Shiko Media Library
                </Link>
                <label className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm text-neutral-600 hover:bg-secondary transition-colors cursor-pointer">
                  <UploadSimple size={15} />
                  Ngarko nga PC
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        const dataUrl = ev.target?.result as string;
                        setField("image", dataUrl);
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Save bar (sticky bottom on mobile) */}
          <div className="flex items-center justify-between gap-4 bg-white rounded-xl border border-border p-4">
            <p className="text-sm text-neutral-500">
              {saved
                ? <span className="text-emerald-600 font-medium flex items-center gap-1.5"><Check size={15} weight="bold" /> Ndryshimet u ruajtën me sukses!</span>
                : dirty
                ? "Keni ndryshime të pàruajtura."
                : "Nuk ka ndryshime të reja."}
            </p>
            <div className="flex gap-2">
              <Link
                to="/admin/flota"
                className="px-4 py-2 rounded-lg border border-border text-sm text-neutral-600 hover:bg-secondary transition-colors no-underline"
              >
                Anulo
              </Link>
              <button
                onClick={handleSave}
                disabled={isMutating || !dirty}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium bg-gradient-primary text-white hover:opacity-90 disabled:opacity-40 transition-opacity cursor-pointer"
              >
                {isMutating ? <SpinnerGap size={14} className="animate-spin" /> : <FloppyDisk size={14} />}
                Ruaj ndryshimet
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirm modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-neutral-900/55 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Warning size={20} weight="fill" className="text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-neutral-900">Fshi makinën</h3>
                <p className="text-xs text-neutral-500">{car.brand} {car.model} ({car.year})</p>
              </div>
            </div>
            <p className="text-sm text-neutral-600 mb-6">Jeni të sigurt? Ky veprim është i pakthyeshëm dhe do të fshijë të gjitha të dhënat e lidhura.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium text-neutral-700 hover:bg-secondary transition-colors cursor-pointer"
              >
                Anulo
              </button>
              <button
                onClick={handleDelete}
                disabled={isMutating}
                className="flex-1 py-2.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {isMutating ? "Duke fshirë…" : "Fshi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
