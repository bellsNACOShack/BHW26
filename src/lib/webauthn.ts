import crypto from "crypto";

export interface PasskeyChallenge {
  challenge: string;
  userId: string;
  expiresAt: number;
}

// In-memory or temporary challenge cache (in production can be Redis/DB)
const challengeStore = new Map<string, PasskeyChallenge>();

/**
 * Generates a WebAuthn challenge for registering a Passkey or Signing
 */
export function generatePasskeyChallenge(userId: string): string {
  const challenge = crypto.randomBytes(32).toString("base64url");
  challengeStore.set(userId, {
    challenge,
    userId,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes validity
  });
  return challenge;
}

/**
 * Validates a pending WebAuthn challenge for a user
 */
export function verifyPasskeyChallenge(userId: string, incomingChallenge: string): boolean {
  const stored = challengeStore.get(userId);
  if (!stored) return false;
  if (Date.now() > stored.expiresAt) {
    challengeStore.delete(userId);
    return false;
  }
  const isValid = stored.challenge === incomingChallenge;
  if (isValid) {
    challengeStore.delete(userId);
  }
  return isValid;
}
