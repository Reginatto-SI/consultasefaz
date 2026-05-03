# PRD 05 — Motor de Conferência

## Matching SEFAZ x RFT006 por chave + IE

### Regras

1. Se a chave da SEFAZ não existe no RFT006:
   - `resultado_matching = CHAVE_NAO_ENCONTRADA`
   - `motivo_divergencia = CHAVE_NAO_ENCONTRADA`

2. Se a chave existe e alguma linha do RFT006 possui IE do emitente igual à IE da SEFAZ:
   - `resultado_matching = CONFIRMADO`
   - `motivo_divergencia = null`

3. Se a chave existe e todas as linhas encontradas estão sem IE do emitente:
   - `resultado_matching = IE_EMITENTE_DIVERGENTE`
   - `motivo_divergencia = IE_EMITENTE_AUSENTE_RFT006`

4. Se a chave existe e há IE preenchida no RFT006, mas nenhuma IE bate com a IE SEFAZ:
   - `resultado_matching = IE_EMITENTE_DIVERGENTE`
   - `motivo_divergencia = IE_EMITENTE_DIVERGENTE`

5. Cenário misto (linhas sem IE + linhas com IE preenchida divergente):
   - priorizar `motivo_divergencia = IE_EMITENTE_DIVERGENTE`

## Classificação final

- Não criar novo `status_final`.
- Para status SEFAZ válido:
  - `CONFIRMADO` => `status_final = OK`
  - `CHAVE_NAO_ENCONTRADA` => `status_final = FALTANTE`
  - problemas de IE (`IE_EMITENTE_DIVERGENTE` e `IE_EMITENTE_AUSENTE_RFT006`) => `status_final = IRREGULAR`
- Motivo visual recomendado na UI para problemas de IE: `Verificar IE`.
