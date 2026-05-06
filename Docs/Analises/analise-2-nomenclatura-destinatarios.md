# Análise 2 — Nomenclatura de Destinatários SEFAZ

## 1. Diagnóstico da ambiguidade

- O termo "Empresa" aparecia simultaneamente para cadastro operacional de CNPJ destinatário e para contexto de sistema, gerando ambiguidade conceitual.
- Na operação fiscal, a nota pertence ao **destinatário SEFAZ** (CNPJ destinatário), não ao emitente e não ao tenant por si só.
- No código da V1, o campo técnico `empresa_id` já é usado como vínculo da nota e foi mantido por compatibilidade.

## 2. PRDs ajustados

- `docs/PRD/PRD-01-visao-geral-regras-negocio.md`
  - Adicionada seção de convenção de nomenclatura (Destinatários SEFAZ).
  - Ajustado texto de visão consolidada para destinatário.
- `docs/PRD/PRD-03-interface-experiencia-usuario.md`
  - Adicionada convenção de nomenclatura para UI.
  - Filtro obrigatório "Empresa" ajustado para "Destinatário".
- `docs/PRD/PRD-07-contrato-dados-pipeline.md`
  - Adicionada seção semântica para V1.
  - Entidade 4.1 renomeada para "Destinatário SEFAZ" (sem mudar campos técnicos).
  - Snapshot textual ajustado para "destinatários impactados".

## 3. Arquivos de front alterados

- `src/pages/Index.tsx`
  - Menu lateral: "Empresas" → "Destinatários".
  - Filtro: "Empresa" → "Destinatário".
  - Coluna da tabela: "Empresa" → "Destinatário".
  - Comentário técnico explícito de que `empresa_id` representa destinatário fiscal na V1.

## 4. Decisão oficial de nomenclatura

- **UI e documentação operacional:** usar "Destinatários SEFAZ" ou "Destinatários".
- **Nomenclatura técnica temporária:** manter `empresa_id`, `empresa_nome`, `Empresa` internamente enquanto não houver migração estrutural.
- **Semântica V1:** multiempresa = múltiplos destinatários fiscais no processamento.

## 5. Pontos técnicos para revisão futura (pré-backend real)

- Planejar migração de nomenclatura técnica (`empresa_*` → `destinatario_*`) com estratégia de compatibilidade.
- Revisar contratos de API e payloads futuros para já nascerem com semântica de destinatário.
- Revisar mensagens de logs para evitar ambiguidade quando houver integração real com autenticação/multi-tenant.
- Definir dicionário oficial de domínio (tenant, destinatário, emitente) para reduzir inconsistência entre módulos.
