"use client";

import { useSyncExternalStore } from "react";
import { getAuthToken, subscribeToAuthToken } from "../session";

/**
 * Reactive access to the stored token. Returns `undefined` during SSR/hydration
 * so guards can distinguish "not yet known" from "signed out" (`null`).
 */
export function useAuthToken(): string | null | undefined {
  return useSyncExternalStore(subscribeToAuthToken, getAuthToken, () => undefined);
}
