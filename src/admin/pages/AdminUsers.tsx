import React, { useState } from "react";
import {
  useQuery,
  useMutation,
  useAuth,
} from "../../hooks/useApi";
import {
  Users,
  Plus,
  PencilSimple,
  Trash,
  X,
  ShieldCheck,
  ShieldSlash,
  Eye,
  EyeSlash,
  LockKey,
  CheckCircle,
  XCircle,
  ClockCounterClockwise,
  Warning,
  MagnifyingGlass,
  Funnel,
  DeviceMobile,
  EnvelopeSimple,
  Key,
  UserCircle,
  ArrowClockwise,
} from "@phosphor-icons/react";
import { useBulkSelection } from "../../hooks/useBulkSelection";
import BulkActionBar, { BulkCheckbox } from "../components/BulkActionBar";

// ─── Role config ────────────────────────────────────────────────────────────
const ROLES = ["Admin", "Manager", "Staff", "Accountant"] as const;
type Role = typeof ROLES[number];

const ROLE_COLORS: Record<Role, string> = {
  Admin: "bg-red-100 text-red-700 border border-red-200",
  Manager: "bg-blue-100 text-blue-700 border border-blue-200",
  Staff: "bg-green-100 text-green-700 border border-green-200",
  Accountant: "bg-purple-100 text-purple-700 border border-purple-200",
};

const ROLE_PERMISSIONS: Record<Role, string[]> = {
  Admin: [
    "cars.view","cars.edit","cars.delete",
    "reservations.view","reservations.edit","reservations.delete",
    "customers.view","customers.edit","customers.delete",
    "finance.view","finance.edit",
    "reports.view",
    "users.view","users.edit","users.delete",
    "settings.view","settings.edit",
  ],
  Manager: [
    "cars.view","cars.edit",
    "reservations.view","reservations.edit",
    "customers.view","customers.edit",
    "finance.view",
    "reports.view",
    "users.view",
  ],
  Staff: [
    "cars.view",
    "reservations.view","reservations.edit",
    "customers.view","customers.edit",
  ],
  Accountant: [
    "cars.view",
    "reservations.view",
    "customers.view",
    "finance.view","finance.edit",
    "reports.view",
  ],
};

const ALL_PERMISSIONS = [
  { key: "cars.view", label: "Flota: Shiko" },
  { key: "cars.edit", label: "Flota: Ndrysho" },
  { key: "cars.delete", label: "Flota: Fshi" },
  { key: "reservations.view", label: "Rezervimet: Shiko" },
  { key: "reservations.edit", label: "Rezervimet: Ndrysho" },
  { key: "reservations.delete", label: "Rezervimet: Fshi" },
  { key: "customers.view", label: "Klientët: Shiko" },
  { key: "customers.edit", label: "Klientët: Ndrysho" },
  { key: "customers.delete", label: "Klientët: Fshi" },
  { key: "finance.view", label: "Financat: Shiko" },
  { key: "finance.edit", label: "Financat: Ndrysho" },
  { key: "reports.view", label: "Raportet: Shiko" },
  { key: "users.view", label: "Përdoruesit: Shiko" },
  { key: "users.edit", label: "Përdoruesit: Ndrysho" },
  { key: "users.delete", label: "Përdoruesit: Fshi" },
  { key: "settings.view", label: "Cilësimet: Shiko" },
  { key: "settings.edit", label: "Cilësimet: Ndrysho" },
];

// ─── Helper ──────────────────────────────────────────────────────────────────
function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(d?: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("sq-AL", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ─── Empty drawer form state ──────────────────────────────────────────────────
interface UserForm {
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  twoFactorEnabled: boolean;
  permissions: string[];
}

const defaultForm = (): UserForm => ({
  name: "",
  email: "",
  role: "Staff",
  isActive: true,
  twoFactorEnabled: false,
  permissions: [...ROLE_PERMISSIONS.Staff],
});

// ─── 2FA Setup Modal ──────────────────────────────────────────────────────────
function TwoFAModal({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [step, setStep] = useState<"loading" | "qr" | "verify">("loading");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [tempSecret, setTempSecret] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Load QR code on mount
  React.useEffect(() => {
    fetch("/api/auth/2fa/setup", {
      method: "POST",
      credentials: "include",
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.qrDataUrl) {
          setQrDataUrl(data.qrDataUrl);
          setTempSecret(data.tempSecret);
          setStep("qr");
        } else {
          setError("Gabim gjatë konfigurimit të 2FA.");
          setStep("qr");
        }
      })
      .catch(() => { setError("Gabim gjatë lidhjes me serverin."); setStep("qr"); });
  }, []);

  const handleVerify = async () => {
    if (otp.length !== 6) { setError("Kodi duhet të jetë 6 shifra."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/2fa/verify-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ tempSecret, otp }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Kodi OTP është i gabuar."); return; }
      onConfirm();
    } catch {
      setError("Gabim gjatë verifikimit.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-primary" weight="duotone" />
            <h3 className="font-semibold text-neutral-900 text-sm">Konfiguro 2FA</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-neutral-100 cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <div className="p-5">
          {step === "loading" ? (
            <div className="flex justify-center py-8">
              <ArrowClockwise size={28} className="animate-spin text-primary" />
            </div>
          ) : step === "qr" ? (
            <div className="space-y-4">
              <p className="text-sm text-neutral-600">
                Skano kodin QR me aplikacionin tuaj <strong>Google Authenticator</strong> ose <strong>Authy</strong>.
              </p>
              {error && <p className="text-xs text-error text-center">{error}</p>}
              {qrDataUrl && (
                <div className="flex justify-center">
                  <img src={qrDataUrl} alt="QR Code 2FA" className="w-44 h-44 rounded-lg border border-border" />
                </div>
              )}
              {tempSecret && (
                <div className="bg-neutral-50 rounded-lg p-3 border border-border">
                  <p className="text-xs text-neutral-500 mb-1">Ose fut manualisht:</p>
                  <code className="text-xs font-mono text-primary font-bold tracking-wider break-all">{tempSecret}</code>
                </div>
              )}
              <button
                onClick={() => setStep("verify")}
                disabled={!qrDataUrl}
                className="w-full py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50"
              >
                Vazhdo
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-neutral-600">
                Fut kodin 6-shifror nga aplikacioni juaj autentifikues për të konfirmuar.
              </p>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => { if (e.key === "Enter") handleVerify(); }}
                autoFocus
                className="w-full px-4 py-3 text-center text-lg font-mono border-2 border-border rounded-md focus:border-primary focus:outline-none tracking-widest"
              />
              {error && <p className="text-xs text-error text-center">{error}</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => { setStep("qr"); setOtp(""); setError(""); }}
                  className="flex-1 py-2 border border-border text-neutral-600 rounded-md text-sm hover:bg-neutral-50 transition-colors cursor-pointer"
                >
                  Mbrapa
                </button>
                <button
                  onClick={handleVerify}
                  disabled={loading || otp.length !== 6}
                  className="flex-1 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {loading ? "Duke verifikuar..." : "Aktivizo 2FA"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Activity Log Tab ────────────────────────────────────────────────────────
function ActivityLogTab() {
  const { data: logs, isPending } = useQuery("ActivityLog", {
    orderBy: { timestamp: "desc" },
    limit: 50,
  });

  const [filterAction, setFilterAction] = useState("Të gjitha");
  const [filterEntity, setFilterEntity] = useState("Të gjitha");
  const [search, setSearch] = useState("");

  const actions = ["Të gjitha", "CREATE", "UPDATE", "DELETE", "LOGIN", "LOGOUT"];
  const entities = ["Të gjitha", "Car", "Reservation", "Customer", "Invoice", "UserAdminProfile"];

  const ACTION_COLORS: Record<string, string> = {
    CREATE: "bg-green-100 text-green-700",
    UPDATE: "bg-blue-100 text-blue-700",
    DELETE: "bg-red-100 text-red-700",
    LOGIN: "bg-purple-100 text-purple-700",
    LOGOUT: "bg-neutral-100 text-neutral-600",
  };

  const filtered = (logs ?? []).filter((log) => {
    const matchAction = filterAction === "Të gjitha" || log.action === filterAction;
    const matchEntity = filterEntity === "Të gjitha" || log.entity === filterEntity;
    const matchSearch =
      !search ||
      log.description.toLowerCase().includes(search.toLowerCase()) ||
      (log.entityId ?? "").toLowerCase().includes(search.toLowerCase());
    return matchAction && matchEntity && matchSearch;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="search"
            placeholder="Kërko..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-3 py-2 w-full rounded-md border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="px-3 py-2 rounded-md border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
        >
          {actions.map((a) => <option key={a}>{a}</option>)}
        </select>
        <select
          value={filterEntity}
          onChange={(e) => setFilterEntity(e.target.value)}
          className="px-3 py-2 rounded-md border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
        >
          {entities.map((e) => <option key={e}>{e}</option>)}
        </select>
      </div>

      {isPending ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-14 bg-neutral-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-neutral-400">
          <ClockCounterClockwise size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">Nuk ka log aktiviteti</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((log) => (
            <div
              key={log.id}
              className="flex items-start gap-3 p-3 rounded-lg bg-white border border-border hover:border-primary/30 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold text-white">
                  {log.entity[0] ?? "?"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ACTION_COLORS[log.action] ?? "bg-neutral-100 text-neutral-600"}`}>
                    {log.action}
                  </span>
                  <span className="text-xs text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full">
                    {log.entity}
                  </span>
                  {log.entityId && (
                    <span className="text-xs text-neutral-300 font-mono">#{log.entityId.slice(0, 8)}</span>
                  )}
                </div>
                <p className="text-xs text-neutral-500 mt-0.5 truncate">{log.description}</p>
              </div>
              <div className="text-xs text-neutral-400 shrink-0 text-right">
                <p>{formatDate(log.timestamp)}</p>
                {log.ipAddress && <p className="text-neutral-300">{log.ipAddress}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminUsers() {
  const { data: users, isPending, refetch } = useQuery("UserAdminProfile", {
    orderBy: { createdAt: "desc" },
  });
  const { create, update, remove, isPending: isMutating } = useMutation("UserAdminProfile");
  const { create: createLog } = useMutation("ActivityLog");

  const [tab, setTab] = useState<"users" | "logs">("users");
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("Të gjitha");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<UserForm>(defaultForm());
  const [showTwoFA, setShowTwoFA] = useState<string | null>(null); // userId
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showPermissions, setShowPermissions] = useState(false);
  const [bulkConfirm, setBulkConfirm] = useState<null | "delete" | "activate" | "deactivate">(null);

  const filtered = (users ?? []).filter((u) => {
    const matchRole = filterRole === "Të gjitha" || u.role === filterRole;
    const matchSearch =
      !search ||
      (u.userId ?? "").toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase());
    return matchRole && matchSearch;
  });

  const bulk = useBulkSelection(filtered);

  const handleBulkDelete = async () => {
    const items = bulk.getSelectedItems();
    try {
      await Promise.all(items.map((u: any) => remove(u.id)));
      await Promise.all(items.map((u: any) => createLog({ action: "DELETE", entity: "UserAdminProfile", entityId: u.id, description: `Fshirë profili ${u.userId ?? u.id}`, timestamp: new Date() })));
      bulk.clear();
      setBulkConfirm(null);
      await refetch();
    } catch (e) { console.error(e); }
  };

  const handleBulkActivate = async (value: boolean) => {
    const items = bulk.getSelectedItems();
    try {
      await Promise.all(items.map((u: any) => update(u.id, { isActive: value })));
      bulk.clear();
      setBulkConfirm(null);
      await refetch();
    } catch (e) { console.error(e); }
  };

  const openCreate = () => {
    setEditing(null);
    setForm(defaultForm());
    setShowPermissions(false);
    setDrawerOpen(true);
  };

  const openEdit = (u: any) => {
    setEditing(u.id);
    // Reconstruct display name/email from userId
    const uid = u.userId ?? "";
    const parts = uid.split("_at_");
    const namePart = parts[0]?.replace(/_/g, " ") ?? "";
    const emailPart = parts.length > 1 ? `${parts[0]}@${parts[1]}` : uid;
    setForm({
      name: namePart || uid,
      email: emailPart,
      role: u.role as Role,
      isActive: u.isActive,
      twoFactorEnabled: u.twoFactorEnabled,
      permissions: u.permissions ? u.permissions.split(",") : [],
    });
    setShowPermissions(false);
    setDrawerOpen(true);
  };

  const handleRoleChange = (role: Role) => {
    setForm((f) => ({ ...f, role, permissions: [...ROLE_PERMISSIONS[role]] }));
  };

  const togglePermission = (key: string) => {
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(key)
        ? f.permissions.filter((p) => p !== key)
        : [...f.permissions, key],
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) return;
    // UserAdminProfile requires a userId — we use email as a stable synthetic key
    const syntheticUserId = form.email.trim().toLowerCase().replace(/[^a-z0-9]/g, "_");
    const data = {
      userId: syntheticUserId,
      role: form.role,
      isActive: form.isActive,
      twoFactorEnabled: form.twoFactorEnabled,
      permissions: form.permissions.join(","),
    };
    try {
      if (editing) {
        await update(editing, data);
        await createLog({ action: "UPDATE", entity: "UserAdminProfile", entityId: editing, description: `Përditësuar profili i ${form.name.trim()} (${form.role})`, timestamp: new Date() });
      } else {
        const created = await create(data);
        await createLog({ action: "CREATE", entity: "UserAdminProfile", entityId: created.id, description: `Krijuar staf i ri: ${form.name.trim()} me rol ${form.role}`, timestamp: new Date() });
      }
      await refetch();
      setDrawerOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    const target = (users ?? []).find((u) => u.id === id);
    await remove(id);
    await createLog({ action: "DELETE", entity: "UserAdminProfile", entityId: id, description: `Fshirë profili ${target?.userId ?? id}`, timestamp: new Date() });
    await refetch();
    setDeleteConfirm(null);
  };

  const handleToggleActive = async (u: any) => {
    await update(u.id, { isActive: !u.isActive });
    await refetch();
  };

  const handle2FAConfirm = async () => {
    await refetch();
    setShowTwoFA(null);
  };

  const handle2FADisable = async (id: string) => {
    await update(id, { twoFactorEnabled: false });
    await refetch();
  };

  // Counts
  const totalUsers = (users ?? []).length;
  const activeUsers = (users ?? []).filter((u) => u.isActive).length;
  const adminCount = (users ?? []).filter((u) => u.role === "Admin").length;
  const twoFACount = (users ?? []).filter((u) => u.twoFactorEnabled).length;

  // Display helpers — UserAdminProfile uses userId as name/email placeholder
  const getDisplayName = (u: any) => u.userId?.replace(/_/g, " ") ?? "—";
  const getDisplayEmail = (u: any) => u.userId?.includes("@") ? u.userId : `${u.userId ?? ""}@staff`.replace(/_at_/, "@");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium text-neutral-900">Menaxhimi i Përdoruesve</h1>
          <p className="text-neutral-500 text-sm mt-1">Stafi, rolet dhe autorizimet e sistemit</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-hover transition-colors cursor-pointer"
        >
          <Plus size={16} weight="bold" />
          Shto Përdorues
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Totali", value: totalUsers, icon: Users, color: "bg-primary" },
          { label: "Aktiv", value: activeUsers, icon: CheckCircle, color: "bg-success" },
          { label: "Adminë", value: adminCount, icon: ShieldCheck, color: "bg-error" },
          { label: "Me 2FA", value: twoFACount, icon: LockKey, color: "bg-warning" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-lg border border-border p-4 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center shrink-0`}>
              <Icon size={20} weight="regular" className="text-white" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-neutral-900">{value}</p>
              <p className="text-xs text-neutral-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-neutral-100 p-1 rounded-lg w-fit">
        {(["users", "logs"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
              tab === t ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            {t === "users" ? "Përdoruesit" : "Log Aktiviteti"}
          </button>
        ))}
      </div>

      {tab === "logs" ? (
        <ActivityLogTab />
      ) : (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-48">
              <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="search"
                placeholder="Kërko emër ose email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-3 py-2 w-full rounded-md border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-3 py-2 rounded-md border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
            >
              <option>Të gjitha</option>
              {ROLES.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>

          {/* Table */}
          {isPending ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-neutral-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-neutral-400">
              <UserCircle size={48} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium">Nuk ka përdorues</p>
              <p className="text-xs mt-1">Shto staffin e parë me butonin &quot;Shto Përdorues&quot;</p>
            </div>
          ) : (
            <>
            <BulkActionBar
              selectedCount={bulk.selectedCount}
              onClear={bulk.clear}
              itemLabel="përdorues"
              actions={[
                { label: "Aktivizo", icon: CheckCircle, variant: "success", onClick: () => setBulkConfirm("activate"), disabled: isMutating },
                { label: "Çaktivizo", icon: XCircle, variant: "warning", onClick: () => setBulkConfirm("deactivate"), disabled: isMutating },
                { label: "Fshi", icon: Trash, variant: "danger", onClick: () => setBulkConfirm("delete"), disabled: isMutating },
              ]}
            />

            {/* Mobile card layout */}
            <div className="md:hidden space-y-3">
              {filtered.map((u) => (
                <div
                  key={u.id}
                  className={`bg-white rounded-lg border p-4 ${bulk.isSelected(u.id) ? "border-primary/40 bg-primary/5" : "border-border"}`}
                >
                  <div className="flex items-start gap-3 mb-2">
                    <BulkCheckbox
                      checked={bulk.isSelected(u.id)}
                      onChange={() => bulk.toggleOne(u.id)}
                      ariaLabel={`Zgjidh ${getDisplayName(u)}`}
                    />
                    <div className="w-9 h-9 rounded-full bg-gradient-primary flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-white">{getInitials(getDisplayName(u))}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-neutral-900 truncate">{getDisplayName(u)}</p>
                      <p className="text-xs text-neutral-500 truncate">{getDisplayEmail(u)}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[u.role as Role] ?? "bg-neutral-100 text-neutral-600"}`}>
                      {u.role}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-neutral-600">
                      <span className="flex items-center gap-1">
                        {u.isActive ? <CheckCircle size={12} weight="fill" className="text-success" /> : <XCircle size={12} weight="fill" className="text-neutral-300" />}
                        {u.isActive ? "Aktiv" : "Joaktiv"}
                      </span>
                      <span className="flex items-center gap-1">
                        {u.twoFactorEnabled ? <ShieldCheck size={12} weight="fill" className="text-primary" /> : <ShieldSlash size={12} className="text-neutral-300" />}
                        2FA
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(u)} className="p-2 rounded text-neutral-400 hover:text-primary hover:bg-secondary cursor-pointer" aria-label="Modifiko">
                        <PencilSimple size={15} />
                      </button>
                      <button onClick={() => setDeleteConfirm(u.id)} className="p-2 rounded text-neutral-400 hover:text-error hover:bg-error/10 cursor-pointer" aria-label="Fshi">
                        <Trash size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-lg border border-border overflow-hidden hidden md:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-neutral-50">
                    <th className="px-4 py-3 w-10">
                      <BulkCheckbox
                        checked={bulk.isAllSelected}
                        indeterminate={bulk.isSomeSelected}
                        onChange={bulk.toggleAll}
                        ariaLabel="Zgjidh të gjithë"
                      />
                    </th>
                    <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">Stafi</th>
                    <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3 hidden md:table-cell">Roli</th>
                    <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3 hidden lg:table-cell">Hyrja e fundit</th>
                    <th className="text-center text-xs font-medium text-neutral-500 px-4 py-3">Statusi</th>
                    <th className="text-center text-xs font-medium text-neutral-500 px-4 py-3">2FA</th>
                    <th className="text-right text-xs font-medium text-neutral-500 px-4 py-3">Veprime</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => (
                    <tr key={u.id} className={`border-b border-border last:border-0 hover:bg-neutral-50 transition-colors ${bulk.isSelected(u.id) ? "bg-primary/5" : ""}`}>
                      <td className="px-4 py-3">
                        <BulkCheckbox
                          checked={bulk.isSelected(u.id)}
                          onChange={() => bulk.toggleOne(u.id)}
                          ariaLabel={`Zgjidh ${getDisplayName(u)}`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-primary flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-white">{getInitials(getDisplayName(u))}</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-neutral-800">{getDisplayName(u)}</p>
                            <p className="text-xs text-neutral-400 flex items-center gap-1">
                              <EnvelopeSimple size={11} />
                              {getDisplayEmail(u)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${ROLE_COLORS[u.role as Role] ?? "bg-neutral-100 text-neutral-600"}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-xs text-neutral-500">{formatDate(u.createdAt)}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleToggleActive(u)}
                          title={u.isActive ? "Çaktivizo" : "Aktivo"}
                          className="cursor-pointer"
                        >
                          {u.isActive ? (
                            <CheckCircle size={20} weight="fill" className="text-success mx-auto" />
                          ) : (
                            <XCircle size={20} weight="fill" className="text-neutral-300 mx-auto" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {u.twoFactorEnabled ? (
                          <button
                            onClick={() => handle2FADisable(u.id)}
                            title="Çaktivizo 2FA"
                            className="cursor-pointer"
                          >
                            <ShieldCheck size={20} weight="fill" className="text-primary mx-auto" />
                          </button>
                        ) : (
                          <button
                            onClick={() => setShowTwoFA(u.id)}
                            title="Aktivizo 2FA"
                            className="cursor-pointer"
                          >
                            <ShieldSlash size={20} weight="regular" className="text-neutral-300 mx-auto" />
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => openEdit(u)}
                            className="p-1.5 rounded-md hover:bg-neutral-100 text-neutral-500 hover:text-primary transition-colors cursor-pointer"
                            title="Ndrysho"
                          >
                            <PencilSimple size={15} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(u.id)}
                            className="p-1.5 rounded-md hover:bg-red-50 text-neutral-400 hover:text-error transition-colors cursor-pointer"
                            title="Fshi"
                          >
                            <Trash size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </>
      )}

      {bulkConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-neutral-900/55" onClick={() => setBulkConfirm(null)} />
          <div className="relative bg-white rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-medium text-neutral-900 mb-2">
              {bulkConfirm === "delete" ? "Fshi përdoruesit" : bulkConfirm === "activate" ? "Aktivizo përdoruesit" : "Çaktivizo përdoruesit"}
            </h3>
            <p className="text-sm text-neutral-500 mb-6">
              {bulkConfirm === "delete" ? `${bulk.selectedCount} përdorues do të fshihen përgjithmonë.` : `Statusi i ${bulk.selectedCount} përdoruesve do të ndryshojë.`}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setBulkConfirm(null)} className="flex-1 py-2.5 rounded-md text-sm font-medium border border-border text-neutral-700 hover:bg-secondary cursor-pointer">Anulo</button>
              <button
                onClick={() => {
                  if (bulkConfirm === "delete") handleBulkDelete();
                  else handleBulkActivate(bulkConfirm === "activate");
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

      {/* ── Drawer ─────────────────────────────────────────────────────────── */}
      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 bg-neutral-900/40 z-40"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-xl z-50 flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-semibold text-neutral-900 text-sm">
                {editing ? "Ndrysho Përdoruesin" : "Shto Përdorues të Ri"}
              </h2>
              <button onClick={() => setDrawerOpen(false)} className="p-1.5 rounded hover:bg-neutral-100 cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Informacioni</h3>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1.5">Emri i plotë *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="p.sh. Artan Hoxha"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1.5">Email *</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="artan@rentride.al"
                  />
                </div>
              </div>

              {/* Role */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Roli</h3>
                <div className="grid grid-cols-2 gap-2">
                  {ROLES.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => handleRoleChange(r)}
                      className={`px-3 py-2 rounded-md border text-sm font-medium transition-colors cursor-pointer ${
                        form.role === r
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border text-neutral-600 hover:border-primary/40"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Permissions */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setShowPermissions((v) => !v)}
                  className="flex items-center justify-between w-full text-xs font-semibold text-neutral-500 uppercase tracking-wide cursor-pointer"
                >
                  <span>Autorizimet ({form.permissions.length}/{ALL_PERMISSIONS.length})</span>
                  <span className="text-primary text-xs normal-case font-normal">
                    {showPermissions ? "Fshih" : "Ndrysho"}
                  </span>
                </button>
                {showPermissions && (
                  <div className="grid grid-cols-1 gap-1 bg-neutral-50 rounded-lg p-3 border border-border max-h-52 overflow-y-auto">
                    {ALL_PERMISSIONS.map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-2 text-xs text-neutral-700 cursor-pointer hover:text-neutral-900 py-0.5">
                        <input
                          type="checkbox"
                          checked={form.permissions.includes(key)}
                          onChange={() => togglePermission(key)}
                          className="w-3.5 h-3.5 accent-primary"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Status toggles */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Opsione</h3>
                <div className="space-y-2">
                  <label className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg border border-border cursor-pointer">
                    <div className="flex items-center gap-2">
                      <CheckCircle size={16} className="text-success" />
                      <span className="text-sm text-neutral-700">Llogaria aktive</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                      className="w-4 h-4 accent-primary"
                    />
                  </label>
                  <label className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg border border-border cursor-pointer">
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={16} className="text-primary" />
                      <span className="text-sm text-neutral-700">Autentifikim 2FA</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={form.twoFactorEnabled}
                      onChange={(e) => setForm((f) => ({ ...f, twoFactorEnabled: e.target.checked }))}
                      className="w-4 h-4 accent-primary"
                    />
                  </label>
                </div>
              </div>

              {/* Role badge preview */}
              <div className="bg-neutral-50 rounded-lg border border-border p-4">
                <p className="text-xs text-neutral-500 mb-2">Pamja paraprake</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
                    <span className="text-sm font-bold text-white">
                      {form.name ? getInitials(form.name) : "??"}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-800">{form.name || "Emri i plotë"}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[form.role]}`}>
                        {form.role}
                      </span>
                      {form.twoFactorEnabled && (
                        <span className="text-xs text-primary flex items-center gap-0.5">
                          <ShieldCheck size={11} /> 2FA
                        </span>
                      )}
                      {!form.isActive && (
                        <span className="text-xs text-neutral-400">(joaktiv)</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-border flex gap-3">
              <button
                onClick={() => setDrawerOpen(false)}
                className="flex-1 py-2 border border-border text-neutral-600 rounded-md text-sm hover:bg-neutral-50 transition-colors cursor-pointer"
              >
                Anulo
              </button>
              <button
                onClick={handleSave}
                disabled={isMutating || !form.name.trim() || !form.email.trim()}
                className="flex-1 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-hover disabled:opacity-50 transition-colors cursor-pointer"
              >
                {isMutating ? "Duke ruajtur..." : editing ? "Përditëso" : "Shto"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── 2FA Setup Modal ──────────────────────────────────────────────── */}
      {showTwoFA && (
        <TwoFAModal
          onClose={() => setShowTwoFA(null)}
          onConfirm={handle2FAConfirm}
        />
      )}

      {/* ── Delete Confirm ───────────────────────────────────────────────── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xs mx-4 p-6 text-center">
            <Warning size={36} weight="duotone" className="text-error mx-auto mb-3" />
            <h3 className="font-semibold text-neutral-900 mb-1">Fshi Përdoruesin?</h3>
            <p className="text-sm text-neutral-500 mb-5">Ky veprim nuk mund të kthehet prapa.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2 border border-border rounded-md text-sm text-neutral-600 hover:bg-neutral-50 cursor-pointer"
              >
                Anulo
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={isMutating}
                className="flex-1 py-2 bg-error text-white rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50 cursor-pointer"
              >
                Fshi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
