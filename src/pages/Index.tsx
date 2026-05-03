import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/store/useStore";
import { Button } from "@/components/ui/button";
import { ImportDialog } from "@/components/ImportDialog";
import { DetailDrawer } from "@/components/DetailDrawer";
import { LogsDrawer } from "@/components/LogsDrawer";
import { useToast } from "@/hooks/use-toast";
import { Ban, Building2, ChevronLeft, ChevronRight, ClipboardList, FileDown, FileSpreadsheet, ShieldCheck, Trash2, Upload } from "lucide-react";
import type { DatasetLinha, StatusFinal } from "@/lib/types";
import { ConferenciaView } from "@/pages/views/ConferenciaView";
import { DestinatariosView } from "@/pages/views/DestinatariosView";
import { ExcecoesView } from "@/pages/views/ExcecoesView";
import { LogsView } from "@/pages/views/LogsView";
import { APP_VERSION } from "@/config/appVersion";
import { exportarExcelConferencia } from "@/lib/exporters/excelExporter";
import { exportarPdfConferencia } from "@/lib/exporters/pdfExporter";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const PAGE_SIZE = 10;
type ViewKey = "conferencia" | "destinatarios" | "excecoes" | "logs";
const VIEW_HEADER: Record<ViewKey, { title: string; subtitle: string }> = {
  conferencia: {
    title: "Conferência",
    subtitle: "Conferência Inteligente de Notas Fiscais de Entrada",
  },
  destinatarios: {
    title: "Destinatários",
    subtitle: "Destinatários SEFAZ encontrados nas importações locais",
  },
  excecoes: {
    title: "Exceções",
    subtitle: "Regras locais de desconsideração de notas fiscais",
  },
  logs: {
    title: "Logs",
    subtitle: "Erros e avisos operacionais da sessão atual",
  },
};

const Index = () => {
  const { dataset, notas, erp, empresas, excecoes, logs, clearAnalysisData } = useStore();
  const { toast } = useToast();
  const [importOpen, setImportOpen] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  // activeView é navegação temporária por estado local; ainda não representa roteamento real.
  const [activeView, setActiveView] = useState<ViewKey>("conferencia");
  const [selected, setSelected] = useState<DatasetLinha | null>(null);
  // Controla o modo expandido/colapsado da sidebar no desktop.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("consultasefaz:sidebar-collapsed") === "true";
  });
  /**
   * ⚠️ REGRA CRÍTICA DO SISTEMA
   * `empresa_id` NÃO representa tenant.
   * Representa exclusivamente o DESTINATÁRIO FISCAL (CNPJ) da nota SEFAZ.
   */
  const [empresaId, setEmpresaId] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [chave, setChave] = useState("");
  const [dataIni, setDataIni] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [page, setPage] = useState(1);
  const headerContent = VIEW_HEADER[activeView];

  // Base sem filtro de status para manter contadores dinâmicos dos botões rápidos
  // respeitando os demais filtros (destinatário, período e chave).
  const filteredWithoutStatus = useMemo(() => {
    return dataset.filter((l) => {
      if (empresaId !== "all" && l.empresa_id !== empresaId) return false;
      if (chave && !l.chave_nfe.includes(chave.replace(/\D/g, ""))) return false;
      if (dataIni && new Date(l.data_emissao) < new Date(dataIni)) return false;
      if (dataFim && new Date(l.data_emissao) > new Date(dataFim + "T23:59:59")) return false;
      return true;
    });
  }, [dataset, empresaId, chave, dataIni, dataFim]);

  const filtered = useMemo(() => {
    if (status === "all") return filteredWithoutStatus;
    return filteredWithoutStatus.filter((l) => l.status_final === status);
  }, [filteredWithoutStatus, status]);

  const stats = useMemo(() => {
    const c = (s: StatusFinal) => filteredWithoutStatus.filter((l) => l.status_final === s).length;
    return {
      total: filteredWithoutStatus.length,
      ok: c("OK"),
      faltantes: c("FALTANTE"),
      irregulares: c("IRREGULAR"),
      desconsideradas: c("DESCONSIDERADA"),
    };
  }, [filteredWithoutStatus]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => {
    setPage(1);
  }, [empresaId, status, chave, dataIni, dataFim]);



  // Persiste a preferência do usuário para manter a mesma largura após recarregar.
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("consultasefaz:sidebar-collapsed", String(sidebarCollapsed));
  }, [sidebarCollapsed]);
  const errCount = logs.filter((l) => l.nivel === "erro").length;
  const hasAnalysisData = useMemo(() => {
    return dataset.length > 0 || notas.length > 0 || erp.length > 0 || logs.length > 0;
  }, [dataset.length, notas.length, erp.length, logs.length]);

  const warnCount = logs.filter((l) => l.nivel === "aviso").length;

  const clearFilters = () => {
    setEmpresaId("all");
    setStatus("all");
    setChave("");
    setDataIni("");
    setDataFim("");
  };

  const handleClearAnalysis = () => {
    clearAnalysisData();
    clearFilters();
    setPage(1);
    setSelected(null);
    setImportOpen(false);
    setLogsOpen(false);
    setConfirmClearOpen(false);
    toast({ title: "Análise limpa com sucesso. As exceções foram mantidas." });
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <div className={`grid min-h-screen grid-cols-1 ${sidebarCollapsed ? "lg:grid-cols-[96px_1fr]" : "lg:grid-cols-[232px_1fr]"}`}>
        <aside className={`hidden lg:flex flex-col border-r border-border bg-card sticky top-0 h-screen ${sidebarCollapsed ? "items-center px-3 py-4" : "p-4"}`}>
          <div className={`mb-7 w-full ${sidebarCollapsed ? "flex flex-col items-center gap-2" : "flex items-center justify-between gap-3 px-2"}`}>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/90 text-primary-foreground flex items-center justify-center">
                <ShieldCheck className="h-5 w-5" />
              </div>
              {!sidebarCollapsed && (
                <div>
                  <p className="text-lg font-bold leading-none">ConsultaSefaz</p>
                  <p className="text-xs text-muted-foreground">Conferência fiscal</p>
                </div>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
              onClick={() => setSidebarCollapsed((prev) => !prev)}
              title={sidebarCollapsed ? "Expandir menu" : "Colapsar menu"}
              aria-label={sidebarCollapsed ? "Expandir menu lateral" : "Colapsar menu lateral"}
            >
              {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>

          <nav className={`space-y-1 text-sm w-full ${sidebarCollapsed ? "flex flex-col items-center gap-2 space-y-0" : ""}`}>
            {/* activeView é navegação transitória; evolução futura pode migrar para roteamento real. */}
            <NavItem label="Conferência" icon={<ShieldCheck className="h-4 w-4" />} collapsed={sidebarCollapsed} active={activeView === "conferencia"} onClick={() => setActiveView("conferencia")} />
            <NavItem label="Destinatários" icon={<Building2 className="h-4 w-4" />} collapsed={sidebarCollapsed} active={activeView === "destinatarios"} onClick={() => setActiveView("destinatarios")} />
            <NavItem label="Exceções" icon={<Ban className="h-4 w-4" />} collapsed={sidebarCollapsed} active={activeView === "excecoes"} onClick={() => setActiveView("excecoes")} />
            <NavItem label="Logs" icon={<ClipboardList className="h-4 w-4" />} collapsed={sidebarCollapsed} active={activeView === "logs"} onClick={() => setActiveView("logs")} />
          </nav>

          {/* Rodapé discreto da sidebar com metadado estático de versão da aplicação. */}
          {!sidebarCollapsed && (
            <div className="mt-auto px-2 pt-6 text-xs text-muted-foreground">
              <p>Versão {APP_VERSION.version}</p>
              <p>Atualizado em {APP_VERSION.updatedAt}</p>
            </div>
          )}
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
            <div className="px-4 md:px-6 py-3 flex items-center justify-between gap-3">
              <div>
                <h1 className="text-lg font-semibold">{headerContent.title}</h1>
                <p className="text-xs text-muted-foreground">{headerContent.subtitle}</p>
              </div>
              {activeView === "conferencia" && (
                <div className="flex items-center gap-2">
                  <AlertDialog open={confirmClearOpen} onOpenChange={setConfirmClearOpen}>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!hasAnalysisData}
                        className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive disabled:border-border disabled:text-muted-foreground"
                      >
                        <Trash2 className="h-4 w-4 mr-2" /> Limpar análise
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Limpar análise atual?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja limpar a análise atual? Os relatórios importados, resultados da conferência e filtros serão removidos. As exceções cadastradas serão mantidas.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleClearAnalysis}>Sim, limpar análise</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  {/* Reaproveita o mesmo estado do wizard para abrir a importação direto no header da Conferência. */}
                  <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
                    <Upload className="h-4 w-4 mr-2" /> Importar Arquivos
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!hasAnalysisData}
                    onClick={() => {
                      if (filtered.length === 0) {
                        toast({ title: "Não há dados de conferência para exportar." });
                        return;
                      }
                      try {
                        exportarExcelConferencia(filtered, stats, { empresaId, status, dataIni, dataFim, chave, empresas });
                        toast({ title: "Relatório Excel gerado." });
                      } catch (e) {
                        console.error(e);
                        toast({ variant: "destructive", title: "Não foi possível gerar o relatório. Verifique os dados e tente novamente." });
                      }
                    }}
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-2" /> Exportar Excel
                  </Button>
                  <Button
                    size="sm"
                    disabled={!hasAnalysisData}
                    onClick={() => {
                      if (filtered.length === 0) {
                        toast({ title: "Não há dados de conferência para exportar." });
                        return;
                      }
                      try {
                        exportarPdfConferencia(filtered, stats, { empresaId, status, dataIni, dataFim, chave, empresas });
                        toast({ title: "Relatório PDF gerado." });
                      } catch (e) {
                        console.error(e);
                        toast({ variant: "destructive", title: "Não foi possível gerar o relatório. Verifique os dados e tente novamente." });
                      }
                    }}
                  >
                    <FileDown className="h-4 w-4 mr-2" /> Gerar PDF
                  </Button>
                </div>
              )}
            </div>
          </header>

          <main className="p-4 md:p-6 space-y-4">
            {/* Views separadas apenas para organização do front-end, sem alteração funcional ou de regra de negócio. */}
            {activeView === "conferencia" && (
              <ConferenciaView
                stats={stats}
                empresaId={empresaId}
                setEmpresaId={setEmpresaId}
                empresas={empresas}
                status={status}
                setStatus={setStatus}
                dataIni={dataIni}
                setDataIni={setDataIni}
                dataFim={dataFim}
                setDataFim={setDataFim}
                chave={chave}
                setChave={setChave}
                clearFilters={clearFilters}
                pageData={pageData}
                filteredLength={filtered.length}
                pageSize={PAGE_SIZE}
                page={page}
                totalPages={totalPages}
                setPage={setPage}
                setSelected={setSelected}
              />
            )}
            {activeView === "destinatarios" && <DestinatariosView />}
            {activeView === "excecoes" && (
              <ExcecoesView
                excecoes={excecoes}
                empresas={empresas}
                onNovaExcecao={() => toast({ title: "Cadastro de exceções será implementado em etapa futura." })}
              />
            )}
            {activeView === "logs" && (
              <LogsView
                logs={logs}
                warnCount={warnCount}
                errCount={errCount}
                onClear={() => toast({ title: "Funcionalidade será implementada em etapa futura" })}
              />
            )}
          </main>
        </div>
      </div>

      <ImportDialog
        open={importOpen}
        // Mantém o usuário na Conferência após fechar/concluir o wizard de importação.
        onOpenChange={(v) => {
          setImportOpen(v);
          if (!v) setActiveView("conferencia");
        }}
      />
      <DetailDrawer linha={selected} open={!!selected} onOpenChange={(v) => !v && setSelected(null)} />
      <LogsDrawer open={logsOpen} onOpenChange={setLogsOpen} />
    </div>
  );
};

function NavItem({
  label,
  icon,
  collapsed = false,
  active = false,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  collapsed?: boolean;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={collapsed ? label : undefined}
      aria-label={label}
      className={`rounded-md transition-colors ${collapsed ? "h-10 w-10 px-0 py-0 text-center" : "w-full px-3 py-2 text-left"} ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
    >
      <span className={`inline-flex items-center ${collapsed ? "justify-center" : "w-full gap-2"}`}>
        {icon}
        {!collapsed && label}
      </span>
    </button>
  );
}

export default Index;
