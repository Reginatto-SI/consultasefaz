import { cn } from "@/lib/utils";
import type { StatusFinal } from "@/lib/types";

// Padronização visual intencional: badge mantém semântica textual do status, mas sempre em azul.
const STYLES: Record<StatusFinal, string> = {
  OK: "bg-primary/10 text-primary border-primary/30",
  FALTANTE: "bg-primary/10 text-primary border-primary/30",
  IRREGULAR: "bg-primary/10 text-primary border-primary/30",
  DESCONSIDERADA: "bg-primary/10 text-primary border-primary/30",
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
