# PRD 03 — ConsultaSefaz — Interface e Experiência do Usuário (UX/UI)

## 1. Objetivo
Definir a interface operacional para importar, conferir, filtrar e tratar exceções.

## 2. Fonte de verdade deste PRD

Referência obrigatória de nomenclatura: PRD 00 — Dicionário de Domínio.

## 2.1 Convenção de nomenclatura de UI (V1)
- Onde houver referência a "Empresa" na interface, deve-se usar **Destinatário** para reduzir ambiguidade operacional.
- O campo técnico `empresa_id` permanece interno na V1, representando o destinatário fiscal definido pelo CNPJ destinatário da SEFAZ.

Este documento é a fonte de verdade de comportamento de UI/UX, estados de tela e fluxo do usuário.


## Convenção obrigatória de interface
- Nunca usar o termo “Empresa” na UI.
- Sempre usar “Destinatário”.
- A UI deve refletir exatamente o domínio definido no PRD 00.

## 3. Fluxo oficial de uso
1) Importar arquivos (PRD 02)
2) Conferir resumo e lista
3) Investigar detalhes
4) Aplicar/reverter exceções (PRD 04)
5) Reavaliar resultado recalculado (PRD 05)

## 4. Componentes V1
- Botão principal “Importar Arquivos”
- Card de filtros
- Cards de resumo (Total, OK, Faltantes, Irregulares)
- Tabela paginada
- Drawer de detalhes
- Feedback pós-importação com erros/avisos (PRD 06)

## 5. Filtros obrigatórios
- Destinatário
- Status
- Período (data inicial/final)
- Busca por chave NFe

## 6. Regras de exibição
- Quando houver destinatário conhecido local, exibir apelido como nome principal na listagem.
- Quando não houver destinatário conhecido local, exibir razão social da SEFAZ como nome principal.
- Filtros por destinatário devem priorizar apelido quando disponível.
- Drawer/detalhe deve preservar e permitir visualizar a razão social original da SEFAZ.
- UI não depende de IE para calcular ou inferir status.
- Status exibido vem exclusivamente do resultado do motor de conferência (PRD 05).
- Mostrar visão por destinatário e consolidado multidestinatário.
- Status DESCONSIDERADA deve ficar explícito.
- `IGNORADA` não entra na tabela principal, nos filtros públicos, nos KPIs públicos ou na exportação operacional padrão, conforme PRD 01/PRD 05.
- Linha deve abrir drawer com payload completo da SEFAZ.
- Quando exibido no detalhe da nota, separar explicitamente blocos de **Emitente** e **Destinatário** para evitar ambiguidade operacional.
- Quando disponível no dataset final, o drawer deve exibir indicadores de auditoria de matching definidos pelo PRD 07 e preenchidos conforme PRD 05.

## 7. Ações de usuário
- Ver detalhes
- Desconsiderar nota
- Reverter desconsideração
- Exportar exceções locais
- Importar exceções locais

## 8. Estados da tela
- Sem dados
- Carregando
- Erro com orientação de correção

## 9. Limites V1
- Sem dashboard avançado.
- Sem personalização estrutural de layout.
- Sem perfis avançados de acesso.

## 10. Conexão com outros PRDs
- PRD 02: importação.
- PRD 04: ações de exceção.
- PRD 05: resultado exibido.
- PRD 06: mensagens de erro/aviso.
- PRD 07: contrato do dataset exibido.
- PRD 08: origem semântica dos campos de Emitente e Destinatário no layout SEFAZ.


## 11. Diretrizes de experiência local (V1)
- Estado vazio obrigatório quando não houver dados importados.
- A interface deve deixar explícito que a conferência atual é local (navegador).
- Ações de exportação têm prioridade de destaque na V1.
- Se houver persistência local, oferecer ação simples para limpar dados locais.
- Não criar telas de banco de dados, conta, login, usuário ou histórico remoto na V1.


## 12. Tela de Destinatários (V1)
- Tela predominantemente informativa (sem CRUD completo).
- Listar destinatários encontrados nas importações locais.
- Exibir por linha: CNPJ/CPF, razão social, quantidade de notas e data/hora da última importação local (quando disponível).
- Não exigir cadastro manual de destinatário na V1.

## 13. Tela de Exceções (V1)
- Permitir adicionar exceção por chave NF-e.
- Permitir informar motivo e observação.
- Permitir ativar/inativar exceção.
- Permitir excluir exceção localmente.
- Permitir exportar exceções para arquivo local.
- Permitir importar exceções de arquivo local.
- Exibir aviso obrigatório: `As exceções são salvas apenas neste navegador. Exporte um backup para reutilizar em outro computador.`

## 14. Conferência — status e motivo operacional

- A tabela principal deve exibir somente os status públicos definidos no PRD 01.
- A UI não cria status funcional novo; ela apenas representa o resultado produzido pelo PRD 05.
- Problemas reais de IE devem usar indicação visual complementar `Verificar IE` quando o dataset final trouxer motivo/resultado de IE conforme PRD 05/PRD 07.
- O badge `Verificar IE` é complementar e não substitui o badge principal de status público.
- Quando a equivalência isento/ausente confirmar matching conforme PRD 05, o drawer deve apresentar a IE isenta de forma amigável (`Isento`) quando essa for a origem real, ou `—` quando houver ausência real, sem exibir `Verificar IE`.

## 15. Drawer da nota — auditoria de matching

O drawer deve exibir, por nota, os campos de auditoria disponíveis no dataset final conforme PRD 07, incluindo quando aplicável:

- Chave existe no ERP: Sim/Não
- IE SEFAZ
- IE RFT006 encontrada
- Resultado matching
- Motivo divergência

Mensagens orientativas de UI para motivos de IE:

- `IE_EMITENTE_AUSENTE_RFT006`: A chave foi encontrada no RFT006, mas a IE do emitente não está preenchida no relatório complementar. Verifique a escrituração no ERP.
- `IE_EMITENTE_DIVERGENTE`: A chave foi encontrada no RFT006, mas a IE do emitente informada no ERP diverge da IE do emitente no relatório SEFAZ. Verifique a escrituração no ERP.

A semântica de `resultado_matching` e `motivo_divergencia` pertence exclusivamente ao PRD 05; este PRD define apenas como a UI deve apresentar esses dados.
