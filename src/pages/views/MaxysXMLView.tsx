import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Copy, Eye, FileSpreadsheet, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/store/useStore";
import { formatFiscalDateBR } from "@/lib/fiscalDate";
import type { DatasetLinha, ResultadoMaxysXMLPorNota, SituacaoXmlMaxys } from "@/lib/types";
import { toast } from "sonner";
import { exportarExcelMaxysXML } from "@/lib/exporters/excelExporter";

type ExportMode = "pendentes" | "encontrados" | "armazenamento" | "completa";
type MaxysSortDirection = "asc" | "desc";
type MaxysSortKey = "destinatario" | "data_emissao" | "numero" | "serie" | "chave_nfe" | "emitente" | "situacao" | "status_xml" | "status_erp" | "status_sefaz";
type MaxysSortState = { key: MaxysSortKey; direction: MaxysSortDirection } | null;

const DEFAULT_PAGE_SIZE = 30;
const PAGE_SIZE_OPTIONS = [30, 50, 100, 200, 500] as const;

const SITUACOES: Array<{ value: SituacaoXmlMaxys | "all"; label: string }> = [
  { value: "all", label: "Todas" },
  { value: "XML_PRESENTE", label: "XML presente" },
  { value: "XML_PENDENTE_MAXYS", label: "XML pendente" },
  { value: "XML_PRESENTE_NAO_ARMAZENADO", label: "Verificar armazenamento" },
  { value: "XML_FORA_DA_SEFAZ_ATUAL", label: "Fora da SEFAZ atual" },
];

export function MaxysXMLView({ onSelect }: { onSelect: (linha: DatasetLinha) => void }) {
  const { dataset, empresas, maxysxml, maxysxmlAnalise } = useStore();
  const [situacao, setSituacao] = useState<string>("all");
  const [empresaId, setEmpresaId] = useState("all");
  const [dataIni, setDataIni] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [busca, setBusca] = useState("");
  const [emitente, setEmitente] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [sort, setSort] = useState<MaxysSortState>(null);

  const filtered = useMemo(() => maxysxmlAnalise.filter((item) => {
    const linha = item.linha_conferencia;
    if (situacao !== "all" && item.situacao_xml_maxys !== situacao) return false;
    if (empresaId !== "all" && linha?.empresa_id !== empresaId) return false;
    const data = getDataEmissao(item);
    if (dataIni && (!data || new Date(data) < new Date(dataIni))) return false;
    if (dataFim && (!data || new Date(data) > new Date(dataFim + "T23:59:59"))) return false;
    if (busca && !item.chave_nfe.includes(busca.replace(/\D/g, ""))) return false;
    if (emitente && !getEmitente(item).toLowerCase().includes(emitente.toLowerCase())) return false;
    return true;
  }), [maxysxmlAnalise, situacao, empresaId, dataIni, dataFim, busca, emitente]);

  const stats = useMemo(() => ({
    totalSefaz: dataset.length,
    encontrados: maxysxmlAnalise.filter((item) => item.situacao_xml_maxys === "XML_PRESENTE").length,
    pendentes: maxysxmlAnalise.filter((item) => item.situacao_xml_maxys === "XML_PENDENTE_MAXYS").length,
    armazenamento: maxysxmlAnalise.filter((item) => item.situacao_xml_maxys === "XML_PRESENTE_NAO_ARMAZENADO").length,
    fora: maxysxmlAnalise.filter((item) => item.situacao_xml_maxys === "XML_FORA_DA_SEFAZ_ATUAL").length,
  }), [dataset.length, maxysxmlAnalise]);

  const sortedFiltered = useMemo(() => {
    if (!sort) return filtered;
    // Ordena apenas a cópia filtrada da análise auxiliar, preservando a fonte MaxysXML e a conferência principal.
    return [...filtered].sort((a, b) => compareMaxysRows(a, b, sort.key, sort.direction));
  }, [filtered, sort]);

  const totalPages = Math.max(1, Math.ceil(sortedFiltered.length / pageSize));
  const pageData = sortedFiltered.slice((page - 1) * pageSize, page * pageSize);

  const updatePageSize = (value: number) => {
    setPageSize(value);
    setPage(1);
  };

  const updateSort = (value: MaxysSortState) => {
    setSort(value);
    setPage(1);
  };

  useEffect(() => {
    setPage(1);
  }, [situacao, empresaId, dataIni, dataFim, busca, emitente]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const exportMode = (mode: ExportMode) => {
    // Exportação segue os filtros atuais da aba MaxysXML, sem limitar à página visível.
    const source = mode === "completa" ? filtered : filtered.filter((item) => {
      const s = item.situacao_xml_maxys;
      if (mode === "pendentes") return s === "XML_PENDENTE_MAXYS";
      if (mode === "encontrados") return s === "XML_PRESENTE";
      return s === "XML_PRESENTE_NAO_ARMAZENADO";
    });
    exportarExcelMaxysXML(source, mode);
    toast.success("Exportação MaxysXML gerada.");
  };

  if (!maxysxml.length) {
    return <Card className="p-6 text-sm text-muted-foreground">MaxysXML não importado. A conferência principal SEFAZ x RFT006 continua disponível normalmente.</Card>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <Metric label="Total SEFAZ" value={stats.totalSefaz} />
        <Metric label="XMLs encontrados" value={stats.encontrados} />
        <Metric label="XMLs pendentes" value={stats.pendentes} />
        <Metric label="Verificar armazenamento" value={stats.armazenamento} />
        <Metric label="Fora da SEFAZ atual" value={stats.fora} />
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <div><Label>Situação MaxysXML</Label><Select value={situacao} onValueChange={setSituacao}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{SITUACOES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Destinatário</Label><Select value={empresaId} onValueChange={setEmpresaId}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem>{empresas.map((empresa) => <SelectItem key={empresa.id} value={empresa.id}>{empresa.nome}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Data inicial</Label><Input className="mt-1" type="date" value={dataIni} onChange={(e) => setDataIni(e.target.value)} /></div>
          <div><Label>Data final</Label><Input className="mt-1" type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} /></div>
          <div><Label>Busca por chave</Label><div className="relative mt-1"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-8" value={busca} onChange={(e) => setBusca(e.target.value)} /></div></div>
          <div><Label>Emitente</Label><Input className="mt-1" value={emitente} onChange={(e) => setEmitente(e.target.value)} /></div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => exportMode("pendentes")}><FileSpreadsheet className="mr-2 h-4 w-4" />Pendentes</Button>
          <Button size="sm" variant="outline" onClick={() => exportMode("encontrados")}>Encontrados</Button>
          <Button size="sm" variant="outline" onClick={() => exportMode("armazenamento")}>Verificar armazenamento</Button>
          <Button size="sm" variant="outline" onClick={() => exportMode("completa")}>Análise completa</Button>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border text-sm text-muted-foreground">
          Exibindo <span className="font-semibold text-foreground tabular-nums">{filtered.length}</span> registros após filtros
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <SortableHeader label="Destinatário" sortKey="destinatario" sort={sort} onSort={updateSort} />
                <SortableHeader label="Emissão" sortKey="data_emissao" sort={sort} onSort={updateSort} />
                <SortableHeader label="Número" sortKey="numero" sort={sort} onSort={updateSort} />
                <SortableHeader label="Série" sortKey="serie" sort={sort} onSort={updateSort} />
                <SortableHeader label="Chave de acesso" sortKey="chave_nfe" sort={sort} onSort={updateSort} />
                <SortableHeader label="Emitente" sortKey="emitente" sort={sort} onSort={updateSort} />
                <SortableHeader label="Situação MaxysXML" sortKey="situacao" sort={sort} onSort={updateSort} />
                <SortableHeader label="Status XML" sortKey="status_xml" sort={sort} onSort={updateSort} />
                <SortableHeader label="Status ERP MaxysXML" sortKey="status_erp" sort={sort} onSort={updateSort} />
                <SortableHeader label="Status SEFAZ MaxysXML" sortKey="status_sefaz" sort={sort} onSort={updateSort} />
                <th className="px-3 py-2.5 text-left font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>{pageData.map((item) => {
              const linha = item.linha_conferencia;
              return <tr key={`${item.chave_nfe}-${item.situacao_xml_maxys}`} className="border-t">
                <td className="px-3 py-2">{getDestinatario(item)}</td>
                <td className="px-3 py-2">{formatData(item)}</td>
                <td className="px-3 py-2">{getNumero(item)}</td>
                <td className="px-3 py-2">{item.registro_maxysxml_encontrado?.serie_nota_fiscal ?? linha?.payload_completo_drawer?.serie_nota_fiscal ?? "—"}</td>
                <td className="px-3 py-2 font-mono text-xs break-all">{item.chave_nfe}</td>
                <td className="px-3 py-2">{getEmitente(item)}</td>
                <td className="px-3 py-2">{labelSituacao(item.situacao_xml_maxys)}</td>
                <td className="px-3 py-2">{item.status_xml_maxys ?? "—"}</td>
                <td className="px-3 py-2">{item.status_erp_maxys ?? "—"}</td>
                <td className="px-3 py-2">{item.status_sefaz_maxys ?? item.registro_maxysxml_encontrado?.status_sefaz_maxys ?? "—"}</td>
                <td className="px-3 py-2"><div className="flex gap-1"><Button size="icon" variant="ghost" onClick={() => navigator.clipboard.writeText(item.chave_nfe)}><Copy className="h-4 w-4" /></Button>{linha && <Button size="icon" variant="ghost" onClick={() => onSelect(linha)}><Eye className="h-4 w-4" /></Button>}</div></td>
              </tr>;
            })}</tbody>
          </table>
        </div>
        <div className="flex flex-col gap-3 px-4 py-2.5 border-t border-border text-sm lg:flex-row lg:items-center lg:justify-between">
          <span className="text-muted-foreground">Página {page} de {totalPages} · {filtered.length} registros</span>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>Registros por página:</span>
              <Select value={String(pageSize)} onValueChange={(value) => updatePageSize(Number(value))}>
                <SelectTrigger className="h-8 w-[88px]"><SelectValue /></SelectTrigger>
                <SelectContent>{PAGE_SIZE_OPTIONS.map((option) => <SelectItem key={option} value={String(option)}>{option}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap items-center gap-1">
              <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>Anterior</Button>
              {getPaginationItems(page, totalPages).map((item, index) => item === "ellipsis" ? <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">...</span> : <Button key={item} size="sm" variant={item === page ? "default" : "outline"} className="h-8 min-w-8 px-2" onClick={() => setPage(item)}>{item}</Button>)}
              <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage(page + 1)}>Próxima</Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}


type SortableHeaderProps = {
  label: string;
  sortKey: MaxysSortKey;
  sort: MaxysSortState;
  onSort: (value: MaxysSortState) => void;
};

function SortableHeader({ label, sortKey, sort, onSort }: SortableHeaderProps) {
  const active = sort?.key === sortKey;
  const nextSort: MaxysSortState = !active ? { key: sortKey, direction: "asc" } : sort.direction === "asc" ? { key: sortKey, direction: "desc" } : null;
  const Icon = !active ? ArrowUpDown : sort.direction === "asc" ? ArrowUp : ArrowDown;
  const ariaSort = active ? (sort.direction === "asc" ? "ascending" : "descending") : "none";

  return (
    <th className="px-3 py-2.5 text-left font-medium" aria-sort={ariaSort}>
      <button type="button" onClick={() => onSort(nextSort)} className="inline-flex w-full items-center justify-start gap-1.5 rounded-sm text-inherit transition-colors hover:text-foreground" title={`Ordenar por ${label}`} aria-label={`Ordenar por ${label}`}>
        <span>{label}</span>
        <Icon className={`h-3.5 w-3.5 shrink-0 ${active ? "text-primary" : "text-muted-foreground/60"}`} />
      </button>
    </th>
  );
}

function getPaginationItems(currentPage: number, totalPages: number): Array<number | "ellipsis"> {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);

  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  const visiblePages = Array.from(pages).filter((pageNumber) => pageNumber >= 1 && pageNumber <= totalPages).sort((a, b) => a - b);

  return visiblePages.reduce<Array<number | "ellipsis">>((items, pageNumber) => {
    const previous = items[items.length - 1];
    if (typeof previous === "number" && pageNumber - previous > 1) items.push("ellipsis");
    items.push(pageNumber);
    return items;
  }, []);
}

function compareMaxysRows(a: ResultadoMaxysXMLPorNota, b: ResultadoMaxysXMLPorNota, key: MaxysSortKey, direction: MaxysSortDirection) {
  const modifier = direction === "asc" ? 1 : -1;

  if (key === "data_emissao") return compareNullableNumbers(getTimestampOrdenavel(getDataEmissao(a)), getTimestampOrdenavel(getDataEmissao(b)), modifier);
  if (key === "numero") return compareNullableNumbers(getNumeroOrdenavel(a), getNumeroOrdenavel(b), modifier);

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

function getTextoOrdenavel(item: ResultadoMaxysXMLPorNota, key: MaxysSortKey) {
  const value = key === "destinatario"
    ? getDestinatario(item)
    : key === "serie"
      ? item.registro_maxysxml_encontrado?.serie_nota_fiscal ?? item.linha_conferencia?.payload_completo_drawer?.serie_nota_fiscal
      : key === "chave_nfe"
        ? item.chave_nfe
        : key === "emitente"
          ? getEmitente(item)
          : key === "situacao"
            ? labelSituacao(item.situacao_xml_maxys)
            : key === "status_xml"
              ? item.status_xml_maxys
              : key === "status_erp"
                ? item.status_erp_maxys
                : item.status_sefaz_maxys ?? item.registro_maxysxml_encontrado?.status_sefaz_maxys;

  return String(value ?? "").trim();
}

function getNumeroOrdenavel(item: ResultadoMaxysXMLPorNota) {
  const digits = String(getNumero(item)).replace(/\D/g, "");
  if (!digits) return null;
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : null;
}

function getTimestampOrdenavel(value?: string | null) {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function Metric({ label, value }: { label: string; value: number }) {
  return <Card className="p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></Card>;
}

function labelSituacao(s: SituacaoXmlMaxys) {
  return SITUACOES.find((item) => item.value === s)?.label ?? s;
}

function getDataEmissao(item: ResultadoMaxysXMLPorNota) {
  return item.linha_conferencia?.data_emissao ?? item.registro_maxysxml_encontrado?.data_emissao ?? "";
}

function formatData(item: ResultadoMaxysXMLPorNota) {
  const data = getDataEmissao(item);
  return data ? formatFiscalDateBR(data) : "—";
}

function getDestinatario(item: ResultadoMaxysXMLPorNota) {
  return item.linha_conferencia?.empresa_nome ?? "—";
}

function getNumero(item: ResultadoMaxysXMLPorNota) {
  return item.registro_maxysxml_encontrado?.numero_nota_fiscal ?? item.linha_conferencia?.payload_resumo_tabela?.numero ?? item.linha_conferencia?.payload_completo_drawer?.numero_nota_fiscal ?? "—";
}

function getEmitente(item: ResultadoMaxysXMLPorNota) {
  return item.registro_maxysxml_encontrado?.emitente_razao_social ?? item.linha_conferencia?.payload_resumo_tabela?.emitente ?? item.linha_conferencia?.payload_completo_drawer?.emitente_razao_social ?? "—";
}
