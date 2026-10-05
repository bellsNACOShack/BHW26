import type { ScafSubmissionStatus } from "../types";

export const SCAF_SUBMISSION_LABELS: Record<ScafSubmissionStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under review",
  approved: "Approved",
  requires_correction: "Requires correction",
};

/** Students may edit and (re)submit their SCAF in these states. */
export function isScafEditable(status: ScafSubmissionStatus | undefined) {
  return !status || status === "draft" || status === "requires_correction";
}
