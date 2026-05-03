# PRD 03 — Interface e Experiência do Usuário

## Conferência — status e motivo operacional

- A tabela principal mantém o badge oficial de `status_final` (`OK`, `FALTANTE`, `IRREGULAR`, `DESCONSIDERADA`).
- Não há criação de novo `status_final` para problemas de IE.
- Quando `resultado_matching = IE_EMITENTE_DIVERGENTE` **ou** `motivo_divergencia` indicar ausência/divergência de IE, a UI deve exibir badge complementar `Verificar IE`.

## Drawer da nota — auditoria de matching

O drawer deve exibir, por nota:

- Chave existe no ERP: Sim/Não
- IE SEFAZ
- IE RFT006 encontrada
- Resultado matching
- Motivo divergência

Mensagens orientativas:

- `IE_EMITENTE_AUSENTE_RFT006`: A chave foi encontrada no RFT006, mas a IE do emitente não está preenchida no relatório complementar. Verifique a escrituração no ERP.
- `IE_EMITENTE_DIVERGENTE`: A chave foi encontrada no RFT006, mas a IE do emitente informada no ERP diverge da IE do emitente no relatório SEFAZ. Verifique a escrituração no ERP.
