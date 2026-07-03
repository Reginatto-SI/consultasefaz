# PRD 01 — ConsultaSefaz — Visão Geral e Regras de Negócio

## 1. Objetivo
Definir a visão funcional, os objetivos, o escopo, os princípios globais e os status públicos do ConsultaSefaz na V1.

## 2. Fonte de verdade deste PRD
Este documento é a fonte de verdade para regras globais de negócio, filosofia operacional, escopo V1, princípios determinísticos e definição oficial dos status públicos.

Referências obrigatórias:
- PRD 00 — nomenclatura e semântica de domínio.
- PRD 05 — matching, classificação automática, `resultado_matching`, `motivo_divergencia` e matriz de decisão.
- PRD 07 — contratos estruturais, entidades, campos e dataset final.

Este PRD não substitui contratos técnicos completos nem repete algoritmo do motor.

## 3. Princípios obrigatórios (V1)
- SEFAZ é a fonte de verdade do universo de notas.
- ERP/RFT006 apenas confirma escrituração conforme PRD 05.
- MaxysXML/MasterXML apenas indica localização/armazenamento de XML conforme PRD 10.
- Sistema multidestinatário desde o início.
- Destinatário da nota é definido pela SEFAZ.
- ERP não define destinatário.
- Exceções ativas têm prioridade máxima conforme PRD 04.
- Processamento deve ser determinístico.
- Modelo de trabalho é baseado em snapshot local, sem histórico corporativo completo.

## 4. Escopo V1
Inclui:
- importação local de relatórios SEFAZ e RFT006/ERP;
- conferência automática;
- exceções locais;
- UI de consulta, filtros e detalhes;
- logs operacionais locais/curtos;
- exportações operacionais previstas nos PRDs específicos.

Não inclui:
- integração automática com API da SEFAZ;
- automação agendada;
- backend/banco corporativo;
- autenticação, RBAC ou multi-tenant real;
- auditoria avançada;
- cadastro corporativo permanente de destinatários.

## 5. Status públicos oficiais
Os únicos status públicos da V1 são:

- `OK`
- `FALTANTE`
- `IRREGULAR`
- `DESCONSIDERADA`

Regras de governança dos status públicos:
- Somente esses status podem aparecer como badge principal na UI, KPI público, filtro público e exportação operacional padrão.
- Não criar status público adicional para divergência de IE.
- A semântica de classificação de cada status é definida pela matriz do PRD 05.

## 6. Blindagem do status interno `IGNORADA`

`IGNORADA` é um resultado interno do processamento, documentado no PRD 05 para cenários descartados da visão operacional principal.

Regras obrigatórias:
- `IGNORADA` **não** pertence ao contrato público do sistema.
- `IGNORADA` **não** aparece na UI principal.
- `IGNORADA` **não** entra em KPI público.
- `IGNORADA` **não** entra em filtros públicos.
- `IGNORADA` **não** entra em exportação operacional padrão.
- Caso seja necessário auditar `IGNORADA`, a auditoria deve ser técnica/curta e explicitamente documentada no PRD 05/PRD 06.


## 7. Hierarquia das fontes de relatório
A hierarquia conceitual das fontes da V1 é obrigatória:

1. **SEFAZ** é a única fonte de verdade do universo principal de notas. Somente a SEFAZ responde quais notas existem para conferência no ConsultaSefaz.
2. **RFT006/ERP** é relatório complementar de escrituração. Ele responde quais notas existentes na SEFAZ foram lançadas/escrituradas no ERP, conforme o motor oficial do PRD 05.
3. **MaxysXML/MasterXML** é relatório complementar de XML. Ele responde quais XMLs das notas existentes na SEFAZ estão localizados/armazenados no MaxysXML/MasterXML, conforme PRD 10.

Regras obrigatórias:

- Somente a SEFAZ define o universo principal de notas.
- RFT006/ERP não cria nota no universo principal e não comprova XML encontrado.
- MaxysXML/MasterXML não cria nota no universo principal e não comprova escrituração/lançamento no ERP.
- Nota lançada no ERP não significa XML encontrado.
- XML encontrado no MaxysXML/MasterXML não significa nota lançada no ERP.
- XML pendente no MaxysXML/MasterXML não significa nota faltante no ERP.
- Nota faltante no ERP não significa XML pendente no MaxysXML/MasterXML.
- MaxysXML/MasterXML gera apenas indicadores auxiliares de XML e nunca altera status público principal, `resultado_matching` ou `motivo_divergencia`.

## 8. Regras macro de alto nível
1. Importar arquivos conforme PRD 02, PRD 08 e PRD 09.
2. Montar contratos estruturais e snapshot conforme PRD 07.
3. Rodar motor de conferência conforme PRD 05.
4. Aplicar exceções conforme PRD 04.
5. Exibir resultado conforme PRD 03.
6. Registrar erros/avisos conforme PRD 06.

## 9. Multidestinatário
- A V1 processa múltiplos destinatários fiscais no mesmo ambiente local.
- `empresa_id` é legado técnico/local para destinatário fiscal, conforme PRD 00.
- Visualização por destinatário e consolidada faz parte da operação V1.

## 10. Conexão com os demais PRDs
- PRD 00: semântica e nomenclatura.
- PRD 02: importação, parsing e snapshot de entrada.
- PRD 03: experiência operacional e comportamento visual.
- PRD 04: exceções e precedência.
- PRD 05: algoritmo determinístico, matching e classificação final.
- PRD 06: logs operacionais.
- PRD 07: contrato de dados e pipeline estrutural.
- PRD 08: layout SEFAZ.
- PRD 09: layout RFT006/ERP.

## 11. Evoluções futuras
- Histórico completo de execuções.
- Integrações externas.
- Auditoria avançada.
- Regras fiscais complementares.
- Backend/banco/autenticação, se uma evolução futura justificar.

## 12. Escopo técnico explícito da V1
- Sistema client-side executado no navegador.
- Sem backend, banco de dados, autenticação e persistência corporativa em servidor.
- Exportação é o mecanismo principal para guardar resultado operacional fora do navegador.
- Histórico completo permanece fora de escopo na V1.

## 13. Destinatários e exceções no escopo local da V1
- Destinatários são derivados dos arquivos SEFAZ importados.
- Exceções são regras locais por destinatário + chave, conforme PRD 04.
- Exportação/importação de exceções funciona como backup manual e reutilização em outro ambiente local.

## 14. Enriquecimento por destinatário conhecido local (V1)
- SEFAZ continua definindo o destinatário da nota pelo `destinatario_cnpj_cpf`.
- Cadastro local conhecido apenas melhora exibição operacional.
- Apelido não altera matching, classificação ou exceções.
