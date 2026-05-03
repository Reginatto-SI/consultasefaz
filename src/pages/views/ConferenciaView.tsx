import * as React from "react";
import { AlertCircle, Building2, Check, ChevronDown, CircleHelp, Ellipsis, FileText, Search, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";
import { getNatureza } from "@/lib/conferencia/helpers";
import type { DatasetLinha, Empresa, StatusFinal } from "@/lib/types";

type ConferenciaStats = {
  total: number;
  ok: number;
  faltantes: number;
  irregulares: number;
  desconsideradas: number;
};

type ConferenciaViewProps = {
  stats: ConferenciaStats;
  empresaId: string;
  setEmpresaId: (value: string) => void;
  empresas: Empresa[];
  status: string;
  setStatus: (value: string) => void;
  dataIni: string;
  setDataIni: (value: string) => void;
  dataFim: string;
  setDataFim: (value: string) => void;
  chave: string;
  setChave: (value: string) => void;
  clearFilters: () => void;
  pageData: DatasetLinha[];
  filteredLength: number;
  pageSize: number;
  page: number;
  totalPages: number;
  setPage: (value: number) => void;
  setSelected: (linha: DatasetLinha) => void;
};

export function ConferenciaView(props: ConferenciaViewProps) {
  const {
    stats,
    empresaId,
    setEmpresaId,
    empresas,
    status,
    setStatus,
    dataIni,
    setDataIni,
    dataFim,
    setDataFim,
    chave,
    setChave,
    clearFilters,
    pageData,
    filteredLength,
    pageSize,
    page,
    totalPages,
    setPage,
    setSelected,
  } = props;
  // Padronização visual intencional: filtros usam azul sólido oficial mantendo semântica e comportamento.
  // O estado ativo recebe destaque sutil extra para leitura rápida do filtro selecionado.
  const quickStatusFilters: Array<{ value: string; label: string; count: number; tone: string; activeTone: string }> = [
    { value: "all", label: "Todos", count: stats.total, tone: "border-primary bg-primary text-primary-foreground hover:bg-primary/90", activeTone: "border-primary bg-primary text-primary-foreground ring-primary/50 shadow-md scale-[1.01]" },
    { value: "FALTANTE", label: "Faltante", count: stats.faltantes, tone: "border-primary bg-primary text-primary-foreground hover:bg-primary/90", activeTone: "border-primary bg-primary text-primary-foreground ring-primary/50 shadow-md scale-[1.01]" },
    { value: "OK", label: "OK", count: stats.ok, tone: "border-primary bg-primary text-primary-foreground hover:bg-primary/90", activeTone: "border-primary bg-primary text-primary-foreground ring-primary/50 shadow-md scale-[1.01]" },
    { value: "IRREGULAR", label: "Irregular", count: stats.irregulares, tone: "border-primary bg-primary text-primary-foreground hover:bg-primary/90", activeTone: "border-primary bg-primary text-primary-foreground ring-primary/50 shadow-md scale-[1.01]" },
    { value: "DESCONSIDERADA", label: "Desconsiderada", count: stats.desconsideradas, tone: "border-primary bg-primary text-primary-foreground hover:bg-primary/90", activeTone: "border-primary bg-primary text-primary-foreground ring-primary/50 shadow-md scale-[1.01]" },
  ];

  return (
    <>
      {/* View separada apenas para organização do front; sem alteração funcional. */}
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
        <SummaryCard label="Total" value={stats.total} icon={<FileText className="h-4 w-4" />} tone="primary" />
        <SummaryCard label="OK" value={stats.ok} icon={<ShieldCheck className="h-4 w-4" />} tone="success" />
        <SummaryCard label="Faltantes" value={stats.faltantes} icon={<CircleHelp className="h-4 w-4" />} tone="warning" />
        <SummaryCard label="Irregulares" value={stats.irregulares} icon={<AlertCircle className="h-4 w-4" />} tone="destructive" />
        <SummaryCard label="Desconsideradas" value={stats.desconsideradas} icon={<Building2 className="h-4 w-4" />} tone="muted" />
      </div>

      <Card className="p-3 md:p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 items-end">
          <div>
            <Label className="text-xs">Destinatário</Label>
            {/* Combobox pesquisável para escalar a seleção de destinatário sem alterar a regra do filtro atual. */}
            <DestinatarioCombobox empresaId={empresaId} setEmpresaId={setEmpresaId} empresas={empresas} />
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
        <div className="mt-3">
          <Label className="text-xs">Status</Label>
          {/* Botões rápidos filtram por status usando somente o resultado final do motor,
              sem exibir status interno IGNORADA na UI principal. */}
          <div className="mt-1 flex gap-2 overflow-x-auto pb-1">
            {quickStatusFilters.map((filter) => {
              const isActive = status === filter.value;
              return (
                <Button
                  key={filter.value}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setStatus(filter.value)}
                  className={`h-9 whitespace-nowrap rounded-md transition-all ${filter.tone} ${isActive ? `ring-2 ${filter.activeTone}` : ""}`}
                >
                  <span>{filter.label}</span>
                  <span className="ml-1.5 rounded-full bg-primary-foreground/20 px-2 py-0.5 text-xs font-semibold tabular-nums text-primary-foreground">
                    {filter.count}
                  </span>
                </Button>
              );
            })}
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {/* Mantém claro o total efetivamente exibido na tabela após aplicação do status e demais filtros. */}
        <div className="px-4 py-2.5 border-b border-border text-sm text-muted-foreground">
          Exibindo <span className="font-semibold text-foreground tabular-nums">{filteredLength}</span> registros após filtros
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2.5 font-medium w-[110px]">Status</th>
                <th className="text-left px-3 py-2.5 font-medium w-[120px]">Emissão / Nota</th>
                <th className="text-left px-3 py-2.5 font-medium w-[180px]">Destinatário</th>
                <th className="text-left px-3 py-2.5 font-medium w-[210px]">Chave de Acesso</th>
                <th className="text-left px-3 py-2.5 font-medium w-[170px]">Natureza</th>
                <th className="text-left px-3 py-2.5 font-medium w-[240px]">Emitente</th>
                <th className="text-right px-3 py-2.5 font-medium w-[130px]">Valor Total</th>
                <th className="text-left px-3 py-2.5 font-medium w-[120px]">SEFAZ</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="font-medium">Sem dados para exibir</p>
                    <p className="text-xs mt-1">Importe arquivos SEFAZ e ERP para iniciar a conferência.</p>
                  </td>
                </tr>
              )}
              {pageData.map((l) => {
                // A tabela principal reaproveita a mesma resolução de Natureza usada no PDF para evitar divergência visual entre os dois pontos.
                // String vazia também deve cair no fallback visual para manter consistência com a coluna e com o PDF.
                const natureza = getNatureza(l)?.trim() || "—";
                return (
                <tr key={l.empresa_id + l.chave_nfe} className="border-t border-border hover:bg-muted/40 cursor-pointer" onClick={() => setSelected(l)}>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-col gap-1">
                      <StatusBadge status={l.status_final} />
                      {renderMotivoIE(l)}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 align-top">
                    <p>{formatDataEmissao(l)}</p>
                    <p className="text-xs text-muted-foreground mt-1">NF {getNumeroNota(l) ?? "—"}</p>
                  </td>
                  <td className="px-3 py-2.5 align-top" title={getDestinatarioTitle(l)}>
                    <p className="font-medium break-words">{getDestinatarioNome(l)}</p>
                    {getDestinatarioDocumento(l) && <p className="text-xs text-muted-foreground mt-1">{getDestinatarioDocumento(l)}</p>}
                  </td>
                  <td className="px-3 py-2.5 align-top" title={l.chave_nfe}>
                    {/* Quebramos a chave em duas linhas para manter os 44 dígitos visíveis sem forçar rolagem horizontal na visão operacional. */}
                    <div className="font-mono text-xs leading-tight break-all">
                      <p>{l.chave_nfe.slice(0, 22)}</p>
                      <p>{l.chave_nfe.slice(22)}</p>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 align-top">
                    {/* Campos com corte visual precisam de hover para preservar a conferência completa do usuário na cobrança. */}
                    <p
                      className="max-w-[170px] truncate leading-tight"
                      title={natureza}
                    >
                      {natureza}
                    </p>
                  </td>
                  <td className="px-3 py-2.5 align-top" title={getEmitenteTitle(l)}>
                    {/* O emitente não é truncado com reticências porque a razão social completa é dado crítico de validação manual. */}
                    <p className="break-words">{getEmitenteNome(l) ?? "—"}</p>
                    {getEmitenteDocumento(l) && <p className="text-xs text-muted-foreground mt-1">{getEmitenteDocumento(l)}</p>}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{formatValorTotal(l)}</td>
                  <td className="px-3 py-2.5 text-xs capitalize text-muted-foreground">{l.status_sefaz ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setSelected(l); }}>
                      <Ellipsis className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
        {filteredLength > pageSize && (
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-border text-sm">
            <span className="text-muted-foreground">Página {page} de {totalPages} · {filteredLength} registros</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>Anterior</Button>
              <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage(page + 1)}>Próxima</Button>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}

function SummaryCard({ label, value, icon, tone }: { label: string; value: number; icon: React.ReactNode; tone: "primary" | "success" | "warning" | "destructive" | "muted" }) {
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

function getNumeroNota(linha: DatasetLinha) {
  return linha.payload_completo_drawer?.numero_nota_fiscal
    ?? linha.payload_resumo_tabela?.numero
    ?? linha.payload_resumo_tabela?.numero_nota_fiscal;
}

function formatDataEmissao(linha: DatasetLinha) {
  const rawDate = linha.data_emissao;
  if (!rawDate) return "—";
  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("pt-BR");
}

function renderMotivoIE(linha: DatasetLinha) {
  const motivoIE = linha.resultado_matching === "IE_EMITENTE_DIVERGENTE"
    || linha.motivo_divergencia === "IE_EMITENTE_AUSENTE_RFT006";

  if (!motivoIE) return null;

  return (
    <span className="inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
      Verificar IE
    </span>
  );
}

function getDestinatarioNome(linha: DatasetLinha) {
  return linha.payload_completo_drawer?.destinatario_apelido
    ?? linha.payload_completo_drawer?.destinatario_nome
    ?? linha.empresa_nome
    ?? linha.payload_completo_drawer?.destinatario_razao_social
    ?? "—";
}

function getDestinatarioDocumento(linha: DatasetLinha) {
  return linha.payload_completo_drawer?.destinatario_cnpj_cpf;
}

function getDestinatarioTitle(linha: DatasetLinha) {
  const nome = getDestinatarioNome(linha);
  const documento = getDestinatarioDocumento(linha);
  return documento ? `${nome} • ${documento}` : nome;
}

function getEmitenteNome(linha: DatasetLinha) {
  return linha.payload_resumo_tabela?.emitente
    ?? linha.payload_completo_drawer?.emitente_razao_social
    ?? null;
}

function getEmitenteDocumento(linha: DatasetLinha) {
  return linha.payload_completo_drawer?.emitente_cnpj_cpf ?? null;
}

function getEmitenteTitle(linha: DatasetLinha) {
  const nome = getEmitenteNome(linha) ?? "—";
  const documento = getEmitenteDocumento(linha);
  return documento ? `${nome} • ${documento}` : nome;
}

function formatValorTotal(linha: DatasetLinha) {
  const valor = linha.payload_resumo_tabela?.valor ?? linha.payload_completo_drawer?.valor_total_nota_fiscal;
  if (typeof valor === "number") {
    return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }
  // O importador pode preservar valor textual vindo da planilha; formatamos somente quando a string representa número válido.
  if (typeof valor === "string" && valor.trim()) {
    // A planilha pode trazer "R$ 170.015,23" ou variações com espaços/símbolos; saneamos apenas para leitura numérica.
    const somenteNumerico = valor.replace(/[^\d,.\-]/g, "");
    const normalizado = somenteNumerico.replace(/\./g, "").replace(",", ".");
    const parsed = Number(normalizado);
    if (!Number.isNaN(parsed)) {
      return parsed.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    }
  }
  return "—";
}


function DestinatarioCombobox({
  empresaId,
  setEmpresaId,
  empresas,
}: {
  empresaId: string;
  setEmpresaId: (value: string) => void;
  empresas: Empresa[];
}) {
  const [open, setOpen] = React.useState(false);

  const selectedLabel = empresaId === "all" ? "Todas" : empresas.find((e) => e.id === empresaId)?.nome ?? "Todas";

  const toSearchText = (empresa: Empresa) => {
    const documentoLimpo = (empresa.cnpj ?? "").replace(/\D/g, "");
    return `${empresa.nome} ${empresa.razao_social ?? ""} ${empresa.cnpj ?? ""} ${documentoLimpo}`.trim();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="mt-1 h-9 w-full justify-between font-normal">
          <span className="truncate">{selectedLabel}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar destinatário..." />
          <CommandList>
            <CommandEmpty>Nenhum destinatário encontrado</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="todas all"
                onSelect={() => {
                  setEmpresaId("all");
                  setOpen(false);
                }}
              >
                <Check className={cn("mr-2 h-4 w-4", empresaId === "all" ? "opacity-100" : "opacity-0")} />
                Todas
              </CommandItem>
              {empresas.map((empresa) => (
                <CommandItem
                  key={empresa.id}
                  value={`${empresa.id} ${toSearchText(empresa)}`}
                  onSelect={() => {
                    setEmpresaId(empresa.id);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", empresaId === empresa.id ? "opacity-100" : "opacity-0")} />
                  <span className="truncate">{empresa.nome}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
