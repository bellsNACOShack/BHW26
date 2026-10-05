"use client";

import { useMutation } from "@tanstack/react-query";
import { getRegistrationChallenge, verifyRegistration } from "../api/requests";
import { createPasskey } from "../lib/webauthn";

export function useRegisterPasskey() {
  return useMutation({
    mutationFn: async () => {
      const options = await getRegistrationChallenge();
      const passkey = await createPasskey(options);
      return verifyRegistration({
        challenge: options.challenge,
        credential_id: passkey.credentialId,
        public_key: passkey.publicKey,
        device_type: passkey.deviceType,
      });
    },
  });
}
