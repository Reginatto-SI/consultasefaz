# PRD 07 — ConsultaSefaz — Contrato de Dados e Pipeline Estrutural

## 1. Objetivo
Definir o contrato estrutural mínimo do ConsultaSefaz para garantir consistência entre importação, conferência, exceções, UI e logs.

Este PRD é a fonte única para:
- entidades mínimas;
- campos obrigatórios e opcionais;
- tipos estruturais;
- pipeline estrutural;
- dataset final;
- payloads;
- snapshots;
- identificadores locais.

Este PRD não define algoritmo de matching, matriz de classificação nem semântica de `resultado_matching`/`motivo_divergencia`; esses assuntos pertencem ao PRD 05.

## 2. Referências obrigatórias
- PRD 00 — nomenclatura e semântica de domínio.
- PRD 02 — importação e snapshot de entrada.
- PRD 03 — consumo visual do dataset final.
- PRD 04 — contrato funcional de exceções.
- PRD 05 — matching, classificação e valores semânticos de indicadores do motor.
- PRD 06 — logs operacionais.
- PRD 08 — layout SEFAZ.
- PRD 09 — layout RFT006/ERP.
- `docs/PRD/GOVERNANCA-DOCUMENTAL.md` — fonte única por assunto e precedência documental.

## 3. Princípios estruturais obrigatórios da V1
- `empresa_id` é identificador técnico/local do destinatário fiscal, conforme PRD 00.
- Entidades deste PRD são contratos de dados locais da V1, não tabelas de banco.
- O pipeline deve consumir dados estruturados; layout bruto pertence ao PRD 08/09.
- SEFAZ define o universo principal de notas.
- ERP/RFT006 é entrada complementar e não cria nota principal isolada.
- Exceções são entrada estrutural do pipeline, mas sua precedência funcional pertence ao PRD 04/05.
- Snapshot V1 é local e não representa histórico corporativo completo.

## 4. Entidades mínimas e campos obrigatórios

### 4.1 Destinatário SEFAZ

Campos mínimos:
- `id` (obrigatório; identificador local)
- `nome` (obrigatório)
- `cnpj` (obrigatório, normalizado)
- `inscricao_estadual` (opcional)
- `destinatario_cnpj_cpf_normalizado` (opcional; vínculo com cadastro local conhecido)
- `destinatario_conhecido` (opcional; boolean)
- `destinatario_apelido` (opcional; vindo do cadastro local conhecido quando houver correspondência por CPF/CNPJ)
- `origem` (derivado automaticamente da importação SEFAZ por `destinatario_cnpj_cpf` e `destinatario_razao_social`)

### 4.2 Nota SEFAZ (entrada principal)

Campos mínimos:
- `id` (obrigatório)
- `empresa_id` (obrigatório; legado técnico/local do destinatário fiscal)
- `chave_nfe` (obrigatório, normalizada)
- `status_sefaz` (obrigatório)
- `data_emissao` (obrigatório para filtro por período)
- `emitente_inscricao_estadual` (obrigatório para consumo pelo motor conforme PRD 05)
- `emitente_cnpj_cpf` (obrigatório)
- `emitente_razao_social` (obrigatório)
- `destinatario_cnpj_cpf` (obrigatório; define o destinatário fiscal da nota)
- `destinatario_razao_social` (obrigatório)
- `inscricao_estadual_destinatario` (opcional; informativo na V1)
- `payload_completo` (obrigatório; preserva campos do relatório original SEFAZ)
- `importacao_id` (obrigatório; rastreio local de importação)

A origem de cada campo SEFAZ pertence ao PRD 08.

### 4.3 Registro ERP / RFT006 (entrada complementar)

Campos mínimos:
- `id` (obrigatório)
- `chave_acesso` (obrigatório quando a linha for elegível, normalizada)
- `inscricao_estadual_emitente` (obrigatório para linha elegível de confirmação por IE)
- `payload_completo_erp` (obrigatório)
- `importacao_id` (obrigatório)

Campos recomendados/opcionais:
- `emitente_cnpj_cpf`
- `emitente_razao_social`
- `numero_nota_fiscal`
- `data_emissao_erp`
- `cfop`
- `valor_total`

A origem, elegibilidade e validação das colunas RFT006 pertencem ao PRD 09. O impacto de linhas inelegíveis na classificação pertence ao PRD 05.

### 4.4 Exceção

Campos mínimos:
- `id` (obrigatório; identificador local)
- `empresa_id` (obrigatório; destinatário local)
- `chave_nfe` (obrigatório)
- `tipo_excecao` (obrigatório)
- `motivo` (obrigatório)
- `observacao` (obrigatório, podendo ser string vazia)
- `ativa` (obrigatório; true/false)
- `criada_em` (obrigatório)
- `atualizada_em` (obrigatório)

Regras funcionais de exceção, precedência, backup e compatibilidade local pertencem ao PRD 04.

### 4.5 Resultado de conferência (dataset final)

Campos mínimos:
- `empresa_id`
- `chave_nfe`
- `status_final`
- `status_sefaz`
- `chave_existe_no_erp`
- `ie_emitente_confere`
- `encontrada_no_erp`
- `resultado_matching`
- `motivo_divergencia`
- `ie_emitente_sefaz` (opcional; auditoria)
- `ie_emitente_rft006_encontrada` (opcional; auditoria)
- `tem_excecao_ativa`
- `motivo_excecao` (se aplicável)
- `data_emissao`
- `payload_resumo_tabela`
- `payload_completo_drawer`
- `referencia_execucao`

Regras de governança deste dataset:
- `status_final` público deve obedecer aos status oficiais do PRD 01 e à matriz do PRD 05.
- `resultado_matching` e `motivo_divergencia` são campos estruturais do dataset, mas seus valores e semântica pertencem ao PRD 05.
- `IGNORADA` é resultado interno do motor e não deve compor dataset operacional público, UI principal, filtros públicos, KPIs públicos ou exportação operacional padrão.
- `payload_resumo_tabela` deve conter apenas campos necessários à listagem/resumo.
- `payload_completo_drawer` deve preservar rastreabilidade suficiente para o detalhe operacional.

## 5. Pipeline estrutural oficial (V1)

1. Importar arquivos conforme PRD 02.
2. Resolver layout SEFAZ/RFT006 conforme PRD 08/09.
3. Normalizar campos críticos conforme PRD 02 e contratos deste PRD.
4. Montar snapshot local de entradas.
5. Entregar entradas estruturadas ao motor conforme PRD 05.
6. Receber resultado do motor e montar dataset final conforme este PRD.
7. Expor dataset à UI conforme PRD 03.
8. Registrar logs operacionais conforme PRD 06.

## 6. Snapshot estrutural da V1

- Snapshot SEFAZ: representa o conjunto local de notas SEFAZ vigentes para os destinatários impactados pela importação.
- Snapshot RFT006/ERP: representa a base complementar vigente para confirmação de escrituração.
- Exceções não são apagadas por snapshot de importação, conforme PRD 04.
- Snapshot não é histórico permanente nem versionamento corporativo.

## 7. Payloads

- `payload_completo` deve preservar os campos lidos do relatório SEFAZ, inclusive não estruturados.
- `payload_completo_erp` deve preservar os campos lidos do RFT006, inclusive não estruturados.
- Payloads podem conter valores brutos e normalizados quando isso ajudar rastreabilidade.
- O campo estruturado final deve permanecer determinístico e não depender de heurística de UI.

## 8. Regras operacionais de consistência

- Toda nota exibida deve ter origem em nota SEFAZ.
- Nunca criar nota principal a partir de ERP isolado.
- Exceção órfã permanece cadastrada e não quebra processamento.
- Exceção órfã não gera linha na tabela principal enquanto a nota não reaparecer na SEFAZ.
- Mudança em exceção ativa deve disparar nova conferência do snapshot atual.

## 9. Premissas de performance e execução local (V1)

- Processamento local e previsível para volumes médios.
- Normalização linear.
- Estruturas de busca devem evitar laços quadráticos desnecessários.
- Sem fila distribuída.
- Sem histórico completo de snapshots.
- Histórico curto apenas para logs operacionais conforme PRD 06.

## 10. Persistência local e limites estruturais

- Não há tabela de banco de dados na V1.
- Não há migration na V1.
- Não há persistência corporativa em servidor na V1.
- Identificadores locais (`id`, `empresa_id`, `importacao_id`, `referencia_execucao`) não devem ser interpretados como chaves corporativas globais.
- Em evolução futura, estes contratos podem ser convertidos em modelo persistente mediante PRD próprio.

## 11. Enriquecimento local do destinatário

- `destinatario_cnpj_cpf` da nota sempre vem da SEFAZ.
- `destinatario_apelido` vem do cadastro local conhecido quando houver correspondência por CPF/CNPJ normalizado.
- `destinatario_razao_social` original da SEFAZ deve permanecer preservada no contrato e no payload/detalhe.
- O vínculo com cadastro local deve ser somente por CPF/CNPJ normalizado.
- Não usar razão social para vínculo com cadastro local.
- O cadastro local conhecido não substitui a SEFAZ como fonte de verdade da nota.

## 12. Fora de escopo estrutural (V1)

- Versionamento completo de snapshots.
- Trilha de auditoria avançada por usuário.
- Reconciliação financeira.
- Regras heurísticas/IA para classificação.
- Integração automática com APIs externas.
