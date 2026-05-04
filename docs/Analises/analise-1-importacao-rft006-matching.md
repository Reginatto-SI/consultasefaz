# Análise 1 — Importação RFT006 + Matching SEFAZ

## 1) Resumo executivo do problema

A análise do código indica **três pontos principais**:

1. **Divergência de data na tabela**: há conversão de data com deslocamento de fuso (UTC → local), o que explica casos como payload `01/04/2026 07:08:55` sendo exibido como `31/03/2026` em cenários de timezone negativo. Isso ocorre porque o parser salva datas em ISO UTC e a UI formata com `toLocaleDateString("pt-BR")` no fuso local.
2. **Falha de matching (`CHAVE_NAO_ENCONTRADA`)**: o motor está implementado com busca por `chave_acesso` normalizada e fallback em `chave_nfe` legado, então a regra está correta. Porém, sem dados de execução reais, a causa mais provável é **problema no valor importado da coluna AC (chave)** no arquivo RFT006 (perda/transformação de dígitos, notação científica, header deslocado, célula não textual), levando a índice ERP sem a chave esperada.
3. **Travamento/congelamento na importação RFT006**: o fluxo atual processa parse + construção de arrays + persistência + rerun do motor tudo no thread principal, sem chunking/yield. Em arquivo grande, isso bloqueia UI e pode aparentar “popup travado”. Também não há `try/finally` nos handlers de importação para garantir liberação de `processing` em qualquer exceção.

---

## 2) Arquivos analisados

### PRDs encontrados no repositório
- `docs/PRD/PRD-05-motor-conferencia.md`
- `docs/PRD/PRD-07-contrato-dados-pipeline.md`
- `docs/PRD/PRD-09-layout-relatorio-rft006-erp.md`
- `docs/PRD/PRD-03-interface-experiencia-usuario.md`
- `docs/PRD/PRD-06-logs-erros-operacionais.md`

### PRDs solicitados e **não encontrados**
- PRD 00 (Dicionário de Domínio)
- PRD 02 (Módulo de Importação)
- PRD 08 (Layout SEFAZ)

### Código
- `src/components/ImportDialog.tsx`
- `src/lib/importer.ts`
- `src/lib/engine.ts`
- `src/store/useStore.ts`
- `src/pages/views/ConferenciaView.tsx`
- `src/components/DetailDrawer.tsx`

---

## 3) Fluxo real encontrado no código

1. Usuário dispara processamento no wizard (`handleProcessSefaz` / `handleProcessErp`).
2. `processBatch` itera arquivos e chama `parseFile(file, tipo)` para cada um.
3. No parser:
   - leitura do Excel com `XLSX.read`
   - detecção de header por heurística (`detectHeaderRow`)
   - mapeamento por posição fixa de colunas para SEFAZ e ERP
   - normalizações (`normalizeChave`, `normalizeIE`, `normalizeCnpj`)
4. Após parse com sucesso:
   - SEFAZ: `store.ingestSefaz(...)`
   - ERP: `store.ingestErp(...)`
5. `ingestSefaz` e `ingestErp` chamam `rerun()` imediatamente.
6. `rerun` executa `rodarMotor(...)` e atualiza `dataset`.
7. A tabela da conferência renderiza o `dataset`, inclusive data via `formatDataEmissao`.

---

## 4) Diagnóstico do travamento da importação

### Evidências no fluxo
- Parse de planilha e transformação de linhas são síncronos no thread principal (browser), sem worker/chunking.
- O estado `processing` só é desligado após `await processBatch(...)`; se houver exceção fora do `parseFile` capturado no loop interno, o botão pode ficar em “Processando...”.
- `processBatch` também adiciona logs e dispara escrita em store; em lote grande, isso agrava bloqueio de render.

### Causa provável do “congelamento”
**Bloqueio do thread principal por carga de CPU/memória** durante parse e pós-processamento (arrays grandes + rerun + render), somado a ausência de telemetria de tempo por etapa.

### Sobre “popup sem sucesso/erro”
Se o bloqueio ocorre antes de completar o handler, a UI pode parecer sem resposta. Além disso, não há proteção `try/finally` nos handlers externos para garantir atualização visual final em qualquer erro inesperado.

---

## 5) Diagnóstico da falha de matching (`CHAVE_NAO_ENCONTRADA`)

### Regra implementada vs PRD
- O motor indexa ERP por chave (`chave_acesso` com fallback `chave_nfe`) e compara com `nota.chave_nfe` normalizada.
- Depois compara IE do emitente SEFAZ vs IE do emitente RFT006.
- Isso está aderente ao PRD 05/09 (chave + IE do emitente, sem usar IE de destinatário).

### Onde pode quebrar na prática
1. **Importação da chave ERP inválida**:
   - coluna AC pode vir em formato numérico/científico e perder precisão na origem Excel.
   - chave pode chegar vazia após normalização.
2. **Header heurístico deslocado**:
   - `detectHeaderRow` é genérico; em arquivo fora do padrão pode escolher linha errada e deslocar índices.
3. **Dados não textuais no Excel**:
   - 44 dígitos em célula numérica são vulneráveis a transformação antes da normalização.

### Situação do store e motor
- O ERP é efetivamente salvo no store (`set({ erp: novos })`) e o motor roda em seguida (`rerun()`), então “motor roda antes do ERP” **não se confirmou** pelo código.

---

## 6) Diagnóstico da divergência de data

### Comportamento observado no código
- `parseDate` para formato BR (`dd/mm/yyyy`) cria `new Date('yyyy-mm-dd').toISOString()` (UTC 00:00:00).
- A tabela converte de volta com `new Date(rawDate).toLocaleDateString('pt-BR')` (fuso local).

### Efeito
Em UTC-3, por exemplo:
- `2026-04-01T00:00:00.000Z` pode aparecer como `31/03/2026` local.

### Conclusão
A divergência da data exibida é explicada tecnicamente por **conversão de timezone**, não por uso de data ERP.

---

## 7) Evidências técnicas encontradas

- Parser ERP usa colunas fixas `Z`(25)=IE emitente e `AC`(28)=chave, como esperado.
- Normalização de chave remove não dígitos.
- Motor indexa ERP por chave e aplica regra de IE conforme PRD.
- `ingestErp` substitui snapshot ERP inteiro e dispara rerun.
- Data da tabela vem de `linha.data_emissao` (SEFAZ), formatada localmente.
- Drawer também mostra data por `new Date(linha.data_emissao).toLocaleDateString('pt-BR')`.

---

## 8) Hipóteses descartadas

- “Motor usa IE do destinatário”: **descartado**.
- “Motor busca campo errado (não chave_acesso)”: **descartado** (há fallback legado, mas busca correta existe).
- “ERP não vai para store”: **descartado**.
- “Motor não roda após importação ERP”: **descartado**.

---

## 9) Causa raiz mais provável

### Matching
A causa mais provável para `CHAVE_NAO_ENCONTRADA` no cenário descrito é **qualidade/formatação da chave no arquivo RFT006 importado** (especialmente chave em célula não textual/perdida), ou detecção de header deslocada, resultando em índice ERP sem a chave esperada pós-normalização.

### Travamento
Causa provável: processamento pesado síncrono em UI thread (parse + ingest + rerun + render) sem instrumentação de tempo e sem proteção robusta de estado final no handler.

### Data
Causa provável/confirmada: deslocamento por timezone na serialização/parsing de datas.

---

## 10) Correção mínima recomendada

> Sem refatoração ampla e sem mudar regra de negócio.

1. **Instrumentar diagnósticos (logs estruturados) no parser ERP e no motor**, incluindo:
   - total de linhas lidas
   - total de registros ERP gerados
   - total com chave
   - total com IE
   - 5 primeiras chaves normalizadas
   - tamanho do índice ERP
   - busca direta da chave exemplo no índice
   - tempo de parse e tempo de rerun
2. **Envolver handlers `handleProcessSefaz`/`handleProcessErp` com `try/finally`** para garantir `setProcessing(false)`.
3. **Tratamento de data sem deslocamento para exibição de “data civil”** (ajuste localizado no parser/formatter), mantendo fonte SEFAZ.

---

## 11) Riscos da correção

- Logs excessivos em produção (mitigar com nível/debug).
- Ajuste de data pode afetar exportadores que assumem ISO UTC (validar Excel/PDF).
- Mais validações de chave podem aumentar rejeição de linhas em arquivos já problemáticos.

---

## 12) Checklist de validação manual

1. Importar SEFAZ válido e confirmar total de notas no dataset.
2. Importar RFT006 e verificar:
   - total de linhas lidas
   - total de registros ERP
   - total de `chave_acesso` não vazio
   - total de IE emitente não vazio
3. Procurar a chave `51260403648961000103550010000184861000552749` no índice ERP normalizado.
4. Confirmar resultado da nota:
   - se chave existe + IE confere: `CONFIRMADO/OK`
   - se chave existe + IE diverge/ausente: `IE_EMITENTE_DIVERGENTE/IRREGULAR`
5. Confirmar que tabela e drawer usam a mesma data SEFAZ.
6. Confirmar que popup conclui com toast de sucesso/erro mesmo sob falha inesperada.
7. Repetir com lote grande para medir tempo parse vs tempo motor vs render.

---

## 13) Perguntas pendentes

1. Existem arquivos reais RFT006 de exemplo para reproduzir localmente a chave citada?
2. O PRD 08 (layout SEFAZ) e PRD 02 (importação) estão em outro caminho/repo?
3. A chave de exemplo no RFT006 está armazenada como texto no Excel de origem ou como número?
4. Qual timezone esperado oficialmente para exibição de `data_emissao` na UI (UTC, local do usuário, ou data civil fixa sem fuso)?

---

## Respostas objetivas aos critérios de sucesso

- **O RFT006 está sendo realmente importado para o store?** Sim, via `ingestErp` com `set({ erp: novos })`.
- **Quantos registros ERP válidos são gerados após importação?** Não determinável só por leitura estática; depende do arquivo real.
- **O campo `chave_acesso` existe nos registros ERP?** Sim, é preenchido no parser ERP.
- **A chave do exemplo existe no índice ERP após normalização?** Não determinável sem executar com o arquivo real.
- **A coluna `Chave de acesso` do RFT006 está sendo lida como texto sem perder dígitos?** O código tenta normalizar string, mas não garante que a planilha já não tenha perdido precisão quando a célula é numérica.
- **O motor está buscando no campo correto?** Sim (`chave_acesso` com fallback `chave_nfe`).
- **O motor roda depois da atualização do ERP?** Sim, `ingestErp` faz `set` e chama `rerun` em seguida.
- **A data da tabela vem de qual campo?** `linha.data_emissao` (origem SEFAZ estruturada).
- **O travamento ocorre no parse, snapshot, motor ou renderização?** Pelo código, mais provável combinação de parse + processamento síncrono + rerun/render em lote grande; sem profiling de execução real, não dá para cravar um único ponto.
