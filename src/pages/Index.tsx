import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/store/useStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ImportDialog } from "@/components/ImportDialog";
import { DetailDrawer } from "@/components/DetailDrawer";
import { LogsDrawer } from "@/components/LogsDrawer";
import { useToast } from "@/hooks/use-toast";
import { Ban, Building2, ChevronLeft, ChevronRight, ClipboardList, FileDown, FileSpreadsheet, ShieldCheck, Trash2, Upload } from "lucide-react";
import type { DatasetLinha, StatusFinal } from "@/lib/types";
import { ConferenciaView } from "@/pages/views/ConferenciaView";
import type { SortDirection, SortKey, SortState } from "@/pages/views/ConferenciaView";
import { DestinatariosView } from "@/pages/views/DestinatariosView";
import { ExcecoesView } from "@/pages/views/ExcecoesView";
import { LogsView } from "@/pages/views/LogsView";
import { APP_VERSION } from "@/config/appVersion";
import { getNatureza } from "@/lib/conferencia/helpers";
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

const DEFAULT_PAGE_SIZE = 30;
const PAGE_SIZE_OPTIONS = [15, 30, 50, 100, 200, 500] as const;
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
  const { dataset, notas, erp, empresas, excecoes, logs, clearAnalysisData, analysisSnapshotRestored } = useStore();
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
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [sort, setSort] = useState<SortState>(null);
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

  // Base sem filtro de destinatário para contabilizar chips de Destinatário junto com status, período e chave.
  const filteredWithoutDestinatario = useMemo(() => {
    return dataset.filter((l) => {
      if (status !== "all" && l.status_final !== status) return false;
      if (chave && !l.chave_nfe.includes(chave.replace(/\D/g, ""))) return false;
      if (dataIni && new Date(l.data_emissao) < new Date(dataIni)) return false;
      if (dataFim && new Date(l.data_emissao) > new Date(dataFim + "T23:59:59")) return false;
      return true;
    });
  }, [dataset, status, chave, dataIni, dataFim]);

  const destinatarioCounts = useMemo(() => {
    return filteredWithoutDestinatario.reduce<Record<string, number>>((acc, linha) => {
      acc[linha.empresa_id] = (acc[linha.empresa_id] ?? 0) + 1;
      return acc;
    }, {});
  }, [filteredWithoutDestinatario]);

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

  const sortedFiltered = useMemo(() => {
    if (!sort) return filtered;
    // Ordena sempre em cópia para preservar a ordem original do dataset filtrado quando a ordenação é removida.
    return [...filtered].sort((a, b) => compareConferenciaRows(a, b, sort.key, sort.direction));
  }, [filtered, sort]);

  const totalPages = Math.max(1, Math.ceil(sortedFiltered.length / pageSize));
  const pageData = sortedFiltered.slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => {
    setPage(1);
  }, [empresaId, status, chave, dataIni, dataFim, sort]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

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
    setPageSize(DEFAULT_PAGE_SIZE);
    setSort(null);
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
              {/* Logo textual da empresa no lugar do ícone para manter identidade visual solicitada. */}
              <div className="h-9 w-9 rounded-lg bg-primary/90 text-primary-foreground flex items-center justify-center font-bold text-sm tracking-wide">
                JM
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
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs text-muted-foreground">{headerContent.subtitle}</p>
                  {activeView === "conferencia" && analysisSnapshotRestored && (
                    <Badge variant="outline" className="border-primary/30 bg-primary/5 text-[11px] font-medium text-primary">
                      Última análise carregada deste navegador
                    </Badge>
                  )}
                </div>
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
                          Tem certeza que deseja limpar a análise atual? Os relatórios SEFAZ/RFT006 importados, resultados da conferência, logs operacionais, execução atual e filtros serão removidos. As exceções cadastradas serão mantidas.
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
                destinatarioCounts={destinatarioCounts}
                destinatarioTotalCount={filteredWithoutDestinatario.length}
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
                pageSize={pageSize}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                setPageSize={(value) => {
                  setPageSize(value);
                  setPage(1);
                }}
                page={page}
                totalPages={totalPages}
                setPage={setPage}
                sort={sort}
                setSort={(value) => {
                  setSort(value);
                  setPage(1);
                }}
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

function compareConferenciaRows(a: DatasetLinha, b: DatasetLinha, key: SortKey, direction: SortDirection) {
  const modifier = direction === "asc" ? 1 : -1;

  if (key === "valor_total") {
    return compareNullableNumbers(getValorTotalOrdenavel(a), getValorTotalOrdenavel(b), modifier);
  }

  if (key === "data_emissao") {
    return compareNullableNumbers(getTimestampOrdenavel(a.data_emissao), getTimestampOrdenavel(b.data_emissao), modifier);
  }

  return compareText(getTextoOrdenavel(a, key), getTextoOrdenavel(b, key)) * modifier;
}

function compareNullableNumbers(a: number | null, b: number | null, modifier: 1 | -1) {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return (a - b) * modifier;
}

function compareText(a: string, b: string) {
  return a.localeCompare(b, "pt-BR", { sensitivity: "base", numeric: true });
}

function getTextoOrdenavel(linha: DatasetLinha, key: SortKey) {
  const value = key === "status"
    ? linha.status_final
    : key === "destinatario"
      ? linha.payload_completo_drawer?.destinatario_apelido
        ?? linha.payload_completo_drawer?.destinatario_nome
        ?? linha.empresa_nome
        ?? linha.payload_completo_drawer?.destinatario_razao_social
      : key === "natureza"
        ? getNatureza(linha)
        : key === "emitente"
          ? linha.payload_resumo_tabela?.emitente ?? linha.payload_completo_drawer?.emitente_razao_social
          : key === "status_sefaz"
            ? linha.status_sefaz
            : linha.chave_nfe;

  return String(value ?? "").trim();
}

function getValorTotalOrdenavel(linha: DatasetLinha) {
  const valor = linha.payload_resumo_tabela?.valor ?? linha.payload_completo_drawer?.valor_total_nota_fiscal;
  return normalizeCurrencyValue(valor);
}

export function normalizeCurrencyValue(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || !value.trim()) return null;

  // Aceita moedas BR e formatos americanos sem confundir decimal americano (104.00) com milhar BR.
  const sanitized = value.trim().replace(/[^\d,.-]/g, "");
  if (!sanitized || sanitized === "-" || sanitized === "." || sanitized === ",") return null;

  const lastComma = sanitized.lastIndexOf(",");
  const lastDot = sanitized.lastIndexOf(".");
  const decimalSeparator = getCurrencyDecimalSeparator(sanitized, lastComma, lastDot);
  const normalized = decimalSeparator
    ? normalizeWithDecimalSeparator(sanitized, decimalSeparator)
    : sanitized.replace(/[^\d-]/g, "");
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

function getCurrencyDecimalSeparator(value: string, lastComma: number, lastDot: number) {
  if (lastComma >= 0 && lastDot >= 0) return lastComma > lastDot ? "," : ".";

  const separator = lastComma >= 0 ? "," : lastDot >= 0 ? "." : null;
  if (!separator) return null;

  const lastSeparator = separator === "," ? lastComma : lastDot;
  const fractionLength = value.length - lastSeparator - 1;
  const occurrences = value.split(separator).length - 1;

  if (occurrences > 1) return null;
  return fractionLength > 0 && fractionLength <= 2 ? separator : null;
}

function normalizeWithDecimalSeparator(value: string, decimalSeparator: "," | ".") {
  const decimalIndex = value.lastIndexOf(decimalSeparator);
  const integerPart = value.slice(0, decimalIndex).replace(/[^\d-]/g, "");
  const decimalPart = value.slice(decimalIndex + 1).replace(/\D/g, "");

  return `${integerPart}.${decimalPart}`;
}

function getTimestampOrdenavel(value?: string | null) {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

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
