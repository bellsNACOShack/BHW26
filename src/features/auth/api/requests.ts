import { apiRequest } from "@/lib/api-client";
import type { AuthResponse, LoginPayload, MeResponse, RegisterPayload } from "../types";

export function login(payload: LoginPayload) {
  return apiRequest<AuthResponse>("/auth/login", { method: "POST", body: payload, anonymous: true });
}

export function register(payload: RegisterPayload) {
  return apiRequest<AuthResponse>("/auth/register", { method: "POST", body: payload, anonymous: true });
}

export async function getCurrentUser() {
  const { user } = await apiRequest<MeResponse>("/auth/me");
  return user;
}
