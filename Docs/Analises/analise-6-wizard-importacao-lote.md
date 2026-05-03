# Análise 6 — Wizard de importação em lote SEFAZ e RFT006

## 1. Problema encontrado

O modelo anterior com abas (SEFAZ e RFT006/ERP) permitia troca de tipo sem isolamento completo do estado interno de arquivos, gerando confusão operacional no fluxo em lote. Na prática, o operador selecionava arquivos em uma aba e ao trocar de aba visualizava arquivo do outro tipo no mesmo input/lista, criando percepção de mistura entre lotes e inconsistência do botão de processar.

## 2. Solução aplicada

A solução aplicada foi substituir o modal baseado em abas por um wizard simples de 3 etapas sequenciais:

1. Etapa 1 — Importar lote SEFAZ;
2. Etapa 2 — Importar lote RFT006 / ERP;
3. Etapa 3 — Conferência consolidada.

O wizard mantém estado separado por etapa, com suporte explícito a múltiplos arquivos em cada lote e processamento independente por tipo.

## 3. Arquivos alterados

- `src/components/ImportDialog.tsx`
- `Docs/Analises/analise-6-wizard-importacao-lote.md`

## 4. Como ficou o fluxo

### Etapa 1 — Lote SEFAZ

- Exibe título e descrição orientada ao relatório SEFAZ.
- Exibe colunas esperadas do layout SEFAZ.
- Permite seleção múltipla (`multiple`) de arquivos `.xls/.xlsx`.
- Mostra lista de arquivos selecionados.
- Processa todos os arquivos como tipo `SEFAZ`.
- Exibe resultado por arquivo (sucesso/erro/aviso).
- Avança para etapa 2 quando houver ao menos 1 sucesso.

### Etapa 2 — Lote RFT006 / ERP

- Exibe título e descrição orientada ao relatório RFT006/ERP.
- Exibe colunas esperadas do layout RFT006.
- Permite seleção múltipla (`multiple`) de arquivos `.xls/.xlsx`.
- Mostra lista de arquivos selecionados.
- Possui botão `Voltar` para retornar à etapa 1.
- Processa todos os arquivos como tipo `ERP`.
- Exibe resultado por arquivo (sucesso/erro/aviso).
- Avança para etapa 3 quando houver ao menos 1 sucesso.

### Etapa 3 — Conferência consolidada

- Exibe resumo consolidado dos dois lotes:
  - arquivos selecionados por tipo;
  - sucessos por tipo;
  - total de avisos;
  - total de erros.
- Exibe mensagem de recálculo da conferência.
- `Ver conferência` fecha o modal.
- `Importar novamente` reinicia apenas o estado interno do wizard.

## 5. Como funciona o processamento em lote

Foi centralizado no helper interno `processBatch(tipo, files)` dentro do próprio `ImportDialog`:

1. percorre todos os arquivos selecionados do lote;
2. chama `parseFile(file, tipo)` para cada arquivo;
3. faz ingestão na store usando fluxo existente:
   - `store.ingestSefaz(...)` para SEFAZ;
   - `store.ingestErp(...)` para ERP;
4. registra logs de erro e aviso por arquivo;
5. retorna resumo do lote com:
   - total;
   - sucessos;
   - erros;
   - avisos.

Com isso:

- cada etapa aceita múltiplos arquivos;
- cada arquivo mantém seu resultado individual;
- erro parcial não bloqueia processamento dos demais arquivos do mesmo lote;
- avisos permanecem visíveis por arquivo;
- consolidação final usa os dados ingeridos no fluxo atual.

## 6. O que não foi alterado

- Motor de conferência não foi alterado.
- Parser não foi alterado.
- Store não foi alterada.
- Não foi criado banco de dados.
- Não foi criado backend.

## 7. Como testar manualmente

Checklist sugerido:

- [ ] Selecionar múltiplos arquivos SEFAZ na etapa 1.
- [ ] Processar lote SEFAZ e validar resultado por arquivo.
- [ ] Avançar para etapa 2.
- [ ] Confirmar que arquivo SEFAZ não aparece na etapa RFT006.
- [ ] Selecionar múltiplos arquivos RFT006 na etapa 2.
- [ ] Processar lote RFT006 e validar resultado por arquivo.
- [ ] Confirmar que arquivo RFT006 não aparece na etapa SEFAZ.
- [ ] Confirmar que cada etapa processa o tipo correto (`SEFAZ`/`ERP`).
- [ ] Validar cenário com erro parcial (um arquivo falha e outros passam no mesmo lote).
- [ ] Concluir na etapa 3 e clicar em `Ver conferência`.
- [ ] Confirmar recálculo da conferência com dataset consolidado.
- [ ] Confirmar exibição de avisos por etapa/lote.

## Critérios de sucesso

- Fluxo de importação sequencial em 3 etapas.
- Suporte a múltiplos arquivos por etapa.
- Sem mistura visual de arquivos entre tipos.
- Operador entende claramente qual relatório importar em cada etapa.
- Matching existente continua funcionando.
- Sem complexidade nova desnecessária.
