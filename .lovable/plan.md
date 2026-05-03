## Objetivo
Implementar geração real dos relatórios nos botões "Exportar Excel" e "Gerar PDF" do header da Conferência, usando os dados filtrados da tela. Sem alterar motor, importação, exceções ou layout.

## Bibliotecas
- Excel: usar `xlsx` (já instalado).
- PDF: adicionar `jspdf` + `jspdf-autotable` (libs simples e padrão de mercado, sem mudança arquitetural).

## Arquivos a criar
- `src/lib/exporters/excelExporter.ts` — função `exportarExcelConferencia(linhas, stats, filtros)`:
  - Aba "Resumo": data/hora geração, total exportado, totais OK/FALTANTE/IRREGULAR/DESCONSIDERADA, filtros aplicados (destinatário, período, chave, status).
  - Aba "Conferência": colunas em PT-BR — Data Emissão, Destinatário, Chave NF-e, Número Nota, Emitente, CNPJ/CPF Emitente, IE Emitente SEFAZ, IE Emitente ERP/RFT006, Status SEFAZ, Resultado Matching, Motivo Divergência, Status Final, Valor Total.
  - Cabeçalhos em negrito (via `!cols` width + estilo simples), congelar primeira linha.
  - Nome do arquivo: `relatorio-conferencia-sefaz-erp-YYYY-MM-DD.xlsx`.

- `src/lib/exporters/pdfExporter.ts` — função `exportarPdfConferencia(linhas, stats, filtros)`:
  - jsPDF orientação paisagem A4.
  - Cabeçalho: título "Relatório de Conferência SEFAZ x ERP", data/hora, total considerado, filtros aplicados.
  - Bloco resumo: OK / FALTANTE / IRREGULAR / DESCONSIDERADA.
  - Tabela via autoTable: Data Emissão, Destinatário, Chave NF-e (fonte menor / quebra), Emitente, IE SEFAZ, IE ERP, Resultado Matching, Status Final.
  - `didDrawPage` desenha rodapé em todas as páginas com 2 linhas:
    - "Por Edimar Reginato — JM Assessoria e Contabilidade MT"
    - "Gerado por Reginatto SI — www.reginattosistemas.com.br — Contato: (65) 99210-2030"
    - Numeração "Página X de Y" no canto direito.
  - Cabeçalho da tabela repetido por página (autoTable default).
  - Nome do arquivo: `relatorio-conferencia-sefaz-erp-YYYY-MM-DD.pdf`.

- `src/lib/exporters/helpers.ts` — utilitários compartilhados:
  - `getLinhaExportFields(linha)` reaproveitando os mesmos getters já usados em `ConferenciaView` (destinatário, número da nota, natureza, emitente, valor) — duplicar lógica em pequena escala para não tocar a view.
  - `formatarFiltrosAplicados({ empresaId, status, dataIni, dataFim, chave, empresas })` → string descritiva.

## Alterações no `src/pages/Index.tsx`
- Substituir os dois `onClick` que hoje só abrem toast "Funcionalidade será implementada":
  - "Exportar Excel": chama `exportarExcelConferencia(filtered, stats, filtrosDescricao)` dentro de try/catch.
  - "Gerar PDF": chama `exportarPdfConferencia(filtered, stats, filtrosDescricao)` dentro de try/catch.
- Antes de exportar, se `filtered.length === 0`: `toast({ title: "Não há dados de conferência para exportar." })` e abortar.
- Em erro: `toast({ variant: "destructive", title: "Não foi possível gerar o relatório. Verifique os dados e tente novamente." })`.
- Sucesso: toast curto "Relatório gerado".
- Manter botões desabilitados quando `!hasAnalysisData` (mesmo padrão do botão "Limpar análise") para coerência visual.

## Dependências a instalar
- `jspdf`
- `jspdf-autotable`

(`xlsx` já presente, não reinstalar.)

## Fora de escopo (não tocar)
- Motor (`src/lib/engine.ts`), importador, regras de exceções, store, tipos, layout da `ConferenciaView`, filtros da tela, estado persistido.

## Critérios de aceite mapeados
- Dados = `filtered` (respeita filtros e ordem da tela). 
- Resumo presente em Excel (aba Resumo) e PDF (bloco no topo).
- Colunas conforme especificação.
- Rodapé do PDF em todas as páginas com as duas frases obrigatórias.
- Mensagens amigáveis para "sem dados" e erro genérico.
- Nomes de arquivo com data atual.