# PRD 04 — ConsultaSefaz — Exceções e Regras Operacionais

## 1. Objetivo
Definir exceções manuais que sobrescrevem o comportamento automático do motor.

## 2. Fonte de verdade deste PRD

Referência obrigatória de nomenclatura: PRD 00 — Dicionário de Domínio.
Este documento é a fonte de verdade sobre criação, persistência, reversão e precedência de exceções.

## 3. Regra central
Exceção ativa sempre vence qualquer classificação automática.

## 4. Tipo de exceção (V1)
- DESCONSIDERAÇÃO de nota

## 5. Campos mínimos
- id (identificador local)
- empresa_id (identificador técnico local do destinatário na V1; não representa tenant)
- chave_nfe
- motivo
- observacao
- ativa (true/false)
- criada_em
- atualizada_em

## 6. Ordem obrigatória de decisão
1) Verificar exceção ativa.
2) Se houver exceção ativa aplicável, a nota deve ser `DESCONSIDERADA`.
3) Se não houver exceção ativa, devolver a decisão automática ao motor conforme PRD 05.

Este PRD define apenas a precedência da exceção; matriz de status, validade SEFAZ e matching pertencem ao PRD 05.

## 7. Comportamentos obrigatórios
- Exceção ativa prevalece sobre classificação automática.
- Exceção inativa não altera o resultado da conferência.
- Exceção é permanente localmente até reversão/inativação manual.
- Exceção continua existindo após novos snapshots locais, enquanto os dados do navegador forem preservados.
- Reversão/inativação reativa fluxo normal de conferência.
- Não permitir duplicidade de exceção ativa para mesmo destinatário + chave.

## 8. Exceção órfã
Se a exceção existir mas a nota não estiver no snapshot SEFAZ atual:
- manter exceção cadastrada;
- não gerar linha na tabela principal;
- não falhar processamento.

## 9. Limites V1
- Sem aprovação por workflow.
- Sem trilha de auditoria completa.

## 10. Conexão com outros PRDs
- PRD 01: princípio de precedência.
- PRD 03: ações de UI.
- PRD 05: aplicação no algoritmo.
- PRD 07: contrato estrutural da exceção.


## 11. Persistência local, backup e limitações (V1)
- Exceções são locais na V1.
- Podem existir somente durante a sessão ou no armazenamento local do navegador.
- Não há garantia de persistência corporativa.
- Exportação/importação de exceções é o mecanismo oficial de backup manual.
- Se o navegador for limpo, as exceções podem ser perdidas.
- Não há persistência em servidor, usuário autenticado, workflow ou auditoria corporativa por usuário na V1.
