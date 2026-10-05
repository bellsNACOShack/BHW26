import { getSupabaseAdmin } from "./supabase/admin";

export interface NotificationParams {
  title: string;
  body?: string | null;
  /** In-app path the notification opens, e.g. `/logbook`. */
  link?: string | null;
}

/**
 * Stores an in-app notification for each recipient. Like audit logging it never
 * fails the request that triggered it.
 */
export async function notifyUsers(userIds: (string | null | undefined)[], params: NotificationParams): Promise<void> {
  const recipients = Array.from(new Set(userIds.filter((id): id is string => Boolean(id))));
  if (recipients.length === 0) return;
  try {
    const { error } = await getSupabaseAdmin()
      .from("notifications")
      .insert(
        recipients.map((user_id) => ({
          user_id,
          title: params.title,
          body: params.body ?? null,
          link: params.link ?? null,
        }))
      );
    if (error) console.error("Failed to create notifications:", error.message);
  } catch (error) {
    console.error("Failed to create notifications:", error);
  }
}
