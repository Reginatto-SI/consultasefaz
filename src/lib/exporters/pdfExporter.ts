import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { DatasetLinha } from "@/lib/types";
import { getNatureza } from "@/lib/conferencia/helpers";
import {
  ConferenciaStats,
  FiltrosConferencia,
  dataHojeISO,
  dataHoraGeracao,
  formatStatusSefazVisual,
  formatDataEmissao,
  formatarFiltrosAplicados,
  getDestinatarioNome,
  getEmitenteNome,
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

  // Nova ordem das colunas no PDF: Emitente passa para a 3ª posição e Destinatário vai para a 6ª.
  // Mantemos o espelhamento da tabela principal com os ajustes visuais específicos solicitados para exportação.
  const head = [[
    "Status",
    "Emissão / Nota",
    "Emitente",
    "Chave de Acesso",
    "Natureza",
    "Destinatário",
    "Valor Total",
    "SEFAZ",
  ]];
  const body = linhas.map((l) => {
    // Evita chamada duplicada de getValorTotal mantendo o mesmo resultado visual no PDF.
    const valorTotal = getValorTotal(l);

    return [
      l.status_final ?? "—",
      `${formatDataEmissao(l) || "—"}\nNF ${getNumeroNota(l) || "—"}`,
      getEmitenteNome(l),
      `${l.chave_nfe.slice(0, 22)}\n${l.chave_nfe.slice(22)}`,
      getNatureza(l) || "—",
      // No PDF, Destinatário exibe apenas o apelido/nome principal (sem documento/CNPJ/CPF).
      getDestinatarioNome(l),
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
    // Padronização visual: todo o conteúdo da tabela deve ficar alinhado à esquerda.
    styles: { fontSize: 7, cellPadding: 3, overflow: "linebreak", valign: "middle", halign: "left" },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold", fontSize: 7.5 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: {
      // Refino visual: reduzimos Destinatário/Chave para ampliar Natureza sem alterar ordem ou conteúdo.
      0: { cellWidth: 50 },
      1: { cellWidth: 82 },
      2: { cellWidth: 125 },
      3: { cellWidth: 135, font: "courier", fontSize: 6.5 },
      4: { cellWidth: 140 },
      5: { cellWidth: 85 },
      6: { cellWidth: 75 },
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
