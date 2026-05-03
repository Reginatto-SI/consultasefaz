import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { LogOperacional } from "@/lib/types";

type LogsViewProps = {
  logs: LogOperacional[];
  warnCount: number;
  errCount: number;
  onClear: () => void;
};

export function LogsView({ logs, warnCount, errCount, onClear }: LogsViewProps) {
  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Logs Operacionais</h2>
          <p className="text-sm text-muted-foreground">Total de avisos: {warnCount} · Total de erros: {errCount}</p>
        </div>
        <Button variant="outline" size="sm" onClick={onClear}>Limpar</Button>
      </div>
      <div className="space-y-2">
        {logs.map((log) => (
          <div key={`${log.data_hora}-${log.codigo_evento}`} className="rounded-md border border-border p-3 text-sm">
            <p className="font-medium">{log.mensagem_usuario}</p>
            <p className="text-xs text-muted-foreground mt-1">{log.tipo} · {log.nivel} · {log.codigo_evento}</p>
          </div>
        ))}
        {logs.length === 0 && <p className="text-sm text-muted-foreground">Nenhum log operacional registrado.</p>}
      </div>
    </Card>
  );
}
