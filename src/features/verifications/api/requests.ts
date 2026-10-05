import { apiRequest } from "@/lib/api-client";
import type { GenerateVerificationResponse, VerificationResult } from "../types";

export function generateVerification(placementId: string) {
  return apiRequest<GenerateVerificationResponse>("/verifications/generate", {
    method: "POST",
    body: { placement_id: placementId },
  });
}

export function getVerification(code: string) {
  return apiRequest<VerificationResult>(`/verifications/${encodeURIComponent(code)}`, { anonymous: true });
}
