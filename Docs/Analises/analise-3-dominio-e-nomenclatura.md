# Análise 3 — Domínio e Nomenclatura

## 1. Diagnóstico das inconsistências encontradas

- O termo “empresa” era usado com múltiplos significados (destinatário fiscal, agrupamento operacional e potencial tenant).
- A interface já evoluiu parcialmente para “Destinatário”, mas PRDs e README ainda tinham pontos ambíguos.
- O campo técnico `empresa_id` é legado da V1 e precisa de semântica explícita para evitar interpretação incorreta.

## 2. Definição final do domínio

- Dicionário oficial criado no **PRD 00**.
- Conceito central da operação: **Destinatário SEFAZ**.
- Tenant existe como conceito organizacional, mas não está implementado formalmente na V1.
- Emitente e ERP permanecem conceitos auxiliares (não definem agrupamento principal).

## 3. Impacto nos PRDs existentes

- PRD 01, PRD 03, PRD 04 e PRD 07 passam a referenciar o PRD 00 para governança semântica.
- Ajustes pontuais feitos sem reescrever os documentos completos.
- README atualizado para refletir prioridade do PRD 00 e semântica de multidestinatário.

## 4. Lista de termos críticos corrigidos

- “Empresa” (UI) → “Destinatário”.
- “Empresa da nota” → “Destinatário SEFAZ da nota”.
- “Multiempresa” (conceito operacional) → “Multidestinatário” (sem excluir termo técnico legado quando necessário).
- `empresa_id` documentado como identificador técnico de destinatário na V1.

## 5. Riscos evitados com essa padronização

- Evita confundir tenant com destinatário fiscal.
- Evita decisões erradas de modelagem no backend futuro.
- Reduz inconsistência entre UI, PRDs e README.
- Reduz risco de regressão semântica em novos PRDs.
