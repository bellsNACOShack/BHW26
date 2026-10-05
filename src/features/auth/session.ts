/**
 * Client-side storage for the backend-issued JWT.
 *
 * The API authenticates with `Authorization: Bearer <token>` only (no cookies),
 * so the token lives in web storage: localStorage when the user chooses
 * "Keep me logged in", sessionStorage otherwise.
 */
const TOKEN_KEY = "interlog.token";

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

function safeStorage(kind: "local" | "session"): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export function getAuthToken(): string | null {
  return safeStorage("local")?.getItem(TOKEN_KEY) ?? safeStorage("session")?.getItem(TOKEN_KEY) ?? null;
}

export function setAuthToken(token: string, persist: boolean) {
  clearStoredToken();
  safeStorage(persist ? "local" : "session")?.setItem(TOKEN_KEY, token);
  notify();
}

function clearStoredToken() {
  safeStorage("local")?.removeItem(TOKEN_KEY);
  safeStorage("session")?.removeItem(TOKEN_KEY);
}

export function clearAuthToken() {
  clearStoredToken();
  notify();
}

export function subscribeToAuthToken(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === TOKEN_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}
