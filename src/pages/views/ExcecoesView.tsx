import { Ban, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Empresa, Excecao } from "@/lib/types";

type ExcecoesViewProps = {
  excecoes: Excecao[];
  empresas: Empresa[];
  onNovaExcecao: () => void;
};

export function ExcecoesView({ excecoes, empresas, onNovaExcecao }: ExcecoesViewProps) {
  return (
    <>
      <Card className="p-4 space-y-1">
        <h2 className="text-lg font-semibold">Exceções Operacionais</h2>
        <p className="text-sm text-muted-foreground">Notas desconsideradas manualmente ou tratadas fora da regra automática.</p>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <SummaryCard label="Exceções ativas" value={excecoes.filter((e) => e.ativa).length} icon={<Ban className="h-4 w-4" />} tone="warning" />
        <SummaryCard label="Exceções revertidas/futuras" value={excecoes.filter((e) => !e.ativa).length} icon={<FileText className="h-4 w-4" />} tone="muted" />
      </div>
      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-medium">Lista de exceções</h3>
          <Button variant="outline" size="sm" onClick={onNovaExcecao}>Nova exceção</Button>
        </div>
        {excecoes.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-8 text-center">
            <p className="font-medium">Nenhuma exceção cadastrada.</p>
            <Button className="mt-3" size="sm" variant="outline" onClick={onNovaExcecao}>Nova exceção</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Destinatário</th>
                  <th className="text-left px-3 py-2 font-medium">Chave NFe</th>
                  <th className="text-left px-3 py-2 font-medium">Motivo</th>
                  <th className="text-left px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {excecoes.map((excecao) => (
                  <tr key={excecao.id} className="border-t border-border">
                    <td className="px-3 py-2">{empresas.find((e) => e.id === excecao.empresa_id)?.nome ?? "Destinatário não identificado"}</td>
                    <td className="px-3 py-2 font-mono text-xs">{excecao.chave_nfe}</td>
                    <td className="px-3 py-2">{excecao.motivo}</td>
                    <td className="px-3 py-2">{excecao.ativa ? "Ativa" : "Revertida"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

function SummaryCard({ label, value, icon, tone }: { label: string; value: number; icon: React.ReactNode; tone: "warning" | "muted" }) {
  const toneClasses: Record<string, string> = {
    warning: "bg-warning/10 text-warning",
    muted: "bg-muted text-muted-foreground",
  };

  return (
    <Card className="p-3 flex items-center gap-3">
      <div className={`h-9 w-9 rounded-md flex items-center justify-center ${toneClasses[tone]}`}>{icon}</div>
      <div>
        <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">{label}</p>
        <p className="text-xl font-bold tabular-nums leading-tight">{value}</p>
      </div>
    </Card>
  );
}
