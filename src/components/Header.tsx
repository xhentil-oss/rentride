import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Car,
  List,
  X,
  Phone,
  SignOut,
  SignIn,
  CalendarBlank,
  ShieldCheck,
  CaretDown,
  SpinnerGap,
  Globe,
  UserPlus,
  Star,
  SealCheck,
  Headset,
} from "@phosphor-icons/react";
import { useAuth } from "../hooks/useApi";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import { trackEvent } from "../lib/track";
import { useLocale } from "../hooks/useLocale";
import { useSiteLogo } from "../hooks/useSiteLogo";
import LLink from "./LLink";

// Google Identity Services — loaded lazily when the auth dropdown opens.
const GSI_SRC = "https://accounts.google.com/gsi/client";
const GOOGLE_CLIENT_ID = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || "";
let activeGoogleCallback: ((resp: { credential?: string }) => void) | null = null;
let initializedGoogleClientId = "";

function loadGsiScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if ((window as any).google?.accounts?.id) return Promise.resolve();
  const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SRC}"]`);
  if (existing) {
    return new Promise((resolve) => existing.addEventListener("load", () => resolve(), { once: true }));
  }
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = GSI_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Google script"));
    document.head.appendChild(s);
  });
}

function GoogleSignInButton({ onCredential, onError }: { onCredential: (c: string) => void; onError: (msg: string) => void }) {
  const divRef = useRef<HTMLDivElement>(null);
  const callbacksRef = useRef({ onCredential, onError });

  useEffect(() => {
    callbacksRef.current = { onCredential, onError };
  }, [onCredential, onError]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !divRef.current) return;
    let cancelled = false;
    const localCallback = (resp: { credential?: string }) => {
      const callbacks = callbacksRef.current;
      if (resp?.credential) callbacks.onCredential(resp.credential);
      else callbacks.onError(i18n.t("header.errors.googleSignIn"));
    };
    activeGoogleCallback = localCallback;

    loadGsiScript()
      .then(() => {
        if (cancelled || !divRef.current) return;
        const g = (window as any).google;
        if (!g?.accounts?.id) return;
        if (initializedGoogleClientId !== GOOGLE_CLIENT_ID) {
          g.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: (resp: { credential?: string }) => activeGoogleCallback?.(resp),
          });
          initializedGoogleClientId = GOOGLE_CLIENT_ID;
        }
        divRef.current.innerHTML = "";
        g.accounts.id.renderButton(divRef.current, {
          theme: "outline",
          size: "large",
          width: 280,
          text: "continue_with",
          shape: "rectangular",
          logo_alignment: "left",
        });
      })
      .catch(() => onError(i18n.t("header.errors.googleLoad")));
    return () => {
      cancelled = true;
      if (activeGoogleCallback === localCallback) activeGoogleCallback = null;
    };
  }, []);

  if (!GOOGLE_CLIENT_ID) return null;
  return <div ref={divRef} className="flex justify-center" />;
}

function LanguageSwitcher({ onAfterSelect }: { onAfterSelect?: () => void }) {
  const { lang, switchLang } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const LANG_INFO: Record<string, { flag: string; code: string; label: string }> = {
    sq: { flag: "🇦🇱", code: "AL", label: "Shqip" },
    en: { flag: "🇬🇧", code: "EN", label: "English" },
    fr: { flag: "🇫🇷", code: "FR", label: "Français" },
    es: { flag: "🇪🇸", code: "ES", label: "Español" },
    it: { flag: "🇮🇹", code: "IT", label: "Italiano" },
  };
  const ORDER = ["sq", "en", "fr", "es", "it"] as const;
  const current = LANG_INFO[lang] ?? LANG_INFO.sq;

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-md border border-border bg-azure hover:bg-neutral-100 transition-colors cursor-pointer"
        aria-label={current.label}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="text-base leading-none">{current.flag}</span>
        <span>{current.code}</span>
        <CaretDown size={10} weight="bold" className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-lg border border-border shadow-lg overflow-hidden z-50">
          {ORDER.map((l) => {
            const info = LANG_INFO[l];
            const active = lang === l;
            return (
              <button
                key={l}
                onClick={() => { switchLang(l); setOpen(false); onAfterSelect?.(); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors cursor-pointer ${
                  active ? "bg-primary/10 text-primary font-semibold" : "text-neutral-700 hover:bg-neutral-50"
                }`}
                role="menuitem"
              >
                <span className="text-base leading-none">{info.flag}</span>
                <span className="flex-1 text-left">{info.label}</span>
                {active && <span className="text-primary">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function UserMenu() {
  const { user, isPending, isAnonymous, login, loginWith2FA, requestLoginCode, loginWithCode, register, googleLogin, logout, forgotPassword } = useAuth();
  const { localePath } = useLocale();
  const [open, setOpen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "register" | "forgot">("login");

  // Allow other pages (e.g. MyAccountPage's "Register Free" CTA) to open this
  // auth dropdown by dispatching `new CustomEvent("openAuth", { detail: { tab } })`.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { tab?: "login" | "register" | "forgot" } | undefined;
      setAuthTab(detail?.tab ?? "login");
      setShowAuth(true);
    };
    window.addEventListener("openAuth", handler);
    return () => window.removeEventListener("openAuth", handler);
  }, []);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  // 2FA step
  const [twoFAStep, setTwoFAStep] = useState(false);
  const [tempToken, setTempToken] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [twoFAError, setTwoFAError] = useState("");
  const [twoFALoading, setTwoFALoading] = useState(false);
  // Passwordless email-code login (admin/staff)
  const [codeMode, setCodeMode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [loginCode, setLoginCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [codeInfo, setCodeInfo] = useState("");
  const [codeLoading, setCodeLoading] = useState(false);
  // Forgot password
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  // Register
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPass, setRegPass] = useState("");
  const [regPass2, setRegPass2] = useState("");
  const [regError, setRegError] = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const isAdmin = !isAnonymous && user?.role && ['admin', 'manager', 'staff'].includes(user.role);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const { t } = useTranslation();

  if (isPending) {
    return (
      <div className="w-9 h-9 flex items-center justify-center">
        <SpinnerGap size={18} className="animate-spin text-neutral-400" />
      </div>
    );
  }

  if (isAnonymous) {
    const handleLogin = () => {
      setLoginLoading(true);
      setLoginError("");
      login(loginEmail, loginPass)
        .then((result: any) => {
          if (result?.requires2fa) {
            setTempToken(result.tempToken);
            setTwoFAStep(true);
          } else {
            setShowAuth(false);
          }
        })
        .catch((err: Error) => setLoginError(err.message || t("header.errors.loginFailed")))
        .finally(() => setLoginLoading(false));
    };

    const handleTwoFA = () => {
      setTwoFALoading(true);
      setTwoFAError("");
      loginWith2FA(tempToken, otpCode)
        .then(() => { setShowAuth(false); setTwoFAStep(false); })
        .catch((err: Error) => setTwoFAError(err.message || t("header.errors.otpWrong")))
        .finally(() => setTwoFALoading(false));
    };

    const handleForgot = () => {
      setForgotLoading(true);
      setForgotError("");
      forgotPassword(forgotEmail)
        .then(() => setForgotSent(true))
        .catch((err: Error) => setForgotError(err.message || t("header.errors.requestFailed")))
        .finally(() => setForgotLoading(false));
    };

    const handleRequestCode = () => {
      setCodeLoading(true);
      setCodeError("");
      setCodeInfo("");
      requestLoginCode(loginEmail)
        .then(() => { setCodeSent(true); setCodeInfo("Nëse ky email i përket stafit, kodi u dërgua. Kontrollo edhe Spam."); })
        .catch((err: Error) => setCodeError(err.message || "Dërgimi i kodit dështoi"))
        .finally(() => setCodeLoading(false));
    };

    const handleVerifyCode = () => {
      setCodeLoading(true);
      setCodeError("");
      loginWithCode(loginEmail, loginCode)
        .then(() => { setShowAuth(false); setCodeMode(false); setCodeSent(false); setLoginCode(""); })
        .catch((err: Error) => setCodeError(err.message || "Kodi i pavlefshëm"))
        .finally(() => setCodeLoading(false));
    };

    const handleRegister = () => {
      const trimmedName = regName.trim();
      const trimmedEmail = regEmail.trim();
      if (!trimmedName) { setRegError(t("header.errors.nameRequired")); return; }
      // Basic RFC-ish email check — UX guard; backend re-validates.
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) { setRegError(t("header.errors.invalidEmail")); return; }
      if (regPass !== regPass2) { setRegError(t("header.errors.passwordMismatch")); return; }
      if (regPass.length < 8) { setRegError(t("header.errors.passwordTooShort")); return; }
      setRegLoading(true);
      setRegError("");
      register(trimmedName, trimmedEmail, regPass, regPhone.trim())
        .then(() => setShowAuth(false))
        .catch((err: Error) => setRegError(err.message || t("header.errors.registerFailed")))
        .finally(() => setRegLoading(false));
    };

    const handleGoogleCredential = (credential: string) => {
      setLoginError("");
      setRegError("");
      setLoginLoading(true);
      googleLogin(credential)
        .then(() => setShowAuth(false))
        .catch((err: Error) => {
          const msg = err.message || "Hyrja me Google dështoi";
          if (authTab === "register") setRegError(msg);
          else setLoginError(msg);
        })
        .finally(() => setLoginLoading(false));
    };

    return (
      <div className="relative" ref={ref}>
        <button
          onClick={() => setShowAuth(!showAuth)}
          className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium border border-neutral-300 text-neutral-700 hover:bg-neutral-50 transition-colors duration-200 cursor-pointer bg-white shadow-sm"
        >
          <SignIn size={16} weight="bold" />
          {t("header.login", "Hyr")}
        </button>

        {showAuth && (
          <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-border shadow-lg z-50 overflow-hidden">
            {/* Tabs — hidden in 2FA step */}
            {!twoFAStep && authTab !== "forgot" && (
              <div className="flex border-b border-border">
                <button
                  onClick={() => setAuthTab("login")}
                  className={`flex-1 py-2.5 text-sm font-medium cursor-pointer border-0 transition-colors ${authTab === "login" ? "bg-white text-primary border-b-2 border-primary" : "bg-neutral-50 text-neutral-500 hover:text-neutral-700"}`}
                >
                  <SignIn size={14} weight="bold" className="inline mr-1.5 -mt-0.5" />
                  Hyr
                </button>
                <button
                  onClick={() => setAuthTab("register")}
                  className={`flex-1 py-2.5 text-sm font-medium cursor-pointer border-0 transition-colors ${authTab === "register" ? "bg-white text-primary border-b-2 border-primary" : "bg-neutral-50 text-neutral-500 hover:text-neutral-700"}`}
                >
                  <UserPlus size={14} weight="bold" className="inline mr-1.5 -mt-0.5" />
                  Regjistrohu
                </button>
              </div>
            )}

            <div className="p-4">
              {/* ── 2FA Step ── */}
              {twoFAStep ? (
                <>
                  <p className="text-xs font-medium text-neutral-700 mb-1">Autentifikim me dy faktorë</p>
                  <p className="text-xs text-neutral-500 mb-3">Shkruani kodin 6-shifror nga aplikacioni tuaj autentifikues.</p>
                  {twoFAError && <p className="text-xs text-error mb-2">{twoFAError}</p>}
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    onKeyDown={(e) => { if (e.key === "Enter") handleTwoFA(); }}
                    className="w-full px-3 py-2 text-sm border border-border rounded-md mb-3 outline-none focus:border-primary tracking-widest text-center font-mono"
                    autoFocus
                  />
                  <button
                    disabled={twoFALoading || otpCode.length !== 6}
                    onClick={handleTwoFA}
                    className="w-full py-2 rounded-md text-sm font-medium text-white bg-primary hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer border-0"
                  >
                    {twoFALoading ? "Duke verifikuar..." : "Konfirmo"}
                  </button>
                  <button
                    onClick={() => { setTwoFAStep(false); setOtpCode(""); setTwoFAError(""); }}
                    className="mt-2 w-full text-xs text-neutral-400 underline cursor-pointer bg-transparent border-0"
                  >
                    Kthehu te kyçja
                  </button>
                </>
              ) : authTab === "forgot" ? (
                /* ── Forgot Password ── */
                <>
                  <p className="text-xs font-medium text-neutral-700 mb-1">Rivendos fjalëkalimin</p>
                  {forgotSent ? (
                    <p className="text-xs text-green-600 mb-3">Nëse emaili ekziston, keni marrë udhëzime për rivendosjen.</p>
                  ) : (
                    <>
                      <p className="text-xs text-neutral-500 mb-3">Shkruani emailin tuaj dhe do t'ju dërgojmë udhëzime.</p>
                      {forgotError && <p className="text-xs text-error mb-2">{forgotError}</p>}
                      <input
                        type="email"
                        placeholder="Email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleForgot(); }}
                        className="w-full px-3 py-2 text-sm border border-border rounded-md mb-3 outline-none focus:border-primary"
                        autoFocus
                      />
                      <button
                        disabled={forgotLoading || !forgotEmail}
                        onClick={handleForgot}
                        className="w-full py-2 rounded-md text-sm font-medium text-white bg-primary hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer border-0"
                      >
                        {forgotLoading ? "Duke dërguar..." : "Dërgo linkun"}
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => { setAuthTab("login"); setForgotSent(false); setForgotEmail(""); setForgotError(""); }}
                    className="mt-2 w-full text-xs text-neutral-400 underline cursor-pointer bg-transparent border-0"
                  >
                    Kthehu te kyçja
                  </button>
                </>
              ) : authTab === "login" && codeMode ? (
                /* ── Login me kod në email (vetëm staf) ── */
                <>
                  {codeError && <p className="text-xs text-error mb-2">{codeError}</p>}
                  {codeInfo && <p className="text-xs text-success mb-2">{codeInfo}</p>}
                  <input
                    type="email"
                    placeholder="Email i stafit"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    disabled={codeSent}
                    className="w-full px-3 py-2 text-sm border border-border rounded-md mb-2 outline-none focus:border-primary disabled:bg-neutral-50 disabled:text-neutral-500"
                  />
                  {codeSent && (
                    <input
                      inputMode="numeric"
                      autoFocus
                      maxLength={6}
                      placeholder="Kodi 6-shifror"
                      value={loginCode}
                      onChange={(e) => setLoginCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      onKeyDown={(e) => { if (e.key === "Enter") handleVerifyCode(); }}
                      className="w-full px-3 py-2 text-sm border border-border rounded-md mb-2 outline-none focus:border-primary tracking-[0.4em] text-center"
                    />
                  )}
                  <button
                    disabled={codeLoading || !loginEmail || (codeSent && loginCode.length < 6)}
                    onClick={codeSent ? handleVerifyCode : handleRequestCode}
                    className="w-full py-2 rounded-md text-sm font-medium text-white bg-primary hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer border-0"
                  >
                    {codeLoading ? "Duke punuar..." : codeSent ? "Hyr" : "Dërgo kodin"}
                  </button>
                  {codeSent && (
                    <button
                      onClick={handleRequestCode}
                      disabled={codeLoading}
                      className="mt-2 w-full text-xs text-neutral-400 hover:text-primary underline cursor-pointer bg-transparent border-0"
                    >
                      Dërgo përsëri kodin
                    </button>
                  )}
                  <button
                    onClick={() => { setCodeMode(false); setCodeSent(false); setLoginCode(""); setCodeError(""); setCodeInfo(""); }}
                    className="mt-2 w-full text-xs text-neutral-400 hover:text-primary underline cursor-pointer bg-transparent border-0"
                  >
                    ← Hyr me fjalëkalim
                  </button>
                </>
              ) : authTab === "login" ? (
                /* ── Login ── */
                <>
                  {loginError && <p className="text-xs text-error mb-2">{loginError}</p>}
                  <input
                    type="email"
                    placeholder="Email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-border rounded-md mb-2 outline-none focus:border-primary"
                  />
                  <input
                    type="password"
                    placeholder="Fjalëkalimi"
                    value={loginPass}
                    onChange={(e) => setLoginPass(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleLogin(); }}
                    className="w-full px-3 py-2 text-sm border border-border rounded-md mb-1 outline-none focus:border-primary"
                  />
                  <div className="text-right mb-3">
                    <button
                      onClick={() => { setAuthTab("forgot"); setForgotEmail(loginEmail); }}
                      className="text-xs text-neutral-400 hover:text-primary underline cursor-pointer bg-transparent border-0"
                    >
                      Harrova fjalëkalimin
                    </button>
                  </div>
                  <button
                    disabled={loginLoading || !loginEmail || !loginPass}
                    onClick={handleLogin}
                    className="w-full py-2 rounded-md text-sm font-medium text-white bg-primary hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer border-0"
                  >
                    {loginLoading ? "Duke hyrë..." : "Hyr"}
                  </button>
                  <button
                    onClick={() => { setCodeMode(true); setCodeError(""); setCodeInfo(""); setLoginError(""); }}
                    className="mt-2 w-full text-xs text-neutral-500 hover:text-primary underline cursor-pointer bg-transparent border-0"
                  >
                    Hyr me kod në email (staf)
                  </button>
                  {GOOGLE_CLIENT_ID && (
                    <>
                      <div className="flex items-center gap-2 my-3">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-[10px] text-neutral-400 uppercase tracking-wide">ose</span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                      <GoogleSignInButton onCredential={handleGoogleCredential} onError={setLoginError} />
                    </>
                  )}
                  <p className="mt-3 text-xs text-center text-neutral-400">
                    Nuk ke llogari?{" "}
                    <button onClick={() => setAuthTab("register")} className="text-primary underline cursor-pointer bg-transparent border-0 text-xs">
                      Regjistrohu falas
                    </button>
                  </p>
                </>
              ) : (
                /* ── Register ── */
                <>
                  {regError && <p className="text-xs text-error mb-2">{regError}</p>}
                  <input
                    type="text"
                    placeholder="Emri i plotë *"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-border rounded-md mb-2 outline-none focus:border-primary"
                  />
                  <input
                    type="email"
                    placeholder="Email *"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-border rounded-md mb-2 outline-none focus:border-primary"
                  />
                  <input
                    type="tel"
                    placeholder="Telefoni (opsional)"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-border rounded-md mb-2 outline-none focus:border-primary"
                  />
                  <input
                    type="password"
                    placeholder="Fjalëkalimi * (min 8 karaktere)"
                    value={regPass}
                    onChange={(e) => setRegPass(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-border rounded-md mb-2 outline-none focus:border-primary"
                  />
                  <input
                    type="password"
                    placeholder="Konfirmo fjalëkalimin *"
                    value={regPass2}
                    onChange={(e) => setRegPass2(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleRegister(); }}
                    className="w-full px-3 py-2 text-sm border border-border rounded-md mb-3 outline-none focus:border-primary"
                  />
                  <button
                    disabled={regLoading || !regName || !regEmail || !regPass || !regPass2}
                    onClick={handleRegister}
                    className="w-full py-2 rounded-md text-sm font-medium text-white bg-primary hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer border-0"
                  >
                    {regLoading ? "Duke regjistruar..." : "Krijo llogarinë"}
                  </button>
                  {GOOGLE_CLIENT_ID && (
                    <>
                      <div className="flex items-center gap-2 my-3">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-[10px] text-neutral-400 uppercase tracking-wide">ose</span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                      <GoogleSignInButton onCredential={handleGoogleCredential} onError={setRegError} />
                    </>
                  )}
                  <p className="mt-3 text-xs text-center text-neutral-400">
                    Ke llogari?{" "}
                    <button onClick={() => setAuthTab("login")} className="text-primary underline cursor-pointer bg-transparent border-0 text-xs">
                      Hyr këtu
                    </button>
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? "U";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-neutral-700 hover:bg-azure transition-colors duration-200 cursor-pointer bg-transparent border-0"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <div className="w-7 h-7 rounded-full bg-gradient-primary flex items-center justify-center">
          <span className="text-[11px] font-semibold text-white">{initials}</span>
        </div>
        <span className="hidden sm:block max-w-[120px] truncate">
          {user?.name || user?.email}
        </span>
        <CaretDown
          size={14}
          weight="bold"
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl border border-border shadow-lg z-50 py-1 overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold text-neutral-900 truncate">
              {user?.name || t("header.user")}
            </p>
            <p className="text-xs text-neutral-500 truncate">{user?.email}</p>
          </div>

          <div className="py-1">
            <button
              onClick={() => { navigate(localePath("/llogaria")); setOpen(false); }}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-neutral-700 hover:bg-azure hover:text-primary transition-colors duration-200 cursor-pointer bg-transparent border-0 text-left"
            >
              <CalendarBlank size={16} weight="regular" className="text-neutral-400" />
              {t("header.myReservations")}
            </button>

            {isAdmin && (
              <button
                onClick={() => { navigate("/admin"); setOpen(false); }}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-neutral-700 hover:bg-azure hover:text-primary transition-colors duration-200 cursor-pointer bg-transparent border-0 text-left"
              >
                <ShieldCheck size={16} weight="regular" className="text-neutral-400" />
                {t("header.adminPanel")}
              </button>
            )}
          </div>

          <div className="border-t border-border py-1">
            <button
              onClick={() => { logout(); setOpen(false); }}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-error hover:bg-red-50 transition-colors duration-200 cursor-pointer bg-transparent border-0 text-left"
            >
              <SignOut size={16} weight="regular" />
              {t("header.logout")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MobileUserMenu({ onClose }: { onClose: () => void }) {
  const { user, isAnonymous, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { localePath } = useLocale();

  if (isAnonymous) {
    return (
      <button
        onClick={() => { navigate("/admin"); onClose(); }}
        className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-full text-sm font-medium border border-neutral-300 text-neutral-700 hover:bg-neutral-50 transition-colors duration-200 cursor-pointer bg-white shadow-sm"
      >
        <SignIn size={16} weight="bold" />
        {t("header.login", "Hyr")}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-3 px-4 py-2 rounded-md bg-azure">
        <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center shrink-0">
          <span className="text-xs font-semibold text-white">
            {user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? "U"}
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-neutral-900 truncate">{user?.name || t("header.user")}</p>
          <p className="text-xs text-neutral-500 truncate">{user?.email}</p>
        </div>
      </div>
      <button
        onClick={() => { navigate(localePath("/llogaria")); onClose(); }}
        className="flex items-center gap-3 px-4 py-2.5 rounded-md text-sm text-neutral-700 hover:bg-azure transition-colors duration-200 cursor-pointer bg-transparent border-0 text-left w-full"
      >
        <CalendarBlank size={16} weight="regular" className="text-neutral-400" />
        {t("header.myReservations")}
      </button>
      <button
        onClick={() => { logout(); onClose(); }}
        className="flex items-center gap-3 px-4 py-2.5 rounded-md text-sm text-error hover:bg-red-50 transition-colors duration-200 cursor-pointer bg-transparent border-0 text-left w-full"
      >
        <SignOut size={16} weight="regular" />
        {t("header.logout")}
      </button>
    </div>
  );
}

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { localePath } = useLocale();
  const logoUrl = useSiteLogo();

  const navLinks = [
    { label: t("header.fleet"), href: "/flota" },
    { label: "Blog", href: "/blog" },
    { label: t("header.reviews"), href: "/vleresime", badge: "★ 4.9" },
    { label: t("header.about"), href: "/", anchor: "rreth-nesh" },
    { label: t("header.contact"), href: "/kontakt" },
  ];

  const scrollToAnchor = (anchor: string) => {
    const el = document.getElementById(anchor);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleNavClick = (link: typeof navLinks[number]) => {
    if (link.anchor) {
      const homePath = localePath("/");
      if (location.pathname === homePath || location.pathname === "/") {
        scrollToAnchor(link.anchor);
      } else {
        navigate(homePath);
        setTimeout(() => scrollToAnchor(link.anchor), 300);
      }
    }
  };

  const isActive = (href: string) => {
    const localHref = localePath(href);
    if (href === "/") return location.pathname === "/" || location.pathname === "/en";
    return location.pathname.startsWith(localHref);
  };

  return (
    <header className="sticky top-0 z-50 bg-navy border-b border-navy-light">
      {/* Trust bar — desktop only */}
      <div className="hidden md:block bg-navy-dark text-white text-xs">
        <div className="max-w-[1440px] mx-auto px-6 py-1.5 flex items-center justify-center gap-6">
          <span className="flex items-center gap-1.5">
            <Star size={11} weight="fill" className="text-yellow-400" />
            <span className="font-semibold">4.9/5</span>
            <span className="text-neutral-400 mx-1">·</span>
            <span className="text-neutral-300">{t("header.trustClients")}</span>
          </span>
          <span className="text-neutral-600">|</span>
          <span className="flex items-center gap-1.5">
            <SealCheck size={11} weight="fill" className="text-green-400" />
            <span className="text-neutral-300">{t("header.trustNoFees")}</span>
          </span>
          <span className="text-neutral-600">|</span>
          <span className="flex items-center gap-1.5">
            <Headset size={11} weight="fill" className="text-primary" />
            <span className="text-neutral-300">{t("header.trustSupport")}</span>
          </span>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-6 flex items-center justify-between" style={{ height: "72px" }}>
        {/* Logo */}
        <LLink
          to="/"
          onClick={() => window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior })}
          className="flex items-center gap-2 no-underline"
          aria-label="Rent Ride - Kryefaqja"
        >
          {logoUrl ? (
            <img src={logoUrl} alt="Rent Ride" className="h-10 w-auto max-w-[200px] object-contain" />
          ) : (
            <>
              <div className="w-9 h-9 rounded-md bg-gradient-primary flex items-center justify-center">
                <Car size={20} weight="fill" className="text-white" />
              </div>
              <span className="font-semibold text-lg text-white leading-tight">
                Rent <span className="text-primary">Ride</span>
              </span>
            </>
          )}
        </LLink>

        {/* Desktop Nav */}
        <nav
          className="hidden md:flex items-center gap-1"
          aria-label="Navigimi kryesor"
        >
          {navLinks.map((link) =>
            link.anchor ? (
              <button
                key={link.anchor}
                onClick={() => handleNavClick(link)}
                className={`px-4 py-3 rounded-full text-sm font-medium transition-colors duration-200 no-underline cursor-pointer border-0 bg-transparent ${
                  "text-neutral-200 hover:text-white hover:bg-white/10"
                }`}
              >
                {link.label}
              </button>
            ) : (
              <LLink
                key={link.href}
                to={link.href}
                className={`px-4 py-3 rounded-full text-sm font-medium transition-colors duration-200 no-underline cursor-pointer inline-flex items-center gap-1.5 ${
                  isActive(link.href)
                    ? "text-primary"
                    : "text-neutral-200 hover:text-white hover:bg-white/10"
                }`}
              >
                {link.label}
                {link.badge && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-yellow-100 text-yellow-700 leading-none">
                    {link.badge}
                  </span>
                )}
              </LLink>
            )
          )}
        </nav>

        {/* Desktop Right */}
        <div className="hidden md:flex items-center gap-3">
          <a
            href="tel:+355698145803"
            onClick={() => trackEvent("phone_click")}
            className="flex items-center gap-2 text-sm text-neutral-200 hover:text-white transition-colors duration-200 no-underline px-3 py-2"
          >
            <Phone size={16} weight="regular" />
            <span>{t("header.phone")}</span>
          </a>

          <LanguageSwitcher />
          <UserMenu />

          <LLink
            to="/rezervo"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-full text-sm font-medium bg-primary text-primary-foreground hover:bg-primary-hover transition-colors duration-200 no-underline"
          >
            {t("header.bookNow")}
          </LLink>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-md text-white hover:bg-white/10 transition-colors duration-200"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Mbyll menunë" : "Hap menunë"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? (
            <X size={24} weight="regular" />
          ) : (
            <List size={24} weight="regular" />
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-navy border-b border-navy-light z-50 shadow-lg">
          <nav className="flex flex-col p-4 gap-1" aria-label="Navigimi mobil">
            {navLinks.map((link) =>
              link.anchor ? (
                <button
                  key={link.anchor}
                  onClick={() => { setMobileOpen(false); handleNavClick(link); }}
                  className={`px-4 py-3 rounded-full text-sm font-medium transition-colors duration-200 no-underline cursor-pointer border-0 bg-transparent text-left ${
                    "text-neutral-200 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {link.label}
                </button>
              ) : (
                <LLink
                  key={link.href}
                  to={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`px-4 py-3 rounded-full text-sm font-medium transition-colors duration-200 no-underline inline-flex items-center gap-2 ${
                    isActive(link.href)
                      ? "text-primary"
                      : "text-neutral-200 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {link.label}
                  {link.badge && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-yellow-100 text-yellow-700 leading-none">
                      {link.badge}
                    </span>
                  )}
                </LLink>
              )
            )}
            {/* Trust strip — mobile */}
            <div className="mx-4 my-2 px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 grid grid-cols-3 gap-1 text-center">
              <span className="flex flex-col items-center gap-0.5">
                <Star size={12} weight="fill" className="text-yellow-400" />
                <span className="text-[10px] font-semibold text-white">4.9/5</span>
                <span className="text-[9px] text-neutral-300">{t("header.trustClients")}</span>
              </span>
              <span className="flex flex-col items-center gap-0.5 border-x border-white/10">
                <SealCheck size={12} weight="fill" className="text-green-400" />
                <span className="text-[10px] font-semibold text-white">{t("header.trustNoFees")}</span>
              </span>
              <span className="flex flex-col items-center gap-0.5">
                <Headset size={12} weight="fill" className="text-primary" />
                <span className="text-[10px] font-semibold text-white">{t("header.trustSupport")}</span>
              </span>
            </div>

            <div className="pt-3 border-t border-white/10 mt-2 flex flex-col gap-2">
              <a
                href="tel:+355698145803"
                onClick={() => trackEvent("phone_click")}
                className="flex items-center gap-2 text-sm text-neutral-200 px-4 py-3 no-underline"
              >
                <Phone size={16} weight="regular" />
                <span>{t("header.phone")}</span>
              </a>
              <div className="px-1">
                <LanguageSwitcher onAfterSelect={() => setMobileOpen(false)} />
              </div>
              <MobileUserMenu onClose={() => setMobileOpen(false)} />
              <LLink
                to="/rezervo"
                onClick={() => setMobileOpen(false)}
                className="inline-flex items-center justify-center px-5 py-3 rounded-full text-sm font-medium bg-primary text-primary-foreground no-underline text-center"
              >
                {t("header.bookNow")}
              </LLink>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
