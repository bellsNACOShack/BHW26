import { getAuthToken } from "@/features/auth/session";

/**
 * Error thrown for any non-2xx API response. The backend always responds with
 * `{ success: false, error, message }` on failure, so `message` is user-presentable.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  query?: Record<string, string | number | undefined | null>;
  /** Skip attaching the bearer token (public endpoints). */
  anonymous?: boolean;
}

/** Listeners notified when the API rejects the current token (401). */
const unauthorizedListeners = new Set<() => void>();

export function onUnauthorized(listener: () => void) {
  unauthorizedListeners.add(listener);
  return () => {
    unauthorizedListeners.delete(listener);
  };
}

function buildUrl(path: string, query?: RequestOptions["query"]) {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

/**
 * Thin fetch wrapper used by every feature's `api/requests.ts`.
 * Calls the same-origin Next.js API routes under `/api`.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query, anonymous = false } = options;
  const headers: Record<string, string> = { Accept: "application/json" };

  if (body !== undefined) headers["Content-Type"] = "application/json";

  const token = anonymous ? null : getAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(buildUrl(`/api${path}`, query), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, "Network Error", "Unable to reach the server. Check your connection and try again.");
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401 && token) {
      unauthorizedListeners.forEach((listener) => listener());
    }
    throw new ApiError(
      response.status,
      payload?.error ?? "Request Failed",
      payload?.message ?? `Request failed with status ${response.status}.`
    );
  }

  return payload as T;
}

export function getErrorMessage(error: unknown, fallback = "Something went wrong. Please try again.") {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
