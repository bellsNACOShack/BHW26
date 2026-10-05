import type { LogEntryFilters } from "./types";

export const logKeys = {
  all: ["logs"] as const,
  list: (filters: LogEntryFilters = {}) => [...logKeys.all, "list", filters] as const,
  detail: (id: string) => [...logKeys.all, "detail", id] as const,
};
