import { apiRequest } from "@/lib/api-client";
import type { ScafDetails } from "./lib/fields";
import type { ScafReviewAction, ScafSubmission, ScafSubmissionStatus } from "./types";

export async function getScafSubmissions(status?: ScafSubmissionStatus[]) {
  const { submissions } = await apiRequest<{ submissions: ScafSubmission[] }>("/scaf", {
    query: { status: status?.join(",") },
  });
  return submissions;
}

export async function getScafSubmission(id: string) {
  const { submission } = await apiRequest<{ submission: ScafSubmission }>(`/scaf/${id}`);
  return submission;
}

export async function saveScaf(payload: { placement_id: string; details: ScafDetails; submit: boolean }) {
  const { submission } = await apiRequest<{ submission: ScafSubmission }>("/scaf", { method: "POST", body: payload });
  return submission;
}

export function reviewScaf(id: string, payload: { action: ScafReviewAction; comments?: string }) {
  return apiRequest<{ submission: ScafSubmission | null }>(`/scaf/${id}/review`, { method: "POST", body: payload });
}
