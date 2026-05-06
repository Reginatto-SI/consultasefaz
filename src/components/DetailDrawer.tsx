import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "./StatusBadge";
import { useStore } from "@/store/useStore";
import type { DatasetLinha } from "@/lib/types";
import { Ban, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { formatFiscalDateBR } from "@/lib/fiscalDate";
import { IE_ISENTO_MARKER } from "@/lib/engine";

function formatIEAuditoria(ie?: string) {
  return ie === IE_ISENTO_MARKER ? "Isento" : ie ?? "—";
}

export function DetailDrawer({
  linha,
  open,
  onOpenChange,
}: {
  linha: DatasetLinha | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { addExcecao, reverterExcecao, excecoes } = useStore();
  const [motivo, setMotivo] = useState("");
  const [observacao, setObservacao] = useState("");
  const [usuario, setUsuario] = useState("");

  if (!linha) return null;

  const excAtiva = excecoes.find(
    (e) => e.ativa && e.empresa_id === linha.empresa_id && e.chave_nfe === linha.chave_nfe
  );

  const handleDesconsiderar = () => {
    if (!motivo.trim()) {
      toast.error("Motivo é obrigatório.");
      return;
    }
    const ok = addExcecao({
      empresa_id: linha.empresa_id,
      chave_nfe: linha.chave_nfe,
      motivo,
      observacao,
      usuario,
    });
    if (!ok) {
      toast.error("Já existe exceção ativa para esta nota.");
      return;
    }
    toast.success("Nota desconsiderada.");
    setMotivo("");
    setObservacao("");
    setUsuario("");
    onOpenChange(false);
  };

  const handleReverter = () => {
    if (!excAtiva) return;
    reverterExcecao(excAtiva.id);
    toast.success("Exceção revertida.");
    onOpenChange(false);
  };

  const p = linha.payload_completo_drawer || {};

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            Detalhes da Nota <StatusBadge status={linha.status_final} />
          </SheetTitle>
          <SheetDescription className="font-mono text-xs break-all">
            {linha.chave_nfe}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          <section>
            <h3 className="font-semibold text-sm text-foreground mb-3">Informações</h3>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground text-xs">Destinatário</dt>
                <dd className="font-medium">{linha.empresa_nome}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Status SEFAZ</dt>
                <dd className="font-medium capitalize">{linha.status_sefaz}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Encontrada no ERP</dt>
                <dd className="font-medium">{linha.encontrada_no_erp ? "Sim" : "Não"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Resultado matching</dt>
                <dd className="font-medium">{linha.resultado_matching}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Chave existe no ERP</dt>
                <dd className="font-medium">{linha.chave_existe_no_erp ? "Sim" : "Não"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">IE emitente confere</dt>
                <dd className="font-medium">{linha.ie_emitente_confere ? "Sim" : "Não"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">IE SEFAZ</dt>
                <dd className="font-medium">{formatIEAuditoria(linha.ie_emitente_sefaz)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">IE RFT006 encontrada</dt>
                <dd className="font-medium">{formatIEAuditoria(linha.ie_emitente_rft006_encontrada)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Motivo divergência</dt>
                <dd className="font-medium">{linha.motivo_divergencia ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Data emissão</dt>
                <dd className="font-medium">{formatFiscalDateBR(linha.data_emissao)}</dd>
              </div>
            </dl>
            {linha.motivo_divergencia === "IE_EMITENTE_AUSENTE_RFT006" && (
              <p className="mt-3 rounded-md border border-warning/40 bg-warning/10 p-3 text-xs text-foreground">
                A chave foi encontrada no RFT006, mas a IE do emitente não está preenchida no relatório complementar. Verifique a escrituração no ERP.
              </p>
            )}
            {linha.motivo_divergencia === "IE_EMITENTE_DIVERGENTE" && (
              <p className="mt-3 rounded-md border border-warning/40 bg-warning/10 p-3 text-xs text-foreground">
                A chave foi encontrada no RFT006, mas a IE do emitente informada no ERP diverge da IE do emitente no relatório SEFAZ. Verifique a escrituração no ERP.
              </p>
            )}
          </section>

          <section>
            <h3 className="font-semibold text-sm text-foreground mb-3">Payload SEFAZ</h3>
            <div className="bg-muted/50 rounded-lg p-3 text-xs font-mono overflow-auto max-h-64">
              <pre>{JSON.stringify(p, null, 2)}</pre>
            </div>
          </section>

          {excAtiva ? (
            <section className="border border-border rounded-lg p-4 bg-muted/30">
              <h3 className="font-semibold text-sm mb-2">Exceção ativa</h3>
              <p className="text-sm"><span className="text-muted-foreground">Motivo:</span> {excAtiva.motivo}</p>
              {excAtiva.observacao && (
                <p className="text-sm mt-1"><span className="text-muted-foreground">Obs:</span> {excAtiva.observacao}</p>
              )}
              {excAtiva.usuario && (
                <p className="text-sm mt-1"><span className="text-muted-foreground">Usuário:</span> {excAtiva.usuario}</p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                {new Date(excAtiva.data_registro).toLocaleString("pt-BR")}
              </p>
              <Button variant="outline" className="mt-3 w-full" onClick={handleReverter}>
                <RotateCcw className="h-4 w-4 mr-2" /> Reverter Desconsideração
              </Button>
            </section>
          ) : (
            // Fluxo rápido contextual mantido: este card de drawer continua sendo o ponto de desconsideração de nota específica.
            // A view de Exceções segue como gestão geral, sem remover esta funcionalidade nesta etapa.
            <section className="border border-border rounded-lg p-4">
              <h3 className="font-semibold text-sm mb-3">Desconsiderar nota</h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="motivo">Motivo *</Label>
                  <Input id="motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="obs">Observação</Label>
                  <Textarea id="obs" value={observacao} onChange={(e) => setObservacao(e.target.value)} className="mt-1" rows={2} />
                </div>
                <div>
                  <Label htmlFor="user">Usuário</Label>
                  <Input id="user" value={usuario} onChange={(e) => setUsuario(e.target.value)} className="mt-1" />
                </div>
                <Button onClick={handleDesconsiderar} variant="destructive" className="w-full">
                  <Ban className="h-4 w-4 mr-2" /> Desconsiderar
                </Button>
              </div>
            </section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
