import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, FileSpreadsheet, X, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { parseFile, type ParseResult, type TipoImportacao } from "@/lib/importer";
import { useStore } from "@/store/useStore";
import { toast } from "sonner";

export function ImportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [tipo, setTipo] = useState<TipoImportacao>("SEFAZ");
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<ParseResult[]>([]);
  const [processing, setProcessing] = useState(false);
  const store = useStore();

  const reset = () => {
    setFiles([]);
    setResults([]);
  };

  const handleProcess = async () => {
    setProcessing(true);
    const all: ParseResult[] = [];
    for (const f of files) {
      try {
        const r = await parseFile(f, tipo);
        all.push(r);
      } catch (e: any) {
        all.push({
          ok: false,
          arquivo: f.name,
          tipo,
          errors: [e?.message || "Erro ao ler arquivo."],
          warnings: [],
        });
      }
    }
    setResults(all);

    // ingest valid ones
    const importacao_id = "imp-" + Date.now();
    if (tipo === "SEFAZ") {
      const todasNotas: any[] = [];
      for (const r of all) {
        if (!r.ok || !r.notasSefaz) continue;
        for (const n of r.notasSefaz) {
          const empresa = store.upsertEmpresaByCnpj(n.cnpj_destinatario);
          todasNotas.push({
            empresa_id: empresa.id,
            chave_nfe: n.chave_nfe,
            status_sefaz: n.status_sefaz,
            data_emissao: n.data_emissao,
            inscricao_estadual_destinatario: n.inscricao_estadual_destinatario,
            payload_completo: n.payload_completo,
          });
        }
      }
      if (todasNotas.length) store.ingestSefaz(todasNotas, importacao_id, files.map(f => f.name).join(", "));
    } else {
      const todos: any[] = [];
      for (const r of all) {
        if (!r.ok || !r.registrosErp) continue;
        todos.push(...r.registrosErp);
      }
      if (todos.length) store.ingestErp(todos, importacao_id, files.map(f => f.name).join(", "));
    }

    for (const r of all) {
      for (const err of r.errors) {
        store.addLog({
          tipo: "importacao",
          nivel: "erro",
          arquivo_nome: r.arquivo,
          codigo_evento: "IMPORT_ERR",
          mensagem_usuario: err,
        });
      }
      for (const w of r.warnings) {
        store.addLog({
          tipo: "importacao",
          nivel: "aviso",
          arquivo_nome: r.arquivo,
          codigo_evento: "IMPORT_WARN",
          mensagem_usuario: w,
        });
      }
    }

    const ok = all.filter((r) => r.ok).length;
    const err = all.filter((r) => !r.ok).length;
    toast.success(`Importação concluída: ${ok} sucesso, ${err} com erro.`);
    setProcessing(false);
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar Arquivos</DialogTitle>
          <DialogDescription>Suporte para .xlsx e .xls. Múltiplos arquivos por lote.</DialogDescription>
        </DialogHeader>

        <Tabs value={tipo} onValueChange={(v) => setTipo(v as TipoImportacao)}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="SEFAZ">SEFAZ</TabsTrigger>
            <TabsTrigger value="ERP">ERP</TabsTrigger>
          </TabsList>

          <TabsContent value={tipo} className="space-y-4 mt-4">
            <div>
              <Label htmlFor="files">Arquivos</Label>
              <Input
                id="files"
                type="file"
                multiple
                accept=".xlsx,.xls"
                onChange={(e) => {
                  setFiles(Array.from(e.target.files || []));
                  setResults([]);
                }}
                className="mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-2">
                {tipo === "SEFAZ"
                  ? "Colunas obrigatórias: chave_nfe, cnpj_destinatario, status_sefaz, data_emissao."
                  : "Colunas obrigatórias: chave_nfe. Opcional: inscricao_estadual."}
              </p>
            </div>

            {files.length > 0 && (
              <div className="space-y-1.5 max-h-40 overflow-auto">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm bg-muted/50 rounded px-3 py-2">
                    <FileSpreadsheet className="h-4 w-4 text-primary" />
                    <span className="flex-1 truncate">{f.name}</span>
                    <button
                      onClick={() => setFiles(files.filter((_, j) => j !== i))}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {results.length > 0 && (
              <div className="space-y-1.5 max-h-60 overflow-auto border rounded-lg p-3">
                <div className="text-sm font-medium mb-2">Resultado:</div>
                {results.map((r, i) => (
                  <div key={i} className="text-sm space-y-1">
                    <div className="flex items-center gap-2">
                      {r.ok ? (
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive" />
                      )}
                      <span className="font-medium">{r.arquivo}</span>
                    </div>
                    {r.errors.map((e, j) => (
                      <div key={j} className="ml-6 text-xs text-destructive flex items-start gap-1">
                        <XCircle className="h-3 w-3 mt-0.5 shrink-0" /> {e}
                      </div>
                    ))}
                    {r.warnings.map((w, j) => (
                      <div key={j} className="ml-6 text-xs text-warning flex items-start gap-1">
                        <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" /> {w}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => handleClose(false)}>
                Fechar
              </Button>
              <Button onClick={handleProcess} disabled={!files.length || processing}>
                <Upload className="h-4 w-4 mr-2" />
                {processing ? "Processando..." : `Processar ${files.length || ""}`}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
