# PRD 09 — Layout do Relatório RFT006 ERP

## Regra de elegibilidade de linha para matching

- Linha com chave e IE do emitente preenchida pode confirmar matching por chave + IE.
- Linha com chave e IE ausente é inelegível para confirmar matching por IE.

## Regra de interpretação

- Linha com chave e IE ausente **não** deve ser interpretada como chave inexistente no ERP.
- Essa linha comprova que a chave existe no ERP.
- Havendo nota correspondente na SEFAZ, o motor deve classificar o caso como irregularidade de IE (não `FALTANTE`).
