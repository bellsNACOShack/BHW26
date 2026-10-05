"use client";

import { useMutation } from "@tanstack/react-query";
import { authenticateWithPasskey } from "@/features/passkeys/lib/webauthn";
import { signLogEntry } from "../api/requests";
import { useInvalidateLogs } from "./useInvalidateLogs";

/** Authenticates the supervisor with their passkey, then signs and locks the entry. */
export function useSignLogEntry(id: string) {
  const invalidate = useInvalidateLogs();
  return useMutation({
    mutationFn: async () => {
      const assertion = await authenticateWithPasskey();
      return signLogEntry(id, {
        signature_type: "passkey",
        signature_reference: assertion.signature,
        passkey_credential_id: assertion.credentialId,
      });
    },
    onSuccess: invalidate,
  });
}
