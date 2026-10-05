import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  name: string;
  src?: string | null;
  className?: string;
}

export function UserAvatar({ name, src, className }: UserAvatarProps) {
  return (
    <Avatar className={cn("size-7", className)}>
      {src && <AvatarImage src={src} alt="" />}
      <AvatarFallback className="bg-brand text-[0.625rem] font-semibold uppercase text-brand-foreground">
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
