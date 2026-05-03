import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/store/useStore";
import { Button } from "@/components/ui/button";
import { ImportDialog } from "@/components/ImportDialog";
import { DetailDrawer } from "@/components/DetailDrawer";
import { LogsDrawer } from "@/components/LogsDrawer";
import { useToast } from "@/hooks/use-toast";
import { Ban, Building2, ClipboardList, FileDown, FileSpreadsheet, ShieldCheck, Upload } from "lucide-react";
import type { DatasetLinha, StatusFinal } from "@/lib/types";
import { ConferenciaView } from "@/pages/views/ConferenciaView";
import { ImportacaoView } from "@/pages/views/ImportacaoView";
import { DestinatariosView } from "@/pages/views/DestinatariosView";
import { ExcecoesView } from "@/pages/views/ExcecoesView";
import { LogsView } from "@/pages/views/LogsView";
import { APP_VERSION } from "@/config/appVersion";

const PAGE_SIZE = 10;
type ViewKey = "conferencia" | "importacao" | "destinatarios" | "excecoes" | "logs";

const Index = () => {
  const { dataset, empresas, excecoes, logs } = useStore();
  const { toast } = useToast();
  const [importOpen, setImportOpen] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
  // activeView é navegação temporária por estado local; ainda não representa roteamento real.
  const [activeView, setActiveView] = useState<ViewKey>("conferencia");
  const [selected, setSelected] = useState<DatasetLinha | null>(null);
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
            {/* activeView é navegação transitória; evolução futura pode migrar para roteamento real. */}
            <NavItem label="Conferência" icon={<ShieldCheck className="h-4 w-4" />} active={activeView === "conferencia"} onClick={() => setActiveView("conferencia")} />
            <NavItem label="Importação" icon={<Upload className="h-4 w-4" />} active={activeView === "importacao"} onClick={() => setActiveView("importacao")} />
            <NavItem label="Destinatários" icon={<Building2 className="h-4 w-4" />} active={activeView === "destinatarios"} onClick={() => setActiveView("destinatarios")} />
            <NavItem label="Exceções" icon={<Ban className="h-4 w-4" />} active={activeView === "excecoes"} onClick={() => setActiveView("excecoes")} />
            <NavItem label="Logs" icon={<ClipboardList className="h-4 w-4" />} active={activeView === "logs"} onClick={() => setActiveView("logs")} />
          </nav>

          {/* Rodapé discreto da sidebar com metadado estático de versão da aplicação. */}
          <div className="mt-auto px-2 pt-6 text-xs text-muted-foreground">
            <p>Versão {APP_VERSION.version}</p>
            <p>Atualizado em {APP_VERSION.updatedAt}</p>
          </div>
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
            {activeView === "importacao" && <ImportacaoView onOpenImport={() => setImportOpen(true)} />}
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

export default Index;
