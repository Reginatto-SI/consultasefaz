# Análise 5 — Normalização de IE e melhoria da tela de importação

## 1. Problema identificado

Durante os testes da V1 com arquivos reais, foi identificado que a Inscrição Estadual (IE) chega em formatos diferentes entre as origens:

- SEFAZ pode trazer IE textual com zeros à esquerda, por exemplo `0012345678`;
- RFT006/Maxicon pode trazer IE numérica sem esses zeros, por exemplo `12345678`.

Sem uma normalização consistente no matching, a mesma IE pode ser tratada como divergente e gerar falso status `IRREGULAR`.

## 2. Arquivos alterados

- `src/lib/engine.ts`
- `src/lib/importer.ts`
- `src/components/ImportDialog.tsx`
- `Docs/Analises/analise-5-normalizacao-ie-e-importacao-ui.md`

## 3. Normalização aplicada

A função `normalizeIE` foi ajustada para comparação/matching com as regras:

1. Converter qualquer valor para string;
2. Remover caracteres não numéricos;
3. Remover zeros à esquerda;
4. Retornar `undefined` quando o resultado final ficar vazio.

Exemplos:

- `0012345678` → `12345678`
- `12345678` → `12345678`

O valor bruto continua preservado nos payloads de importação (`payload_completo` e `payload_completo_erp`).

## 4. Ajustes na tela de importação

Foram aplicados ajustes mínimos na UI para reduzir confusão operacional:

- limpeza automática de arquivos e resultados ao trocar entre abas SEFAZ e RFT006/ERP;
- inclusão de textos didáticos por aba (tipo de relatório e colunas esperadas);
- ajuste de rótulo visual da aba de `ERP` para `RFT006 / ERP`.

Também foram ajustadas mensagens de aviso do RFT006 para linguagem mais amigável quando linhas são ignoradas por falta de chave ou IE do emitente.

## 5. Como testar

Testes manuais sugeridos:

1. Importar SEFAZ com IE `0012345678`.
2. Importar RFT006 com IE `12345678`.
3. Confirmar que o matching reconhece como mesma IE.
4. Confirmar que não gera `IRREGULAR` por zeros à esquerda.
5. Trocar de aba no modal e confirmar que arquivos/resultados anteriores são limpos.
6. Confirmar que os textos diferenciam claramente SEFAZ e RFT006.

## Critérios de sucesso

- IE com zeros à esquerda e IE sem zeros casam corretamente.
- Valor bruto continua preservado no payload.
- Matching continua usando IE do emitente.
- Tela de importação fica mais clara.
- Trocar aba não mantém arquivo da aba anterior.
- Nenhuma complexidade nova foi adicionada.
