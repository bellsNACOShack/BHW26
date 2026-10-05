import { apiRequest } from "@/lib/api-client";

export interface AppNotification {
  id: string;
  title: string;
  body: string | null;
  /** In-app path to open, e.g. `/logbook`. */
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export function getNotifications() {
  return apiRequest<{ notifications: AppNotification[]; unread_count: number }>("/notifications");
}

/** Marks the given notifications as read, or all of them when `ids` is omitted. */
export function markNotificationsRead(ids?: string[]) {
  return apiRequest<{ success: true }>("/notifications/read", { method: "POST", body: ids ? { ids } : {} });
}
