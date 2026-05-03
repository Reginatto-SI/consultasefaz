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
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Ban, Building2, CircleHelp, ClipboardList, Ellipsis, FileDown, FileSpreadsheet, FileText, Search, ShieldCheck, Upload } from "lucide-react";
import type { DatasetLinha, StatusFinal } from "@/lib/types";

const PAGE_SIZE = 10;
type ViewKey = "conferencia" | "importacao" | "destinatarios" | "excecoes" | "logs";

const Index = () => {
  const { dataset, empresas, excecoes, logs } = useStore();
  const { toast } = useToast();
  const [importOpen, setImportOpen] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
  const [activeView, setActiveView] = useState<ViewKey>("conferencia");
  const [selected, setSelected] = useState<DatasetLinha | null>(null);
  /**
   * ⚠️ REGRA CRÍTICA DO SISTEMA
   *
   * `empresa_id` NÃO representa empresa/tenant.
   * Representa exclusivamente o DESTINATÁRIO FISCAL (CNPJ) da nota SEFAZ.
   *
   * Qualquer uso fora desse contexto é ERRO DE MODELAGEM.
   *
   * Ver: PRD 00 — Dicionário de Domínio
   */
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
  useEffect(() => {
    setPage(1);
  }, [empresaId, status, chave, dataIni, dataFim]);

  const errCount = logs.filter((l) => l.nivel === "erro").length;
  const warnCount = logs.filter((l) => l.nivel === "aviso").length;

  const clearFilters = () => {
    setEmpresaId("all");
    setStatus("all");
    setChave("");
    setDataIni("");
    setDataFim("");
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Ajuste visual: base estrutural com sidebar fixa + header operacional para evitar aparência de dashboard isolado. */}
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[232px_1fr]">
        <aside className="hidden lg:flex flex-col border-r border-border bg-card sticky top-0 h-screen p-4">
          <div className="mb-7 flex items-center gap-3 px-2">
            <div className="h-9 w-9 rounded-lg bg-primary/90 text-primary-foreground flex items-center justify-center">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-bold leading-none">ConsultaSefaz</p>
              <p className="text-xs text-muted-foreground">Conferência fiscal</p>
            </div>
          </div>

          <nav className="space-y-1 text-sm">
            {/* Navegação por estado é temporária nesta etapa; o PRD prevê evolução posterior para roteamento real. */}
            <NavItem label="Conferência" icon={<ShieldCheck className="h-4 w-4" />} active={activeView === "conferencia"} onClick={() => setActiveView("conferencia")} />
            <NavItem label="Importação" icon={<Upload className="h-4 w-4" />} active={activeView === "importacao"} onClick={() => setActiveView("importacao")} />
            <NavItem label="Destinatários" icon={<Building2 className="h-4 w-4" />} active={activeView === "destinatarios"} onClick={() => setActiveView("destinatarios")} />
            <NavItem label="Exceções" icon={<Ban className="h-4 w-4" />} active={activeView === "excecoes"} onClick={() => setActiveView("excecoes")} />
            <NavItem label="Logs" icon={<ClipboardList className="h-4 w-4" />} active={activeView === "logs"} onClick={() => setActiveView("logs")} />
          </nav>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
            <div className="px-4 md:px-6 py-3 flex items-center justify-between gap-3">
              <div>
                <h1 className="text-lg font-semibold">Conferência</h1>
                <p className="text-xs text-muted-foreground">Conferência Inteligente de Notas Fiscais de Entrada</p>
              </div>
              {activeView === "conferencia" && (
                <div className="flex items-center gap-2">
                  {/* Botões de Exportar Excel e Gerar PDF são placeholders visuais; não há exportação/PDF real nesta etapa. */}
                  <Button variant="outline" size="sm" onClick={() => toast({ title: "Funcionalidade será implementada em etapa futura" })}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" /> Exportar Excel
                  </Button>
                  <Button size="sm" onClick={() => toast({ title: "Funcionalidade será implementada em etapa futura" })}>
                    <FileDown className="h-4 w-4 mr-2" /> Gerar PDF
                  </Button>
                </div>
              )}
              {activeView === "importacao" && (
                <Button size="sm" onClick={() => setImportOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" /> Importar Arquivos
                </Button>
              )}
            </div>
          </header>

          <main className="p-4 md:p-6 space-y-4">
            {activeView === "importacao" && (
              <Card className="p-4 space-y-4">
                <h2 className="text-lg font-semibold">Importação de Arquivos</h2>
                <p className="text-sm text-muted-foreground">Selecione o tipo de arquivo e siga os campos obrigatórios para iniciar a conferência.</p>
                <div className="grid gap-3 md:grid-cols-2">
                  <Card className="p-4">
                    <h3 className="font-medium">Importação SEFAZ</h3>
                    <p className="text-sm text-muted-foreground mt-1">Obrigatórios: XML/relatório SEFAZ, período e destinatário.</p>
                  </Card>
                  <Card className="p-4">
                    <h3 className="font-medium">Importação ERP</h3>
                    <p className="text-sm text-muted-foreground mt-1">Obrigatórios: arquivo ERP compatível e período equivalente ao lote SEFAZ.</p>
                  </Card>
                </div>
                <Button onClick={() => setImportOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" /> Abrir modal de importação
                </Button>
              </Card>
            )}
            {activeView === "destinatarios" && (
              <Card className="p-4 space-y-3">
                <h2 className="text-lg font-semibold">Destinatários SEFAZ</h2>
                <p className="text-sm text-muted-foreground">Cadastro de destinatários será implementado na próxima etapa.</p>
                <Button variant="outline">Novo destinatário</Button>
              </Card>
            )}
            {activeView === "excecoes" && (
              <>
                {/* Exceções são módulo operacional previsto no PRD 04 para notas desconsideradas/revertidas. */}
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
                    <Button variant="outline" size="sm" onClick={() => toast({ title: "Cadastro de exceções será implementado em etapa futura." })}>
                      Nova exceção
                    </Button>
                  </div>
                  {excecoes.length === 0 ? (
                    <div className="rounded-md border border-dashed border-border p-8 text-center">
                      <p className="font-medium">Nenhuma exceção cadastrada.</p>
                      <Button className="mt-3" size="sm" variant="outline" onClick={() => toast({ title: "Cadastro de exceções será implementado em etapa futura." })}>
                        Nova exceção
                      </Button>
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
            )}
            {activeView === "logs" && (
              <Card className="p-4 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">Logs Operacionais</h2>
                    <p className="text-sm text-muted-foreground">Total de avisos: {warnCount} · Total de erros: {errCount}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => toast({ title: "Funcionalidade será implementada em etapa futura" })}>Limpar</Button>
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
            )}
            {activeView === "conferencia" && (
              <>
            {/* Ajuste visual: cards compactos para manter contexto sem competir com a tabela. */}
            <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
              <SummaryCard label="Total" value={stats.total} icon={<FileText className="h-4 w-4" />} tone="primary" />
              <SummaryCard label="OK" value={stats.ok} icon={<ShieldCheck className="h-4 w-4" />} tone="success" />
              <SummaryCard label="Faltantes" value={stats.faltantes} icon={<CircleHelp className="h-4 w-4" />} tone="warning" />
              <SummaryCard label="Irregulares" value={stats.irregulares} icon={<AlertCircle className="h-4 w-4" />} tone="destructive" />
              <SummaryCard label="Desconsideradas" value={stats.desconsideradas} icon={<Building2 className="h-4 w-4" />} tone="muted" />
            </div>

            {/* Ajuste visual: card de filtros compacto/responsivo com ação explícita para limpar estado. */}
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

            {/* Ajuste visual: tabela com protagonismo e linhas clicáveis para ação rápida de conferência. */}
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
              {filtered.length > PAGE_SIZE && (
                <div className="flex items-center justify-between px-4 py-2.5 border-t border-border text-sm">
                  <span className="text-muted-foreground">Página {page} de {totalPages} · {filtered.length} registros</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>Anterior</Button>
                    <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage(page + 1)}>Próxima</Button>
                  </div>
                </div>
              )}
            </Card>
              </>
            )}
          </main>
        </div>
      </div>

      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
      <DetailDrawer linha={selected} open={!!selected} onOpenChange={(v) => !v && setSelected(null)} />
      <LogsDrawer open={logsOpen} onOpenChange={setLogsOpen} />
    </div>
  );
};

function NavItem({ label, icon, active = false, onClick }: { label: string; icon: React.ReactNode; active?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-md px-3 py-2 text-left transition-colors ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
    >
      <span className="inline-flex items-center gap-2">
        {icon}
        {label}
      </span>
    </button>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: "primary" | "success" | "warning" | "destructive" | "muted";
}) {
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

export default Index;
