import * as React from "react";
import { AlertCircle, AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown, Building2, CircleHelp, Ellipsis, FileText, Search, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/StatusBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getNatureza } from "@/lib/conferencia/helpers";
import { formatFiscalDateBR } from "@/lib/fiscalDate";
import type { DatasetLinha, Empresa, SituacaoXmlMaxys } from "@/lib/types";

type ConferenciaStats = {
  total: number;
  ok: number;
  faltantes: number;
  irregulares: number;
  desconsideradas: number;
};

export type SortDirection = "asc" | "desc";
export type SortKey = "status" | "data_emissao" | "destinatario" | "chave_nfe" | "natureza" | "emitente" | "valor_total" | "status_sefaz";
export type SituacaoXmlFiltro = SituacaoXmlMaxys | "all";
export type SortState = { key: SortKey; direction: SortDirection } | null;

type ConferenciaViewProps = {
  stats: ConferenciaStats;
  empresaId: string;
  setEmpresaId: (value: string) => void;
  empresas: Empresa[];
  destinatarioCounts: Record<string, number>;
  destinatarioTotalCount: number;
  status: string;
  setStatus: (value: string) => void;
  situacaoXml: SituacaoXmlFiltro;
  setSituacaoXml: (value: SituacaoXmlFiltro) => void;
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
  pageSizeOptions: readonly number[];
  setPageSize: (value: number) => void;
  page: number;
  totalPages: number;
  setPage: (value: number) => void;
  sort: SortState;
  setSort: (value: SortState) => void;
  setSelected: (linha: DatasetLinha) => void;
};

export function ConferenciaView(props: ConferenciaViewProps) {
  const {
    stats,
    empresaId,
    setEmpresaId,
    empresas,
    destinatarioCounts,
    destinatarioTotalCount,
    status,
    setStatus,
    situacaoXml,
    setSituacaoXml,
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
    pageSizeOptions,
    setPageSize,
    page,
    totalPages,
    setPage,
    sort,
    setSort,
    setSelected,
  } = props;
  const statusSummaryCards: Array<{ value: string; label: string; count: number; icon: React.ReactNode; tone: SummaryCardTone }> = [
    { value: "all", label: "Total", count: stats.total, icon: <FileText className="h-4 w-4" />, tone: "primary" },
    { value: "OK", label: "OK", count: stats.ok, icon: <ShieldCheck className="h-4 w-4" />, tone: "success" },
    { value: "FALTANTE", label: "Faltantes", count: stats.faltantes, icon: <CircleHelp className="h-4 w-4" />, tone: "warning" },
    { value: "IRREGULAR", label: "Irregulares", count: stats.irregulares, icon: <AlertCircle className="h-4 w-4" />, tone: "destructive" },
    { value: "DESCONSIDERADA", label: "Desconsideradas", count: stats.desconsideradas, icon: <Building2 className="h-4 w-4" />, tone: "muted" },
  ];
  const situacaoXmlOptions: Array<{ value: SituacaoXmlFiltro; label: string }> = [
    { value: "all", label: "Todos" },
    { value: "XML_PRESENTE", label: "Encontrado" },
    { value: "XML_PENDENTE_MAXYS", label: "Pendente" },
    { value: "XML_PRESENTE_NAO_ARMAZENADO", label: "Verificar armazenamento" },
    { value: "NAO_ANALISADO", label: "Não analisado" },
  ];
  const quickDestinatarioFilters = empresas.map((empresa) => ({
    value: empresa.id,
    label: getEmpresaFilterLabel(empresa),
    count: destinatarioCounts[empresa.id] ?? 0,
  }));

  return (
    <>
      {/* View separada apenas para organização do front; sem alteração funcional. */}
      <Card className="p-3 border-warning/30 bg-warning/5 text-sm text-muted-foreground">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
          <p>
            A análise importada fica apenas na sessão atual do navegador. Ao atualizar ou fechar a página,
            os relatórios SEFAZ/RFT006 e a conferência podem ser perdidos; exporte o resultado para conservar a análise.
          </p>
        </div>
      </Card>


      <Card className="p-3 md:p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 items-end">
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
          <div>
            <Label className="text-xs">Situação XML</Label>
            <Select value={situacaoXml} onValueChange={(value) => setSituacaoXml(value as SituacaoXmlFiltro)}>
              <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>{situacaoXmlOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm" className="h-9" onClick={clearFilters}>Limpar filtros</Button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-5">
          {statusSummaryCards.map((filter) => (
            <SummaryCard
              key={filter.value}
              label={filter.label}
              value={filter.count}
              icon={filter.icon}
              tone={filter.tone}
              active={status === filter.value}
              onClick={() => setStatus(filter.value)}
            />
          ))}
        </div>
        <div className="mt-3">
          <Label className="text-xs">Destinatário</Label>
          {/* Destinatário passa de dropdown para botões rápidos, preservando empresa_id apenas como estado técnico legado. */}
          <div className="mt-1 flex flex-wrap gap-2">
            <QuickFilterButton
              label="Todos"
              count={destinatarioTotalCount}
              active={empresaId === "all"}
              onClick={() => setEmpresaId("all")}
            />
            {quickDestinatarioFilters.map((filter) => (
              <QuickFilterButton
                key={filter.value}
                label={filter.label}
                count={filter.count}
                active={empresaId === filter.value}
                onClick={() => setEmpresaId(filter.value)}
                title={filter.label}
                className="max-w-full sm:max-w-[16rem]"
              />
            ))}
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
                <SortableHeader className="text-left w-[110px]" label="Status" sortKey="status" sort={sort} onSort={setSort} />
                <SortableHeader className="text-left w-[120px]" label="Emissão / Nota" sortKey="data_emissao" sort={sort} onSort={setSort} />
                <SortableHeader className="text-left w-[180px]" label="Destinatário" sortKey="destinatario" sort={sort} onSort={setSort} />
                <SortableHeader className="text-left w-[210px]" label="Chave de Acesso" sortKey="chave_nfe" sort={sort} onSort={setSort} />
                <SortableHeader className="text-left w-[170px]" label="Natureza" sortKey="natureza" sort={sort} onSort={setSort} />
                <SortableHeader className="text-left w-[240px]" label="Emitente" sortKey="emitente" sort={sort} onSort={setSort} />
                <SortableHeader className="text-right w-[130px] justify-end" label="Valor Total" sortKey="valor_total" sort={sort} onSort={setSort} />
                <SortableHeader className="text-left w-[120px]" label="SEFAZ" sortKey="status_sefaz" sort={sort} onSort={setSort} />
                {/* Indicador operacional complementar; o status principal permanece exclusivamente na coluna Status. */}
                <th className="px-3 py-2.5 text-left font-medium w-[150px]">XML MaxysXML</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-muted-foreground">
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
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{labelSituacaoXmlConferencia(l.maxysxml?.situacao_xml_maxys)}</td>
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
        <div className="flex flex-col gap-3 px-4 py-2.5 border-t border-border text-sm lg:flex-row lg:items-center lg:justify-between">
          <span className="text-muted-foreground">Página {page} de {totalPages} · {filteredLength} registros</span>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>Registros por página:</span>
              <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
                <SelectTrigger className="h-8 w-[88px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pageSizeOptions.map((option) => (
                    <SelectItem key={option} value={String(option)}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap items-center gap-1">
              <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>Anterior</Button>
              {getPaginationItems(page, totalPages).map((item, index) => item === "ellipsis" ? (
                <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">...</span>
              ) : (
                <Button
                  key={item}
                  size="sm"
                  variant={item === page ? "default" : "outline"}
                  className="h-8 min-w-8 px-2"
                  onClick={() => setPage(item)}
                >
                  {item}
                </Button>
              ))}
              <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage(page + 1)}>Próxima</Button>
            </div>
          </div>
        </div>
      </Card>
    </>
  );
}

type SortableHeaderProps = {
  label: string;
  sortKey: SortKey;
  sort: SortState;
  onSort: (value: SortState) => void;
  className?: string;
};

function SortableHeader({ label, sortKey, sort, onSort, className }: SortableHeaderProps) {
  const active = sort?.key === sortKey;
  const nextSort: SortState = !active
    ? { key: sortKey, direction: "asc" }
    : sort.direction === "asc"
      ? { key: sortKey, direction: "desc" }
      : null;
  const Icon = !active ? ArrowUpDown : sort.direction === "asc" ? ArrowUp : ArrowDown;

  const ariaSort = active ? (sort.direction === "asc" ? "ascending" : "descending") : "none";

  return (
    <th className={`px-3 py-2.5 font-medium ${className ?? ""}`} aria-sort={ariaSort}>
      <button
        type="button"
        onClick={() => onSort(nextSort)}
        className={`inline-flex w-full items-center gap-1.5 cursor-pointer rounded-sm text-inherit transition-colors hover:text-foreground ${className?.includes("justify-end") ? "justify-end" : "justify-start"}`}
        title={`Ordenar por ${label}`}
        aria-label={`Ordenar por ${label}`}
      >
        <span>{label}</span>
        <Icon className={`h-3.5 w-3.5 shrink-0 ${active ? "text-primary" : "text-muted-foreground/60"}`} />
      </button>
    </th>
  );
}

function getPaginationItems(currentPage: number, totalPages: number): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  const visiblePages = Array.from(pages)
    .filter((pageNumber) => pageNumber >= 1 && pageNumber <= totalPages)
    .sort((a, b) => a - b);

  return visiblePages.reduce<Array<number | "ellipsis">>((items, pageNumber) => {
    const previous = items[items.length - 1];
    if (typeof previous === "number" && pageNumber - previous > 1) {
      items.push("ellipsis");
    }
    items.push(pageNumber);
    return items;
  }, []);
}

type SummaryCardTone = "primary" | "success" | "warning" | "destructive" | "muted";

function SummaryCard({ label, value, icon, tone, active, onClick }: { label: string; value: number; icon: React.ReactNode; tone: SummaryCardTone; active: boolean; onClick: () => void }) {
  const toneClasses: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    destructive: "bg-destructive/10 text-destructive",
    muted: "bg-muted text-muted-foreground",
  };
  // Os cards de resumo agora são o próprio filtro de status; o destaque usa token do tema para claro/escuro.
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`relative overflow-hidden rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
        active
          ? "border-primary bg-primary/10 shadow-sm ring-2 ring-primary/30"
          : "border-border bg-card hover:border-primary/50 hover:bg-muted/30"
      }`}
    >
      {active && <span className="absolute inset-y-0 left-0 w-1 bg-primary" aria-hidden="true" />}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <div className={`h-9 w-9 rounded-md flex items-center justify-center ${toneClasses[tone]}`}>{icon}</div>
          <div className="min-w-0">
            <p className={`text-[11px] uppercase tracking-wide font-semibold ${active ? "text-primary" : "text-muted-foreground"}`}>{label}</p>
            <p className={`text-xl font-bold tabular-nums leading-tight ${active ? "text-primary" : "text-foreground"}`}>{value}</p>
          </div>
        </div>
        {active && (
          <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
            Selecionado
          </span>
        )}
      </div>
    </button>
  );
}

function getNumeroNota(linha: DatasetLinha) {
  return linha.payload_completo_drawer?.numero_nota_fiscal
    ?? linha.payload_resumo_tabela?.numero
    ?? linha.payload_resumo_tabela?.numero_nota_fiscal;
}

function formatDataEmissao(linha: DatasetLinha) {
  return formatFiscalDateBR(linha.data_emissao);
}

export function shouldShowVerificarIE(linha: Pick<DatasetLinha, "resultado_matching" | "motivo_divergencia">) {
  return linha.resultado_matching === "IE_EMITENTE_DIVERGENTE"
    || linha.motivo_divergencia === "IE_EMITENTE_AUSENTE_RFT006";
}

function renderMotivoIE(linha: DatasetLinha) {
  if (!shouldShowVerificarIE(linha)) return null;

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


type QuickFilterButtonProps = {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  title?: string;
  className?: string;
};

function QuickFilterButton({ label, count, active, onClick, title, className }: QuickFilterButtonProps) {
  const isZeroInactive = count === 0 && !active;
  // Badge e chip compartilham o mesmo estado: ativo azul forte; inativo com outline/fundo discreto.
  // Quando o contador chega a zero por filtros combinados, o chip permanece visível, porém mais neutro.
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      title={title}
      className={`h-9 min-w-0 rounded-md transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
          : isZeroInactive
            ? "border-border bg-muted/40 text-muted-foreground hover:bg-muted/60 hover:text-muted-foreground"
            : "border-primary/25 bg-background text-primary hover:bg-primary/5 hover:text-primary"
      } ${className ?? ""}`}
    >
      <span className="min-w-0 flex-1 truncate text-left">{label}</span>
      <span
        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
          active
            ? "bg-primary-foreground/20 text-primary-foreground"
            : isZeroInactive
              ? "bg-background/80 text-muted-foreground"
              : "bg-primary/10 text-primary"
        }`}
      >
        {count}
      </span>
    </Button>
  );
}

function getEmpresaFilterLabel(empresa: Empresa) {
  const nomeAmigavel = normalizeDestinatarioLabel(empresa.destinatario_apelido);
  if (nomeAmigavel) return nomeAmigavel;

  const nome = normalizeDestinatarioLabel(empresa.nome);
  if (nome && !isGeneratedEmpresaLabel(empresa.nome)) return nome;

  return normalizeDestinatarioLabel(empresa.razao_social) ?? nome ?? "Destinatário";
}

function normalizeDestinatarioLabel(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed.replace(/^Empresa\s+(.+)$/i, "Destinatário $1");
}

function isGeneratedEmpresaLabel(value?: string) {
  return /^Empresa\s+/i.test(value?.trim() ?? "");
}


export function labelSituacaoXmlConferencia(situacao?: SituacaoXmlMaxys) {
  if (situacao === "XML_PRESENTE") return "Encontrado";
  if (situacao === "XML_PENDENTE_MAXYS") return "Pendente";
  if (situacao === "XML_PRESENTE_NAO_ARMAZENADO") return "Verificar armazenamento";
  if (situacao === "NAO_ANALISADO" || !situacao) return "Não analisado";
  return "—";
}
