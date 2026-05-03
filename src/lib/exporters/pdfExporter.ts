import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { DatasetLinha } from "@/lib/types";
import {
  ConferenciaStats,
  FiltrosConferencia,
  dataHojeISO,
  dataHoraGeracao,
  formatDataEmissao,
  formatarFiltrosAplicados,
  getDestinatarioNome,
  getEmitenteNome,
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

  const head = [[
    "Data Emissão",
    "Destinatário",
    "Chave NF-e",
    "Emitente",
    "IE SEFAZ",
    "IE ERP/RFT006",
    "Resultado Matching",
    "Status Final",
  ]];
  const body = linhas.map((l) => [
    formatDataEmissao(l),
    getDestinatarioNome(l),
    l.chave_nfe,
    getEmitenteNome(l),
    l.ie_emitente_sefaz ?? "",
    l.ie_emitente_rft006_encontrada ?? "",
    l.resultado_matching ?? "",
    l.status_final ?? "",
  ]);

  autoTable(doc, {
    head,
    body,
    startY: 130,
    margin: { left: 40, right: 40, bottom: 60 },
    styles: { fontSize: 7, cellPadding: 3, overflow: "linebreak", valign: "middle" },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold", fontSize: 7.5 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 130 },
      2: { cellWidth: 150, font: "courier", fontSize: 6.5 },
      3: { cellWidth: 150 },
      4: { cellWidth: 60 },
      5: { cellWidth: 60 },
      6: { cellWidth: 95 },
      7: { cellWidth: 65 },
    },
    didDrawPage: () => {
      const totalPagesExp = "{total_pages_count_string}";
      const pageNum = doc.getCurrentPageInfo().pageNumber;
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(90);
      const yLine1 = pageHeight - 36;
      const yLine2 = pageHeight - 24;
      doc.text("Por Edimar Reginato — JM Assessoria e Contabilidade MT", 40, yLine1);
      doc.text(
        "Gerado por Reginatto SI — www.reginattosistemas.com.br — Contato: (65) 99210-2030",
        40,
        yLine2,
      );
      const pageStr = `Página ${pageNum} de ${totalPagesExp}`;
      doc.text(pageStr, pageWidth - 40, yLine2, { align: "right" });
      doc.setTextColor(0);
    },
  });

  if (typeof (doc as any).putTotalPages === "function") {
    (doc as any).putTotalPages("{total_pages_count_string}");
  }

  doc.save(`relatorio-conferencia-sefaz-erp-${dataHojeISO()}.pdf`);
}
