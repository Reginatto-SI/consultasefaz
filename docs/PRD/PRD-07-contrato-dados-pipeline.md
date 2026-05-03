# PRD 07 — Contrato de Dados e Pipeline Estrutural

## Resultado de conferência

`motivo_divergencia` aceita:

- `IE_EMITENTE_DIVERGENTE`
- `IE_EMITENTE_AUSENTE_RFT006`
- `CHAVE_NAO_ENCONTRADA`
- `null`

Campos opcionais de auditoria operacional no dataset final:

- `ie_emitente_sefaz`
- `ie_emitente_rft006_encontrada`

Esses campos são destinados à explicação do matching no drawer da conferência.
