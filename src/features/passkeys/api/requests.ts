import { apiRequest } from "@/lib/api-client";
import type { PasskeyRegistrationChallenge, RegisterPasskeyPayload } from "../types";

export function getRegistrationChallenge() {
  return apiRequest<PasskeyRegistrationChallenge>("/auth/passkey/register-challenge", { method: "POST" });
}

export function verifyRegistration(payload: RegisterPasskeyPayload) {
  return apiRequest<{ message: string }>("/auth/passkey/register-verify", { method: "POST", body: payload });
}
