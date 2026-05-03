import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { DatasetLinha } from "@/lib/types";
import {
  ConferenciaStats,
  FiltrosConferencia,
  dataHojeISO,
  dataHoraGeracao,
  formatStatusSefazVisual,
  formatDataEmissao,
  formatarFiltrosAplicados,
  getDestinatarioDocumento,
  getDestinatarioNome,
  getEmitenteNome,
  getNatureza,
  getNumeroNota,
  getValorTotal,
} from "./helpers";

export function exportarPdfConferencia(
  linhas: DatasetLinha[],
  stats: ConferenciaStats,
  filtros: FiltrosConferencia,
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const filtrosTxt = formatarFiltrosAplicados(filtros);

  // Cabeçalho
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Relatório de Conferência SEFAZ x ERP", 40, 40);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Gerado em: ${dataHoraGeracao()}`, 40, 58);
  doc.text(`Total de notas: ${linhas.length}`, 40, 71);
  doc.text(`Filtros aplicados: ${filtrosTxt}`, 40, 84);

  // Resumo
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Resumo", 40, 104);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const resumo = `OK: ${stats.ok}    FALTANTE: ${stats.faltantes}    IRREGULAR: ${stats.irregulares}    DESCONSIDERADA: ${stats.desconsideradas}`;
  doc.text(resumo, 40, 118);

  // A tabela do PDF replica a mesma estrutura exibida na tabela principal da conferência,
  // removendo apenas a coluna interativa de ações.
  const head = [[
    "Status",
    "Emissão / Nota",
    "Destinatário",
    "Chave de Acesso",
    "Natureza",
    "Emitente",
    "Valor Total",
    "SEFAZ",
  ]];
  const body = linhas.map((l) => {
    // Evita chamada duplicada de getValorTotal mantendo o mesmo resultado visual no PDF.
    const valorTotal = getValorTotal(l);

    return [
      l.status_final ?? "—",
      `${formatDataEmissao(l) || "—"}\nNF ${getNumeroNota(l) || "—"}`,
      `${getDestinatarioNome(l)}${getDestinatarioDocumento(l) ? `\n${getDestinatarioDocumento(l)}` : ""}`,
      `${l.chave_nfe.slice(0, 22)}\n${l.chave_nfe.slice(22)}`,
      getNatureza(l) || "—",
      getEmitenteNome(l),
      typeof valorTotal === "number"
        ? valorTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
        : "—",
      // Mantém a mesma apresentação amigável da tela para status SEFAZ (equivalente ao uso de "capitalize").
      formatStatusSefazVisual(l.status_sefaz),
    ];
  });

  autoTable(doc, {
    head,
    body,
    startY: 130,
    margin: { left: 40, right: 40, bottom: 60 },
    styles: { fontSize: 7, cellPadding: 3, overflow: "linebreak", valign: "middle" },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold", fontSize: 7.5 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: {
      0: { cellWidth: 58 },
      1: { cellWidth: 86 },
      2: { cellWidth: 120 },
      3: { cellWidth: 160, font: "courier", fontSize: 6.5 },
      4: { cellWidth: 84 },
      5: { cellWidth: 128 },
      6: { cellWidth: 75, halign: "right" },
      7: { cellWidth: 64 },
    },
    didDrawPage: () => {
      const totalPagesExp = "{total_pages_count_string}";
      const pageNum = doc.getCurrentPageInfo().pageNumber;
      // Rodapé institucional único: evita a duplicação anterior e mantém paginação à direita.
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(90);
      const yLine = pageHeight - 24;
      doc.text("JM Assessoria e Contabilidade MT — www.jmassessoriamt.com.br", 40, yLine);
      const pageStr = `Página ${pageNum} de ${totalPagesExp}`;
      doc.text(pageStr, pageWidth - 40, yLine, { align: "right" });
      doc.setTextColor(0);
    },
  });

  if (typeof (doc as any).putTotalPages === "function") {
    (doc as any).putTotalPages("{total_pages_count_string}");
  }

  doc.save(`relatorio-conferencia-sefaz-erp-${dataHojeISO()}.pdf`);
}
