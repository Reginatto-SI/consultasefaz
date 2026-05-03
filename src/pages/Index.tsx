import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/store/useStore";
import { seedDemoData } from "@/lib/seed";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { ImportDialog } from "@/components/ImportDialog";
import { DetailDrawer } from "@/components/DetailDrawer";
import { LogsDrawer } from "@/components/LogsDrawer";
import { StatusBadge } from "@/components/StatusBadge";
import { Upload, FileText, ScrollText, ShieldCheck, AlertCircle, CircleHelp, Search, Sparkles } from "lucide-react";
import type { DatasetLinha, StatusFinal } from "@/lib/types";

const PAGE_SIZE = 10;

const Index = () => {
  const { dataset, empresas, logs } = useStore();
  const [importOpen, setImportOpen] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
  const [selected, setSelected] = useState<DatasetLinha | null>(null);
  const [empresaId, setEmpresaId] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [chave, setChave] = useState("");
  const [dataIni, setDataIni] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    seedDemoData();
  }, []);

  const filtered = useMemo(() => {
    return dataset.filter((l) => {
      if (empresaId !== "all" && l.empresa_id !== empresaId) return false;
      if (status !== "all" && l.status_final !== status) return false;
      if (chave && !l.chave_nfe.includes(chave.replace(/\D/g, ""))) return false;
      if (dataIni && new Date(l.data_emissao) < new Date(dataIni)) return false;
      if (dataFim && new Date(l.data_emissao) > new Date(dataFim + "T23:59:59")) return false;
      return true;
    });
  }, [dataset, empresaId, status, chave, dataIni, dataFim]);

  const stats = useMemo(() => {
    const c = (s: StatusFinal) => filtered.filter((l) => l.status_final === s).length;
    return {
      total: filtered.length,
      ok: c("OK"),
      faltantes: c("FALTANTE"),
      irregulares: c("IRREGULAR"),
      desconsideradas: c("DESCONSIDERADA"),
    };
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { setPage(1); }, [empresaId, status, chave, dataIni, dataFim]);

  const errCount = logs.filter((l) => l.nivel === "erro").length;
  const warnCount = logs.filter((l) => l.nivel === "aviso").length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">ConsultaSefaz</h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="h-3 w-3" /> Conferência Inteligente de Notas Fiscais
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setLogsOpen(true)}>
              <ScrollText className="h-4 w-4 mr-2" />
              Logs
              {(errCount + warnCount) > 0 && (
                <span className="ml-2 text-xs bg-muted px-1.5 py-0.5 rounded-full">
                  {errCount + warnCount}
                </span>
              )}
            </Button>
            <Button onClick={() => setImportOpen(true)} className="shadow-sm">
              <Upload className="h-4 w-4 mr-2" /> Importar Arquivos
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-6 space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard label="Total" value={stats.total} icon={<FileText className="h-5 w-5" />} tone="primary" />
          <SummaryCard label="OK" value={stats.ok} icon={<ShieldCheck className="h-5 w-5" />} tone="success" />
          <SummaryCard label="Faltantes" value={stats.faltantes} icon={<CircleHelp className="h-5 w-5" />} tone="warning" />
          <SummaryCard label="Irregulares" value={stats.irregulares} icon={<AlertCircle className="h-5 w-5" />} tone="destructive" />
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <Label className="text-xs">Empresa</Label>
              <Select value={empresaId} onValueChange={setEmpresaId}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
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
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
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
              <Input type="date" value={dataIni} onChange={(e) => setDataIni(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Data final</Label>
              <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Buscar chave NFe</Label>
              <div className="relative mt-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input value={chave} onChange={(e) => setChave(e.target.value)} placeholder="Chave..." className="pl-8" />
              </div>
            </div>
          </div>
        </Card>

        {/* Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Empresa</th>
                  <th className="text-left px-4 py-3 font-medium">Chave NFe</th>
                  <th className="text-left px-4 py-3 font-medium">Emitente</th>
                  <th className="text-right px-4 py-3 font-medium">Valor</th>
                  <th className="text-left px-4 py-3 font-medium">Emissão</th>
                  <th className="text-left px-4 py-3 font-medium">SEFAZ</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {pageData.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-16 text-muted-foreground">
                      <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
                      <p className="font-medium">Sem dados para exibir</p>
                      <p className="text-xs mt-1">Importe arquivos SEFAZ e ERP para iniciar a conferência.</p>
                    </td>
                  </tr>
                )}
                {pageData.map((l) => (
                  <tr key={l.empresa_id + l.chave_nfe} className="border-t border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3"><StatusBadge status={l.status_final} /></td>
                    <td className="px-4 py-3 font-medium">{l.empresa_nome}</td>
                    <td className="px-4 py-3 font-mono text-xs">{l.chave_nfe.slice(0, 8)}…{l.chave_nfe.slice(-6)}</td>
                    <td className="px-4 py-3">{l.payload_resumo_tabela.emitente ?? "—"}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {typeof l.payload_resumo_tabela.valor === "number"
                        ? l.payload_resumo_tabela.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                        : "—"}
                    </td>
                    <td className="px-4 py-3">{new Date(l.data_emissao).toLocaleDateString("pt-BR")}</td>
                    <td className="px-4 py-3 text-xs capitalize text-muted-foreground">{l.status_sefaz}</td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="ghost" onClick={() => setSelected(l)}>Detalhes</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border text-sm">
              <span className="text-muted-foreground">
                Página {page} de {totalPages} · {filtered.length} registros
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>
                  Anterior
                </Button>
                <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </Card>
      </main>

      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
      <DetailDrawer linha={selected} open={!!selected} onOpenChange={(v) => !v && setSelected(null)} />
      <LogsDrawer open={logsOpen} onOpenChange={setLogsOpen} />
    </div>
  );
};

function SummaryCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: "primary" | "success" | "warning" | "destructive";
}) {
  const toneClasses: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    destructive: "bg-destructive/10 text-destructive",
  };
  return (
    <Card className="p-4 flex items-center gap-4">
      <div className={`h-11 w-11 rounded-lg flex items-center justify-center ${toneClasses[tone]}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{label}</p>
        <p className="text-2xl font-bold tabular-nums">{value}</p>
      </div>
    </Card>
  );
}

export default Index;
