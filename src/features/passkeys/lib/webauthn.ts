import {
  WebAuthnError,
  bufferToBase64URLString,
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";
import type { PasskeyAssertion, PasskeyRegistrationChallenge } from "../types";

function toBase64Url(value: string) {
  return bufferToBase64URLString(new TextEncoder().encode(value).buffer as ArrayBuffer);
}

function randomChallenge() {
  return bufferToBase64URLString(crypto.getRandomValues(new Uint8Array(32)).buffer as ArrayBuffer);
}

/** Runs the device's passkey creation ceremony (Face ID, fingerprint, PIN...). */
export async function createPasskey(options: PasskeyRegistrationChallenge) {
  const credential = await startRegistration({
    optionsJSON: {
      challenge: options.challenge,
      rp: options.rp,
      user: { ...options.user, id: toBase64Url(options.user.id) },
      pubKeyCredParams: options.pubKeyCredParams,
      timeout: options.timeout,
      // Discoverable so signing can find the credential without a lookup endpoint.
      authenticatorSelection: { ...options.authenticatorSelection, residentKey: "required" },
    },
  });
  return {
    credentialId: credential.id,
    publicKey: credential.response.publicKey ?? credential.response.attestationObject,
    deviceType: credential.authenticatorAttachment ?? "biometric_authenticator",
  };
}

/**
 * Asks the device to authenticate the supervisor with their passkey and returns the
 * assertion used as the signature reference for POST /api/logs/{id}/sign.
 */
export async function authenticateWithPasskey(): Promise<PasskeyAssertion> {
  const assertion = await startAuthentication({
    optionsJSON: {
      challenge: randomChallenge(),
      rpId: window.location.hostname,
      userVerification: "required",
      timeout: 60000,
    },
  });
  return { credentialId: assertion.id, signature: assertion.response.signature };
}

export function describePasskeyError(error: unknown) {
  if (error instanceof WebAuthnError || (error instanceof Error && error.name === "NotAllowedError")) {
    return "Passkey verification was cancelled or timed out. Make sure this device has a registered passkey.";
  }
  return null;
}
