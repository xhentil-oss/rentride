import React, { useState } from "react";
import { Link, useLocation, Outlet, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Car,
  Users,
  CalendarBlank,
  ChartBar,
  List,
  MagnifyingGlass,
  SignOut,
  Gauge,
  CurrencyDollar,
  UserGear,
  ShieldCheck,
  Wrench,
  SpinnerGap,
  Star,
  Tag,
  Images,
  Gear,
  Article,
  Package,
  UploadSimple,
} from "@phosphor-icons/react";
import { useAuth } from "../hooks/useApi";
import NotificationPanel from "../components/NotificationPanel";

const navItems = [
  { label: "Dashboard", href: "/admin", icon: Gauge, group: "main" },
  { label: "Flota", href: "/admin/flota", icon: Car, group: "main" },
  { label: "Klientët", href: "/admin/klientet", icon: Users, group: "main" },
  { label: "Rezervimet", href: "/admin/rezervime", icon: CalendarBlank, group: "main" },
  { label: "Kalendari", href: "/admin/kalendar", icon: CalendarBlank, group: "main" },
  { label: "Financat", href: "/admin/financa", icon: CurrencyDollar, group: "main" },
  { label: "Raportet", href: "/admin/raporte", icon: ChartBar, group: "main" },
  { label: "Fleet Mgmt", href: "/admin/fleet", icon: Wrench, group: "main" },
  { label: "Ofertat & Çmimet", href: "/admin/ofertat", icon: Tag, group: "main" },
  { label: "Extras & Sigurime", href: "/admin/extras", icon: Package, group: "main" },
  { label: "Çmimet Mujore", href: "/admin/cmime-mujore", icon: CalendarBlank, group: "main" },
  { label: "Media", href: "/admin/media", icon: Images, group: "main" },
  { label: "Vlerësimet", href: "/admin/vleresimet", icon: Star, group: "system" },
  { label: "Përdoruesit", href: "/admin/perdoruesit", icon: UserGear, group: "system" },
  { label: "Cilësimet", href: "/admin/cilesimet", icon: Gear, group: "system" },
  { label: "Blog", href: "/admin/blog", icon: Article, group: "system" },
  { label: "Importo", href: "/admin/importo", icon: UploadSimple, group: "system" },
];

function AdminLoginForm({
  login,
  loginWith2FA,
}: {
  login: (email: string, password: string) => Promise<any>;
  loginWith2FA: (tempToken: string, otp: string) => Promise<any>;
}) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // 2FA step
  const [twoFAStep, setTwoFAStep] = useState(false);
  const [tempToken, setTempToken] = useState("");
  const [otpCode, setOtpCode] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await login(email, password);
      if (result?.requires2fa) {
        setTempToken(result.tempToken);
        setTwoFAStep(true);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("errors.loginFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleTwoFA = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await loginWith2FA(tempToken, otpCode);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Kodi OTP është i gabuar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-background px-6">
      <div className="bg-white rounded-xl border border-border p-10 max-w-sm w-full shadow-md">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <ShieldCheck size={28} weight="duotone" className="text-primary" />
        </div>
        <h1 className="text-xl font-semibold text-neutral-900 mb-2 text-center">Paneli Admin</h1>

        {twoFAStep ? (
          <>
            <p className="text-sm text-neutral-500 mb-6 text-center">Shkruani kodin 6-shifror nga aplikacioni juaj autentifikues.</p>
            {error && <p className="text-sm text-error bg-red-50 rounded-md px-3 py-2 mb-4 text-center">{error}</p>}
            <form onSubmit={handleTwoFA} className="flex flex-col gap-3">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                required
                autoFocus
                aria-label="Kodi 6-shifror i autentifikimit dy-faktorësh"
                autoComplete="one-time-code"
                className="w-full px-4 py-3 text-sm border border-border rounded-md outline-none focus:border-primary transition-colors tracking-widest text-center font-mono"
              />
              <button
                type="submit"
                disabled={loading || otpCode.length !== 6}
                className="w-full py-3 rounded-full text-sm font-semibold text-white bg-primary hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer border-0 mt-1"
              >
                {loading ? "Duke verifikuar..." : "Konfirmo"}
              </button>
              <button
                type="button"
                onClick={() => { setTwoFAStep(false); setOtpCode(""); setError(""); }}
                className="text-xs text-neutral-400 underline cursor-pointer bg-transparent border-0 text-center"
              >
                Kthehu te kyçja
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="text-sm text-neutral-500 mb-6 text-center">Kyçuni për të aksesuar panelin e administrimit.</p>
            {error && <p className="text-sm text-error bg-red-50 rounded-md px-3 py-2 mb-4 text-center">{error}</p>}
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 text-sm border border-border rounded-md outline-none focus:border-primary transition-colors"
              />
              <input
                type="password"
                placeholder="Fjalëkalimi"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 text-sm border border-border rounded-md outline-none focus:border-primary transition-colors"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-full text-sm font-semibold text-white bg-primary hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer border-0 mt-1"
              >
                {loading ? "Duke u kyçur..." : "Kyçu"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default function AdminLayout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { user, isPending, isAnonymous, login, loginWith2FA, logout } = useAuth();

  // Still loading auth state
  if (isPending) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-neutral-400">
          <SpinnerGap size={32} className="animate-spin text-primary" />
          <p className="text-sm">Duke verifikuar hyrjen...</p>
        </div>
      </div>
    );
  }

  // Not logged in → show login form
  if (isAnonymous) {
    return <AdminLoginForm login={login} loginWith2FA={loginWith2FA} />;
  }

  // Role-based access control — only admin, manager, staff can access admin panel
  const allowedRoles = ['admin', 'manager', 'staff'];
  if (!user?.role || !allowedRoles.includes(user.role)) {
    return (
      <div className="flex h-screen items-center justify-center bg-background px-6">
        <div className="bg-white rounded-xl border border-border p-10 max-w-sm w-full shadow-md text-center">
          <ShieldCheck size={40} weight="duotone" className="text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-neutral-900 mb-2">Akses i Refuzuar</h1>
          <p className="text-sm text-neutral-500 mb-6">Nuk keni leje të aksesoni panelin e administrimit.</p>
          <button onClick={() => logout()} className="px-5 py-2 rounded-md text-sm font-medium text-white bg-primary hover:bg-primary/90 cursor-pointer border-0">
            Shkyçu
          </button>
        </div>
      </div>
    );
  }

  const isActive = (href: string) => {
    if (href === "/admin") return location.pathname === "/admin";
    return location.pathname.startsWith(href);
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`fixed lg:relative z-40 h-full bg-admin-sidebar flex flex-col transition-all duration-300 ${
          collapsed ? "w-20" : "w-64"
        } ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        aria-label="Admin navigimi"
      >
        <div
          className={`flex items-center gap-3 px-4 py-5 border-b border-neutral-800 ${collapsed ? "justify-center" : ""}`}
        >
          <div className="w-8 h-8 rounded-md bg-gradient-primary flex items-center justify-center shrink-0">
            <Car size={16} weight="fill" className="text-white" />
          </div>
          {!collapsed && (
            <span className="font-semibold text-white text-sm">
              Rent Ride Admin
            </span>
          )}
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          {/* Main nav */}
          {navItems.filter(i => i.group === "main").map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              to={href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 mx-2 rounded-md transition-colors duration-200 no-underline mb-1 !text-white ${
                collapsed ? "justify-center" : ""
              } ${
                isActive(href)
                  ? "bg-admin-sidebar-active"
                  : "hover:bg-admin-sidebar-hover"
              }`}
              title={collapsed ? label : undefined}
              aria-label={label}
            >
              <Icon size={20} weight="regular" />
              {!collapsed && (
                <span className="text-sm font-medium">{label}</span>
              )}
            </Link>
          ))}

          {/* Divider + System group */}
          <div className={`mx-4 my-3 border-t border-neutral-700 ${collapsed ? "mx-2" : ""}`} />
          {!collapsed && (
            <p className="px-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
              Sistemi
            </p>
          )}
          {navItems.filter(i => i.group === "system").map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              to={href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 mx-2 rounded-md transition-colors duration-200 no-underline mb-1 !text-white ${
                collapsed ? "justify-center" : ""
              } ${
                isActive(href)
                  ? "bg-admin-sidebar-active"
                  : "hover:bg-admin-sidebar-hover"
              }`}
              title={collapsed ? label : undefined}
              aria-label={label}
            >
              <Icon size={20} weight="regular" />
              {!collapsed && (
                <span className="text-sm font-medium">{label}</span>
              )}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-neutral-800">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`flex items-center gap-3 w-full px-2 py-2 rounded-md text-white hover:bg-admin-sidebar-hover hover:text-white transition-colors duration-200 cursor-pointer ${collapsed ? "justify-center" : ""}`}
            aria-label={collapsed ? "Zgjero menunë" : "Mbledh menunë"}
          >
            <List size={20} weight="regular" />
            {!collapsed && <span className="text-sm">Mbledh</span>}
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-neutral-900/55 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-16 bg-white/70 backdrop-blur-md border-b border-border flex items-center justify-between px-6 shrink-0 z-20">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 rounded-md text-neutral-600 hover:bg-secondary transition-colors duration-200 cursor-pointer"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Hap menunë"
            >
              <List size={20} weight="regular" />
            </button>
            <div className="relative hidden md:block">
              <MagnifyingGlass
                size={16}
                weight="regular"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
              />
              <input
                type="search"
                placeholder="Kërko..."
                className="pl-9 pr-4 py-2 rounded-md border border-border text-sm text-neutral-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary placeholder:text-neutral-400 w-64"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <NotificationPanel />
            <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center" title={user?.email ?? ""}>
              <span className="text-xs font-medium text-white">
                {user?.name ? user.name[0].toUpperCase() : user?.email?.[0]?.toUpperCase() ?? "A"}
              </span>
            </div>
            <button
              onClick={() => logout()}
              className="hidden md:flex items-center gap-1.5 text-sm text-neutral-600 hover:text-primary transition-colors duration-200 cursor-pointer bg-transparent border-0"
            >
              <SignOut size={16} weight="regular" />
              Dil
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6" id="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
