import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;
export const TOKEN_KEY = "sn_token";

export const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function resolveImg(url) {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `${API}/files/${url}`;
}

export function formatApiError(detail) {
  if (detail == null) return "Ocurrió un error. Inténtalo de nuevo.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export const CATEGORY_META = {
  diabeticos: { label: "Para Diabéticos", cls: "bg-amber-100 text-amber-800 border-amber-200" },
  bajar_peso: { label: "Bajar de Peso", cls: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  comida_saludable: { label: "Comida Saludable", cls: "bg-teal-100 text-teal-800 border-teal-200" },
  veganos: { label: "Veganos", cls: "bg-lime-100 text-lime-800 border-lime-200" },
};
