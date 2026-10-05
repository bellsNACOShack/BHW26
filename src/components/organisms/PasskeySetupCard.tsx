"use client";

import { browserSupportsWebAuthn } from "@simplewebauthn/browser";
import { Fingerprint, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SectionCard } from "@/components/molecules/SectionCard";
import { Button } from "@/components/ui/button";
import { useRegisterPasskey } from "@/features/passkeys/hooks/useRegisterPasskey";
import { describePasskeyError } from "@/features/passkeys/lib/webauthn";
import { getErrorMessage } from "@/lib/api-client";

/** Lets a supervisor enrol this device's passkey (Face ID, fingerprint, PIN) for signing entries. */
export function PasskeySetupCard() {
  const register = useRegisterPasskey();
  const [supported, setSupported] = useState(true);

  useEffect(() => setSupported(browserSupportsWebAuthn()), []);

  function handleRegister() {
    register.mutate(undefined, {
      onSuccess: () => toast.success("Passkey registered. You can now sign entries from this device."),
      onError: (error) => toast.error(describePasskeyError(error) ?? getErrorMessage(error)),
    });
  }

  return (
    <SectionCard title="Biometric signing" description="Signing a week locks it permanently with your passkey." divided={false}>
      <div className="space-y-4">
        <div className="flex items-start gap-4">
          <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
            <Fingerprint className="size-6" aria-hidden />
          </span>
          <p className="flex-1 text-sm text-muted-foreground">
            {supported
              ? "Register a passkey on each device you sign from. Your device verifies you with Face ID, fingerprint or its PIN — Inter.log never sees your biometric data."
              : "This browser doesn't support passkeys. Use an up-to-date browser on a phone or computer with Face ID, fingerprint or a device PIN."}
          </p>
        </div>
        <Button onClick={handleRegister} disabled={!supported || register.isPending} className="w-full sm:w-auto">
          {register.isPending && <Loader2 className="animate-spin" />}
          Register passkey
        </Button>
      </div>
    </SectionCard>
  );
}
