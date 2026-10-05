"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { logKeys } from "@/features/logbook/keys";
import { notificationKeys } from "@/features/notifications/keys";
import { authenticateWithPasskey } from "@/features/passkeys/lib/webauthn";
import { logbookAction } from "../api/requests";
import type { LogbookActionPayload } from "../types";
import { useInvalidatePlacements } from "./useInvalidatePlacements";

/** ITF approval and academic signing use the same passkey signature flow as weekly sign-off. */
const SIGNED_ACTIONS = new Set<LogbookActionPayload["action"]>(["itf_approve", "academic_sign"]);

/** Moves a logbook through its lifecycle, signing with a passkey where the stage requires it. */
export function useLogbookAction(placementId: string) {
  const invalidatePlacements = useInvalidatePlacements();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: LogbookActionPayload) => {
      if (SIGNED_ACTIONS.has(payload.action)) {
        const assertion = await authenticateWithPasskey();
        payload = { ...payload, signature_reference: assertion.signature, passkey_credential_id: assertion.credentialId };
      }
      return logbookAction(placementId, payload);
    },
    onSuccess: () =>
      Promise.all([
        invalidatePlacements(),
        // An ITF rejection can reopen weekly entries.
        queryClient.invalidateQueries({ queryKey: logKeys.all }),
        queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
      ]),
  });
}
