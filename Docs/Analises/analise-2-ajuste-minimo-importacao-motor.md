# Análise 2 — Ajuste mínimo de importação e motor ConsultaSefaz

## 1. Resumo do que foi alterado

Foi feito ajuste pontual na base existente para aderir à V1 mínima dos PRDs, sem criar arquitetura nova: contrato de dados, parser SEFAZ por colunas oficiais, parser RFT006 por colunas oficiais e motor de matching por chave + IE do emitente.

## 2. Arquivos modificados

- `src/lib/types.ts`
- `src/lib/importer.ts`
- `src/lib/engine.ts`
- `src/store/useStore.ts`
- `src/components/ImportDialog.tsx`
- `src/components/DetailDrawer.tsx`

## 3. Como ficou o contrato de dados

- `NotaSefaz` agora contém explicitamente `emitente_inscricao_estadual`, `destinatario_cnpj_cpf`, campos opcionais de emitente/destinatário e `payload_completo`.
- `RegistroErp` agora contém `chave_acesso`, `inscricao_estadual_emitente` e `payload_completo_erp`.
- `DatasetLinha` agora contém indicadores do matching:
  - `chave_existe_no_erp`
  - `ie_emitente_confere`
  - `resultado_matching`
  - `motivo_divergencia`

## 4. Como ficou o parser SEFAZ

- Leitura prioriza colunas fixas do PRD 08 (base 0):
  - A(0) data_emissao
  - D(3) chave_nfe
  - I(8) status_sefaz
  - L(11) emitente_inscricao_estadual
  - O(14) destinatario_cnpj_cpf
- Também extrai campos úteis simples (J/K/Q/Y/C/P).
- `payload_completo` preserva toda a linha lida, além de campos estruturados.

## 5. Como ficou o parser RFT006

- Leitura prioriza colunas fixas do PRD 09 (base 0):
  - AC(28) chave_acesso
  - Z(25) inscricao_estadual_emitente
- Também extrai campos úteis simples (Y/AA/I/G/L/T).
- `payload_completo_erp` preserva toda a linha lida.
- Linha sem chave ou sem IE é preservada, marcada inelegível e gera aviso resumido.

## 6. Como ficou o motor de matching

- Matching oficial por:
  - `SEFAZ.chave_nfe + SEFAZ.emitente_inscricao_estadual`
  - versus `RFT006.chave_acesso + RFT006.inscricao_estadual_emitente`
- Nunca usa IE do destinatário para confirmar ERP.
- Preenche `resultado_matching` com:
  - `CONFIRMADO`
  - `IE_EMITENTE_DIVERGENTE`
  - `CHAVE_NAO_ENCONTRADA`

## 7. Como ficou a matriz de classificação

Matriz aplicada no motor:

- Exceção ativa → `DESCONSIDERADA`
- Status SEFAZ inválido + `CHAVE_NAO_ENCONTRADA` → `IGNORADA` interna (não entra no dataset principal)
- Status SEFAZ inválido + demais resultados de matching → `IRREGULAR`
- Status SEFAZ válido + `CONFIRMADO` → `OK`
- Status SEFAZ válido + `IE_EMITENTE_DIVERGENTE` → `IRREGULAR`
- Status SEFAZ válido + `CHAVE_NAO_ENCONTRADA` → `FALTANTE`

## 8. Pontos não implementados de propósito

- Não foi criada nova arquitetura/store/motor paralelo.
- Não foram criadas telas grandes novas.
- Não foi implementado detalhamento linha a linha de inelegibilidade em nova tela.
- Não foi implementado versionamento de múltiplos layouts.

## 9. Como testar manualmente

1. Importar SEFAZ e RFT006 com mesma chave e mesma IE do emitente e validar `OK`.
2. Importar SEFAZ com chave ausente no RFT006 e validar `FALTANTE` (quando status SEFAZ válido).
3. Importar mesma chave com IE divergente no RFT006 e validar `IRREGULAR`.
4. Alterar IE do destinatário mantendo IE do emitente igual e validar que resultado não muda (matching não usa IE do destinatário).
5. Importar linha RFT006 com chave sem IE do emitente e validar que não confirma matching e gera aviso operacional.
