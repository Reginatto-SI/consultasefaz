import { cn } from "@/lib/utils";
import type { StatusFinal } from "@/lib/types";

// Padronização visual intencional: badge usa azul sólido oficial sem alterar semântica textual.
const STYLES: Record<StatusFinal, string> = {
  OK: "bg-primary text-primary-foreground border-primary",
  FALTANTE: "bg-primary text-primary-foreground border-primary",
  IRREGULAR: "bg-primary text-primary-foreground border-primary",
  DESCONSIDERADA: "bg-primary text-primary-foreground border-primary",
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
