export const placementKeys = {
  all: ["placements"] as const,
  list: (filters: object = {}) => [...placementKeys.all, "list", filters] as const,
  detail: (id: string) => [...placementKeys.all, "detail", id] as const,
};
