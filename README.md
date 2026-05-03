# ConsultaSefaz — Conferência Inteligente de Notas Fiscais

## Objetivo do sistema
O ConsultaSefaz compara relatórios da SEFAZ com relatórios de ERP para classificar notas fiscais de entrada em:
- OK
- FALTANTE
- IRREGULAR
- DESCONSIDERADA

A SEFAZ é a fonte de verdade. O ERP somente confirma escrituração.

## Visão geral do fluxo operacional
1. Importar arquivos SEFAZ e ERP.
2. Normalizar e validar dados mínimos.
3. Aplicar snapshot de entrada local (memória e/ou armazenamento local do navegador).
4. Executar motor de conferência determinístico.
5. Aplicar exceções manuais locais com prioridade máxima.
6. Exibir resultados por destinatário e consolidado.
7. Exibir logs operacionais locais para correção rápida e exportar resultado final.

## Estrutura dos PRDs (fonte de verdade funcional)

Referência de nomenclatura e semântica: **PRD 00 — Dicionário de Domínio**.
Todos os PRDs da pasta `/PRD` são a fonte de verdade funcional do projeto.

- **PRD 00** — Dicionário de domínio e governança de nomenclatura.
- **PRD 01** — Visão geral e regras de negócio globais.
- **PRD 02** — Importação de arquivos e snapshot de entrada.
- **PRD 03** — Interface e experiência operacional.
- **PRD 04** — Exceções e precedência de regras.
- **PRD 05** — Motor de conferência determinístico.
- **PRD 06** — Logs de erros e avisos operacionais.
- **PRD 07** — Contrato de dados e pipeline estrutural.
- **PRD 08** — Layout do relatório SEFAZ (mapeamento e identificação de colunas).
- **PRD 09** — Layout do relatório RFT006 ERP (base complementar de confirmação no ERP).


## ⚠️ Convenção Crítica de Domínio (LEITURA OBRIGATÓRIA)
- O sistema NÃO é multiempresa no sentido de ERP/tenant.
- O sistema é multidestinatário (CNPJs conferidos).
- `empresa_id` é legado técnico e NÃO representa organização.
- Desenvolvedores devem obrigatoriamente ler o PRD 00 antes de qualquer alteração.

## Ordem recomendada de leitura
1. PRD 00
2. PRD 01
3. PRD 07
4. PRD 02
5. PRD 08
6. PRD 09
7. PRD 05
8. PRD 04
9. PRD 03
10. PRD 06
## Ordem sugerida de desenvolvimento
1. Contratos de dados e pipeline (PRD 07)
2. Importação (PRD 02)
3. Motor de conferência (PRD 05)
4. Exceções (PRD 04)
5. Interface (PRD 03)
6. Logs operacionais (PRD 06)
7. Ajustes de regras globais e validação final (PRD 01)

## Principais regras de negócio
- Multidestinatário desde a V1 (sem multi-tenant real, conforme PRD 00).
- Destinatário da nota definido somente pela SEFAZ (CNPJ destinatário).
- ERP não define destinatário.
- Exceções ativas sobrescrevem regras automáticas.
- Processamento determinístico: mesma entrada, mesmo resultado.
- Modelo snapshot na V1, sem histórico completo de execuções.

## Principais decisões arquiteturais
- Base SEFAZ como universo de conferência.
- ERP como base complementar de matching.
- Classificação por regras explícitas e sem heurística complexa.
- Persistência local e curta de logs operacionais.
- Estrutura simples para facilitar evolução futura.

## Limites da V1
- Ferramenta client-side executada no navegador.
- Sem banco de dados na V1.
- Sem backend na V1.
- Sem autenticação na V1.
- Sem integração automática com API da SEFAZ.
- Sem histórico completo de snapshots/execuções (sem persistência corporativa em servidor).
- Sem auditoria avançada por usuário.
- Sem workflow de aprovação de exceções.
- Sem validações fiscais financeiras avançadas.

## Evoluções futuras
- Banco de dados/backend apenas se necessário em evolução futura (V2+).
- Histórico completo de execuções e auditoria.
- Integrações externas automatizadas.
- Regras fiscais complementares.
- Alertas e observabilidade avançada.
- Recursos de governança multiusuário.


## Ordem obrigatória de leitura
1. PRD 00
2. PRD 01
3. PRD 07


## Regra conceitual oficial da V1
> Ferramenta local de conferência rápida, com processamento client-side, sem banco de dados e sem persistência corporativa.

Observações operacionais da V1:
- Não há upload para servidor; os arquivos são lidos no navegador.
- Estado pode existir em memória e/ou armazenamento local do navegador.
- A manutenção dos dados depende da estratégia local e não possui garantia corporativa de retenção.
- Exportação é o meio oficial para conservar o resultado da conferência.


## Regras específicas da V1 sem banco
- Destinatários são identificados automaticamente nas importações SEFAZ pelos campos `destinatario_cnpj_cpf` e `destinatario_razao_social`.
- A tela de destinatários é informativa (consulta/listagem local), sem CRUD corporativo completo na V1.
- Exceções são salvas localmente no navegador e aplicadas pelo motor de conferência.
- Exceções devem poder ser exportadas/importadas para backup manual entre ambientes locais.
- Se os dados do navegador forem limpos, as exceções locais podem ser perdidas.
- Banco de dados, backend e autenticação ficam para evolução futura (V2+), se necessários.


## Enriquecimento local de destinatários na V1
- A V1 segue sem banco de dados, sem backend e sem autenticação.
- Destinatários podem ser enriquecidos por cadastro local fixo de destinatários conhecidos (configuração operacional local em código).
- O apelido é usado para facilitar leitura na UI quando houver correspondência por CNPJ/CPF.
- CNPJ/CPF continua sendo a chave de identificação do destinatário da nota.
- A razão social original da SEFAZ permanece rastreável no payload/detalhe.
- O cadastro local conhecido não altera matching, classificação ou precedência de exceções.
