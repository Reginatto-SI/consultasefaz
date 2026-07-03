import { useMemo, useState } from "react";
import { Copy, Eye, FileSpreadsheet, Search } from "lucide-react";
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

  const exportMode = (mode: ExportMode) => {
    const source = mode === "completa" ? maxysxmlAnalise : maxysxmlAnalise.filter((item) => {
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
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground"><tr>{["Destinatário", "Emissão", "Número", "Série", "Chave de acesso", "Emitente", "Situação MaxysXML", "Status XML", "Status ERP MaxysXML", "Ações"].map((h) => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead>
            <tbody>{filtered.map((item) => {
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
                <td className="px-3 py-2"><div className="flex gap-1"><Button size="icon" variant="ghost" onClick={() => navigator.clipboard.writeText(item.chave_nfe)}><Copy className="h-4 w-4" /></Button>{linha && <Button size="icon" variant="ghost" onClick={() => onSelect(linha)}><Eye className="h-4 w-4" /></Button>}</div></td>
              </tr>;
            })}</tbody>
          </table>
        </div>
      </Card>
    </div>
  );
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
