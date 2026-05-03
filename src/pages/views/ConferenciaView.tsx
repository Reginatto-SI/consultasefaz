import { AlertCircle, Building2, CircleHelp, Ellipsis, FileText, Search, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import type { DatasetLinha, Empresa, StatusFinal } from "@/lib/types";

type ConferenciaStats = {
  total: number;
  ok: number;
  faltantes: number;
  irregulares: number;
  desconsideradas: number;
};

type ConferenciaViewProps = {
  stats: ConferenciaStats;
  empresaId: string;
  setEmpresaId: (value: string) => void;
  empresas: Empresa[];
  status: string;
  setStatus: (value: string) => void;
  dataIni: string;
  setDataIni: (value: string) => void;
  dataFim: string;
  setDataFim: (value: string) => void;
  chave: string;
  setChave: (value: string) => void;
  clearFilters: () => void;
  pageData: DatasetLinha[];
  filteredLength: number;
  pageSize: number;
  page: number;
  totalPages: number;
  setPage: (value: number) => void;
  setSelected: (linha: DatasetLinha) => void;
};

export function ConferenciaView(props: ConferenciaViewProps) {
  const {
    stats,
    empresaId,
    setEmpresaId,
    empresas,
    status,
    setStatus,
    dataIni,
    setDataIni,
    dataFim,
    setDataFim,
    chave,
    setChave,
    clearFilters,
    pageData,
    filteredLength,
    pageSize,
    page,
    totalPages,
    setPage,
    setSelected,
  } = props;

  return (
    <>
      {/* View separada apenas para organização do front; sem alteração funcional. */}
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
        <SummaryCard label="Total" value={stats.total} icon={<FileText className="h-4 w-4" />} tone="primary" />
        <SummaryCard label="OK" value={stats.ok} icon={<ShieldCheck className="h-4 w-4" />} tone="success" />
        <SummaryCard label="Faltantes" value={stats.faltantes} icon={<CircleHelp className="h-4 w-4" />} tone="warning" />
        <SummaryCard label="Irregulares" value={stats.irregulares} icon={<AlertCircle className="h-4 w-4" />} tone="destructive" />
        <SummaryCard label="Desconsideradas" value={stats.desconsideradas} icon={<Building2 className="h-4 w-4" />} tone="muted" />
      </div>

      <Card className="p-3 md:p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-3 items-end">
          <div>
            <Label className="text-xs">Destinatário</Label>
            <Select value={empresaId} onValueChange={setEmpresaId}>
              <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {empresas.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="OK">OK</SelectItem>
                <SelectItem value="FALTANTE">Faltante</SelectItem>
                <SelectItem value="IRREGULAR">Irregular</SelectItem>
                <SelectItem value="DESCONSIDERADA">Desconsiderada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Data inicial</Label>
            <Input type="date" value={dataIni} onChange={(e) => setDataIni(e.target.value)} className="mt-1 h-9" />
          </div>
          <div>
            <Label className="text-xs">Data final</Label>
            <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="mt-1 h-9" />
          </div>
          <div>
            <Label className="text-xs">Buscar chave NFe</Label>
            <div className="relative mt-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={chave} onChange={(e) => setChave(e.target.value)} placeholder="Chave..." className="pl-8 h-9" />
            </div>
          </div>
          <Button variant="outline" size="sm" className="h-9" onClick={clearFilters}>Limpar filtros</Button>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium">Status</th>
                <th className="text-left px-4 py-2.5 font-medium">Destinatário</th>
                <th className="text-left px-4 py-2.5 font-medium">Chave NFe</th>
                <th className="text-left px-4 py-2.5 font-medium">Emitente</th>
                <th className="text-right px-4 py-2.5 font-medium">Valor</th>
                <th className="text-left px-4 py-2.5 font-medium">Emissão</th>
                <th className="text-left px-4 py-2.5 font-medium">SEFAZ</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="font-medium">Sem dados para exibir</p>
                    <p className="text-xs mt-1">Importe arquivos SEFAZ e ERP para iniciar a conferência.</p>
                  </td>
                </tr>
              )}
              {pageData.map((l) => (
                <tr key={l.empresa_id + l.chave_nfe} className="border-t border-border hover:bg-muted/40 cursor-pointer" onClick={() => setSelected(l)}>
                  <td className="px-4 py-2.5"><StatusBadge status={l.status_final} /></td>
                  <td className="px-4 py-2.5 font-medium">{l.empresa_nome}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{l.chave_nfe.slice(0, 8)}…{l.chave_nfe.slice(-6)}</td>
                  <td className="px-4 py-2.5">{l.payload_resumo_tabela.emitente ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {typeof l.payload_resumo_tabela.valor === "number"
                      ? l.payload_resumo_tabela.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                      : "—"}
                  </td>
                  <td className="px-4 py-2.5">{new Date(l.data_emissao).toLocaleDateString("pt-BR")}</td>
                  <td className="px-4 py-2.5 text-xs capitalize text-muted-foreground">{l.status_sefaz}</td>
                  <td className="px-4 py-2.5 text-right">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setSelected(l); }}>
                      <Ellipsis className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredLength > pageSize && (
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-border text-sm">
            <span className="text-muted-foreground">Página {page} de {totalPages} · {filteredLength} registros</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>Anterior</Button>
              <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage(page + 1)}>Próxima</Button>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}

function SummaryCard({ label, value, icon, tone }: { label: string; value: number; icon: React.ReactNode; tone: "primary" | "success" | "warning" | "destructive" | "muted" }) {
  const toneClasses: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    destructive: "bg-destructive/10 text-destructive",
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
