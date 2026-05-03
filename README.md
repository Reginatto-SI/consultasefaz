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
3. Aplicar snapshot de entrada.
4. Executar motor de conferência determinístico.
5. Aplicar exceções manuais com prioridade máxima.
6. Exibir resultados por empresa e consolidado.
7. Exibir logs operacionais para correção rápida.

## Estrutura dos PRDs (fonte de verdade funcional)
Todos os PRDs da pasta `/PRD` são a fonte de verdade funcional do projeto.

- **PRD 01** — Visão geral e regras de negócio globais.
- **PRD 02** — Importação de arquivos e snapshot de entrada.
- **PRD 03** — Interface e experiência operacional.
- **PRD 04** — Exceções e precedência de regras.
- **PRD 05** — Motor de conferência determinístico.
- **PRD 06** — Logs de erros e avisos operacionais.
- **PRD 07** — Contrato de dados e pipeline estrutural.

## Ordem recomendada de leitura
1. PRD 01
2. PRD 07
3. PRD 02
4. PRD 05
5. PRD 04
6. PRD 03
7. PRD 06

## Ordem sugerida de desenvolvimento
1. Contratos de dados e pipeline (PRD 07)
2. Importação (PRD 02)
3. Motor de conferência (PRD 05)
4. Exceções (PRD 04)
5. Interface (PRD 03)
6. Logs operacionais (PRD 06)
7. Ajustes de regras globais e validação final (PRD 01)

## Principais regras de negócio
- Multiempresa desde a V1.
- Empresa da nota definida somente pela SEFAZ (CNPJ destinatário).
- ERP não define empresa.
- Exceções ativas sobrescrevem regras automáticas.
- Processamento determinístico: mesma entrada, mesmo resultado.
- Modelo snapshot na V1, sem histórico completo de execuções.

## Principais decisões arquiteturais
- Base SEFAZ como universo de conferência.
- ERP como base complementar de matching.
- Classificação por regras explícitas e sem heurística complexa.
- Persistência curta de logs operacionais.
- Estrutura simples para facilitar evolução futura.

## Limites da V1
- Sem integração automática com API da SEFAZ.
- Sem histórico completo de snapshots/execuções.
- Sem auditoria avançada por usuário.
- Sem workflow de aprovação de exceções.
- Sem validações fiscais financeiras avançadas.

## Evoluções futuras
- Histórico completo de execuções e auditoria.
- Integrações externas automatizadas.
- Regras fiscais complementares.
- Alertas e observabilidade avançada.
- Recursos de governança multiusuário.
