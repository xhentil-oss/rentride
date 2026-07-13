/**
 * Custom hooks to replace @animaapp/playground-react-sdk
 * Maps entity names to our backend API endpoints
 */
import { useState, useEffect, useCallback } from "react";

const API_BASE = "/api";
const AUTH_CHANGED_EVENT = "rct_auth_changed";

function readStoredUser() {
  const stored = localStorage.getItem("rct_user");
  if (!stored) return null;

  try {
    return JSON.parse(stored);
  } catch {
    localStorage.removeItem("rct_user");
    return null;
  }
}

function publishAuthUser(user: any) {
  if (user) {
    localStorage.setItem("rct_user", JSON.stringify(user));
  } else {
    localStorage.removeItem("rct_user");
  }

  window.dispatchEvent(new CustomEvent(AUTH_CHANGED_EVENT, { detail: { user } }));
}

// Map Anima entity names to our API endpoints
const ENTITY_MAP: Record<string, string> = {
  Car: "/cars",
  Reservation: "/reservations",
  Customer: "/customers",
  Review: "/reviews",
  ReviewAdmin: "/reviews/admin",
  PricingRule: "/pricing-rules",
  PricingRuleAdmin: "/pricing-rules/admin",
  Extra: "/extras",
  ExtraAdmin: "/extras/admin",
  MonthlyRate: "/monthly-rates",
  MonthlyRatePublic: "/monthly-rates/public",
  UserAdminProfile: "/users",
  Invoice: "/invoices",
  ActivityLog: "/activity-logs",
  MaintenanceRecord: "/fleet/maintenance",
  InsuranceRecord: "/fleet/insurance",
  RegistrationRecord: "/fleet/registration",
  FuelLog: "/fleet/fuel",
  DamageReport: "/fleet/damage",
  ChatMessage: "/chat",
  Setting: "/settings",
  ReservationAvailability: "/reservations/availability",
  BlogPost: "/blog",
  BlogPostAdmin: "/blog/admin",
  CustomerDocument: "/customer-documents",
  CommunicationLog: "/communication-logs",
  Deposit: "/deposits",
  GoogleReview: "/google-reviews",
};

// Cookies are sent automatically — only Content-Type + locale needed.
// X-Locale tells the backend which language to return error messages in.
function detectLocale(): "sq" | "en" | "fr" | "es" | "it" {
  if (typeof window === "undefined") return "sq";
  const path = window.location.pathname;
  for (const lang of ["en", "fr", "es", "it"] as const) {
    if (path === `/${lang}` || path.startsWith(`/${lang}/`)) return lang;
  }
  return "sq";
}

function getHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "X-Locale": detectLocale(),
  };
}

// Token refresh mutex — prevents concurrent refresh requests
let refreshPromise: Promise<boolean> | null = null;

async function doRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchWithRefresh(url: string, options: RequestInit): Promise<Response> {
  const opts = { ...options, credentials: "include" as RequestCredentials };
  let res = await fetch(url, opts);
  if (res.status === 401) {
    if (!refreshPromise) {
      refreshPromise = doRefresh().finally(() => { refreshPromise = null; });
    }
    const refreshed = await refreshPromise;
    if (refreshed) {
      res = await fetch(url, opts);
    }
  }
  return res;
}

function buildQuery(filters?: Record<string, unknown>): string {
  if (!filters) return "";
  const params = new URLSearchParams();
  const serialize = (v: unknown): string => {
    if (v === null || v === undefined) return "";
    if (Array.isArray(v) || (typeof v === "object" && v !== null)) {
      try { return JSON.stringify(v); } catch { return String(v); }
    }
    return String(v);
  };
  if (filters.where && typeof filters.where === "object") {
    for (const [k, v] of Object.entries(filters.where as Record<string, unknown>)) {
      if (v !== undefined && v !== null) params.set(k, serialize(v));
    }
  }
  if (filters.orderBy) params.set("orderBy", serialize(filters.orderBy));
  if (filters.limit) params.set("limit", String(filters.limit));
  return params.toString() ? `?${params.toString()}` : "";
}

// ─── useQuery ──────────────────────────────────────────────────
// T = entity row type. When you pass a string `filtersOrId`, the result `data`
// is `T | null` (single fetch). When you pass filters or nothing, it's `T[]`.
// Default T = any so existing callers compile without changes; opt in to typed
// data via `useQuery<Customer>("Customer")`.
export function useQuery<T = any>(
  entity: string,
  filtersOrId?: Record<string, unknown> | string,
): {
  /**
   * Shape depends on call: single-id fetch → `T | null`, list fetch → `T[]`.
   * Defaults to `any` so existing callers compile unchanged. Pass an explicit
   * type to opt in:
   *   useQuery<Customer[]>("Customer")          // list
   *   useQuery<Customer>("Customer", customerId) // single
   */
  data: T;
  isPending: boolean;
  error: string | null;
  refetch: () => void;
} {
  const isIdFetch = typeof filtersOrId === "string";
  const filters = isIdFetch ? undefined : filtersOrId;
  const entityId = isIdFetch ? filtersOrId : undefined;
  const skip = !!filters?.skip;
  const [data, setData] = useState<any>(undefined);
  const [isPending, setIsPending] = useState(!skip && !(isIdFetch && !entityId));
  const [error, setError] = useState<string | null>(null);

  const endpoint = ENTITY_MAP[entity] || `/${entity.toLowerCase()}s`;

  const refetch = useCallback(() => {
    if (skip) { setData(isIdFetch ? null : []); setIsPending(false); return; }
    setIsPending(true);
    const controller = new AbortController();
    const url = entityId
      ? `${API_BASE}${endpoint}/${entityId}`
      : `${API_BASE}${endpoint}${buildQuery(filters)}`;
    fetchWithRefresh(url, { headers: getHeaders(), cache: 'no-store', signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.json();
      })
      .then((json) => {
        if (controller.signal.aborted) return;
        if (isIdFetch) {
          setData(Array.isArray(json) ? json[0] ?? null : json);
        } else {
          setData(Array.isArray(json) ? json : json.data ?? json.items ?? [json]);
        }
        setError(null);
      })
      .catch((err) => {
        if (err?.name === 'AbortError' || controller.signal.aborted) return;
        console.warn(`useQuery(${entity}):`, err.message);
        setData(isIdFetch ? null : []);
        setError(err.message);
      })
      .finally(() => { if (!controller.signal.aborted) setIsPending(false); });

    // Return cleanup so useEffect can abort on unmount/refetch
    (refetch as any)._cleanup = () => controller.abort();
  }, [entity, isIdFetch, isIdFetch ? entityId : JSON.stringify(filters)]);

  useEffect(() => {
    refetch();
    return () => { (refetch as any)._cleanup?.(); };
  }, [refetch]);

  return { data, isPending, error, refetch };
}

// ─── useLazyQuery ──────────────────────────────────────────────
export function useLazyQuery(entity: string) {
  const endpoint = ENTITY_MAP[entity] || `/${entity.toLowerCase()}s`;

  const query = useCallback(async (filters?: Record<string, unknown>) => {
    const qs = buildQuery(filters);
    const res = await fetchWithRefresh(`${API_BASE}${endpoint}${qs}`, { headers: getHeaders() });
    if (!res.ok) throw new Error(`${res.status}`);
    const json = await res.json();
    return Array.isArray(json) ? json : json.data ?? json.items ?? [json];
  }, [entity]);

  return { query };
}

// ─── useMutation ───────────────────────────────────────────────
export function useMutation(entity: string) {
  const endpoint = ENTITY_MAP[entity] || `/${entity.toLowerCase()}s`;
  const [isPending, setIsPending] = useState(false);

  const create = useCallback(async (data: Record<string, unknown>) => {
    setIsPending(true);
    try {
      const res = await fetchWithRefresh(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `${res.status}`);
      }
      return res.json();
    } finally {
      setIsPending(false);
    }
  }, [entity]);

  const update = useCallback(async (id: string, data: Record<string, unknown>) => {
    setIsPending(true);
    try {
      const res = await fetchWithRefresh(`${API_BASE}${endpoint}/${id}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `${res.status}`);
      }
      return res.json();
    } finally {
      setIsPending(false);
    }
  }, [entity]);

  const remove = useCallback(async (id: string) => {
    setIsPending(true);
    try {
      const res = await fetchWithRefresh(`${API_BASE}${endpoint}/${id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `${res.status}`);
      }
      return res.json();
    } finally {
      setIsPending(false);
    }
  }, [entity]);

  return { create, update, remove, isPending };
}

// ─── useAuth ───────────────────────────────────────────────────
export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [isPending, setIsPending] = useState(true);
  const [isAnonymous, setIsAnonymous] = useState(true);

  // Restore user from localStorage immediately (fast), then verify with server in background
  useEffect(() => {
    const applyUser = (nextUser: any) => {
      setUser(nextUser);
      setIsAnonymous(!nextUser);
    };

    const storedUser = readStoredUser();
    if (storedUser) applyUser(storedUser);
    const verifyingUserId = storedUser?.id;
    setIsPending(false);

    const handleAuthChanged = (event: Event) => {
      const nextUser = (event as CustomEvent).detail?.user ?? readStoredUser();
      applyUser(nextUser);
    };

    window.addEventListener(AUTH_CHANGED_EVENT, handleAuthChanged);
    window.addEventListener("storage", handleAuthChanged);

    // Background session verify — syncs with server cookie state
    fetchWithRefresh(`${API_BASE}/auth/me`, {})
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.user) {
          publishAuthUser(data.user);
        } else {
          // Cookie expired or revoked — clear stale local state
          const currentUserId = readStoredUser()?.id;
          if (!currentUserId || currentUserId === verifyingUserId) {
            publishAuthUser(null);
          }
        }
      })
      .catch(() => { /* network error — keep current local state */ });
    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, handleAuthChanged);
      window.removeEventListener("storage", handleAuthChanged);
    };
  }, []);

  const login = useCallback(async (email?: string, password?: string) => {
    if (!email || !password) {
      window.location.href = "/admin";
      return;
    }
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Login dështoi");
    }
    const data = await res.json();
    // 2FA required — return as-is so the caller can show OTP input
    if (data.requires2fa) return data;

    publishAuthUser(data.user);
    return data.user;
  }, []);

  const loginWith2FA = useCallback(async (tempToken: string, otp: string) => {
    const res = await fetch(`${API_BASE}/auth/login-2fa`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ tempToken, otp }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "2FA dështoi");
    }
    const data = await res.json();
    publishAuthUser(data.user);
    return data.user;
  }, []);

  // Passwordless email-code login (admin/staff). Step 1: request a code.
  const requestLoginCode = useCallback(async (email: string) => {
    const res = await fetch(`${API_BASE}/auth/login-code/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Dërgimi i kodit dështoi");
    }
    return res.json();
  }, []);

  // Step 2: exchange the email + code for a session.
  const loginWithCode = useCallback(async (email: string, code: string) => {
    const res = await fetch(`${API_BASE}/auth/login-code/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, code }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Kodi i pavlefshëm");
    }
    const data = await res.json();
    publishAuthUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (name: string, email: string, password: string, phone?: string) => {
    // Detect locale from URL so the verification email link redirects back to
    // the page in the user's language.
    const locale = typeof window !== 'undefined' && /^\/en(\/|$)/.test(window.location.pathname) ? 'en' : 'sq';
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name, email, password, phone, locale }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      if (err.errors) throw new Error(err.errors.map((e: any) => e.msg).join(", "));
      throw new Error(err.error || "Regjistrimi dështoi");
    }
    const data = await res.json();
    publishAuthUser(data.user);
    return data.user;
  }, []);

  /**
   * Sign in with a Google ID token (credential string from Google Identity Services).
   * Backend verifies the token, creates/links the user, and sets auth cookies.
   */
  const googleLogin = useCallback(async (credential: string) => {
    const res = await fetch(`${API_BASE}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ credential }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Hyrja me Google dështoi");
    }
    const data = await res.json();
    publishAuthUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch { /* ignore network errors during logout */ }
    publishAuthUser(null);
    window.location.href = "/";
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    const res = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Kërkesa dështoi");
    }
    return res.json();
  }, []);

  return { user, isPending, isAnonymous, login, loginWith2FA, requestLoginCode, loginWithCode, register, googleLogin, logout, forgotPassword };
}
