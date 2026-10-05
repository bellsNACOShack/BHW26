"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { login } from "../api/requests";
import { authKeys } from "../keys";
import { setAuthToken } from "../session";
import type { LoginPayload } from "../types";

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ remember, ...payload }: LoginPayload & { remember: boolean }) =>
      login(payload).then((res) => ({ ...res, remember })),
    onSuccess: ({ token, user, remember }) => {
      queryClient.clear();
      queryClient.setQueryData(authKeys.me, user);
      setAuthToken(token, remember);
    },
  });
}
