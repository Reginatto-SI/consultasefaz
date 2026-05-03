# Análise 14 — Verificar IE na Conferência

## Diagnóstico do problema encontrado

- O motor já diferenciava `CHAVE_NAO_ENCONTRADA` vs `IE_EMITENTE_DIVERGENTE`, porém não explicitava quando a divergência era causada por IE ausente no RFT006.
- Em consequência, a UI não comunicava de forma clara o motivo operacional por nota na tabela/drawer (apenas códigos técnicos), reduzindo a rastreabilidade do erro de escrituração.
- Também faltavam campos explícitos no dataset para mostrar IE da SEFAZ e IE encontrada no RFT006 no drawer de conferência.

## Arquivos alterados

- `src/lib/types.ts`
- `src/lib/engine.ts`
- `src/pages/views/ConferenciaView.tsx`
- `src/components/DetailDrawer.tsx`

## Regra implementada

1. **Sem novo `status_final`**: mantidos `OK`, `FALTANTE`, `IRREGULAR`, `DESCONSIDERADA`.
2. **Motor**:
   - Quando a chave não existe no ERP: continua `CHAVE_NAO_ENCONTRADA` e segue `FALTANTE` para status SEFAZ válido.
   - Quando a chave existe e a IE confere: `CONFIRMADO` e `OK`.
   - Quando a chave existe e IE não confirma: `IE_EMITENTE_DIVERGENTE` e `IRREGULAR`.
   - Quando a chave existe e há linha(s) RFT006 sem IE do emitente (sem confirmação por IE): mantém `IE_EMITENTE_DIVERGENTE` com `motivo_divergencia = IE_EMITENTE_AUSENTE_RFT006`.
3. **UI da conferência**:
   - Mantém badge principal `IRREGULAR`.
   - Exibe motivo complementar `Verificar IE` na tabela quando há divergência de IE.
4. **Drawer**:
   - Exibe: chave existe no ERP, IE SEFAZ, IE RFT006 encontrada, resultado matching, motivo divergência.
   - Em IE ausente no RFT006 mostra mensagem clara orientando verificação de escrituração no ERP.

## Cenários testados (validação lógica)

- Chave ausente no ERP: continua classificada como `FALTANTE` (sem falso positivo de IE).
- Chave presente + IE igual: `OK` / `CONFIRMADO`.
- Chave presente + IE divergente: `IRREGULAR` com motivo de IE.
- **Chave presente + IE ausente no RFT006**: agora classificada como `IRREGULAR` com motivo específico `IE_EMITENTE_AUSENTE_RFT006` e indicação visual `Verificar IE`.

## Confirmação solicitada

✅ Confirmado: chave existente no RFT006 sem IE **não** é mais tratada como simples chave não encontrada. O motor marca existência de chave no ERP e classifica impacto por nota como irregularidade de IE.
