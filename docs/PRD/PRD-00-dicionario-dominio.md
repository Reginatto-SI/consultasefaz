# PRD 00 — ConsultaSefaz — Dicionário de Domínio

## 1. Objetivo
Definir a fonte oficial de nomenclatura, semântica e interpretação conceitual do ConsultaSefaz para eliminar ambiguidades entre termos fiscais, termos operacionais e termos técnicos legados.

## 2. Fonte de verdade deste PRD
Este documento é a fonte de verdade para vocabulário de domínio, termos oficiais, blindagem conceitual e regras de interpretação semântica.

Este PRD **não** define algoritmo de matching, matriz de classificação, contratos estruturais completos, layout de arquivos ou comportamento visual detalhado. Esses assuntos pertencem aos PRDs específicos e à governança documental.

## 3. Prioridade de governança
Em caso de conflito conceitual entre documentos, prevalece:
**PRD 00 > PRD 01 > PRD 07 > PRDs específicos por tema**.

Regra obrigatória: qualquer novo PRD, análise ou implementação deve respeitar este dicionário.

## 4. Conceitos oficiais do domínio (V1)

### 4.1 Tenant (Organização / Escritório)
- É o usuário organizacional do sistema (ex.: escritório contábil).
- Não está implementado formalmente na V1.
- Não deve ser confundido com destinatário fiscal.
- Não deve ser derivado de `empresa_id`.

### 4.2 Destinatário SEFAZ (conceito principal)
- É o CNPJ/CPF destinatário da NF-e no relatório SEFAZ.
- Define a quem a nota pertence no sistema.
- É a base de agrupamento operacional da V1.
- Substitui semanticamente o uso ambíguo de “empresa” na interface.

### 4.3 Emitente
- É o fornecedor/remetente da nota fiscal.
- Nunca define agrupamento principal do sistema.
- Pode aparecer em colunas e detalhes da nota.

### 4.4 Empresa
- Termo ambíguo e evitado na UI funcional.
- Quando aparecer em artefatos técnicos da V1 (`empresa_id`, `empresa_nome`, tipo `Empresa`), deve ser interpretado como legado técnico relacionado ao destinatário fiscal.
- Não representa tenant, organização, usuário, escritório contábil nem isolamento de segurança.

### 4.5 ERP
- Fonte complementar de confirmação de escrituração.
- Nunca define destinatário.
- Nunca cria nota no universo principal.
- A regra de confirmação pertence ao PRD 05.

### 4.6 SEFAZ
- Fonte de verdade do universo de notas conferidas.
- Define destinatário, status fiscal de origem e dados principais da nota.
- O layout de origem pertence ao PRD 08.

### 4.7 Nota SEFAZ
- Entidade principal de conferência.
- Sempre vinculada a um destinatário SEFAZ.
- Origem obrigatória do dataset principal exibido na UI.

### 4.8 Snapshot
- Recorte local das entradas importadas em uma execução/sessão de conferência.
- Não significa histórico corporativo permanente.
- Regras estruturais e payloads pertencem ao PRD 07; regras de importação pertencem ao PRD 02.

### 4.9 Exceção
- Regra manual operacional com precedência sobre classificação automática.
- Conceito de domínio: desconsiderar uma nota específica por decisão operacional.
- Regras de ativação, inativação, backup e compatibilidade local pertencem ao PRD 04.

### 4.10 Status
- Status público: classificação visível e operacional definida no PRD 01.
- Status interno: indicador técnico não público usado pelo processamento, quando documentado no PRD 05.
- Status interno não deve ser tratado como filtro, KPI, badge público ou exportação operacional padrão.


### 4.11 Nota existente na SEFAZ
- Nota existente na SEFAZ é toda nota fiscal presente no relatório SEFAZ importado e estruturada no snapshot atual.
- É o conceito que define o universo principal de notas do ConsultaSefaz.
- Sua existência não depende de a nota estar lançada/escriturada no ERP.
- Sua existência não depende de o XML estar encontrado/armazenado no MaxysXML/MasterXML.

### 4.12 Nota lançada/escriturada no ERP
- Nota lançada/escriturada no ERP é uma nota SEFAZ cuja chave foi encontrada e confirmada no RFT006/ERP conforme as regras do PRD 05.
- É uma confirmação complementar de escrituração/lançamento no ERP, não uma prova de armazenamento de XML.
- Nota lançada/escriturada no ERP não significa XML encontrado no MaxysXML/MasterXML.
- RFT006/ERP nunca deve ser usado para comprovar localização, download, importação ou armazenamento de XML.

### 4.13 XML encontrado no MaxysXML/MasterXML
- XML encontrado no MaxysXML/MasterXML é o indicador auxiliar de que a chave de uma nota SEFAZ foi localizada no relatório MaxysXML/MasterXML importado.
- É uma confirmação complementar de localização/armazenamento de XML, não uma prova de escrituração/lançamento no ERP.
- XML encontrado no MaxysXML/MasterXML não significa nota lançada/escriturada no ERP.
- MaxysXML/MasterXML nunca deve ser usado para comprovar escrituração/lançamento no ERP.

### 4.14 XML pendente no MaxysXML/MasterXML
- XML pendente no MaxysXML/MasterXML é o indicador auxiliar de que a chave de uma nota SEFAZ não foi localizada no relatório MaxysXML/MasterXML importado, ou requer verificação de armazenamento conforme PRD 10.
- XML pendente no MaxysXML/MasterXML não significa nota faltante no ERP.
- Nota faltante no ERP não significa XML pendente no MaxysXML/MasterXML.
- Este conceito não altera `status_final`, `resultado_matching` ou `motivo_divergencia`.

### 4.15 Independência conceitual obrigatória
- SEFAZ, RFT006/ERP e MaxysXML/MasterXML respondem perguntas diferentes e independentes.
- SEFAZ responde quais notas existem no universo principal.
- RFT006/ERP responde se a nota SEFAZ foi lançada/escriturada no ERP.
- MaxysXML/MasterXML responde se o XML da nota SEFAZ está localizado/armazenado no MaxysXML/MasterXML.
- A presença em uma fonte complementar não presume presença na outra fonte complementar.
- MaxysXML/MasterXML gera apenas indicadores auxiliares de XML e nunca altera a classificação oficial da conferência SEFAZ x RFT006/ERP.

## 5. Regras obrigatórias de nomenclatura

### 5.1 UI
- Usar sempre: **Destinatário** ou **Destinatário SEFAZ**.
- Não usar “Empresa” como rótulo funcional na interface.

### 5.2 Contratos técnicos (V1)
- Manter `empresa_id` e correlatos por compatibilidade da V1.
- Semântica oficial: `empresa_id` representa o identificador técnico/local do destinatário fiscal.
- Não usar `empresa_id` como tenant, organização, usuário ou chave de autorização.

### 5.3 Futuro (V2)
- Planejar migração de nomenclatura técnica quando houver evolução estrutural:
  - `empresa_id` → `destinatario_id`
  - `empresa_nome` → `destinatario_nome`
- Se houver multi-tenant futuro, criar `tenant_id` separado.

## 6. Tabela de mapeamento

| Termo legado/ambíguo | Termo correto | Contexto |
|---|---|---|
| Empresa | Destinatário | UI/operação |
| empresa_id | destinatario_id (futuro) | Contrato técnico |
| empresa_nome | destinatario_nome (futuro) | Contrato técnico |
| Multiempresa | Multidestinatário | Conceito V1 |
| Empresa da nota | Destinatário SEFAZ da nota | Regra de domínio |

## 7. Regras de blindagem conceitual

- O sistema é **multidestinatário**, não multiempresa SaaS.
- Toda lógica principal gira em torno do **destinatário SEFAZ**.
- SEFAZ define o destinatário; ERP nunca define.
- Nenhuma regra de autenticação, usuário, permissão ou tenant deve depender de `empresa_id`.
- Mudanças de nomenclatura não podem alterar matching, classificação, exceções ou layout sem consultar os PRDs responsáveis.
- Não confundir nota existente na SEFAZ, nota lançada/escriturada no ERP e XML encontrado/pendente no MaxysXML/MasterXML; são conceitos independentes.

## 8. Destinatário conhecido local (V1)

Definição:
- Destinatário conhecido local é um registro operacional local usado para enriquecer leitura visual de destinatários recorrentes.

Regras obrigatórias:
- Não é banco de dados.
- Não é cadastro corporativo.
- Não define pertencimento fiscal da nota.
- Não altera matching, classificação ou precedência de exceções.
- Apenas enriquece a exibição quando o CPF/CNPJ da SEFAZ coincide com a base local.
