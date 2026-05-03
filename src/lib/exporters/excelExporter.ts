import * as XLSX from "xlsx";
import type { DatasetLinha } from "@/lib/types";
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
    l.ie_emitente_sefaz ?? "",
    l.ie_emitente_rft006_encontrada ?? "",
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
