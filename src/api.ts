const BASE = import.meta.env.VITE_API_URL || "";
const TOKEN_KEY = "campusbite_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(t: string) {
  localStorage.setItem(TOKEN_KEY, t);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function api<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data as T;
}

export const login = (body: any) =>
  api<{ token: string; user: any }>("/api/auth/login", { method: "POST", body: JSON.stringify(body) });

export const getMe = () => api<{ user: any }>("/api/auth/me");
export const updateProfile = (body: any) =>
  api("/api/auth/me", { method: "PATCH", body: JSON.stringify(body) });

export const fetchCanteens = () => api<{ canteens: any[] }>("/api/canteens");
export const fetchFoods = (canteenId?: string) =>
  api<{ foods: any[] }>(`/api/foods${canteenId ? `?canteenId=${canteenId}` : ""}`);

export const placeOrder = (body: any) =>
  api<{ order: any }>("/api/orders", { method: "POST", body: JSON.stringify(body) });
export const fetchMyOrders = () => api<{ orders: any[] }>("/api/orders/mine");

export const fetchAdminKPIs = () => api("/api/admin/kpis");
export const fetchAdminOrders = () => api("/api/admin/orders");
export const fetchStudents = () => api("/api/admin/students");

export const health = () => api<{ ok: boolean; db: string }>("/api/health");