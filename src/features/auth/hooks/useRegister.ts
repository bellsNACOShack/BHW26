"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { register } from "../api/requests";
import { authKeys } from "../keys";
import { setAuthToken } from "../session";

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: register,
    onSuccess: ({ token, user }) => {
      queryClient.clear();
      queryClient.setQueryData(authKeys.me, user);
      setAuthToken(token, true);
    },
  });
}
