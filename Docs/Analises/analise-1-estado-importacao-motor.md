# Análise 1 — Estado atual da importação e motor ConsultaSefaz

## 1. Resumo executivo

- **Já existe implementação relevante** para importação de Excel, armazenamento em memória/persistência local, motor de conferência e telas operacionais básicas.
- **Está parcialmente pronto para a V1 mínima**, mas com divergências importantes em relação aos PRDs obrigatórios.
- **Não está “do zero”**, porém **ainda não está aderente** ao contrato oficial de layout/campos e à regra de matching `chave + IE do emitente` definida nos PRDs 05/07/08/09.
- **Proximidade da V1 mínima:** **média** (base funcional existe), desde que sejam feitos ajustes pontuais no importador, contrato de dados e classificação.

## 2. Arquivos encontrados

### Importação/upload
- `src/components/ImportDialog.tsx`  
  Modal de importação com seleção de tipo (SEFAZ/ERP), múltiplos arquivos, processamento em lote, ingestão no store e geração de feedback visual (sucesso/aviso/erro).
- `src/pages/views/ImportacaoView.tsx`  
  Tela/fluxo de entrada para abrir o modal de importação e orientar o operador.

### Parsing Excel
- `src/lib/importer.ts`  
  Leitura de planilha com `xlsx` (primeira aba), detecção automática de cabeçalho, mapeamento por aliases textuais, validações mínimas, normalização e warnings por linha.
- `package.json`  
  Dependência `xlsx` habilitando leitura de `.xls/.xlsx`.

### Motor/matching
- `src/lib/engine.ts`  
  Normalizadores (`chave`, `CNPJ`, `IE`, `status`) e motor determinístico `rodarMotor` com aplicação de exceção, matching e classificação final.

### Tela de conferência
- `src/pages/views/ConferenciaView.tsx`  
  Cards de resumo, filtros (destinatário/status/data/chave), tabela de resultados e paginação.
- `src/pages/Index.tsx`  
  Orquestra estados/filtros/paginação e alterna as views (conferência/importação/logs etc.).

### Logs/avisos
- `src/store/useStore.ts`  
  Registro de logs operacionais de importação/processamento, retenção curta (até 200), e gatilho automático de reprocessamento.
- `src/pages/views/LogsView.tsx`  
  Listagem de logs por tipo, nível e código.

### Tipos/modelos/dados
- `src/lib/types.ts`  
  Contratos de `NotaSefaz`, `RegistroErp`, `DatasetLinha`, `LogOperacional`, `Excecao`, status.
- `src/store/useStore.ts`  
  Estado global (Zustand), snapshot SEFAZ por destinatário (`empresa_id`) e snapshot ERP global.

## 3. O que já está aderente aos PRDs

- Suporte de importação com leitura de planilha Excel e fluxo separado por tipo SEFAZ/ERP.
- Processamento em lote com isolamento por arquivo (falha de um arquivo não impede tentativa dos demais no lote).
- Normalização básica de campos críticos (`chave`, `CNPJ`, `IE`, `status`).
- Presença de `payload_completo` na nota SEFAZ para detalhamento.
- Snapshot com comportamento compatível com V1:
  - SEFAZ substitui apenas destinatários impactados.
  - ERP substitui base global.
- Motor determinístico com status finais `OK`, `FALTANTE`, `IRREGULAR`, `DESCONSIDERADA` e tratamento interno de `IGNORADA` (não exibida).
- Fluxo/tela de conferência e logs operacionais já existentes.

## 4. O que está parcialmente aderente

- **Importador SEFAZ** existe, mas mapeia colunas por aliases textuais; os PRDs exigem identificação robusta por **grupo + nome + posição** no layout oficial (PRD 08).
- **Importador ERP** existe, porém usa campo técnico `chave_nfe`/`inscricao_estadual`; PRD pede estrutura explícita `chave_acesso` + `inscricao_estadual_emitente`.
- **Matching** implementado, mas usa IE do **destinatário** da nota SEFAZ (`inscricao_estadual_destinatario`) em vez da IE do **emitente** (`emitente_inscricao_estadual`) para comparar com ERP.
- **Classificação/indicadores**: há status final, mas faltam campos de saída oficiais como `resultado_matching`, `chave_existe_no_erp`, `ie_emitente_confere`, `motivo_divergencia`.
- **Payload ERP completo** não está garantido por linha (`payload` opcional e não claramente preenchido no parser).
- **Logs** existem, mas alguns fluxos da UI mostram ação “será implementada” (ex.: limpar logs).

## 5. O que está faltando

### Obrigatório para V1
- Ajustar contrato de dados para refletir PRD 07/09 no ERP:
  - `chave_acesso`
  - `inscricao_estadual_emitente`
  - `payload_completo_erp` obrigatório
- Ajustar importação SEFAZ para extrair explicitamente:
  - `emitente_inscricao_estadual`
  - `destinatario_cnpj_cpf`
  - `status_sefaz`
  - `data_emissao`
  - `payload_completo`
- Ajustar motor para matching oficial:
  - `SEFAZ.chave_nfe + SEFAZ.emitente_inscricao_estadual`
  - vs `ERP.chave_acesso + ERP.inscricao_estadual_emitente`
- Adicionar `resultado_matching` no dataset final (CONFIRMADO / IE_EMITENTE_DIVERGENTE / CHAVE_NAO_ENCONTRADA).
- Garantir regras de status final exatamente conforme matriz do PRD 05.
- Garantir preservação integral de payload ERP (`payload_completo_erp`) e SEFAZ (`payload_completo`).

### Pode ficar para depois
- Exportação Excel/PDF (já sinalizada como futura na UI).
- Melhorias avançadas de UX/observabilidade fora do mínimo operacional.
- Versões múltiplas de layout e heurísticas mais sofisticadas.

## 6. Riscos de complexidade desnecessária

- **Risco moderado** de ambiguidade por aliases genéricos no importador SEFAZ/ERP (pode gerar comportamento implícito em vez de contrato fixo V1).
- **Risco baixo** de excesso arquitetural: o projeto atual está relativamente simples (store local + parser + motor).
- **Risco funcional real**: regra de matching atual está divergente do PRD (usa IE incorreta), o que pode distorcer `OK/FALTANTE/IRREGULAR`.

## 7. Recomendação de próximo passo

- **Reaproveitar o código existente** (base já é útil) e seguir com **implementação mínima dirigida por PRD**.
- Antes de evoluções visuais, **corrigir primeiro contrato e matching** (importador + motor), pois isso impacta diretamente a confiabilidade do resultado.

## 8. Plano mínimo sugerido

1. **Etapa 1 — Contrato mínimo de dados**  
   Ajustar tipos/estruturas para campos oficiais V1 (SEFAZ/ERP/dataset final), sem alterar arquitetura.
2. **Etapa 2 — Importação aderente aos layouts**  
   Ajustar parser SEFAZ/RFT006 para mapear campos obrigatórios e preservar payloads completos.
3. **Etapa 3 — Motor e classificação final**  
   Aplicar matching oficial por `chave + IE do emitente`, preencher `resultado_matching` e validar matriz final de status.

## 9. Perguntas em aberto

- No layout SEFAZ atual usado pelos operadores, o cabeçalho vem sempre em duas linhas (grupo + coluna) ou em uma linha achatada? (impacta ajuste mínimo do parser).
- Há necessidade de manter compatibilidade com arquivos ERP antigos que não tragam `inscricao_estadual_emitente` por coluna nomeada `IE`?
- Para linhas ERP inelegíveis (sem IE com chave presente), o time deseja exibição explícita em logs por arquivo com contagem detalhada por motivo já na V1?
- O `status_sefaz` textual real dos arquivos da operação está estável (lista conhecida) ou haverá variações frequentes de nomenclatura?
