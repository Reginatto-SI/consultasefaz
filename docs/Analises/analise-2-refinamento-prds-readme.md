# Análise 2 — Refinamento dos PRDs e README

## Estrutura atual encontrada

- `README.md` existia como visão geral, mas ainda informava que os PRDs 00, 01, 02, 04 e 08 não estavam versionados em `docs/PRD/`.
- `docs/PRD/` continha somente versões reduzidas dos PRDs 03, 05, 06, 07 e 09, criadas/ajustadas nas análises recentes de RFT006/IE.
- `Docs/PRD/` continha os PRDs funcionais completos 00 a 09 em `.txt`, criando uma segunda convenção documental concorrente.
- `docs/Analises/` continha análises recentes sobre importação RFT006, quota de `localStorage`, precedência de exceções, natureza da operação e refinamento `Verificar IE`.
- Algumas análises históricas ainda citavam caminhos legados como `Docs/PRD`, `public/PRD` ou `/docs/PRD/`.

## Problemas identificados

- O README contradizia a estrutura real: tratava PRDs existentes no contexto do repositório como “não versionados”.
- Havia duas árvores documentais de PRD:
  - `docs/PRD/` como caminho declarado no README;
  - `Docs/PRD/` como caminho com PRDs completos.
- Os PRDs em `docs/PRD/` eram parciais quando comparados aos PRDs completos em `Docs/PRD/`.
- A diferença de caixa (`Docs` x `docs`) poderia gerar comportamento inconsistente em sistemas case-sensitive.
- Referências antigas a `public/PRD` podiam induzir o Codex/Lovable a procurar uma fonte inexistente.
- A documentação precisava deixar explícito que a V1 é local/browser-first, sem backend, sem banco e sem multiempresa SaaS.

## Contradições encontradas

- **PRDs ausentes vs existentes**: o README dizia que PRDs 00, 01, 02, 04 e 08 não estavam versionados, mas havia versões completas em `Docs/PRD/`.
- **Empresa vs destinatário**: os PRDs completos já documentavam `empresa_id` como legado técnico, mas a duplicidade de caminhos deixava margem para leitura parcial apenas dos PRDs reduzidos.
- **Multiempresa vs multidestinatário**: PRD 00/01 definiam o sistema como multidestinatário, não multiempresa SaaS; o README precisava reforçar essa regra como convenção crítica.
- **Matching por IE**: os PRDs reduzidos 05/07/09 continham refinamento mais recente sobre chave existente com IE ausente/divergente; esse refinamento precisava ser preservado na versão consolidada.
- **Persistência local**: análises recentes documentavam que snapshots pesados ficam fora da persistência permanente, enquanto exceções/logs locais permanecem leves; o README precisava tornar isso explícito.
- **Status interno `IGNORADA`**: os PRDs completos citavam `IGNORADA` como status interno; o README e PRDs consolidados deixam claro que ele não é status público de UI.

## PRDs ausentes

Situação antes da consolidação em `docs/PRD/`:

- PRD 00 — ausente em `docs/PRD/`, presente em `Docs/PRD/`.
- PRD 01 — ausente em `docs/PRD/`, presente em `Docs/PRD/`.
- PRD 02 — ausente em `docs/PRD/`, presente em `Docs/PRD/`.
- PRD 04 — ausente em `docs/PRD/`, presente em `Docs/PRD/`.
- PRD 08 — ausente em `docs/PRD/`, presente em `Docs/PRD/`.

Situação após a consolidação:

- Nenhum PRD 00 a 09 permanece ausente em `docs/PRD/`.

## PRDs ajustados

Foram consolidados e padronizados em Markdown:

- `docs/PRD/PRD-00-dicionario-dominio.md`
- `docs/PRD/PRD-01-visao-geral-regras-negocio.md`
- `docs/PRD/PRD-02-importacao-arquivos.md`
- `docs/PRD/PRD-03-interface-experiencia-usuario.md`
- `docs/PRD/PRD-04-excecoes-regras-operacionais.md`
- `docs/PRD/PRD-05-motor-conferencia.md`
- `docs/PRD/PRD-06-logs-erros-operacionais.md`
- `docs/PRD/PRD-07-contrato-dados-pipeline.md`
- `docs/PRD/PRD-08-layout-relatorio-sefaz.md`
- `docs/PRD/PRD-09-layout-relatorio-rft006-erp.md`

Ajustes documentais aplicados:

- Migração dos PRDs completos de `Docs/PRD/` para `docs/PRD/`.
- Preservação dos refinamentos recentes de `Verificar IE` nos PRDs 03, 05, 06, 07 e 09.
- Padronização de nomes de arquivo em kebab-case, com prefixo `PRD-NN-*`.
- Remoção da árvore concorrente `Docs/PRD/` após consolidação, para evitar fonte dupla.
- Correção de referências legadas em análises que apontavam para `Docs/PRD`, `public/PRD` ou `/docs/PRD/`.

## Convenção oficial definida

- A única convenção oficial de PRDs é `docs/PRD/`.
- Não deve ser criada nova pasta `/PRD`, `public/PRD` ou `Docs/PRD`.
- PRDs devem ser versionados em Markdown (`.md`) dentro de `docs/PRD/`.
- A ordem de precedência conceitual permanece: PRD 00 > PRD 01 > PRD 07 > PRDs específicos por tema.
- PRDs obrigatórios para entender o domínio antes de qualquer implementação: 00, 01 e 07.
- PRDs complementares de operação visual/logs: 03 e 06.

## Decisões documentais tomadas

- O README foi reescrito como visão geral profissional do ConsultaSefaz.
- O README agora lista todos os PRDs existentes, separando obrigatórios e complementares.
- O README documenta ordem recomendada de leitura e ordem sugerida de implementação.
- A documentação reforça que a SEFAZ é fonte de verdade e que o ERP apenas confirma escrituração.
- A documentação reforça que a V1 é browser-first e que a análise pesada fica em memória.
- A documentação reforça que exceções locais têm prioridade máxima.
- A documentação reforça que o sistema é multidestinatário e não multiempresa SaaS.
- O refinamento RFT006/IE foi incorporado aos PRDs consolidados para evitar regressão documental.

## Riscos restantes

- Existem análises antigas em `Docs/Analises/`; elas foram tratadas como histórico e não como fonte oficial de PRD.
- Alguns nomes técnicos legados (`empresa_id`, `Empresa`) permanecem no código e nos contratos por compatibilidade da V1; a documentação orienta a interpretação semântica correta.
- A compatibilidade por fallback de exceção apenas por chave normalizada resolve reimportações locais, mas pode ser ambígua se houver múltiplas exceções ativas para a mesma chave em destinatários diferentes.
- A V1 depende do armazenamento local do navegador para exceções/logs leves; limpeza do navegador pode remover dados locais.
- Layouts SEFAZ/RFT006 futuros ainda exigirão revisão controlada dos PRDs 08/09.

## Dúvidas pendentes

- Se a pasta histórica `Docs/Analises/` também deverá ser migrada integralmente para `docs/Analises/` em uma próxima tarefa.
- Se a V2 substituirá `empresa_id` por `destinatario_id` nos contratos técnicos ou manterá compatibilidade indefinida.
- Se haverá política formal de versionamento para múltiplos layouts SEFAZ/RFT006 simultâneos.
- Se haverá regra futura para auditoria corporativa de exceções com usuário/autenticação/backend.
