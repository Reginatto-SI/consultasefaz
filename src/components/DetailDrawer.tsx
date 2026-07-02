import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { StatusBadge } from "./StatusBadge";
import { useStore } from "@/store/useStore";
import type { DatasetLinha } from "@/lib/types";
import { Ban, Check, ChevronDown, Copy, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { formatFiscalDateBR } from "@/lib/fiscalDate";
import { IE_ISENTO_MARKER } from "@/lib/engine";
import { getNatureza } from "@/lib/conferencia/helpers";

function formatIEAuditoria(ie?: string) {
  return ie === IE_ISENTO_MARKER ? "Isento" : ie ?? "—";
}

type TechnicalPayloadData = Record<string, unknown>;

function stringOrUndefined(value: unknown) {
  return value === undefined || value === null || String(value).trim() === "" ? undefined : String(value);
}

function firstAvailable(...values: unknown[]) {
  const value = values.find((v) => v !== undefined && v !== null && String(v).trim() !== "");
  return value === undefined ? "—" : String(value);
}

function formatBoolean(value: boolean) {
  return value ? "Sim" : "Não";
}

function formatCurrencyBR(value: unknown) {
  if (value === undefined || value === null || String(value).trim() === "") return "—";
  const raw = String(value).trim();
  const normalized = typeof value === "number" ? value : Number(raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw);
  if (Number.isNaN(normalized)) return String(value);
  return normalized.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function DetailItem({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="min-w-0 rounded-md bg-muted/35 p-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-foreground">{value === "" || value == null ? "—" : String(value)}</p>
    </div>
  );
}

function splitTechnicalPayload(payload: TechnicalPayloadData) {
  const { payload_completo_erp: payloadCompletoErp, payload_erp: payloadErp, rft006, ...payloadSefazTecnico } = payload;

  // Mantém o JSON SEFAZ limpo e separa objetos técnicos do ERP/RFT006 quando eles vierem aninhados no mesmo payload.
  return {
    payloadSefazTecnico,
    payloadErp: payloadCompletoErp ?? payloadErp ?? rft006,
  };
}

function TechnicalPayload({ title, payload }: { title: string; payload: TechnicalPayloadData }) {
  return (
    <Collapsible className="rounded-lg border border-border bg-muted/20">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="flex w-full justify-between px-4 py-3 font-semibold">
          {title}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-t bg-muted/50 p-3 text-xs font-mono overflow-auto max-h-64">
          <pre>{JSON.stringify(payload, null, 2)}</pre>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
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
  const [copied, setCopied] = useState(false);

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

  const handleCopyChave = async () => {
    const chaveNumerica = linha.chave_nfe.replace(/\D/g, "");

    try {
      await navigator.clipboard.writeText(chaveNumerica);
      setCopied(true);
      toast.success("Chave copiada");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
      toast.error("Não foi possível copiar a chave.");
    }
  };

  const p = (linha.payload_completo_drawer || {}) as TechnicalPayloadData;
  const { payloadSefazTecnico, payloadErp } = splitTechnicalPayload(p);
  const emitenteMunicipioUf = [p.emitente_municipio, p.emitente_uf].filter(Boolean).join(" / ");
  const destinatarioMunicipioUf = [p.destinatario_municipio, p.destinatario_uf].filter(Boolean).join(" / ");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            Detalhes da Nota <StatusBadge status={linha.status_final} />
          </SheetTitle>
          <SheetDescription asChild>
            <div className="space-y-2">
              <div className="flex items-start gap-2 rounded-md bg-muted/40 p-2">
                <span className="font-mono text-xs break-all text-muted-foreground">{linha.chave_nfe}</span>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handleCopyChave} aria-label="Copiar chave de acesso">
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              {copied && <p className="text-xs font-medium text-green-600">Chave copiada</p>}
            </div>
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 mt-6">
          <Card className="bg-card/80">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base">Resumo da nota</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 p-4 pt-2 sm:grid-cols-2">
              <DetailItem label="UF" value={firstAvailable(p.destinatario_uf, p.uf_destinatario, p.UF, p.uf)} />
              <DetailItem label="Número da nota" value={firstAvailable(p.numero_nota_fiscal, p.numero_nota, p.nota, linha.payload_resumo_tabela?.numero)} />
              <DetailItem label="Série" value={firstAvailable(p.serie, p.serie_nota_fiscal, p.numero_serie)} />
              <DetailItem label="Data de emissão" value={formatFiscalDateBR(linha.data_emissao)} />
              <DetailItem label="Valor total" value={formatCurrencyBR(firstAvailable(p.valor_total_nota_fiscal, p.valor_total, p.valor, linha.payload_resumo_tabela?.valor))} />
              <DetailItem label="Status SEFAZ" value={linha.status_sefaz} />
              <DetailItem label="Natureza da operação" value={firstAvailable(getNatureza(linha), p.natureza_operacao, p.natureza_da_operacao, p.natureza)} />
              <DetailItem label="Tipo de emissão" value={firstAvailable(p.tipo_emissao, p.tipoEmissao, p.forma_emissao)} />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="p-4 pb-2"><CardTitle className="text-base">Emitente</CardTitle></CardHeader>
              <CardContent className="space-y-3 p-4 pt-2">
                <DetailItem label="Nome/Razão Social" value={firstAvailable(p.emitente_nome, p.emitente_razao_social, linha.payload_resumo_tabela?.emitente)} />
                <DetailItem label="CNPJ/CPF" value={firstAvailable(p.emitente_cnpj_cpf)} />
                <DetailItem label="IE do emitente SEFAZ" value={formatIEAuditoria(linha.ie_emitente_sefaz ?? stringOrUndefined(p.emitente_inscricao_estadual))} />
                <DetailItem label="UF/Município" value={firstAvailable(emitenteMunicipioUf)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4 pb-2"><CardTitle className="text-base">Destinatário</CardTitle></CardHeader>
              <CardContent className="space-y-3 p-4 pt-2">
                <DetailItem label="Nome/Razão Social" value={firstAvailable(p.destinatario_nome, p.destinatario_razao_social, linha.empresa_nome)} />
                <DetailItem label="CNPJ/CPF" value={firstAvailable(p.destinatario_cnpj_cpf)} />
                <DetailItem label="IE destinatário" value={firstAvailable(p.inscricao_estadual_destinatario, p.destinatario_inscricao_estadual)} />
                <DetailItem label="UF/Município" value={firstAvailable(destinatarioMunicipioUf)} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="p-4 pb-2"><CardTitle className="text-base">Conferência ERP/RFT006</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 p-4 pt-2 sm:grid-cols-2">
              <DetailItem label="Encontrada no ERP" value={formatBoolean(linha.encontrada_no_erp)} />
              <DetailItem label="Chave existe no ERP" value={formatBoolean(linha.chave_existe_no_erp)} />
              <DetailItem label="IE SEFAZ" value={formatIEAuditoria(linha.ie_emitente_sefaz)} />
              <DetailItem label="IE RFT006 encontrada" value={formatIEAuditoria(linha.ie_emitente_rft006_encontrada)} />
              <DetailItem label="IE emitente confere" value={formatBoolean(linha.ie_emitente_confere)} />
              <DetailItem label="Resultado matching" value={linha.resultado_matching} />
              <div className="sm:col-span-2">
                <DetailItem label="Motivo divergência" value={linha.motivo_divergencia ?? "—"} />
              </div>
              {linha.motivo_divergencia === "IE_EMITENTE_AUSENTE_RFT006" && (
                <p className="sm:col-span-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-xs text-foreground">
                  A chave foi encontrada no RFT006, mas a IE do emitente não está preenchida no relatório complementar. Verifique a escrituração no ERP.
                </p>
              )}
              {linha.motivo_divergencia === "IE_EMITENTE_DIVERGENTE" && (
                <p className="sm:col-span-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-xs text-foreground">
                  A chave foi encontrada no RFT006, mas a IE do emitente informada no ERP diverge da IE do emitente no relatório SEFAZ. Verifique a escrituração no ERP.
                </p>
              )}
            </CardContent>
          </Card>

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
              <h3 className="font-semibold text-sm mb-1">Ação operacional</h3>
              <p className="mb-3 text-xs text-muted-foreground">Desconsiderar nota</p>
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

          <div className="space-y-3">
            <TechnicalPayload title="Dados técnicos SEFAZ" payload={payloadSefazTecnico} />
            {payloadErp && typeof payloadErp === "object" && <TechnicalPayload title="Dados técnicos RFT006" payload={payloadErp as TechnicalPayloadData} />}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
