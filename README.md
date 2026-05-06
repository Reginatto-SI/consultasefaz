# ConsultaSefaz

## Visão do sistema

O ConsultaSefaz é uma ferramenta local de conferência inteligente de notas fiscais de entrada. A V1 compara o relatório da SEFAZ com o relatório RFT006 do ERP para apoiar a identificação de notas confirmadas, faltantes, irregulares ou desconsideradas por exceção operacional.

A **SEFAZ é a fonte de verdade** do universo de notas fiscais. O **ERP/RFT006 é fonte complementar** e apenas confirma escrituração conforme as regras do motor de conferência.

## Objetivo

- Conferir notas fiscais de entrada a partir de arquivos importados localmente.
- Exibir visão por destinatário fiscal e visão consolidada.
- Permitir exceções locais para desconsideração operacional.
- Registrar logs operacionais curtos para orientar correções de importação/processamento.

A definição dos status públicos pertence ao PRD 01. A classificação, matching, `resultado_matching`, `motivo_divergencia` e regra `Verificar IE` pertencem ao PRD 05.

## Arquitetura funcional da V1

- Aplicação **browser-first**, executada no navegador.
- Sem backend, banco de dados, autenticação ou upload de arquivos para servidor na V1.
- Importação, normalização, snapshot, motor e exibição ocorrem localmente.
- Análises pesadas e payloads completos pertencem ao snapshot local da sessão.
- Exceções e logs seguem persistência local/curta conforme os PRDs específicos.

Detalhes estruturais de entidades, snapshots, payloads e dataset final pertencem ao PRD 07.

## Fluxo operacional resumido

1. Importar relatório SEFAZ e relatório RFT006/ERP.
2. Normalizar e validar entradas conforme PRD 02, PRD 08 e PRD 09.
3. Montar snapshot local conforme PRD 02/PRD 07.
4. Executar o motor determinístico conforme PRD 05.
5. Aplicar exceções locais conforme PRD 04.
6. Exibir resultados e detalhes conforme PRD 03.
7. Registrar erros/avisos conforme PRD 06.
8. Exportar resultados e backups operacionais quando aplicável.

## Estrutura oficial dos PRDs

O caminho oficial e único dos PRDs versionados é:

```text
docs/PRD/
```

Convenções obrigatórias:

- Não usar `/PRD`, `public/PRD` ou `Docs/PRD` como fonte documental.
- Referências antigas a caminhos legados são históricas e devem ser convertidas para `docs/PRD/` em novas tarefas.
- Todo PRD citado em tarefas futuras deve existir em `docs/PRD/`.
- A matriz de responsabilidade documental está em `docs/PRD/GOVERNANCA-DOCUMENTAL.md` e deve ser lida antes de alterações amplas na documentação.

## PRDs versionados

| Ordem | PRD | Arquivo | Responsabilidade principal |
|---:|---|---|---|
| 1 | PRD 00 — Dicionário de Domínio | `docs/PRD/PRD-00-dicionario-dominio.md` | Nomenclatura, semântica e blindagem conceitual. |
| 2 | PRD 01 — Visão Geral e Regras de Negócio | `docs/PRD/PRD-01-visao-geral-regras-negocio.md` | Objetivos, escopo, princípios e status públicos. |
| 3 | PRD 07 — Contrato de Dados e Pipeline | `docs/PRD/PRD-07-contrato-dados-pipeline.md` | Entidades, campos, tipos, snapshots, payloads e dataset final. |
| 4 | PRD 02 — Importação de Arquivos | `docs/PRD/PRD-02-importacao-arquivos.md` | Parsing, validação, normalização e snapshot de entrada. |
| 5 | PRD 08 — Layout SEFAZ | `docs/PRD/PRD-08-layout-relatorio-sefaz.md` | Layout, colunas e origem dos campos SEFAZ. |
| 6 | PRD 09 — Layout RFT006 ERP | `docs/PRD/PRD-09-layout-relatorio-rft006-erp.md` | Layout, colunas, mapeamentos e elegibilidade do RFT006. |
| 7 | PRD 05 — Motor de Conferência | `docs/PRD/PRD-05-motor-conferencia.md` | Matching, algoritmo, matriz de decisão e classificação final. |
| 8 | PRD 04 — Exceções e Regras Operacionais | `docs/PRD/PRD-04-excecoes-regras-operacionais.md` | Precedência, ativação/inativação, backup e compatibilidade local. |
| 9 | PRD 03 — Interface e Experiência do Usuário | `docs/PRD/PRD-03-interface-experiencia-usuario.md` | UX/UI, filtros, badges, drawers, fluxos e estados visuais. |
| 10 | PRD 06 — Logs de Erros Operacionais | `docs/PRD/PRD-06-logs-erros-operacionais.md` | Categorias, mensagens, avisos, erros e retenção curta de logs. |
| 11 | Governança Documental | `docs/PRD/GOVERNANCA-DOCUMENTAL.md` | Fonte única por assunto, precedência e regras de manutenção documental. |

## Ordem recomendada de leitura

1. Governança Documental.
2. PRD 00 — Dicionário de Domínio.
3. PRD 01 — Visão Geral e Regras de Negócio.
4. PRD 07 — Contrato de Dados e Pipeline.
5. PRD 02 — Importação de Arquivos.
6. PRD 08 — Layout SEFAZ.
7. PRD 09 — Layout RFT006 ERP.
8. PRD 05 — Motor de Conferência.
9. PRD 04 — Exceções e Regras Operacionais.
10. PRD 03 — Interface e Experiência do Usuário.
11. PRD 06 — Logs de Erros Operacionais.

## Ordem sugerida de implementação

1. Validar domínio, escopo e governança documental (Governança, PRD 00 e PRD 01).
2. Garantir contratos de dados e pipeline (PRD 07).
3. Ajustar importação e layouts de entrada (PRD 02, PRD 08 e PRD 09).
4. Ajustar motor somente com base no PRD 05.
5. Ajustar exceções somente com base no PRD 04.
6. Refletir comportamento na interface conforme PRD 03.
7. Registrar feedback operacional conforme PRD 06.

## Convenções críticas de domínio

- O ConsultaSefaz é **multidestinatário**, não multiempresa SaaS.
- `empresa_id` é legado técnico/local e representa o destinatário fiscal no estado da V1.
- A interface deve usar **Destinatário** ou **Destinatário SEFAZ**, não “empresa” como conceito funcional.
- O destinatário da nota é definido somente pela SEFAZ.
- O ERP/RFT006 não define destinatário e não altera pertencimento da nota.
- O emitente é fornecedor/remetente e nunca define agrupamento principal.

A fonte oficial dessas definições é o PRD 00.

## Visão da V1 e limites conhecidos

- Sem backend, banco de dados, autenticação, RLS/multi-tenant real ou upload para servidor.
- Sem integração automática com API da SEFAZ.
- Sem histórico completo de execuções ou auditoria avançada por usuário.
- Sem workflow de aprovação de exceções.
- Sem validações fiscais/financeiras avançadas.
- Sem suporte documentado a múltiplos layouts SEFAZ/RFT006 simultâneos sem revisão dos PRDs de layout.

## Direcionamento para Codex e Lovable

- Não transformar o README em PRD de regra detalhada; ele deve apontar para os PRDs.
- Para domínio e nomenclatura, usar PRD 00.
- Para status públicos e comportamento global, usar PRD 01.
- Para importação/snapshot, usar PRD 02 e PRD 07.
- Para matching, IE, `Verificar IE`, `resultado_matching`, `motivo_divergencia` e classificação, usar PRD 05.
- Para layout SEFAZ/RFT006, usar PRD 08/09.
- Para exceções, usar PRD 04.
- Para UI e logs, usar PRD 03/06.
- Não inferir regra de negócio ausente: registrar dúvida em análise antes de implementar.
