# Análise 2 — Validação do caso real de IE isento

## 1. PRDs consultados

- `docs/PRD/GOVERNANCA-DOCUMENTAL.md`
- `docs/PRD/PRD-00-dicionario-dominio.md`
- `docs/PRD/PRD-01-visao-geral-regras-negocio.md`
- `docs/PRD/PRD-02-importacao-arquivos.md`
- `docs/PRD/PRD-03-interface-experiencia-usuario.md`
- `docs/PRD/PRD-05-motor-conferencia.md`
- `docs/PRD/PRD-06-logs-erros-operacionais.md`
- `docs/PRD/PRD-07-contrato-dados-pipeline.md`
- `docs/PRD/PRD-08-layout-relatorio-sefaz.md`
- `docs/PRD/PRD-09-layout-relatorio-rft006-erp.md`

Fontes principais usadas nesta validação:

- PRD 05: matching, classificação, `resultado_matching`, `motivo_divergencia`, IE e `Verificar IE`.
- PRD 07: contrato dos campos estruturados e payloads.
- PRD 08: origem da IE do emitente no relatório SEFAZ.
- PRD 09: origem da IE do emitente no RFT006/ERP.

## 2. Arquivos de código analisados

- `src/lib/importer.ts`
- `src/lib/engine.ts`
- `src/lib/types.ts`
- `src/store/useStore.ts`
- `src/components/ImportDialog.tsx`
- `src/components/DetailDrawer.tsx`
- `src/pages/views/ConferenciaView.tsx`
- `src/lib/exporters/excelExporter.ts`
- `src/test/engine-ie-isento.test.ts`

Também foi executada busca textual no repositório pela chave `51260421776706000110550020000003661035144026`, pelo valor `135682630` e por `ISENTO`. Não há arquivo de amostra importada no repositório contendo a linha RFT006 real dessa chave; portanto, esta análise não consegue comprovar o conteúdo bruto do arquivo RFT006 do cliente sem novo artefato operacional.

## 3. Respostas do diagnóstico obrigatório

### 3.1 A coluna `IE` do RFT006 está sendo lida corretamente?

Sim, desde que o arquivo siga o layout PRD 09.

O importador RFT006 define `COL_Z_IE_EMITENTE = 25`, valida se o cabeçalho da coluna Z é `IE` ou equivalente a inscrição estadual e, se necessário, usa fallback para encontrar uma coluna de IE a partir da posição Z. O valor bruto da célula selecionada é normalizado para `inscricao_estadual_emitente`.

Ponto de atenção: se o arquivo RFT006 exportado pelo ERP estiver deslocado ou se o texto `ISENTO` aparecer em outra coluna que não seja a coluna `IE` selecionada, a regra atual não usará esse texto para matching.

### 3.2 Quando o ERP mostra `ISENTO`, esse texto aparece no arquivo RFT006 exportado?

Não há evidência local suficiente para afirmar que aparece.

A tela do ERP pode mostrar `ISENTO`, mas o ConsultaSefaz só consegue usar o que veio no arquivo importado. Pelo resultado observado no drawer:

- `IE RFT006 encontrada: —`
- `motivo_divergencia = IE_EMITENTE_AUSENTE_RFT006`

A evidência mais forte é que o campo estruturado `inscricao_estadual_emitente` chegou ao motor como ausência real (`undefined`/vazio), não como `ISENTO`/`__ISENTO__`.

Se `ISENTO` tivesse vindo na coluna `IE` do RFT006 lida pelo importador, a normalização atual transformaria o valor em `__ISENTO__`, o drawer exibiria `Isento` e a divergência observada não seria `IE_EMITENTE_AUSENTE_RFT006` para um caso de ausência no RFT006.

### 3.3 O valor `ISENTO` está chegando em `inscricao_estadual_emitente`, `payload_completo_erp` ou outro campo do RFT006?

Com os dados disponíveis no repositório e no payload SEFAZ fornecido, não foi possível comprovar chegada de `ISENTO` em nenhum campo RFT006.

Comportamento esperado do código, se o texto vier no arquivo:

- Se `ISENTO` vier na coluna `IE` selecionada do RFT006, `inscricao_estadual_emitente` será `__ISENTO__`.
- O valor bruto da linha RFT006 é preservado em `payload_completo_erp` sob o nome original do cabeçalho, por exemplo `payload_completo_erp["IE"] = "ISENTO"`.
- Se `ISENTO` vier em outro campo não estruturado, ele será preservado no payload bruto, mas não será usado pela regra atual de matching.

Limitação importante: o dataset final exibido no drawer preserva `payload_completo_drawer` da SEFAZ, mas não inclui o `payload_completo_erp` da linha RFT006 correspondente. Além disso, o estado pesado `erp` fica somente em memória e não é persistido no `localStorage`. Assim, depois que a sessão é perdida, não há como recuperar o payload RFT006 real pelo repositório.

### 3.4 O valor `135682630` está vindo realmente da SEFAZ como IE do emitente?

Pelo payload fornecido, sim: o campo exibido é `emitente_inscricao_estadual: "135682630"`.

No importador SEFAZ, `emitente_inscricao_estadual` é lido da coluna L (`COL_L_IE_EMITENTE = 11`). O PRD 08 mapeia a coluna L do bloco `DADOS EMISSOR / INSCRIÇÃO ESTADUAL` para `emitente_inscricao_estadual`.

Portanto, para o payload informado, o valor `135682630` está sendo tratado pelo sistema como IE do emitente SEFAZ.

### 3.5 Existe possibilidade de leitura da IE errada da SEFAZ?

Existe possibilidade operacional se o relatório importado não seguir o layout PRD 08, porque o importador SEFAZ usa posição fixa para os campos e valida principalmente presença mínima por quantidade de colunas. No layout esperado:

- IE do emitente: coluna L / índice 11.
- IE do destinatário: coluna P / índice 15.

O código separa esses dois campos e não usa IE do destinatário no matching. Porém, se o arquivo real estiver deslocado ou tiver cabeçalhos diferentes do PRD 08, a coluna L pode não representar a IE do emitente no arquivo real. Para eliminar essa hipótese no caso real, é necessário conferir os cabeçalhos brutos ao redor das colunas J, K, L, O, P e Q do arquivo SEFAZ importado.

### 3.6 Valores brutos e normalizados da chave real

Chave analisada: `51260421776706000110550020000003661035144026`.

Com base apenas no payload SEFAZ fornecido e no comportamento observado no drawer:

| Campo | Valor bruto encontrado | Valor normalizado enviado ao motor | Evidência |
|---|---|---|---|
| IE SEFAZ | `135682630` | `135682630` | Payload fornecido com `emitente_inscricao_estadual` |
| IE RFT006 | não disponível no repositório; drawer exibiu `—` | ausência real (`undefined`) | Resultado `IE_EMITENTE_AUSENTE_RFT006` e IE RFT006 `—` |
| CNPJ emitente SEFAZ | não disponível no payload fornecido como campo explícito | não comprovado nesta análise | O importador leria da coluna J; o payload informado não trouxe esse campo |
| CNPJ emitente RFT006 | não disponível no repositório | não comprovado nesta análise | O importador leria da coluna Y; não há payload RFT006 real disponível |
| Payload completo RFT006 | não disponível no repositório | não aplicável | O dataset do drawer não carrega `payload_completo_erp` e o snapshot ERP não é persistido |

Observação: a chave NF-e contém o CNPJ do emitente em sua composição, mas esta análise não deve substituir a validação do campo bruto importado por inferência da chave, e o matching não pode usar CNPJ para confirmar IE conforme PRD 05.

### 3.7 A regra nova de `ISENTO` foi acionada nesse caso real?

Não há evidência de que tenha sido acionada.

Pelo estado observado:

- SEFAZ normalizada = `135682630` (IE numérica).
- RFT006 normalizada = ausência real.
- `resultado_matching = IE_EMITENTE_DIVERGENTE`.
- `motivo_divergencia = IE_EMITENTE_AUSENTE_RFT006`.

A regra de isenção só é acionada quando pelo menos um lado normaliza para `__ISENTO__`. Neste caso observado, nenhum lado parece ter chegado ao motor como `__ISENTO__`.

### 3.8 Se não foi acionada, por quê?

Porque o sistema não recebeu evidência textual de isenção nos campos usados pelo motor.

A tela do ERP pode exibir `ISENTO`, mas, se o RFT006 exportado deixar a coluna `IE` vazia, o ConsultaSefaz enxerga apenas:

- SEFAZ com IE numérica (`135682630`).
- RFT006 com chave existente e IE ausente.

Pela regra conservadora vigente no PRD 05, esse cenário deve continuar sendo divergência (`IE_EMITENTE_AUSENTE_RFT006`) para evitar que toda IE vazia seja tratada como OK.

## 4. Valores brutos encontrados no payload SEFAZ e RFT006

### SEFAZ

Payload informado pelo usuário:

```json
{
  "CHAVE DE ACESSO": "51260421776706000110550020000003661035144026",
  "emitente_inscricao_estadual": "135682630",
  "destinatario_cnpj_cpf": "46203786000145",
  "numero_nota_fiscal": "366",
  "status_sefaz": "autorizada"
}
```

Valor bruto relevante encontrado: `emitente_inscricao_estadual = "135682630"`.

### RFT006

Não há payload RFT006 bruto anexado/disponível no repositório para a chave `51260421776706000110550020000003661035144026`.

O resultado do drawer indica que o valor estruturado da IE RFT006 chegou como ausente. Isso não comprova se o ERP exportou a coluna `IE` em branco, se a coluna foi lida errada por deslocamento de layout, ou se `ISENTO` apareceu apenas em outra tela/campo fora do RFT006.

## 5. Valores normalizados enviados ao motor

Com base no código atual e no resultado observado:

| Origem | Campo de entrada do motor | Valor normalizado |
|---|---|---|
| SEFAZ | `n.emitente_inscricao_estadual` | `135682630` |
| RFT006 | `r.inscricao_estadual_emitente` | `undefined` |

Consequência direta:

```text
SEFAZ numérica + RFT006 ausente = IE_EMITENTE_AUSENTE_RFT006
```

## 6. Resultado da regra atual

Para a combinação observada:

- Chave existe no ERP/RFT006.
- IE SEFAZ normalizada é numérica (`135682630`).
- IE RFT006 normalizada é ausente.

Resultado esperado pela regra atual:

- `chave_existe_no_erp = true`
- `ie_emitente_confere = false`
- `encontrada_no_erp = false`
- `resultado_matching = IE_EMITENTE_DIVERGENTE`
- `motivo_divergencia = IE_EMITENTE_AUSENTE_RFT006`
- status final com SEFAZ autorizada = `IRREGULAR`
- exibição complementar = `Verificar IE`

Esse resultado é coerente com a regra conservadora e não indica bug na equivalência `ISENTO`/ausente; indica ausência de evidência textual de isenção no dado consumido pelo motor.

## 7. Diagnóstico final

O ajuste de IE isenta resolve casos em que `ISENTO` ou equivalente chega em pelo menos um lado do matching.

O caso real informado provavelmente não foi resolvido porque os dados que chegaram ao ConsultaSefaz aparentam ser:

- SEFAZ: IE do emitente numérica `135682630`.
- RFT006: chave encontrada, mas IE do emitente vazia.
- Nenhuma evidência textual de `ISENTO` no campo estruturado `inscricao_estadual_emitente`.

Sem o arquivo RFT006 real ou sem dump do estado em memória logo após a importação, não é possível afirmar se `ISENTO` não foi exportado pelo ERP ou se apareceu em outro campo bruto não usado pelo motor. A hipótese principal, baseada no drawer, é que o RFT006 exportado não trouxe `ISENTO` na coluna `IE` utilizada pelo ConsultaSefaz.

## 8. Recomendação segura

Não alterar a regra de negócio agora.

Antes de criar qualquer regra adicional, validar operacionalmente se o RFT006 exportado contém `ISENTO` para a chave `51260421776706000110550020000003661035144026`:

1. Abrir o arquivo RFT006 original exportado do ERP.
2. Localizar a linha pela chave de acesso.
3. Conferir a coluna `Z = IE` e registrar o valor bruto.
4. Conferir se `ISENTO` aparece em qualquer outra coluna da mesma linha.
5. Conferir no arquivo SEFAZ as colunas J, K, L, O, P e Q da mesma nota para validar que a coluna L é realmente a IE do emitente.

### Alternativas avaliadas, sem implementação

| Alternativa | Prós | Contras |
|---|---|---|
| 1. Manter como está | Máxima segurança; não transforma IE vazia em OK; aderente ao PRD 05 atual | O caso real continua `IRREGULAR` se o RFT006 não trouxer `ISENTO` |
| 2. Cadastro local de emitentes isentos por CNPJ | Resolve recorrência quando o ERP não exporta `ISENTO`; regra pode exigir evidência operacional prévia | Cria novo cadastro/fluxo local e nova regra; precisa PRD antes; risco de mascarar divergência se mantido errado |
| 3. Exceção manual por nota | Já existe conceito de exceção; baixo impacto arquitetural | Resolve caso a caso; não escala para fornecedor recorrente |
| 4. Exceção por emitente/CNPJ | Pode tratar recorrência com controle operacional | Não existe na V1 atual; cria nova semântica e precisa PRD/UX/contrato; risco de usar CNPJ para burlar matching de IE se mal delimitado |
| 5. Ajustar exportação RFT006 no ERP para trazer `ISENTO` na coluna IE | Melhor evidência documental; aproveita regra já implementada; menor risco no ConsultaSefaz | Depende do ERP/relatório; pode exigir ajuste fora do projeto |

Recomendação preferencial: tentar a alternativa 5 primeiro. Se não for viável, usar exceção manual por nota para casos pontuais e só discutir cadastro/exceção por emitente após confirmação documental de que o RFT006 não consegue exportar `ISENTO`.

## 9. Perguntas pendentes para validação operacional

1. Na linha do RFT006 da chave `51260421776706000110550020000003661035144026`, qual é o valor bruto da coluna `Z = IE`?
2. O texto `ISENTO` aparece em alguma outra coluna da linha RFT006 exportada?
3. O arquivo SEFAZ usado na importação tem a coluna L com cabeçalho de IE do emissor/emitente?
4. O CNPJ do emitente no arquivo SEFAZ (coluna J) coincide com o CNPJ do emitente no RFT006 (coluna Y) para essa chave?
5. A tela do ERP que mostra `ISENTO` usa o mesmo dado/relatório que alimenta o RFT006 ou é uma tela cadastral separada do fornecedor?
6. O ERP consegue configurar o RFT006 para exportar o texto `ISENTO` na coluna `IE` quando o fornecedor for isento?

## 10. Como reproduzir a validação sem alterar a UI final

Durante a sessão em que o arquivo RFT006 ainda está em memória, é possível inspecionar o estado pelo console do navegador se a aplicação expuser o store em DevTools, ou adicionar temporariamente um `console.debug` local e removê-lo antes de finalizar qualquer PR de regra. O objetivo é capturar, para a chave real:

- registro RFT006 completo;
- `registro.inscricao_estadual_emitente`;
- `registro.payload_completo_erp["IE"]` ou campo equivalente;
- headers próximos de Y/Z/AA/AC;
- nota SEFAZ completa, principalmente coluna original L e campo `emitente_inscricao_estadual`.

Não se recomenda promover esse diagnóstico temporário para UI final sem uma necessidade operacional formal.
