import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Upload, FileSpreadsheet, X, CheckCircle2, AlertTriangle, XCircle, Loader2, CloudUpload, FileUp, Search, ShieldCheck } from "lucide-react";
import { parseFile, type ParseResult, type TipoImportacao } from "@/lib/importer";
import { useStore } from "@/store/useStore";
import { toast } from "sonner";

type WizardStep = 1 | 2 | 3 | 4;

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


function formatFileSize(size: number): string {
  if (!Number.isFinite(size) || size <= 0) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
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
  const [maxysFiles, setMaxysFiles] = useState<File[]>([]);
  const [sefazResults, setSefazResults] = useState<ParseResult[]>([]);
  const [erpResults, setErpResults] = useState<ParseResult[]>([]);
  const [maxysResults, setMaxysResults] = useState<ParseResult[]>([]);
  const [processing, setProcessing] = useState(false);
  const [stage, setStage] = useState<StageMsg>("idle");
  const store = useStore();

  const resetWizard = () => {
    setCurrentStep(1);
    setSefazFiles([]);
    setErpFiles([]);
    setMaxysFiles([]);
    setSefazResults([]);
    setErpResults([]);
    setMaxysResults([]);
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

    if (tipo === "MAXYSXML") {
      const registrosMaxys = successResults.flatMap((result) => result.registrosMaxysXML || []);
      if (registrosMaxys.length) {
        setStage("Atualizando conferência...");
        await tick();
        store.ingestMaxysXML(registrosMaxys, importacaoId, files.map((file) => file.name).join(", "));
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
          codigo_evento: tipo === "MAXYSXML" ? "IMPORT_ERR_MAXYSXML" : tipo === "ERP" ? "IMPORT_ERR_ERP" : "IMPORT_ERR_SEFAZ",
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
        // O stepper já comunica a conclusão da SEFAZ; limpamos o feedback para não poluir a etapa RFT006.
        setStage("idle");
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
        setStage("idle");
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


  const handleProcessMaxys = async () => {
    if (processing) return;
    setProcessing(true);
    setStage("Lendo arquivo...");
    try {
      const summary = await processBatch("MAXYSXML", maxysFiles);
      setMaxysResults(summary.results);
      if (summary.sucessos > 0) {
        setStage("Conferência concluída");
        toast.success(`MaxysXML processado com sucesso: ${summary.sucessos} arquivo(s).`);
        setCurrentStep(4);
        return;
      }
      const message = summarizeFailure(summary.results, "Nenhum arquivo MaxysXML foi processado com sucesso.");
      setStage(message);
      toast.error(message);
    } catch (error: any) {
      const message = `Falha inesperada no processamento do MaxysXML: ${error?.message || "erro desconhecido"}`;
      setStage(message);
      store.addLog({ tipo: "importacao", nivel: "erro", codigo_evento: "IMPORT_UNEXPECTED_MAXYSXML", mensagem_usuario: message });
      toast.error(message);
    } finally {
      setProcessing(false);
    }
  };

  const skipMaxys = () => {
    setMaxysFiles([]);
    setMaxysResults([]);
    setStage("Conferência concluída");
    setCurrentStep(4);
  };

  const handleClose = (v: boolean) => {
    // Permite fechar mesmo após erro; não permite fechar enquanto está realmente processando.
    if (!v && processing) return;
    if (!v) resetWizard();
    onOpenChange(v);
  };

  const totalWarnings = [...sefazResults, ...erpResults, ...maxysResults].reduce((acc, result) => acc + result.warnings.length, 0);
  const totalErrors = [...sefazResults, ...erpResults, ...maxysResults].reduce((acc, result) => acc + result.errors.length, 0);
  const sefazSuccesses = sefazResults.filter((result) => result.ok).length;
  const erpSuccesses = erpResults.filter((result) => result.ok).length;
  const maxysSuccesses = maxysResults.filter((result) => result.ok).length;

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

  const activeFiles = currentStep === 1 ? sefazFiles : currentStep === 2 ? erpFiles : maxysFiles;
  const activeResults = currentStep === 1 ? sefazResults : currentStep === 2 ? erpResults : maxysResults;
  const stepHasError = activeResults.some((result) => !result.ok) || (!isLoadingStage(stage) && !isSuccessStage(stage) && stage !== "idle");
  const stepHasSuccess = currentStep === 1
    ? activeResults.some((result) => result.ok) || sefazSuccesses > 0
    : currentStep === 2
      ? activeResults.some((result) => result.ok) || erpSuccesses > 0
      : activeResults.some((result) => result.ok) || maxysSuccesses > 0;

  const onDropFiles = (files: FileList | null, step: WizardStep) => {
    if (!files || processing) return;
    const selected = Array.from(files);
    if (step === 1) {
      setSefazFiles(selected);
      setSefazResults([]);
    } else if (step === 2) {
      setErpFiles(selected);
      setErpResults([]);
    } else {
      setMaxysFiles(selected);
      setMaxysResults([]);
    }
    setStage("idle");
  };

  const renderStepper = () => {
    const steps = [
      { n: 1, title: "SEFAZ", desc: "Relatório baixado da SEFAZ" },
      { n: 2, title: "RFT006 / ERP", desc: "Relatório exportado do ERP/Maxicon" },
      { n: 3, title: "MaxysXML", desc: "Relatório opcional de XMLs" },
      { n: 4, title: "Conferir", desc: "Resultado da importação" },
    ] as const;

    return (
      <div className="mx-auto mt-6 grid w-full max-w-5xl grid-cols-2 gap-3 lg:grid-cols-4">
        {steps.map((step) => {
          const done = currentStep > step.n;
          const active = currentStep === step.n;
          return (
            <div key={step.n} className="flex items-start gap-3 rounded-xl border bg-background p-3">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold ${active ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20" : done ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground"}`}>
                {done ? <CheckCircle2 className="h-5 w-5" /> : step.n}
              </div>
              <div className="min-w-0">
                <p className={`text-sm font-semibold ${active ? "text-primary" : "text-foreground"}`}>{step.title}</p>
                <p className="text-xs text-muted-foreground">{step.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderUploadCard = (step: WizardStep) => {
    const isSefaz = step === 1;
    const isMaxys = step === 3;
    const files = isSefaz ? sefazFiles : isMaxys ? maxysFiles : erpFiles;
    const inputId = isSefaz ? "sefaz-files" : isMaxys ? "maxys-files" : "erp-files";
    const removeFile = (index: number) => {
      if (isSefaz) setSefazFiles(sefazFiles.filter((_, itemIndex) => itemIndex !== index));
      else if (isMaxys) setMaxysFiles(maxysFiles.filter((_, itemIndex) => itemIndex !== index));
      else setErpFiles(erpFiles.filter((_, itemIndex) => itemIndex !== index));
      setStage("idle");
    };
    const stateClass = stepHasError
      ? "border-destructive/60 bg-destructive/5"
      : files.length > 0 || stepHasSuccess
      ? "border-success/60 bg-success/5"
      : "border-primary/50 bg-primary/5 hover:bg-primary/10";

    return (
      <label
        htmlFor={inputId}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          onDropFiles(event.dataTransfer.files, step);
        }}
        className={`block cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition ${stateClass} ${processing ? "pointer-events-none opacity-70" : ""}`}
      >
        <input
          id={inputId}
          type="file"
          multiple
          accept=".xlsx,.xls"
          disabled={processing}
          onChange={(e) => {
            onDropFiles(e.target.files, step);
            // Permite remover e selecionar o mesmo arquivo novamente no input nativo.
            e.currentTarget.value = "";
          }}
          className="sr-only"
        />
        {files.length === 0 ? (
          <div className="flex min-h-44 flex-col items-center justify-center gap-3">
            <CloudUpload className="h-14 w-14 text-primary" />
            <div>
              <p className="text-lg font-semibold text-foreground">Clique para selecionar arquivo(s)</p>
              <p className="mt-1 text-sm text-muted-foreground">ou arraste e solte aqui</p>
            </div>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">Formatos aceitos: .xls e .xlsx</span>
          </div>
        ) : (
          <div className="space-y-3 text-left">
            <div className="flex items-center justify-center gap-2 text-sm font-medium text-success">
              <CheckCircle2 className="h-4 w-4" /> Arquivo(s) selecionado(s)
            </div>
            {files.map((file, index) => (
              <div key={index} className="flex items-center gap-3 rounded-xl border bg-background/80 px-4 py-3 shadow-sm">
                <FileSpreadsheet className="h-5 w-5 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
                  {formatFileSize(file.size) && <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    removeFile(index);
                  }}
                  disabled={processing}
                  aria-label={`Remover arquivo ${file.name}`}
                  className="h-8 px-2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <p className="text-center text-xs text-muted-foreground">Clique no card para substituir ou adicionar arquivo(s).</p>
          </div>
        )}
      </label>
    );
  };

  const renderInfoBlock = (items: string[]) => (
    <div className="rounded-2xl border bg-background p-4">
      <div className="flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <FileSpreadsheet className="h-5 w-5" />
        </div>
        <div>
          <p className="font-semibold">O que este arquivo deve conter?</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {items.map((item) => (
              <li key={item} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> {item}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );

  const renderHowItWorks = () => (
    <Card className="h-full rounded-2xl bg-muted/20 p-5 shadow-none">
      <h3 className="font-semibold">Como funciona</h3>
      <div className="mt-6 space-y-5">
        {[
          [FileUp, "Enviar SEFAZ", "Importe o relatório baixado da SEFAZ."],
          [FileSpreadsheet, "Enviar RFT006 / ERP", "Importe o relatório exportado do ERP."],
          [Search, "Conferir resultados", "O sistema compara os relatórios e exibe as divergências para análise."],
        ].map(([Icon, title, desc], index) => {
          const StepIcon = Icon as typeof FileUp;
          return (
            <div key={String(title)} className="flex gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><StepIcon className="h-5 w-5" /></div>
              <div>
                <div className="flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full border bg-background text-xs font-semibold text-primary">{index + 1}</span><p className="text-sm font-semibold">{title as string}</p></div>
                <p className="mt-1 text-sm text-muted-foreground">{desc as string}</p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-8 flex gap-3 rounded-xl border bg-background/80 p-3 text-sm text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" />
        <span>Os arquivos são processados localmente no navegador.</span>
      </div>
    </Card>
  );

  const renderWizardStep = () => {
    const isSefaz = currentStep === 1;
    const isMaxys = currentStep === 3;
    return (
      <>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Card className="rounded-2xl p-5 shadow-none">
            <h3 className="text-lg font-semibold">{isSefaz ? "Envie o relatório da SEFAZ" : isMaxys ? "Envie o relatório MaxysXML (opcional)" : "Envie o relatório RFT006 / ERP"}</h3>
            <div className="mt-5 space-y-5">
              {renderUploadCard(currentStep)}
              {isMaxys && <p className="rounded-xl border bg-muted/30 p-3 text-sm text-muted-foreground">Importe este arquivo apenas se quiser identificar quais XMLs estão pendentes no MaxysXML.</p>}
              {renderInfoBlock(isSefaz ? ["Chave da NF-e", "Situação da nota", "Emitente e destinatário"] : isMaxys ? ["Chave de Acesso", "Status XML", "Dados complementares do MaxysXML"] : ["Chave de acesso", "IE do emitente", "Dados da escrituração no ERP"])}
              {renderStageBanner()}
              {renderResultList(isSefaz ? sefazResults : isMaxys ? maxysResults : erpResults)}
            </div>
          </Card>
          {renderHowItWorks()}
        </div>
        <div className="mt-6 flex flex-col gap-4 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-44">
            <p className="text-sm font-medium text-muted-foreground">Etapa {currentStep} de 4</p>
            <Progress value={currentStep * 25} className="mt-2 h-1.5" />
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => {
                if (isSefaz) {
                  handleClose(false);
                  return;
                }
                setStage("idle");
                setCurrentStep(isMaxys ? 2 : 1);
              }}
              disabled={processing}
            >
              {isSefaz ? "Cancelar" : "Voltar"}
            </Button>
            {isMaxys && <Button variant="outline" onClick={skipMaxys} disabled={processing}>Pular MaxysXML</Button>}
            <Button onClick={isSefaz ? handleProcessSefaz : isMaxys ? (activeFiles.length ? handleProcessMaxys : skipMaxys) : handleProcessErp} disabled={(!activeFiles.length && !isMaxys) || processing} className="min-w-52">
              {processing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              {processing ? "Processando..." : isSefaz ? "Continuar para RFT006" : isMaxys ? (activeFiles.length ? "Conferir MaxysXML" : "Conferir sem MaxysXML") : "Continuar para MaxysXML"}
            </Button>
          </div>
        </div>
      </>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[92vh] max-w-6xl overflow-y-auto p-0">
        <div className="p-6 sm:p-8">
          <DialogHeader className="relative pr-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Upload className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-2xl">Importar relatórios para conferência</DialogTitle>
                <DialogDescription className="mt-2 text-sm">Importe SEFAZ e RFT006/ERP. A etapa MaxysXML é opcional para identificar XMLs pendentes.</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {currentStep !== 4 && renderStepper()}

          <div className="mt-8">
            {currentStep === 1 && renderWizardStep()}
            {currentStep === 2 && renderWizardStep()}
            {currentStep === 3 && renderWizardStep()}
            {currentStep === 4 && (
              <div className="space-y-4">
                <div className="rounded-2xl border bg-success/5 p-6 text-center">
                  <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
                  <p className="mt-3 text-lg font-semibold">Conferência concluída</p>
                  <p className="mt-1 text-sm text-muted-foreground">Os relatórios foram importados e a conferência foi atualizada.</p>
                </div>
                <div className="rounded-md border bg-muted/30 p-3 space-y-1 text-sm">
                  <p>SEFAZ: {sefazSuccesses} arquivo(s) importado(s)</p>
                  <p>RFT006/ERP: {erpSuccesses} arquivo(s) importado(s)</p>
                  <p>MaxysXML: {maxysSuccesses ? `${maxysSuccesses} arquivo(s) importado(s)` : "não importado"}</p>
                  <p>Avisos: {totalWarnings}</p>
                  <p>Erros: {totalErrors}</p>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={resetWizard}>Importar novamente</Button>
                  <Button onClick={() => handleClose(false)}>Ver conferência</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );}
