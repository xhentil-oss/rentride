import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Gear, FloppyDisk, Envelope, Buildings, Globe, Phone, MapPin, InstagramLogo, FacebookLogo, TiktokLogo, CheckCircle, SpinnerGap, WarningCircle, House, Car, Image, UploadSimple, Link as LinkIcon, X as XIcon, FolderOpen, Plus, Trash, FileText, SortAscending, Tag } from "@phosphor-icons/react";
import { invalidateLocationsCache } from "../../hooks/useLocations";
import { invalidateLogoCache } from "../../hooks/useSiteLogo";

const API_BASE = "/api";

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = localStorage.getItem("rct_token");
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

interface SettingField {
  key: string;
  label: string;
  type?: "text" | "email" | "number" | "password" | "textarea";
  placeholder?: string;
}

const SECTIONS: { id: string; title: string; icon: React.ElementType; description: string; fields: SettingField[] }[] = [
  {
    id: "company",
    title: "Të Dhënat e Kompanisë",
    icon: Buildings,
    description: "Informacione bazë të biznesit që shfaqen në faqe, kontratë, dhe emaile.",
    fields: [
      { key: "company_name", label: "Emri i kompanisë", placeholder: "Rent Ride" },
      { key: "company_email", label: "Email kontakti", type: "email", placeholder: "rentcaralbania23@gmail.com" },
      { key: "company_phone", label: "Numri telefonit", placeholder: "+355 69 81 45 803" },
      { key: "company_address", label: "Adresa", placeholder: "Rruga e Durrësit, Tiranë, Shqipëri" },
      { key: "company_website", label: "Website", placeholder: "https://rentride.al" },
      { key: "company_vat", label: "NIPT / VAT", placeholder: "L12345678A" },
    ],
  },
  {
    id: "smtp",
    title: "Email SMTP",
    icon: Envelope,
    description: "Konfigurimi i email për dërgimin e konfirmimeve, faturave, dhe njoftimeve.",
    fields: [
      { key: "smtp_host", label: "SMTP Host", placeholder: "smtp.gmail.com" },
      { key: "smtp_port", label: "SMTP Port", type: "number", placeholder: "587" },
      { key: "smtp_user", label: "Email / Username", type: "email", placeholder: "noreply@rentride.al" },
      { key: "smtp_password", label: "Fjalëkalimi / App Password", type: "password", placeholder: "••••••••" },
      { key: "smtp_from_name", label: "Emri dërguesit", placeholder: "Rent Ride" },
      { key: "smtp_from_email", label: "Email dërguesit", type: "email", placeholder: "noreply@rentride.al" },
    ],
  },
  {
    id: "social",
    title: "Rrjetet Sociale",
    icon: Globe,
    description: "Linqet e rrjeteve sociale të shfaqura në faqe.",
    fields: [
      { key: "social_facebook", label: "Facebook URL", placeholder: "https://facebook.com/rentride" },
      { key: "social_instagram", label: "Instagram URL", placeholder: "https://instagram.com/rentride" },
      { key: "social_tiktok", label: "TikTok URL", placeholder: "https://tiktok.com/@rentride" },
      { key: "social_whatsapp", label: "WhatsApp numri", placeholder: "+355698145803" },
    ],
  },
  {
    id: "booking",
    title: "Cilësimet e Rezervimit",
    icon: Gear,
    description: "Rregullime për procesin e rezervimit online.",
    fields: [
      { key: "booking_min_days", label: "Ditë minimale", type: "number", placeholder: "1" },
      { key: "booking_max_days", label: "Ditë maksimale", type: "number", placeholder: "90" },
      { key: "booking_advance_hours", label: "Orë paraprake minimale", type: "number", placeholder: "24" },
      { key: "booking_cancellation_hours", label: "Orë pa tarifë anulimi", type: "number", placeholder: "48" },
      { key: "booking_deposit_percent", label: "Depozitë % ", type: "number", placeholder: "0" },
    ],
  },
  {
    id: "logo",
    title: "Logo",
    icon: Image,
    description: "Ngarko logon e biznesit. Shfaqet te header-i dhe footer-i. Nëse e lë bosh, përdoret logoja e parazgjedhur (ikonë + tekst). Rekomandohet PNG me sfond transparent ose SVG.",
    fields: [
      { key: "logo_url", label: "Logo (header & footer)", placeholder: "https://... ose ngarko një skedar" },
    ],
  },
  {
    id: "banners",
    title: "Banerat e Faqes",
    icon: Image,
    description: "Vendosni URL-të e imazheve kryesore (hero) për faqet e ndryshme.",
    fields: [
      { key: "banner_hero", label: "Hero i Faqes Kryesore", placeholder: "https://images.unsplash.com/photo-1485291571150-772bcfc10da5?w=1200&q=80" },
      { key: "banner_about", label: "Seksioni 'Rreth Nesh'", placeholder: "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=800&q=80" },
    ],
  },
  {
    id: "homepage",
    title: "Faqja Kryesore",
    icon: House,
    description: "Zgjidhni cilat makina do të shfaqen në faqen kryesore.",
    fields: [],
  },
];

export default function AdminSettings() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("company");
  const [cars, setCars] = useState<{ id: string; brand: string; model: string; image?: string }[]>([]);
  const [mediaPickerFor, setMediaPickerFor] = useState<string | null>(null);
  const [mediaTab, setMediaTab] = useState<"gallery" | "upload" | "url">("gallery");
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);

  // ── Locations editor state ──
  // Each row represents one pickup/drop-off location. `fee = 0` means "free"
  // (no surcharge). The full list is persisted as two JSON settings:
  //   - `location_fees`    → { "<name>": <fee>, ... }  (ALL locations live here)
  //   - `free_locations`   → [ "<name>", ... ]         (derived: rows with fee = 0)
  type LocationRow = { name: string; fee: number };
  const [locationRows, setLocationRows] = useState<LocationRow[]>([]);
  const [locationsDirty, setLocationsDirty] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/settings`, { headers: getHeaders() })
      .then((r) => r.json())
      .then((data) => {
        // Flatten grouped settings into flat key-value
        const flat: Record<string, string> = {};
        if (data.raw) {
          for (const row of data.raw) {
            flat[row.setting_key] = row.setting_value || "";
          }
        }
        setSettings(flat);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    // Fetch cars for homepage selector
    fetch(`${API_BASE}/cars`, { headers: getHeaders() })
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data.cars || [];
        setCars(list.map((c: any) => ({ id: c.id, brand: c.brand, model: c.model, image: c.image })));
      })
      .catch(() => {});

    // Fetch the merged location list (paid + free) from the public endpoint.
    // /api/settings/public returns `location_fees` (object) and `free_locations`
    // (array). We merge them into a single editable list of rows.
    fetch(`${API_BASE}/settings/public`)
      .then((r) => r.json())
      .then((j) => {
        const fees: Record<string, number> = (j && j.location_fees) || {};
        const free: string[] = (j && Array.isArray(j.free_locations) ? j.free_locations : []) as string[];
        const seen = new Set<string>();
        const rows: LocationRow[] = [];
        for (const name of free) {
          if (!name || seen.has(name)) continue;
          seen.add(name);
          rows.push({ name, fee: 0 });
        }
        for (const [name, fee] of Object.entries(fees)) {
          if (!name || seen.has(name)) continue;
          seen.add(name);
          rows.push({ name, fee: Number(fee) || 0 });
        }
        setLocationRows(rows);
      })
      .catch(() => {});
  }, []);

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const selectedCarIds = (settings["homepage_featured_cars"] || "").split(",").filter(Boolean);

  const toggleCar = (carId: string | number) => {
    const id = String(carId);
    const current = new Set(selectedCarIds);
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    handleChange("homepage_featured_cars", Array.from(current).join(","));
  };

  const openMediaPicker = (fieldKey: string) => {
    setMediaPickerFor(fieldKey);
    setMediaTab("gallery");
    setUploadPreview(null);
  };

  const selectMedia = (url: string) => {
    if (mediaPickerFor) {
      handleChange(mediaPickerFor, url);
    }
    setMediaPickerFor(null);
    setUploadPreview(null);
  };

  const handleFileUpload = (file: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => setUploadPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  // All available images from car gallery
  const galleryImages = cars
    .filter((c) => c.image && !c.image.includes("placeholder"))
    .map((c) => ({ url: c.image!, label: `${c.brand} ${c.model}` }));

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      // Build payload from regular text settings plus the structured locations.
      const payload: Record<string, unknown> = { ...settings };
      // Validate & serialize locations.
      const cleaned: { name: string; fee: number }[] = [];
      const seen = new Set<string>();
      for (const row of locationRows) {
        const name = (row.name || "").trim();
        if (!name) continue;
        if (seen.has(name)) {
          throw new Error(`Lokacion i përsëritur: “${name}”.`);
        }
        seen.add(name);
        const fee = Number.isFinite(row.fee) && row.fee >= 0 ? Math.round(row.fee * 100) / 100 : 0;
        cleaned.push({ name, fee });
      }
      if (cleaned.length === 0) {
        throw new Error("Duhet të keni të paktën një lokacion.");
      }
      const fees: Record<string, number> = {};
      const free: string[] = [];
      for (const { name, fee } of cleaned) {
        if (fee > 0) fees[name] = fee;
        else free.push(name);
      }
      payload.location_fees = fees;
      payload.free_locations = free;

      const res = await fetch(`${API_BASE}/settings`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({ settings: payload }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Gabim gjatë ruajtjes.");
      }
      setSaved(true);
      setLocationsDirty(false);
      // If locations were changed, invalidate the client-side cache so the
      // public site, booking page, and contact page pick up the new list on
      // their next mount (and refetch immediately for any open instances).
      if (payload.location_fees || payload.free_locations) {
        invalidateLocationsCache();
      }
      // Logo may have changed — refresh the header/footer cache immediately.
      invalidateLogoCache();
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("errors.generic"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <SpinnerGap size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  const activeSection = SECTIONS.find((s) => s.id === activeTab) || SECTIONS[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 flex items-center gap-2">
            <Gear size={28} weight="duotone" className="text-primary" />
            Cilësimet
          </h1>
          <p className="text-sm text-neutral-500 mt-1">Konfiguro email, të dhënat e kompanisë, dhe cilësimet e faqes.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium bg-gradient-primary text-white hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer border-0"
        >
          {saving ? (
            <SpinnerGap size={16} className="animate-spin" />
          ) : saved ? (
            <CheckCircle size={16} weight="fill" />
          ) : (
            <FloppyDisk size={16} weight="bold" />
          )}
          {saving ? "Duke ruajtur..." : saved ? "U ruajt!" : "Ruaj ndryshimet"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md px-4 py-3 flex items-center gap-2 text-sm text-red-700">
          <WarningCircle size={18} weight="fill" />
          {error}
        </div>
      )}

      <div className="flex gap-6">
        {/* Sidebar tabs */}
        <div className="w-56 shrink-0 space-y-1">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveTab(section.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer border-0 text-left ${
                  activeTab === section.id
                    ? "bg-primary/10 text-primary"
                    : "text-neutral-600 hover:bg-neutral-100 bg-transparent"
                }`}
              >
                <Icon size={18} weight={activeTab === section.id ? "fill" : "regular"} />
                {section.title}
              </button>
            );
          })}
        </div>

        {/* Content area */}
        <div className="flex-1 bg-white rounded-xl border border-border p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
              {React.createElement(activeSection.icon, { size: 20, weight: "duotone", className: "text-primary" })}
              {activeSection.title}
            </h2>
            <p className="text-sm text-neutral-500 mt-1">{activeSection.description}</p>
          </div>

          {activeSection.id === "booking" && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
                    <MapPin size={16} weight="duotone" className="text-primary" />
                    Lokacionet e tërheqjes / kthimit
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Vendos çmimet e tarifës për çdo lokacion. Tarifa <strong>0</strong> do të thotë falas (Tiranë Qendër, etj.). Lista shfaqet automatikisht në faqen e rezervimit dhe detajeve të makinës.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setLocationRows((prev) => [...prev, { name: "", fee: 0 }]);
                    setLocationsDirty(true);
                    setSaved(false);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium bg-primary/10 text-primary hover:bg-primary/15 transition-colors cursor-pointer border-0"
                >
                  <Plus size={14} weight="bold" /> Shto
                </button>
              </div>

              <div className="space-y-2 mt-3">
                {locationRows.length === 0 && (
                  <p className="text-xs italic text-neutral-400 py-3">
                    Asnjë lokacion. Klikoni <em>Shto</em> për të shtuar të parin.
                  </p>
                )}
                {locationRows.map((row, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={row.name}
                        onChange={(e) => {
                          const v = e.target.value;
                          setLocationRows((prev) => prev.map((r, i) => i === idx ? { ...r, name: v } : r));
                          setLocationsDirty(true);
                          setSaved(false);
                        }}
                        placeholder="p.sh. Tiranë Qendër, Aeroporti Nënë Tereza, Durrës..."
                        className="w-full px-3 py-2 text-sm border border-border rounded-md outline-none focus:border-primary transition-colors"
                      />
                    </div>
                    <div className="w-32 relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 pointer-events-none">€</span>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={row.fee}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setLocationRows((prev) => prev.map((r, i) => i === idx ? { ...r, fee: Number.isFinite(v) ? v : 0 } : r));
                          setLocationsDirty(true);
                          setSaved(false);
                        }}
                        className="w-full pl-7 pr-2 py-2 text-sm border border-border rounded-md outline-none focus:border-primary transition-colors text-right"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setLocationRows((prev) => prev.filter((_, i) => i !== idx));
                        setLocationsDirty(true);
                        setSaved(false);
                      }}
                      title="Fshi"
                      className="p-2 rounded-md text-neutral-400 hover:bg-error/10 hover:text-error transition-colors cursor-pointer border-0 bg-transparent"
                    >
                      <Trash size={16} weight="bold" />
                    </button>
                  </div>
                ))}
              </div>

              {locationsDirty && (
                <p className="text-xs text-amber-600 mt-3 flex items-center gap-1">
                  <WarningCircle size={12} weight="fill" />
                  Ndryshimet ende nuk janë ruajtur — klikoni <strong>Ruaj</strong>.
                </p>
              )}

              <div className="border-t border-border my-6" />

              {/* Digital contract toggle */}
              <div className="mb-2">
                <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
                  <FileText size={16} weight="duotone" className="text-primary" />
                  Kontrata dixhitale
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5 mb-3">
                  Aktivizo ose çaktivizo seksionin e kontratës dhe nënshkrimit në faqen e rezervimit.
                </p>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings["booking_contract_enabled"] !== "false"}
                    onChange={(e) => handleChange("booking_contract_enabled", e.target.checked ? "true" : "false")}
                    className="w-4 h-4 accent-primary"
                  />
                  <span className="text-sm text-neutral-700">
                    {settings["booking_contract_enabled"] !== "false"
                      ? "Kontrata është aktive (shfaqet te rezervimi)"
                      : "Kontrata është çaktivizuar (nuk shfaqet)"}
                  </span>
                </label>
              </div>

              <div className="border-t border-border my-6" />

              {/* Discount-code toggle */}
              <div className="mb-2">
                <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
                  <Tag size={16} weight="duotone" className="text-primary" />
                  Kodi i zbritjes
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5 mb-3">
                  Aktivizo ose çaktivizo fushën e kodit të zbritjes në faqen e rezervimit.
                </p>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings["booking_discount_code_enabled"] !== "false"}
                    onChange={(e) => handleChange("booking_discount_code_enabled", e.target.checked ? "true" : "false")}
                    className="w-4 h-4 accent-primary"
                  />
                  <span className="text-sm text-neutral-700">
                    {settings["booking_discount_code_enabled"] !== "false"
                      ? "Kodi i zbritjes është aktiv (shfaqet te rezervimi)"
                      : "Kodi i zbritjes është çaktivizuar (nuk shfaqet)"}
                  </span>
                </label>
              </div>

              <div className="border-t border-border my-6" />

              {/* Default fleet sort order */}
              <div className="mb-2">
                <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
                  <SortAscending size={16} weight="duotone" className="text-primary" />
                  Renditja e makinave (faqja Flota)
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5 mb-3">
                  Si renditen makinat kur hapet faqja <strong>/flota</strong> (vlen për çdo gjuhë). Vizitori mund ta ndryshojë vetë me dropdown-in.
                </p>
                <select
                  value={settings["fleet_default_sort"] || "default"}
                  onChange={(e) => handleChange("fleet_default_sort", e.target.value)}
                  className="w-full max-w-xs px-3 py-2.5 rounded-md border border-border text-sm text-neutral-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="default">E parazgjedhur (të veçuarat para)</option>
                  <option value="price_asc">Çmimi: nga më i ulëti tek më i larti</option>
                  <option value="price_desc">Çmimi: nga më i larti tek më i ulëti</option>
                  <option value="name_asc">Emri (A–Z)</option>
                </select>
              </div>

              <div className="border-t border-border my-6" />
            </div>
          )}

          {activeSection.id === "homepage" ? (
            <div>
              <p className="text-sm text-neutral-600 mb-3">
                Zgjidhni makinat që doni të shfaqen në faqen kryesore ({selectedCarIds.length} të zgjedhura):
              </p>
              {cars.length === 0 ? (
                <p className="text-sm text-neutral-400 italic">Nuk u gjetën makina.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {cars.map((car) => {
                    const isSelected = selectedCarIds.includes(String(car.id));
                    return (
                      <button
                        key={car.id}
                        type="button"
                        onClick={() => toggleCar(car.id)}
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all cursor-pointer ${
                          isSelected
                            ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                            : "border-border bg-white hover:border-neutral-300"
                        }`}
                      >
                        {car.image ? (
                          <img src={car.image} alt="" className="w-14 h-10 object-cover rounded" />
                        ) : (
                          <div className="w-14 h-10 rounded bg-neutral-100 flex items-center justify-center">
                            <Car size={18} className="text-neutral-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-neutral-900 truncate">
                            {car.brand} {car.model}
                          </p>
                          <p className="text-xs text-neutral-400">ID: {car.id}</p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          isSelected ? "border-primary bg-primary" : "border-neutral-300"
                        }`}>
                          {isSelected && <CheckCircle size={14} weight="fill" className="text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeSection.fields.map((field) => {
              const isImageField = field.key.startsWith("banner_") || field.key === "logo_url";
              const isLogo = field.key === "logo_url";
              return (
              <div key={field.key} className={field.type === "textarea" || isImageField ? "md:col-span-2" : ""}>
                <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1.5">
                  {field.label}
                </label>
                {isImageField ? (
                  <div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={settings[field.key] || ""}
                        onChange={(e) => handleChange(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        className="flex-1 px-3 py-2.5 text-sm border border-border rounded-md outline-none focus:border-primary transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => openMediaPicker(field.key)}
                        className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-md text-sm font-medium bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition-colors cursor-pointer border border-border"
                      >
                        <FolderOpen size={15} weight="bold" />
                        Zgjidh
                      </button>
                    </div>
                    {settings[field.key] && (
                      <div className="mt-2 rounded-lg overflow-hidden border border-border relative group" style={{ maxHeight: 180 }}>
                        <img
                          src={settings[field.key]}
                          alt={field.label}
                          className={isLogo ? "w-auto max-h-24 object-contain p-3" : "w-full h-full object-cover"}
                          style={isLogo ? { maxHeight: 96 } : { maxHeight: 180 }}
                        />
                        <button
                          type="button"
                          onClick={() => handleChange(field.key, "")}
                          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          <XIcon size={14} weight="bold" />
                        </button>
                      </div>
                    )}
                  </div>
                ) : field.type === "textarea" ? (
                  <textarea
                    value={settings[field.key] || ""}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    rows={3}
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-md outline-none focus:border-primary transition-colors resize-none"
                  />
                ) : (
                  <input
                    type={field.type || "text"}
                    value={settings[field.key] || ""}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-md outline-none focus:border-primary transition-colors"
                  />
                )}
              </div>
              );
            })}
          </div>
          )}
        </div>
      </div>

      {/* ── MEDIA PICKER MODAL ─────────────────────────────── */}
      {mediaPickerFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setMediaPickerFor(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-base font-semibold text-neutral-900">Zgjidh Imazhin</h3>
              <button onClick={() => setMediaPickerFor(null)} className="p-1.5 rounded-md text-neutral-400 hover:bg-neutral-100 transition-colors cursor-pointer">
                <XIcon size={18} weight="bold" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-5 pt-3 pb-2">
              {([
                { id: "gallery" as const, label: "Galeria", icon: Image },
                { id: "upload" as const, label: "Ngarko", icon: UploadSimple },
                { id: "url" as const, label: "URL", icon: LinkIcon },
              ]).map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setMediaTab(t.id); setUploadPreview(null); }}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    mediaTab === t.id ? "bg-primary/10 text-primary" : "text-neutral-500 hover:bg-neutral-100"
                  }`}
                >
                  <t.icon size={14} />
                  {t.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 py-3">
              {mediaTab === "gallery" && (
                galleryImages.length === 0 ? (
                  <p className="text-sm text-neutral-400 italic text-center py-8">Nuk ka imazhe në galeri.</p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {galleryImages.map((img, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => selectMedia(img.url)}
                        className="group relative rounded-lg overflow-hidden border-2 border-transparent hover:border-primary transition-all cursor-pointer aspect-[4/3]"
                      >
                        <img src={img.url} alt={img.label} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                          <CheckCircle size={24} weight="fill" className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                        </div>
                        <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-2 py-1 truncate">{img.label}</span>
                      </button>
                    ))}
                  </div>
                )
              )}

              {mediaTab === "upload" && (
                <div className="space-y-4">
                  <label
                    className="flex flex-col items-center justify-center h-44 rounded-xl border-2 border-dashed border-neutral-200 hover:border-primary/50 hover:bg-neutral-50 transition-colors cursor-pointer"
                  >
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e.target.files?.[0] ?? null)} />
                    {uploadPreview ? (
                      <img src={uploadPreview} alt="preview" className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <>
                        <UploadSimple size={32} className="text-neutral-300 mb-2" />
                        <p className="text-sm text-neutral-400">Kliko ose tërhiq imazhin këtu</p>
                        <p className="text-xs text-neutral-300 mt-1">JPG, PNG, WebP</p>
                      </>
                    )}
                  </label>
                  {uploadPreview && (
                    <button
                      onClick={() => selectMedia(uploadPreview)}
                      className="w-full py-2.5 rounded-lg bg-gradient-primary text-white text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer"
                    >
                      Përdor këtë imazh
                    </button>
                  )}
                </div>
              )}

              {mediaTab === "url" && (
                <div className="space-y-4">
                  <input
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    value={uploadPreview || ""}
                    onChange={(e) => setUploadPreview(e.target.value || null)}
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-md outline-none focus:border-primary transition-colors"
                  />
                  {uploadPreview && (
                    <>
                      <div className="rounded-lg overflow-hidden border border-border" style={{ maxHeight: 200 }}>
                        <img src={uploadPreview} alt="preview" className="w-full object-cover" style={{ maxHeight: 200 }} />
                      </div>
                      <button
                        onClick={() => selectMedia(uploadPreview)}
                        className="w-full py-2.5 rounded-lg bg-gradient-primary text-white text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer"
                      >
                        Përdor këtë URL
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
