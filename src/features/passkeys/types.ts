/** Response of POST /api/auth/passkey/register-challenge. */
export interface PasskeyRegistrationChallenge {
  challenge: string;
  rp: { name: string; id: string };
  user: { id: string; name: string; displayName: string };
  pubKeyCredParams: { alg: number; type: "public-key" }[];
  authenticatorSelection: AuthenticatorSelectionCriteria;
  timeout: number;
}

export interface RegisterPasskeyPayload {
  credential_id: string;
  public_key: string;
  challenge: string;
  device_type?: string;
}

export interface PasskeyAssertion {
  credentialId: string;
  signature: string;
}
