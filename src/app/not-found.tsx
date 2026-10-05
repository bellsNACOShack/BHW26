import Link from "next/link";
import { LogoMark } from "@/components/atoms/Logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <LogoMark className="size-10" />
      <h1 className="text-2xl tracking-tight">Page not found</h1>
      <p className="max-w-sm text-sm text-muted-foreground">The page you were looking for doesn&apos;t exist or has moved.</p>
      <Button asChild>
        <Link href="/dashboard">Go to dashboard</Link>
      </Button>
    </main>
  );
}
