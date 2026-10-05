"use client";

import { Bell, BellOff, CheckCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EmptyState } from "@/components/molecules/EmptyState";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import type { AppNotification } from "@/features/notifications/api";
import { useMarkNotificationsRead, useNotifications } from "@/features/notifications/hooks";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Bell with unread count; opens the user's notifications in a side sheet. */
export function NotificationBell({ className }: { className?: string }) {
  const { data: user } = useCurrentUser();
  return user ? <NotificationSheet className={className} /> : null;
}

function NotificationSheet({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { data, isLoading } = useNotifications();
  const markRead = useMarkNotificationsRead();
  const unread = data?.unread_count ?? 0;

  function handleOpen(notification: AppNotification) {
    if (!notification.read_at) markRead.mutate([notification.id]);
    if (notification.link) {
      setOpen(false);
      router.push(notification.link);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("relative shrink-0 bg-secondary", className)}
          aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        >
          <Bell />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-[1.125rem] items-center justify-center rounded-full bg-destructive px-1 text-[0.625rem] font-medium leading-[1.125rem] text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <div className="flex items-center justify-between gap-3 border-b px-5 py-4 pr-12">
          <div>
            <SheetTitle className="text-base font-medium">Notifications</SheetTitle>
            <SheetDescription className="text-xs">{unread ? `${unread} unread` : "You're all caught up"}</SheetDescription>
          </div>
          {unread > 0 && (
            <Button variant="secondary" size="sm" onClick={() => markRead.mutate(undefined)} disabled={markRead.isPending}>
              <CheckCheck /> Mark all read
            </Button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : !data?.notifications.length ? (
            <EmptyState icon={BellOff} title="No notifications yet" description="Requests, reviews and decisions on your records appear here." />
          ) : (
            <ul className="space-y-1.5">
              {data.notifications.map((notification) => (
                <li key={notification.id}>
                  <button
                    type="button"
                    onClick={() => handleOpen(notification)}
                    className={cn(
                      "flex w-full gap-3 rounded-xl px-3.5 py-3 text-left transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
                      notification.read_at ? "bg-transparent" : "bg-surface"
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn("mt-1.5 size-2 shrink-0 rounded-full", notification.read_at ? "bg-transparent" : "bg-brand")}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-foreground">{notification.title}</span>
                      {notification.body && (
                        <span className="mt-0.5 block whitespace-pre-wrap text-xs text-muted-foreground">{notification.body}</span>
                      )}
                      <time dateTime={notification.created_at} className="mt-1 block text-[0.6875rem] text-muted-foreground">
                        {formatDateTime(notification.created_at)}
                      </time>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
