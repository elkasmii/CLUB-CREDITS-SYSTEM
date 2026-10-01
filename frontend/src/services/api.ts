import axios, { AxiosError } from 'axios';

/** Empty in development (Vite proxies /api). Set VITE_API_ORIGIN in production if the API is elsewhere. */
export const API_ORIGIN: string = import.meta.env.VITE_API_ORIGIN ?? '';

const TOKEN_KEY = 'csc_token';

export const tokenStorage = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (token: string) => {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* storage unavailable (private mode) — session just won't persist */
    }
  },
  clear: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  },
};

export const api = axios.create({ baseURL: `${API_ORIGIN}/api`, timeout: 15000 });

api.interceptors.request.use((config) => {
  const token = tokenStorage.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Lets the auth context react when the server says the session is no longer valid.
let onSessionExpired: (() => void) | null = null;
export const setSessionExpiredHandler = (fn: () => void) => {
  onSessionExpired = fn;
};

api.interceptors.response.use(
  (res) => res,
  (error: AxiosError<ApiErrorBody>) => {
    const code = error.response?.data?.error?.code;
    if (code === 'INVALID_TOKEN' || code === 'ACCOUNT_NOT_ACTIVE' || (error.response?.status === 401 && tokenStorage.get())) {
      onSessionExpired?.();
    }
    return Promise.reject(error);
  },
);

interface ApiErrorBody {
  error?: { code?: string; message?: string; details?: Record<string, string> };
}

/** Machine-readable error code from the backend, e.g. "QR_ALREADY_USED". */
export function getErrorCode(err: unknown): string | undefined {
  if (axios.isAxiosError<ApiErrorBody>(err)) {
    if (!err.response) return 'NETWORK_ERROR';
    return err.response.data?.error?.code;
  }
  return undefined;
}

/** Human-readable error message for toasts / error states. */
export function getErrorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (axios.isAxiosError<ApiErrorBody>(err)) {
    if (!err.response) return 'Cannot reach the server. Check your connection.';
    return err.response.data?.error?.message ?? fallback;
  }
  return err instanceof Error ? err.message : fallback;
}

/** Field-level validation messages ({ email: "Enter a valid email address." }). */
export function getFieldErrors(err: unknown): Record<string, string> {
  if (axios.isAxiosError<ApiErrorBody>(err)) return err.response?.data?.error?.details ?? {};
  return {};
}

/** Full URL for an uploaded image path like `/uploads/abc.png`. */
export const assetUrl = (path: string | null | undefined) => (path ? `${API_ORIGIN}${path}` : null);
