# Análise 4 — Blindagem de Domínio

## 1. Pontos de risco encontrados
- Ambiguidade residual entre “empresa”, “destinatário” e “tenant” em regras globais e README.
- Risco de interpretação indevida de `empresa_id` como identificador organizacional.
- Ausência de seção explícita de proibição/regras críticas de modelagem.

## 2. Ajustes realizados
- PRD 00 recebeu seções de blindagem obrigatória e regra de ouro do projeto.
- PRD 01 recebeu nota obrigatória de interpretação conjunta com PRD 00 e ajustes de ambiguidade.
- PRD 03 recebeu seção de convenção obrigatória de interface.
- PRD 04 foi reforçado para “destinatário + chave” e `empresa_id` técnico.
- PRD 07 recebeu bloco obrigatório de regra crítica de modelagem.
- README recebeu seção crítica de domínio e ordem obrigatória de leitura.
- `src/pages/Index.tsx` recebeu comentário técnico forte para evitar erro de modelagem.

## 3. Regras adicionadas
- Proibição de interpretar `empresa_id` como tenant/organização/usuário.
- Proibição de usar `empresa_id` para autenticação/permissão.
- Obrigação de separar `tenant_id` e `destinatario_id` em evolução futura.
- Regra de ouro: sistema multidestinatário orientado por SEFAZ.

## 4. Arquivos modificados
- `docs/PRD/PRD-00-dicionario-dominio.md`
- `docs/PRD/PRD-01-visao-geral-regras-negocio.md`
- `docs/PRD/PRD-03-interface-experiencia-usuario.md`
- `docs/PRD/PRD-04-excecoes-regras-operacionais.md`
- `docs/PRD/PRD-07-contrato-dados-pipeline.md`
- `README.md`
- `src/pages/Index.tsx`
- `Docs/Analises/analise-4-blindagem-dominio.md`

## 5. Garantia de consistência final
- Nomenclatura funcional blindada para “Destinatário” na interface e documentação operacional.
- `empresa_id` mantido apenas como legado técnico V1 com semântica explícita.
- Diretriz de governança e precedência consolidada para prevenir regressão semântica.
