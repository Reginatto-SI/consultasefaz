# Análise 15 — Refino Verificar IE + alinhamento PRDs

## Diagnóstico

Na Análise 14, o motor passou a marcar `IE_EMITENTE_AUSENTE_RFT006` quando detectava linha(s) sem IE para chave existente, mas a regra ainda permitia classificar como “ausente” cenários mistos que já tinham IE preenchida divergente.

## Arquivos alterados

- `src/lib/engine.ts`
- `src/components/DetailDrawer.tsx`
- `docs/PRD/PRD-03-interface-experiencia-usuario.md`
- `docs/PRD/PRD-05-motor-conferencia.md`
- `docs/PRD/PRD-06-logs-erros-operacionais.md`
- `docs/PRD/PRD-07-contrato-dados-pipeline.md`
- `docs/PRD/PRD-09-layout-relatorio-rft006-erp.md`

## PRDs ajustados

Foram criados/atualizados os PRDs 03, 05, 06, 07 e 09 em `docs/PRD/` com a regra oficial para `Verificar IE`, classificação por motivo operacional e distinção entre chave inexistente e chave existente com IE ausente/divergente.

## Regra final implementada

1. Chave não existe no RFT006: `CHAVE_NAO_ENCONTRADA`.
2. Chave existe e IE confirma: `CONFIRMADO` com `motivo_divergencia = null`.
3. Chave existe e todas as linhas estão sem IE: `IE_EMITENTE_AUSENTE_RFT006`.
4. Chave existe e há IE preenchida divergente: `IE_EMITENTE_DIVERGENTE`.
5. Cenário misto (sem IE + divergente): prioriza `IE_EMITENTE_DIVERGENTE`.

## Cenários validados

- Ausência de chave no ERP => permanece faltante para status SEFAZ válido.
- Confirmação por chave + IE => permanece OK para status SEFAZ válido.
- Apenas linhas sem IE => irregular com motivo de IE ausente.
- IE preenchida divergente => irregular com motivo divergente.
- Misto (sem IE + divergente) => irregular com motivo divergente (prioridade correta).

## Confirmações

- Não foi criado novo `status_final`.
- Chave existente no RFT006 sem IE não é tratada como `FALTANTE`.
- Cenário misto com IE ausente + IE divergente é tratado de forma clara com prioridade para divergência preenchida.
