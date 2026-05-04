import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileSpreadsheet, X, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { parseFile, type ParseResult, type TipoImportacao } from "@/lib/importer";
import { useStore } from "@/store/useStore";
import { toast } from "sonner";

type WizardStep = 1 | 2 | 3;

function maskChave(chave: string): string {
  if (!chave) return "";
  if (chave.length <= 10) return chave;
  return `${chave.slice(0, 6)}...${chave.slice(-4)}`;
}

export function ImportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [sefazFiles, setSefazFiles] = useState<File[]>([]);
  const [erpFiles, setErpFiles] = useState<File[]>([]);
  const [sefazResults, setSefazResults] = useState<ParseResult[]>([]);
  const [erpResults, setErpResults] = useState<ParseResult[]>([]);
  const [processing, setProcessing] = useState(false);
  const store = useStore();

  const resetWizard = () => {
    setCurrentStep(1);
    setSefazFiles([]);
    setErpFiles([]);
    setSefazResults([]);
    setErpResults([]);
    setProcessing(false);
  };

  const processBatch = async (tipo: TipoImportacao, files: File[]) => {
    const all: ParseResult[] = [];

    for (const file of files) {
      try {
        const result = await parseFile(file, tipo);
        all.push(result);
      } catch (e: any) {
        all.push({
          ok: false,
          arquivo: file.name,
          tipo,
          errors: [e?.message || "Erro ao ler arquivo."],
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
        store.ingestSefaz(todasNotas, importacaoId, files.map((file) => file.name).join(", "));
      }
    }

    if (tipo === "ERP") {
      const registrosErp = successResults.flatMap((result) => result.registrosErp || []);
      if (registrosErp.length) {
        store.ingestErp(registrosErp, importacaoId, files.map((file) => file.name).join(", "));
      }
    }

    for (const result of all) {
      for (const error of result.errors) {
        store.addLog({
          tipo: "importacao",
          nivel: "erro",
          arquivo_nome: result.arquivo,
          codigo_evento: "IMPORT_ERR",
          mensagem_usuario: error,
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
        store.addLog({
          tipo: "processamento",
          nivel: "aviso",
          arquivo_nome: result.arquivo,
          codigo_evento: "ERP_DIAG",
          mensagem_usuario: `RFT006 diagnóstico: linhas=${d.total_linhas_lidas}, estruturados=${d.total_registros_estruturados}, com_chave=${d.total_com_chave_acesso}, com_ie=${d.total_com_inscricao_estadual_emitente}, sem_chave=${d.total_sem_chave}, sem_ie=${d.total_sem_ie}, chave_44_invalida=${d.total_chave_tamanho_invalido}, parse_ms=${d.tempo_parse_ms}.`,
          contexto_resumido: `amostra_chaves=${amostra || "n/a"}`,
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
    setProcessing(true);
    try {
      const summary = await processBatch("SEFAZ", sefazFiles);
      setSefazResults(summary.results);

      if (summary.sucessos > 0) {
        if (summary.erros > 0) {
          toast.warning(`Lote SEFAZ processado com ressalvas: ${summary.sucessos} sucesso(s) e ${summary.erros} erro(s).`);
        } else {
          toast.success(`Lote SEFAZ processado com sucesso: ${summary.sucessos} arquivo(s).`);
        }
        setCurrentStep(2);
        return;
      }

      toast.error("Nenhum arquivo SEFAZ foi processado com sucesso.");
    } catch (error: any) {
      store.addLog({
        tipo: "importacao",
        nivel: "erro",
        codigo_evento: "IMPORT_UNEXPECTED_SEFAZ",
        mensagem_usuario: `Falha inesperada no processamento do lote SEFAZ: ${error?.message || "erro desconhecido"}`,
      });
      toast.error("Erro inesperado ao processar lote SEFAZ.");
    } finally {
      setProcessing(false);
    }
  };

  const handleProcessErp = async () => {
    setProcessing(true);
    try {
      const summary = await processBatch("ERP", erpFiles);
      setErpResults(summary.results);

      if (summary.sucessos > 0) {
        if (summary.erros > 0) {
          toast.warning(`Lote RFT006 processado com ressalvas: ${summary.sucessos} sucesso(s) e ${summary.erros} erro(s).`);
        } else {
          toast.success(`Lote RFT006 processado com sucesso: ${summary.sucessos} arquivo(s).`);
        }
        setCurrentStep(3);
        return;
      }

      toast.error("Nenhum arquivo RFT006/ERP foi processado com sucesso.");
    } catch (error: any) {
      store.addLog({
        tipo: "importacao",
        nivel: "erro",
        codigo_evento: "IMPORT_UNEXPECTED_ERP",
        mensagem_usuario: `Falha inesperada no processamento do lote RFT006: ${error?.message || "erro desconhecido"}`,
      });
      toast.error("Erro inesperado ao processar lote RFT006/ERP.");
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = (v: boolean) => {
    if (!v) resetWizard();
    onOpenChange(v);
  };

  const totalWarnings = [...sefazResults, ...erpResults].reduce((acc, result) => acc + result.warnings.length, 0);
  const totalErrors = [...sefazResults, ...erpResults].reduce((acc, result) => acc + result.errors.length, 0);
  const sefazSuccesses = sefazResults.filter((result) => result.ok).length;
  const erpSuccesses = erpResults.filter((result) => result.ok).length;

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
          </div>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar Arquivos</DialogTitle>
          <DialogDescription>Suporte para .xlsx e .xls. Múltiplos arquivos por lote.</DialogDescription>
        </DialogHeader>

        {currentStep === 1 && (
          <div className="space-y-4 mt-2">
            <div>
              <p className="text-sm font-semibold">Etapa 1 de 3 — Importar lote SEFAZ</p>
              <p className="text-xs text-muted-foreground mt-1">Selecione um ou mais relatórios de notas destinadas extraídos da SEFAZ.</p>
              <p className="text-xs text-muted-foreground mt-1">A = Data emissão, D = Chave NF-e, I = Situação, L = IE do emitente, O = CNPJ/CPF do destinatário</p>
            </div>

            <div>
              <Label htmlFor="sefaz-files">Arquivos SEFAZ</Label>
              <Input
                id="sefaz-files"
                type="file"
                multiple
                accept=".xlsx,.xls"
                onChange={(e) => {
                  setSefazFiles(Array.from(e.target.files || []));
                  setSefazResults([]);
                }}
                className="mt-1.5"
              />
            </div>

            {sefazFiles.length > 0 && (
              <div className="space-y-1.5 max-h-40 overflow-auto">
                {sefazFiles.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm bg-muted/50 rounded px-3 py-2">
                    <FileSpreadsheet className="h-4 w-4 text-primary" />
                    <span className="flex-1 truncate">{file.name}</span>
                    <button onClick={() => setSefazFiles(sefazFiles.filter((_, itemIndex) => itemIndex !== index))} className="text-muted-foreground hover:text-foreground">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {renderResultList(sefazResults)}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => handleClose(false)}>
                Fechar
              </Button>
              <Button onClick={handleProcessSefaz} disabled={!sefazFiles.length || processing}>
                <Upload className="h-4 w-4 mr-2" />
                {processing ? "Processando..." : "Processar lote SEFAZ e continuar"}
              </Button>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-4 mt-2">
            <div>
              <p className="text-sm font-semibold">Etapa 2 de 3 — Importar lote RFT006 / ERP</p>
              <p className="text-xs text-muted-foreground mt-1">Selecione um ou mais relatórios RFT006 - Relatório de Notas Fiscais exportados do Maxicon/ERP.</p>
              <p className="text-xs text-muted-foreground mt-1">Z = IE do emitente, AC = Chave de acesso</p>
            </div>

            <div>
              <Label htmlFor="erp-files">Arquivos RFT006 / ERP</Label>
              <Input
                id="erp-files"
                type="file"
                multiple
                accept=".xlsx,.xls"
                onChange={(e) => {
                  setErpFiles(Array.from(e.target.files || []));
                  setErpResults([]);
                }}
                className="mt-1.5"
              />
            </div>

            {erpFiles.length > 0 && (
              <div className="space-y-1.5 max-h-40 overflow-auto">
                {erpFiles.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm bg-muted/50 rounded px-3 py-2">
                    <FileSpreadsheet className="h-4 w-4 text-primary" />
                    <span className="flex-1 truncate">{file.name}</span>
                    <button onClick={() => setErpFiles(erpFiles.filter((_, itemIndex) => itemIndex !== index))} className="text-muted-foreground hover:text-foreground">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {renderResultList(erpResults)}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCurrentStep(1)}>
                Voltar
              </Button>
              <Button onClick={handleProcessErp} disabled={!erpFiles.length || processing}>
                <Upload className="h-4 w-4 mr-2" />
                {processing ? "Processando..." : "Processar lote RFT006 e continuar"}
              </Button>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-4 mt-2">
            <div>
              <p className="text-sm font-semibold">Etapa 3 de 3 — Conferência consolidada</p>
              <p className="text-xs text-muted-foreground mt-1">A conferência foi recalculada com os dados importados.</p>
            </div>

            <div className="rounded-md border bg-muted/30 p-3 space-y-1 text-sm">
              <p>Arquivos SEFAZ selecionados: {sefazFiles.length}</p>
              <p>Arquivos SEFAZ processados com sucesso: {sefazSuccesses}</p>
              <p>Arquivos RFT006 selecionados: {erpFiles.length}</p>
              <p>Arquivos RFT006 processados com sucesso: {erpSuccesses}</p>
              <p>Total de avisos: {totalWarnings}</p>
              <p>Total de erros: {totalErrors}</p>
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
