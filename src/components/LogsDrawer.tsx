import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useStore } from "@/store/useStore";
import { AlertTriangle, XCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LogsDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { logs, clearLogs } = useStore();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            Logs Operacionais
            {logs.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearLogs}>
                <Trash2 className="h-4 w-4 mr-1" /> Limpar
              </Button>
            )}
          </SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-2">
          {logs.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">Sem logs.</p>
          )}
          {logs.map((l) => (
            <div key={l.id} className="border rounded-lg p-3 text-sm space-y-1">
              <div className="flex items-start gap-2">
                {l.nivel === "erro" ? (
                  <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                )}
                <div className="flex-1">
                  <p className="font-medium">{l.mensagem_usuario}</p>
                  <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3">
                    <span>{l.codigo_evento}</span>
                    {l.arquivo_nome && <span>· {l.arquivo_nome}</span>}
                    <span>· {new Date(l.data_hora).toLocaleString("pt-BR")}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
