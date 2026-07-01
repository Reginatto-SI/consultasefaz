import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import { Upload, FileSpreadsheet, X, CheckCircle2, AlertTriangle, XCircle, Loader2 } from "lucide-react";
import { parseFile, type ParseResult, type TipoImportacao } from "@/lib/importer";
import { useStore } from "@/store/useStore";
import { toast } from "sonner";

type WizardStep = 1 | 2 | 3;

// Etapas mostradas no modal para o usuário enxergar progresso e nunca ver "Processando..." preso.
type StageMsg =
  | "idle"
  | "Lendo arquivo..."
  | "Validando layout..."
  | "Processando linhas..."
  | "Atualizando conferência..."
  | string;

function maskChave(chave: string): string {
  if (!chave) return "";
  if (chave.length <= 10) return chave;
  return `${chave.slice(0, 6)}...${chave.slice(-4)}`;
}

function isQuotaExceededError(error: any): boolean {
  return error?.name === "QuotaExceededError"
    || error?.code === 22
    || String(error?.message || "").toLowerCase().includes("quota");
}

function summarizeFailure(results: ParseResult[], fallback: string): string {
  const firstError = results.find((result) => result.errors.length > 0)?.errors[0];
  return firstError || fallback;
}

function isLoadingStage(stage: StageMsg): boolean {
  return stage === "Lendo arquivo..."
    || stage === "Validando layout..."
    || stage === "Processando linhas..."
    || stage === "Atualizando conferência...";
}

function isSuccessStage(stage: StageMsg): boolean {
  return stage === "Relatório SEFAZ importado com sucesso"
    || stage === "Conferência concluída";
}

// Pequeno yield para o React conseguir pintar a próxima etapa antes do trabalho pesado.
const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

export function ImportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [sefazFiles, setSefazFiles] = useState<File[]>([]);
  const [erpFiles, setErpFiles] = useState<File[]>([]);
  const [sefazResults, setSefazResults] = useState<ParseResult[]>([]);
  const [erpResults, setErpResults] = useState<ParseResult[]>([]);
  const [processing, setProcessing] = useState(false);
  const [stage, setStage] = useState<StageMsg>("idle");
  const store = useStore();

  const resetWizard = () => {
    setCurrentStep(1);
    setSefazFiles([]);
    setErpFiles([]);
    setSefazResults([]);
    setErpResults([]);
    setProcessing(false);
    setStage("idle");
  };

  const processBatch = async (tipo: TipoImportacao, files: File[]) => {
    const all: ParseResult[] = [];

    for (const file of files) {
      try {
        setStage("Lendo arquivo...");
        await tick();
        // O parser interno faz: validar extensão -> validar tamanho -> ler -> validar layout -> processar linhas.
        // Os yields cooperativos estão dentro do parseFile, mas mantemos o feedback de etapa aqui.
        setStage("Validando layout...");
        await tick();
        setStage("Processando linhas...");
        // tick extra: garante que o banner renderize ANTES de XLSX.read (síncrono
        // e CPU-bound) bloquear o thread por alguns segundos em arquivos grandes.
        await tick();
        const result = await parseFile(file, tipo);
        all.push(result);
      } catch (e: any) {
        // Defesa extra: qualquer erro inesperado vira erro estruturado para não travar a UI.
        all.push({
          ok: false,
          arquivo: file.name,
          tipo,
          errors: [e?.message || "Erro inesperado ao ler arquivo."],
          warnings: [],
        });
      }
    }

    const importacaoId = "imp-" + Date.now();
    const successResults = all.filter((result) => result.ok);

    if (tipo === "SEFAZ") {
      const todasNotas: any[] = [];
      for (const result of successResults) {
        if (!result.notasSefaz) continue;
        for (const nota of result.notasSefaz) {
          const empresa = store.upsertEmpresaByCnpj(nota.destinatario_cnpj_cpf || nota.cnpj_destinatario);
          todasNotas.push({
            empresa_id: empresa.id,
            chave_nfe: nota.chave_nfe,
            status_sefaz: nota.status_sefaz,
            data_emissao: nota.data_emissao,
            emitente_inscricao_estadual: nota.emitente_inscricao_estadual,
            emitente_cnpj_cpf: nota.emitente_cnpj_cpf,
            emitente_razao_social: nota.emitente_razao_social,
            destinatario_cnpj_cpf: nota.destinatario_cnpj_cpf,
            destinatario_razao_social: nota.destinatario_razao_social,
            inscricao_estadual_destinatario: nota.inscricao_estadual_destinatario,
            payload_completo: nota.payload_completo,
          });
        }
      }

      if (todasNotas.length) {
        setStage("Atualizando conferência...");
        await tick();
        store.ingestSefaz(todasNotas, importacaoId, files.map((file) => file.name).join(", "));
      }
    }

    if (tipo === "ERP") {
      // PROTEÇÃO: só agregamos registros de arquivos cujo parse foi OK.
      // Se TODOS os arquivos falharam, NÃO chamamos ingestErp — assim o snapshot ERP atual
      // não é apagado e o motor não classifica tudo como FALTANTE por uma falha de importação.
      const registrosErp = successResults.flatMap((result) => result.registrosErp || []);
      if (registrosErp.length) {
        setStage("Atualizando conferência...");
        await tick();
        store.ingestErp(registrosErp, importacaoId, files.map((file) => file.name).join(", "));
      }
    }

    for (const result of all) {
      for (const error of result.errors) {
        store.addLog({
          tipo: "importacao",
          nivel: "erro",
          arquivo_nome: result.arquivo,
          codigo_evento: tipo === "ERP" ? "IMPORT_ERR_ERP" : "IMPORT_ERR_SEFAZ",
          mensagem_usuario: error,
          contexto_resumido: result.diagnostics
            ? `motivo=${result.diagnostics.motivo_bloqueio || "n/a"}, linhas=${result.diagnostics.total_linhas_lidas ?? "n/a"}, cabecalho=${result.diagnostics.linha_cabecalho ?? "n/a"}, tempo_ms=${result.diagnostics.tempo_ms ?? "n/a"}`
            : undefined,
        });
      }

      for (const warning of result.warnings) {
        store.addLog({
          tipo: "importacao",
          nivel: "aviso",
          arquivo_nome: result.arquivo,
          codigo_evento: "IMPORT_WARN",
          mensagem_usuario: warning,
        });
      }

      if (result.tipo === "ERP" && result.diagnostics) {
        const d = result.diagnostics;
        const amostra = Array.isArray(d.chaves_amostra_5)
          ? d.chaves_amostra_5.map((k: string) => maskChave(k)).join(", ")
          : "";
        const amostraAuditoria = Array.isArray(d.auditoria_amostra_5_registros)
          ? d.auditoria_amostra_5_registros
            .map((r: any, idx: number) => `${idx + 1}) chave=${maskChave(r.chave_operacional_normalizada || "") || "vazia"}; IE=${r.inscricao_estadual_emitente || "n/a"}; emitente=${r.razao_social_emitente || "n/a"}; coluna=${r.coluna_original_chave_operacional || "n/a"}`)
            .join(" | ")
          : "n/a";
        store.addLog({
          tipo: "processamento",
          nivel: "aviso",
          arquivo_nome: result.arquivo,
          codigo_evento: "ERP_DIAG",
          mensagem_usuario: `RFT006 diagnóstico: coluna_chave_operacional=${d.auditoria_coluna_chave_operacional ?? d.coluna_chave_operacional_nome ?? "n/a"}, registros_importados=${d.auditoria_total_registros_rft006_importados ?? d.total_registros_estruturados ?? "n/a"}, chaves_unicas=${d.auditoria_total_chaves_unicas_rft006 ?? "n/a"}, linhas=${d.total_linhas_lidas ?? "n/a"}, estruturados=${d.total_registros_estruturados ?? "n/a"}, com_chave=${d.total_com_chave_acesso ?? "n/a"}, com_ie=${d.total_com_inscricao_estadual_emitente ?? "n/a"}, sem_chave=${d.total_sem_chave ?? "n/a"}, sem_ie=${d.total_sem_ie ?? "n/a"}, chave_44_invalida=${d.total_chave_tamanho_invalido ?? "n/a"}, parse_ms=${d.tempo_parse_ms ?? d.tempo_ms ?? "n/a"}.`,
          contexto_resumido: `amostra_chaves=${amostra || "n/a"}; auditoria_5_primeiros=${amostraAuditoria}`,
        });
      }
    }

    return {
      results: all,
      total: all.length,
      sucessos: successResults.length,
      erros: all.filter((result) => !result.ok).length,
      avisos: all.reduce((acc, result) => acc + result.warnings.length, 0),
    };
  };

  const handleProcessSefaz = async () => {
    if (processing) return; // PROTEÇÃO: bloqueia duplo clique / importações simultâneas.
    setProcessing(true);
    setStage("Lendo arquivo...");
    try {
      const summary = await processBatch("SEFAZ", sefazFiles);
      setSefazResults(summary.results);

      if (summary.sucessos > 0) {
        setStage("Relatório SEFAZ importado com sucesso");
        if (summary.erros > 0) {
          toast.warning(`Lote SEFAZ processado com ressalvas: ${summary.sucessos} sucesso(s) e ${summary.erros} erro(s).`);
        } else {
          toast.success(`Lote SEFAZ processado com sucesso: ${summary.sucessos} arquivo(s).`);
        }
        setCurrentStep(2);
        return;
      }

      const message = summarizeFailure(summary.results, "Nenhum arquivo SEFAZ foi processado com sucesso.");
      setStage(message);
      toast.error(message);
    } catch (error: any) {
      const message = isQuotaExceededError(error)
        ? "Não foi possível importar o arquivo porque o armazenamento local do navegador atingiu o limite. Limpe a análise atual ou reduza o lote."
        : `Falha inesperada no processamento do lote SEFAZ: ${error?.message || "erro desconhecido"}`;
      setStage(message);
      store.addLog({
        tipo: "importacao",
        nivel: "erro",
        codigo_evento: isQuotaExceededError(error) ? "LOCAL_STORAGE_QUOTA" : "IMPORT_UNEXPECTED_SEFAZ",
        mensagem_usuario: message,
      });
      toast.error(message);
    } finally {
      // PROTEÇÃO CRÍTICA: o botão NUNCA pode ficar preso em "Processando...".
      setProcessing(false);
    }
  };

  const handleProcessErp = async () => {
    if (processing) return; // PROTEÇÃO: bloqueia duplo clique / importações simultâneas.
    setProcessing(true);
    setStage("Lendo arquivo...");
    try {
      const summary = await processBatch("ERP", erpFiles);
      setErpResults(summary.results);

      if (summary.sucessos > 0) {
        setStage("Conferência concluída");
        if (summary.erros > 0) {
          toast.warning(`Lote RFT006 processado com ressalvas: ${summary.sucessos} sucesso(s) e ${summary.erros} erro(s).`);
        } else {
          toast.success(`Lote RFT006 processado com sucesso: ${summary.sucessos} arquivo(s).`);
        }
        setCurrentStep(3);
        return;
      }

      // Falha total: snapshot ERP anterior é mantido (não chamamos ingestErp acima).
      const message = `${summarizeFailure(summary.results, "Nenhum arquivo RFT006/ERP foi processado com sucesso.")} Os dados anteriores foram mantidos.`;
      setStage(message);
      toast.error(message);
    } catch (error: any) {
      const message = isQuotaExceededError(error)
        ? "Não foi possível importar o arquivo porque o armazenamento local do navegador atingiu o limite. Limpe a análise atual ou reduza o lote."
        : `Falha inesperada no processamento do lote RFT006: ${error?.message || "erro desconhecido"}`;
      setStage(message);
      store.addLog({
        tipo: "importacao",
        nivel: "erro",
        codigo_evento: isQuotaExceededError(error) ? "LOCAL_STORAGE_QUOTA" : "IMPORT_UNEXPECTED_ERP",
        mensagem_usuario: message,
      });
      toast.error(message);
    } finally {
      // PROTEÇÃO CRÍTICA: garante que o botão volta ao estado normal mesmo em falha.
      setProcessing(false);
    }
  };

  const handleClose = (v: boolean) => {
    // Permite fechar mesmo após erro; não permite fechar enquanto está realmente processando.
    if (!v && processing) return;
    if (!v) resetWizard();
    onOpenChange(v);
  };

  const totalWarnings = [...sefazResults, ...erpResults].reduce((acc, result) => acc + result.warnings.length, 0);
  const totalErrors = [...sefazResults, ...erpResults].reduce((acc, result) => acc + result.errors.length, 0);
  const sefazSuccesses = sefazResults.filter((result) => result.ok).length;
  const erpSuccesses = erpResults.filter((result) => result.ok).length;

  const renderStageBanner = () => {
    if (stage === "idle") return null;
    const isDone = isSuccessStage(stage);
    const isLoading = isLoadingStage(stage);
    const isError = !isLoading && !isDone;
    return (
      <div
        className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
          isError
            ? "border-destructive/40 bg-destructive/10 text-destructive"
            : isDone
            ? "border-success/40 bg-success/10 text-success"
            : "border-border bg-muted/40 text-foreground"
        }`}
        role="status"
        aria-live="polite"
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : isError ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
        <span>{stage}</span>
      </div>
    );
  };

  const renderErpDiagnostics = (result: ParseResult) => {
    if (result.tipo !== "ERP" || !result.diagnostics) return null;

    const d = result.diagnostics;
    const coluna = d.auditoria_coluna_chave_operacional ?? d.coluna_chave_operacional_nome ?? "não identificada";
    const usouFornecedor = d.coluna_chave_operacional_fornecedor === true;
    const fallbackMessage = "A coluna `Chave de acesso fornecedor` não foi encontrada. O sistema usou `Chave de acesso` como fallback. Verifique se o relatório é adequado para conferência de notas de entrada.";

    return (
      <div
        className={`ml-6 rounded-md border px-3 py-2 text-xs ${
          usouFornecedor
            ? "border-border bg-muted/30 text-foreground"
            : "border-warning/50 bg-warning/10 text-foreground"
        }`}
      >
        <p className="font-medium">Diagnóstico RFT006</p>
        <p>Coluna usada para matching: <span className="font-semibold">{coluna}</span></p>
        {!usouFornecedor && <p className="mt-1 text-warning">{fallbackMessage}</p>}
        <div className="mt-1 grid gap-1 sm:grid-cols-2">
          <span>Registros importados: {d.auditoria_total_registros_rft006_importados ?? d.total_registros_estruturados ?? "n/a"}</span>
          <span>Chaves únicas importadas: {d.auditoria_total_chaves_unicas_rft006 ?? "n/a"}</span>
          <span>Linhas sem chave: {d.total_sem_chave ?? "n/a"}</span>
          <span>Linhas com chave inválida: {d.total_chave_tamanho_invalido ?? "n/a"}</span>
          <span>Linhas sem IE: {d.total_sem_ie ?? "n/a"}</span>
        </div>
      </div>
    );
  };

  const renderResultList = (results: ParseResult[]) => {
    if (!results.length) return null;

    return (
      <div className="space-y-1.5 max-h-60 overflow-auto border rounded-lg p-3">
        <div className="text-sm font-medium mb-2">Resultado do lote:</div>
        {results.map((result, index) => (
          <div key={index} className="text-sm space-y-1">
            <div className="flex items-center gap-2">
              {result.ok ? (
                <CheckCircle2 className="h-4 w-4 text-success" />
              ) : (
                <XCircle className="h-4 w-4 text-destructive" />
              )}
              <span className="font-medium">{result.arquivo}</span>
            </div>
            {result.errors.map((error, errorIndex) => (
              <div key={errorIndex} className="ml-6 text-xs text-destructive flex items-start gap-1">
                <XCircle className="h-3 w-3 mt-0.5 shrink-0" /> {error}
              </div>
            ))}
            {result.warnings.map((warning, warningIndex) => (
              <div key={warningIndex} className="ml-6 text-xs text-warning flex items-start gap-1">
                <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" /> {warning}
              </div>
            ))}
            {renderErpDiagnostics(result)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar relatórios para conferência</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2">
              <div className="grid gap-2 text-sm">
                <div className="rounded-md border bg-muted/30 px-3 py-2">1. SEFAZ — relatório baixado da SEFAZ com as notas fiscais de entrada.</div>
                <div className="rounded-md border bg-muted/30 px-3 py-2">2. RFT006 / ERP — relatório exportado do ERP/Maxicon para confirmar o que já foi lançado.</div>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>Depois da importação, o sistema compara os relatórios e mostra notas OK, faltantes e irregulares.</p>
                <p>Formatos aceitos: .xlsx e .xls.</p>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>

        {currentStep === 1 && (
          <div className="space-y-4 mt-2">
            <div>
              <p className="text-sm font-semibold">1 de 2 — Envie o relatório da SEFAZ</p>
              <p className="text-xs text-muted-foreground mt-1">Selecione o Excel baixado da SEFAZ. Ele deve conter a chave da NF-e, situação da nota, emitente e destinatário.</p>
              <Accordion type="single" collapsible className="mt-2">
                <AccordionItem value="sefaz-help" className="border-b-0">
                  <AccordionTrigger className="py-2 text-xs text-muted-foreground">Como identificar este relatório?</AccordionTrigger>
                  <AccordionContent className="text-xs text-muted-foreground">
                    O relatório SEFAZ normalmente possui: Data de emissão, Chave de acesso, Situação, Dados do Emitente e Dados do Destinatário.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            <div>
              <Label htmlFor="sefaz-files">Relatório SEFAZ</Label>
              <Input
                id="sefaz-files"
                type="file"
                multiple
                accept=".xlsx,.xls"
                disabled={processing}
                onChange={(e) => {
                  setSefazFiles(Array.from(e.target.files || []));
                  setSefazResults([]);
                  setStage("idle");
                }}
                className="mt-1.5"
              />
            </div>

            {sefazFiles.length > 0 && (
              <div className="space-y-1.5 max-h-40 overflow-auto">
                {sefazFiles.map((file, index) => (
                  <Card key={index} className="flex items-center gap-2 text-sm bg-muted/50 px-3 py-2 shadow-none">
                    <FileSpreadsheet className="h-4 w-4 text-primary" />
                    <span className="flex-1 truncate">{file.name}</span>
                    <button
                      onClick={() => setSefazFiles(sefazFiles.filter((_, itemIndex) => itemIndex !== index))}
                      className="text-muted-foreground hover:text-foreground"
                      disabled={processing}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </Card>
                ))}
              </div>
            )}

            {renderStageBanner()}
            {renderResultList(sefazResults)}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => handleClose(false)} disabled={processing}>
                Fechar
              </Button>
              <Button onClick={handleProcessSefaz} disabled={!sefazFiles.length || processing}>
                <Upload className="h-4 w-4 mr-2" />
                {processing ? "Processando..." : "Continuar para o relatório ERP"}
              </Button>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-4 mt-2">
            <div>
              <p className="text-sm font-semibold">2 de 2 — Envie o relatório RFT006 do ERP</p>
              <p className="text-xs text-muted-foreground mt-1">Selecione o Excel exportado do ERP/Maxicon. Ele será usado para verificar quais notas da SEFAZ já foram escrituradas.</p>
              {sefazSuccesses > 0 && (
                <p className="text-xs text-success mt-2">Relatório SEFAZ importado com sucesso. Agora envie o relatório RFT006 / ERP.</p>
              )}
              <Accordion type="single" collapsible className="mt-2">
                <AccordionItem value="erp-help" className="border-b-0">
                  <AccordionTrigger className="py-2 text-xs text-muted-foreground">Como identificar este relatório?</AccordionTrigger>
                  <AccordionContent className="text-xs text-muted-foreground">
                    O RFT006 normalmente possui colunas como IE, Chave de acesso, Nota, Emissão, CNPJ e Razão Social.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            <div>
              <Label htmlFor="erp-files">Relatório RFT006 / ERP</Label>
              <Input
                id="erp-files"
                type="file"
                multiple
                accept=".xlsx,.xls"
                disabled={processing}
                onChange={(e) => {
                  setErpFiles(Array.from(e.target.files || []));
                  setErpResults([]);
                  setStage("idle");
                }}
                className="mt-1.5"
              />
            </div>

            {erpFiles.length > 0 && (
              <div className="space-y-1.5 max-h-40 overflow-auto">
                {erpFiles.map((file, index) => (
                  <Card key={index} className="flex items-center gap-2 text-sm bg-muted/50 px-3 py-2 shadow-none">
                    <FileSpreadsheet className="h-4 w-4 text-primary" />
                    <span className="flex-1 truncate">{file.name}</span>
                    <button
                      onClick={() => setErpFiles(erpFiles.filter((_, itemIndex) => itemIndex !== index))}
                      className="text-muted-foreground hover:text-foreground"
                      disabled={processing}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </Card>
                ))}
              </div>
            )}

            {renderStageBanner()}
            {renderResultList(erpResults)}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCurrentStep(1)} disabled={processing}>
                Voltar
              </Button>
              <Button onClick={handleProcessErp} disabled={!erpFiles.length || processing}>
                <Upload className="h-4 w-4 mr-2" />
                {processing ? "Processando..." : "Concluir importação e conferir notas"}
              </Button>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-4 mt-2">
            <div>
              <p className="text-sm font-semibold">Conferência concluída</p>
              <p className="text-xs text-muted-foreground mt-1">Os relatórios foram importados e a conferência foi atualizada.</p>
            </div>

            <div className="rounded-md border bg-muted/30 p-3 space-y-1 text-sm">
              <p>SEFAZ: {sefazSuccesses} arquivo(s) importado(s)</p>
              <p>RFT006/ERP: {erpSuccesses} arquivo(s) importado(s)</p>
              <p>Avisos: {totalWarnings}</p>
              <p>Erros: {totalErrors}</p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={resetWizard}>
                Importar novamente
              </Button>
              <Button onClick={() => handleClose(false)}>Ver conferência</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
