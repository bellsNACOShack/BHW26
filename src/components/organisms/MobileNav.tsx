"use client";

import { LayoutGrid } from "lucide-react";
import { useState } from "react";
import { LogoMark } from "@/components/atoms/Logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { cn } from "@/lib/utils";
import { NavigationPanel } from "./NavigationPanel";

/** Menu button + bottom sheet navigation for viewports without the sidebar. */
export function MobileNav({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const { data: user } = useCurrentUser();
  if (!user) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className={cn("shrink-0 bg-secondary", className)} aria-label="Open menu">
          <LayoutGrid />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[85dvh] rounded-t-3xl px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" aria-hidden />
        <SheetTitle className="mb-4 flex items-center gap-2 text-base font-medium text-brand">
          <LogoMark className="size-6" /> Inter.log
        </SheetTitle>
        <SheetDescription className="sr-only">Navigate between sections</SheetDescription>
        <NavigationPanel user={user} onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
