export const verificationKeys = {
  all: ["verifications"] as const,
  detail: (code: string) => [...verificationKeys.all, code] as const,
};
