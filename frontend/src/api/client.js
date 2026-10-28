import axios from "axios";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";
export const API_ORIGIN = BASE.replace(/\/api\/v1\/?$/, "");
export const api = axios.create({ baseURL: BASE });

// The login token (a signed JWT) is kept in localStorage so a refresh keeps you logged in.
// All real data lives in PostgreSQL; the server re-checks the token on every request.
const KEY = "cc_token";
export const tokenStore = {
  get: () => localStorage.getItem(KEY),
  set: (t) => localStorage.setItem(KEY, t),
  clear: () => {
    localStorage.removeItem(KEY);
    localStorage.removeItem("cc_user");
  },
};

api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || "";
    const isLoginAttempt = url.startsWith("/auth/login") || url.startsWith("/auth/register");
    if (error.response?.status === 401 && !isLoginAttempt && tokenStore.get()) {
      tokenStore.clear();
      sessionStorage.setItem("cc_flash", "Your session has ended. Please log in again.");
      window.dispatchEvent(new Event("auth:expired"));
    }
    return Promise.reject(error);
  }
);

/** One readable message from any API error. */
export function errorMessage(err, fallback = "Something went wrong. Please try again.") {
  if (!err.response) return "Cannot reach the server. Check that the backend is running.";
  const detail = err.response.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length) {
    const first = detail[0];
    const field = first.loc?.[first.loc.length - 1];
    const msg = String(first.msg || "").replace(/^Value error, /, "");
    return field && field !== "body" ? `${labelFor(field)}: ${msg}` : msg;
  }
  return fallback;
}

/** Field-level errors for 422 responses, e.g. { password: "..." }. */
export function fieldErrors(err) {
  const out = {};
  const detail = err.response?.data?.detail;
  if (err.response?.status === 422 && Array.isArray(detail)) {
    detail.forEach((d) => {
      const field = d.loc?.[d.loc.length - 1];
      if (field && !out[field]) out[field] = String(d.msg).replace(/^Value error, /, "");
    });
  }
  return out;
}

function labelFor(field) {
  return String(field).replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

/** Opens a protected file (like a resume) in a new tab. */
export async function openProtectedFile(path) {
  const res = await api.get(path, { responseType: "blob" });
  const url = URL.createObjectURL(res.data);
  window.open(url, "_blank", "noopener");
}
