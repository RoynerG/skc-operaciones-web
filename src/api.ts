const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
const TOKEN_KEY = 'skc-form-studio-token';

export class ApiError extends Error {
  status: number;
  details: Record<string, unknown>;
  constructor(message: string, status: number, details: Record<string, unknown> = {}) {
    super(message); this.status = status; this.details = details;
  }
}

export function getToken() { return localStorage.getItem(TOKEN_KEY) || ''; }
export function setToken(token: string) { token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY); }

export async function api<T>(path: string, options: RequestInit = {}, publicRequest = false): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 30000);
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (!publicRequest && getToken()) headers.set('Authorization', `Bearer ${getToken()}`);
  try {
    const response = await fetch(`${API_URL}${path}`, { ...options, headers, signal: controller.signal });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new ApiError(data.message || 'No se pudo completar la solicitud.', response.status, data.details || {});
    return data as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw new ApiError('La solicitud tardó demasiado. Intenta de nuevo.', 408);
    throw error;
  } finally { window.clearTimeout(timeout); }
}

export function clientId(): string {
  const key = 'skc-form-client';
  let value = localStorage.getItem(key);
  if (!value) { value = crypto.randomUUID().replaceAll('-', ''); localStorage.setItem(key, value); }
  return value;
}
