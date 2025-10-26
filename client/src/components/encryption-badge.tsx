import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface EncryptionBadgeProps {
  className?: string;
}

export function EncryptionBadge({ className }: EncryptionBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-2 border-primary/30 bg-primary/10 text-primary font-mono text-xs",
        className,
      )}
      data-testid="badge-encryption"
    >
      <i className="fa-solid fa-lock text-xs" aria-hidden="true" />
      <span>AES-256 ENCRYPTED</span>
    </Badge>
  );
}
