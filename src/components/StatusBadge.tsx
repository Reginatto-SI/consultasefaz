import { cn } from "@/lib/utils";
import type { StatusFinal } from "@/lib/types";

const STYLES: Record<StatusFinal, string> = {
  OK: "bg-success/15 text-success border-success/30",
  FALTANTE: "bg-warning/15 text-warning border-warning/30",
  IRREGULAR: "bg-destructive/15 text-destructive border-destructive/30",
  DESCONSIDERADA: "bg-muted text-muted-foreground border-border",
};

export function StatusBadge({ status }: { status: StatusFinal }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        STYLES[status]
      )}
    >
      {status}
    </span>
  );
}
