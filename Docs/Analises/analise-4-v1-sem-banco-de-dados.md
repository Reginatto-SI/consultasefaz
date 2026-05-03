# Análise 4 — Adequação da V1 sem banco de dados

## 1. Decisão oficial
A V1 do ConsultaSefaz foi formalizada como ferramenta local de conferência rápida, executada no navegador, com processamento client-side e sem banco de dados ou backend.

## 2. PRDs alterados
- PRD 00: reforço semântico sobre ausência de tenant real, banco e backend; papel local de `empresa_id`.
- PRD 01: escopo técnico explícito da V1 client-side sem persistência corporativa.
- PRD 02: importação local no navegador, sem upload para servidor e com snapshot local.
- PRD 03: diretrizes de UX para estado vazio, transparência de processamento local e limpeza de dados locais.
- PRD 04: exceções locais, sem garantia de retenção corporativa.
- PRD 05: execução do motor no navegador sem dependência de banco.
- PRD 06: logs locais e temporários, sem persistência em servidor.
- PRD 07: contratos como estruturas locais (memória/local storage), não tabelas.
- PRD 08: parsing local do arquivo SEFAZ.
- PRD 09: parsing local do arquivo RFT006/ERP.
- README: visão e limites da V1 alinhados ao modelo sem banco/backend.

## 3. Conceitos ajustados
- Snapshot local: ocorre em memória e/ou armazenamento local do navegador.
- Identificadores locais: `id`, `empresa_id`, `importacao_id`, `referencia_execucao` são gerados localmente na execução.
- Logs locais: orientam operação de sessão/uso recente e podem ser limpos com o estado local.
- Exceções locais: podem ser transitórias ou persistidas localmente, sem garantia corporativa.
- Exportação como saída oficial: principal mecanismo de conservação do resultado da conferência na V1.

## 4. O que ficou fora da V1
- Banco de dados.
- Backend.
- Autenticação.
- Histórico remoto.
- Auditoria corporativa.
- Multi-tenant real.

## 5. Impacto na implementação
- Não devem ser criadas tabelas.
- Não devem ser criadas migrations.
- Não deve haver backend.
- O foco técnico da V1 é remover mocks, validar importação real (SEFAZ e RFT006) e exportar resultado de conferência.

## 6. Recomendações do próximo passo
Próximo passo mínimo: validar ponta a ponta no navegador com arquivos reais (SEFAZ + RFT006), confirmar classificação determinística e concluir fluxo de exportação como saída oficial da V1.
