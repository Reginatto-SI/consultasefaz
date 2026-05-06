# Análise 1 — IE isento no RFT006/ERP

## 1. PRDs consultados

- `docs/PRD/PRD-00-dicionario-dominio.md`
- `docs/PRD/PRD-01-visao-geral-regras-negocio.md`
- `docs/PRD/PRD-02-importacao-arquivos.md`
- `docs/PRD/PRD-03-interface-experiencia-usuario.md`
- `docs/PRD/PRD-05-motor-conferencia.md`
- `docs/PRD/PRD-06-logs-erros-operacionais.md`
- `docs/PRD/PRD-07-contrato-dados-pipeline.md`
- `docs/PRD/PRD-08-layout-relatorio-sefaz.md`
- `docs/PRD/PRD-09-layout-relatorio-rft006-erp.md`
- `docs/PRD/GOVERNANCA-DOCUMENTAL.md`

Fonte principal da decisão: PRD 05 para matching, classificação, `resultado_matching`, `motivo_divergencia` e `Verificar IE`; PRD 07 para campos estruturais; PRD 09 para origem da IE no RFT006.

## 2. Arquivos de código analisados

- `src/lib/engine.ts`
- `src/lib/importer.ts`
- `src/lib/types.ts`
- `src/pages/views/ConferenciaView.tsx`
- `src/components/DetailDrawer.tsx`
- `src/store/useStore.ts`
- `src/components/ImportDialog.tsx`
- `src/lib/exporters/excelExporter.ts`
- `src/test/engine-excecoes.test.ts`

## 3. Diagnóstico da causa

A normalização anterior de IE em `src/lib/engine.ts` removia todos os caracteres não numéricos e retornava `undefined` quando não restavam dígitos. Com isso, valores textuais de isenção como `ISENTO`, `ISENTA` ou `SEM IE` eram indistinguíveis de IE realmente ausente.

No motor, a confirmação exigia `!!ieEmitenteSefaz` e igualdade exata com alguma IE normalizada do ERP. Portanto, uma nota com chave encontrada no RFT006, mas IE textual de isenção em um lado e ausência no outro, não podia ser confirmada e caía em `IE_EMITENTE_DIVERGENTE` ou `IE_EMITENTE_AUSENTE_RFT006`.

Também foi identificado que a importação SEFAZ descartava linhas sem IE do emitente, impedindo o cenário em que a SEFAZ vem sem IE e o RFT006 traz `ISENTO`. No RFT006, o parser bloqueava o arquivo quando não havia linhas com IE preenchida, embora linhas com chave e IE ausente precisem chegar ao motor para diferenciar divergência real de equivalência fiscal de isenção.

## 4. Regra implementada

Foi criada normalização determinística com três estados:

1. IE numérica: remove máscara, espaços e caracteres não numéricos, mantendo a comparação existente.
2. IE isenta: textos de isenção são normalizados para o marcador interno `__ISENTO__`.
3. IE ausente: vazio, nulo, `—`, `-` ou apenas espaços continuam como ausência real.

A equivalência fiscal é aceita somente quando houver evidência textual de isenção em um dos lados:

- SEFAZ `__ISENTO__` + RFT006 ausente: compatível.
- SEFAZ ausente + RFT006 `__ISENTO__`: compatível.
- SEFAZ `__ISENTO__` + RFT006 `__ISENTO__`: compatível.

Foram preservadas as divergências reais:

- SEFAZ numérica + RFT006 vazio: `IE_EMITENTE_AUSENTE_RFT006`.
- SEFAZ numérica + RFT006 `ISENTO`: `IE_EMITENTE_DIVERGENTE`.
- IE numérica divergente: `IE_EMITENTE_DIVERGENTE`.
- Ausência pura dos dois lados não confirma matching por IE.

## 5. Alterações realizadas

- `src/lib/engine.ts`: adicionada normalização de IE isenta com marcador interno e comparação de compatibilidade isento/ausente.
- `src/lib/importer.ts`: a importação SEFAZ deixou de descartar linha apenas por IE ausente; o RFT006 passou a aceitar snapshot com chave estruturada mesmo quando a IE está ausente, para o motor decidir a classificação; o aviso de IE ausente ficou neutro.
- `src/store/useStore.ts`: o log resumido de RFT006 com chave sem IE foi ajustado para indicar avaliação pelo motor, sem afirmar divergência antes do matching.
- `src/pages/views/ConferenciaView.tsx`: extraída a decisão do badge `Verificar IE` para função reutilizável/testável, mantendo o badge apenas para divergência/ausência real indicada no dataset.
- `src/components/DetailDrawer.tsx`: o marcador interno de isenção passa a ser exibido como `Isento`, preservando `—` para ausência real.
- `src/lib/exporters/excelExporter.ts`: a exportação operacional apresenta o marcador interno como `Isento`.
- `src/test/engine-ie-isento.test.ts`: adicionados testes dos sete cenários obrigatórios e da normalização.
- PRDs atualizados: PRD 03, PRD 05, PRD 06 e PRD 09, sem criação de novo status público ou novo fluxo.

## 6. Testes executados

- `npm test -- --runInBand`: não executado com sucesso porque `vitest` não está instalado no ambiente local.
- `npm run lint`: não executado com sucesso porque as dependências locais do ESLint não estão instaladas (`@eslint/js` ausente).
- `npm install`: tentativa de instalar dependências falhou com `403 Forbidden` ao baixar `@supabase/supabase-js` do registry configurado.

## 7. Riscos residuais

- Como as dependências não puderam ser instaladas neste ambiente, os testes automatizados adicionados não foram executados localmente.
- O marcador `__ISENTO__` é interno e aparece em campos estruturados normalizados; o drawer e a exportação Excel foram ajustados para exibir `Isento` quando consumirem esses campos.
- A equivalência isento/ausente depende de texto explícito de isenção em um dos lados; se ambos os lados vierem vazios, o motor continua tratando como ausência real, conforme restrição da tarefa.

## 8. Dúvidas pendentes

Nenhuma dúvida funcional pendente. A regra foi implementada de forma restrita ao matching por IE do emitente e alinhada ao PRD 05.
