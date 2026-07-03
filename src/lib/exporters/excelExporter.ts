import * as XLSX from "xlsx";
import type { DatasetLinha, ResultadoMaxysXMLPorNota } from "@/lib/types";
import { IE_ISENTO_MARKER } from "@/lib/engine";
import {
  ConferenciaStats,
  FiltrosConferencia,
  dataHojeISO,
  dataHoraGeracao,
  formatDataEmissao,
  formatarFiltrosAplicados,
  getDestinatarioNome,
  getEmitenteDoc,
  getEmitenteNome,
  getNumeroNota,
  getValorTotal,
} from "./helpers";

function formatIEExportacao(ie?: string) {
  return ie === IE_ISENTO_MARKER ? "Isento" : ie ?? "";
}

export function exportarExcelConferencia(
  linhas: DatasetLinha[],
  stats: ConferenciaStats,
  filtros: FiltrosConferencia,
) {
  const filtrosTxt = formatarFiltrosAplicados(filtros);

  const resumoRows: (string | number)[][] = [
    ["Relatório de Conferência SEFAZ x ERP"],
    [],
    ["Data/hora de geração", dataHoraGeracao()],
    ["Total de notas exportadas", linhas.length],
    ["Total OK", stats.ok],
    ["Total FALTANTE", stats.faltantes],
    ["Total IRREGULAR", stats.irregulares],
    ["Total DESCONSIDERADA", stats.desconsideradas],
    ["Filtros aplicados", filtrosTxt],
  ];
  const wsResumo = XLSX.utils.aoa_to_sheet(resumoRows);
  wsResumo["!cols"] = [{ wch: 32 }, { wch: 60 }];

  const header = [
    "Data Emissão",
    "Destinatário",
    "Chave NF-e",
    "Número Nota",
    "Emitente",
    "CNPJ/CPF Emitente",
    "IE Emitente SEFAZ",
    "IE Emitente ERP/RFT006",
    "Status SEFAZ",
    "Resultado Matching",
    "Motivo Divergência",
    "Status Final",
    "Valor Total",
  ];
  const body = linhas.map((l) => [
    formatDataEmissao(l),
    getDestinatarioNome(l),
    l.chave_nfe,
    getNumeroNota(l),
    getEmitenteNome(l),
    getEmitenteDoc(l),
    formatIEExportacao(l.ie_emitente_sefaz),
    formatIEExportacao(l.ie_emitente_rft006_encontrada),
    l.status_sefaz ?? "",
    l.resultado_matching ?? "",
    l.motivo_divergencia ?? "",
    l.status_final ?? "",
    getValorTotal(l),
  ]);

  const wsConf = XLSX.utils.aoa_to_sheet([header, ...body]);
  wsConf["!cols"] = [
    { wch: 12 }, { wch: 32 }, { wch: 46 }, { wch: 12 }, { wch: 36 },
    { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 22 },
    { wch: 28 }, { wch: 16 }, { wch: 14 },
  ];
  wsConf["!freeze"] = { xSplit: 0, ySplit: 1 };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo");
  XLSX.utils.book_append_sheet(wb, wsConf, "Conferência");

  const filename = `relatorio-conferencia-sefaz-erp-${dataHojeISO()}.xlsx`;
  XLSX.writeFile(wb, filename);
}

export function exportarExcelMaxysXML(resultados: ResultadoMaxysXMLPorNota[], modo: string) {
  const header = [
    "destinatario_nome",
    "destinatario_cnpj_cpf",
    "data_emissao",
    "numero_nota_fiscal",
    "serie_nota_fiscal",
    "chave_nfe",
    "emitente_cnpj_cpf",
    "emitente_razao_social",
    "situacao_xml_maxys",
    "status_xml_maxys",
    "status_erp_maxys",
    "status_sefaz_maxys",
  ];
  const body = resultados.map((item) => {
    const linha = item.linha_conferencia;
    const registro = item.registro_maxysxml_encontrado;
    return [
      linha ? getDestinatarioNome(linha) : "",
      linha?.payload_completo_drawer?.destinatario_cnpj_cpf ?? "",
      linha ? formatDataEmissao(linha) : formatDataMaxys(registro?.data_emissao),
      registro?.numero_nota_fiscal ?? (linha ? getNumeroNota(linha) : ""),
      registro?.serie_nota_fiscal ?? linha?.payload_completo_drawer?.serie_nota_fiscal ?? "",
      item.chave_nfe,
      registro?.emitente_cnpj_cpf ?? (linha ? getEmitenteDoc(linha) : ""),
      registro?.emitente_razao_social ?? (linha ? getEmitenteNome(linha) : ""),
      item.situacao_xml_maxys,
      item.status_xml_maxys ?? "",
      item.status_erp_maxys ?? "",
      item.status_sefaz_maxys ?? "",
    ];
  });
  const ws = XLSX.utils.aoa_to_sheet([header, ...body]);
  ws["!cols"] = [
    { wch: 32 }, { wch: 18 }, { wch: 14 }, { wch: 16 }, { wch: 10 }, { wch: 46 },
    { wch: 18 }, { wch: 36 }, { wch: 28 }, { wch: 18 }, { wch: 22 }, { wch: 22 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "XMLs MaxysXML");
  XLSX.writeFile(wb, `relatorio-maxysxml-${modo}-${dataHojeISO()}.xlsx`);
}

function formatDataMaxys(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("pt-BR");
}
