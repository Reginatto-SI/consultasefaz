# PRD 05 — ConsultaSefaz — Motor de Conferência

## 1. Objetivo
Definir a fonte oficial do algoritmo determinístico de conferência entre base SEFAZ, base RFT006/ERP e exceções.

## 2. Fonte de verdade deste PRD
Este documento é a fonte única para:
- matching;
- classificação;
- matriz de decisão;
- determinismo;
- `resultado_matching`;
- `motivo_divergencia`;
- regra operacional `Verificar IE`;
- classificação final.

Contratos estruturais de entrada/saída pertencem ao PRD 07. Layout bruto de origem pertence ao PRD 08/PRD 09. Exceções pertencem ao PRD 04, mas sua aplicação no algoritmo é definida aqui.

## 3. Entradas do motor
O motor deve consumir somente dados estruturados entregues pela importação/pipeline:

- notas SEFAZ estruturadas;
- registros RFT006/ERP estruturados;
- exceções ativas;
- destinatários/identificadores locais necessários para vinculação;
- referência local da execução.

O motor não deve reinterpretar layout bruto de planilha. Campos, tipos e payloads são definidos no PRD 07.

## 4. Pré-processamento obrigatório
- Normalizar chave NF-e e IE conforme contratos do pipeline.
- Desconsiderar entradas sem chave estruturável para fins de conferência por nota.
- Indexar RFT006/ERP por chave de acesso para busca determinística.
- Preservar determinismo independentemente da ordem dos arquivos importados.

## 5. Normalização do status SEFAZ
- `status_sefaz_valido` representa nota autorizada/regular no relatório SEFAZ.
- `status_sefaz_invalido` representa nota cancelada, denegada, inutilizada, inexistente ou equivalente no relatório SEFAZ.
- Textos reais do relatório SEFAZ devem ser normalizados antes da classificação.
- Status SEFAZ desconhecido deve gerar aviso operacional e ser tratado como inválido por segurança, salvo regra futura explícita.

## 6. Matching SEFAZ x RFT006 por chave + IE

### 6.1 Regra oficial
Para cada nota SEFAZ:

1. Verificar se existe exceção ativa aplicável conforme PRD 04.
2. Buscar no RFT006/ERP registros com `chave_acesso = chave_nfe`.
3. Se a chave existir, validar se há pelo menos um registro com `inscricao_estadual_emitente = emitente_inscricao_estadual`.
4. Nunca usar IE do destinatário para matching com RFT006.
5. Nunca validar matching por nome, razão social, CNPJ do emitente/destinatário, similaridade textual ou heurística.
6. ERP/RFT006 nunca cria nota nova; apenas confirma existência de nota SEFAZ.

### 6.2 Elegibilidade RFT006
- Linha RFT006 com chave e IE do emitente preenchida pode confirmar matching por chave + IE.
- Linha RFT006 com chave e IE do emitente ausente é inelegível para confirmar por IE, mas comprova que a chave existe no ERP.
- Detalhes de layout, colunas e identificação da IE/chave no RFT006 pertencem ao PRD 09.

### 6.3 `resultado_matching`
Valores oficiais:

- `CONFIRMADO`
- `IE_EMITENTE_DIVERGENTE`
- `CHAVE_NAO_ENCONTRADA`

Regras:

| Condição | `resultado_matching` |
|---|---|
| Chave não existe no RFT006 | `CHAVE_NAO_ENCONTRADA` |
| Chave existe e alguma linha elegível confirma IE do emitente | `CONFIRMADO` |
| Chave existe, mas nenhuma linha elegível confirma IE do emitente | `IE_EMITENTE_DIVERGENTE` |

### 6.4 `motivo_divergencia`
Valores oficiais:

- `IE_EMITENTE_DIVERGENTE`
- `IE_EMITENTE_AUSENTE_RFT006`
- `CHAVE_NAO_ENCONTRADA`
- `null`

Regras:

| Condição | `motivo_divergencia` |
|---|---|
| `resultado_matching = CONFIRMADO` | `null` |
| Chave não existe no RFT006 | `CHAVE_NAO_ENCONTRADA` |
| Chave existe e todas as linhas encontradas estão sem IE do emitente | `IE_EMITENTE_AUSENTE_RFT006` |
| Chave existe e há IE preenchida divergente, inclusive cenário misto com linhas sem IE | `IE_EMITENTE_DIVERGENTE` |

## 7. Matriz oficial de classificação final (V1)

| Condição | status final operacional |
|---|---|
| Exceção ativa aplicável | `DESCONSIDERADA` |
| Status SEFAZ inválido e `resultado_matching = CONFIRMADO` | `IRREGULAR` |
| Status SEFAZ inválido e `resultado_matching = IE_EMITENTE_DIVERGENTE` | `IRREGULAR` |
| Status SEFAZ inválido e `resultado_matching = CHAVE_NAO_ENCONTRADA` | `IGNORADA` interno |
| Status SEFAZ válido e `resultado_matching = CONFIRMADO` | `OK` |
| Status SEFAZ válido e `resultado_matching = IE_EMITENTE_DIVERGENTE` | `IRREGULAR` |
| Status SEFAZ válido e `resultado_matching = CHAVE_NAO_ENCONTRADA` | `FALTANTE` |

Observações obrigatórias:
- Não criar status final público `DIVERGENTE` na V1.
- Problemas de IE são classificados como `IRREGULAR` quando a nota deve aparecer na visão operacional.
- Linha RFT006 com chave existente e IE ausente não deve ser tratada como chave inexistente; portanto não deve gerar `FALTANTE` por ausência de chave.

## 8. Blindagem de `IGNORADA`
`IGNORADA` é resultado interno de descarte operacional para cenário em que a nota SEFAZ inválida também não foi encontrada no RFT006.

Regras obrigatórias:
- `IGNORADA` não pertence ao contrato público do sistema.
- `IGNORADA` não aparece na UI principal.
- `IGNORADA` não entra em KPI público.
- `IGNORADA` não entra em filtros públicos.
- `IGNORADA` não entra em exportação operacional padrão.
- Uso de `IGNORADA` deve ser restrito a auditoria técnica curta ou contagem interna explicitamente documentada.

## 9. Regra operacional `Verificar IE`
- `Verificar IE` é indicação visual/comunicacional para problemas de IE.
- `Verificar IE` não é `status_final`.
- Deve ser usado pela UI quando `resultado_matching`/`motivo_divergencia` indicar ausência ou divergência de IE conforme este PRD.
- A apresentação visual pertence ao PRD 03.

## 10. Determinismo
- Mesma entrada estruturada deve produzir a mesma saída.
- Resultado não depende da ordem de arquivos.
- Sem aleatoriedade.
- Sem heurística de similaridade.

## 11. Disparos de execução
- Após importação SEFAZ.
- Após importação RFT006/ERP.
- Após criação, inativação, reversão ou importação de exceções.

## 12. Saída
O motor produz dataset final por nota, contendo status público quando aplicável, indicadores de matching, motivo operacional e payloads/identificadores necessários à UI.

O contrato estrutural da saída pertence ao PRD 07.

## 13. Limites V1
- Sem histórico completo de execuções.
- Sem processamento distribuído.
- Sem validações fiscais financeiras avançadas.
- Sem inferência por IA ou heurística para classificação.
