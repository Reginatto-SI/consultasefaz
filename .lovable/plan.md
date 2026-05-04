## Problema identificado

No print, vê-se "Tempo limite excedido ao ler o arquivo" e o botão fica preso em "Processando...".

### Causa raiz

Em `src/lib/importer.ts` (linha ~110), o código atual envolve `file.arrayBuffer()` em `withTimeout(..., 30_000, "ler o arquivo")`. O problema é estrutural:

```ts
const buf = await withTimeout(file.arrayBuffer(), READ_TIMEOUT_MS, "ler o arquivo");
const wb = await withTimeout(
  Promise.resolve().then(() => XLSX.read(buf, { type: "array", cellDates: true })),
  READ_TIMEOUT_MS,
  "interpretar a planilha"
);
```

O `withTimeout` usa `setTimeout` baseado no event loop. Quando o `XLSX.read` (que é **síncrono e CPU-bound**) começa a rodar logo em seguida, ele **bloqueia o event loop** por vários segundos em arquivos médios/grandes. Isso faz com que:

1. O `setTimeout` de 30s do `arrayBuffer` fique "atrasado" — quando o event loop volta, o JS julga que passaram 30s embora o `arrayBuffer` em si tenha resolvido em milissegundos.
2. Ou o XLSX.read ultrapassa os 30s reais em arquivos do tipo COOPERAGRO (RFT006 costuma ter muitas colunas).
3. Em ambos casos: erro "Tempo limite excedido ao ler o arquivo" aparece **mesmo com arquivo válido**.

Adicionalmente, o botão da Etapa 2 mostrou "Processando..." mesmo após o erro aparecer no `Resultado do lote`. Isso ocorre porque na captura o usuário provavelmente clicou múltiplas vezes ou o `setProcessing(false)` aconteceu logo depois — mas vale reforçar a UX.

### Correção mínima

**Arquivo: `src/lib/importer.ts`**

1. **Remover o `withTimeout` do `file.arrayBuffer()`** — `arrayBuffer()` é nativo do browser, não pode ser cancelado, e o "timeout" só polui o event loop. Deixa-se o navegador ler o arquivo no seu tempo.
2. **Remover o `withTimeout` do `XLSX.read`** — é síncrono, envolver em `Promise.resolve().then(...)` com timeout não cancela nada (o thread já está bloqueado). O timeout dispara falsamente em arquivos legítimos.
3. **Manter** as outras proteções: validação de extensão, limite de 25MB (já protege contra arquivos absurdos), limite de 200k linhas, yields cooperativos a cada 2k linhas no loop principal.
4. **Manter** o helper `withTimeout` no arquivo caso seja útil em outro ponto, mas não usá-lo em operações síncronas/CPU-bound.
5. Adicionar comentário explicando por que NÃO se usa timeout aqui (lição aprendida).

**Arquivo: `src/components/ImportDialog.tsx`**

6. Reforçar o `finally` já existente — está correto, mas garantir que `setStage` reflita o estado final corretamente. O fluxo atual já chama `setProcessing(false)` no `finally`. Vou apenas adicionar um pequeno `await tick()` antes do parseFile para garantir que o banner "Processando linhas..." renderize antes do bloqueio do thread por XLSX.read.

### Resultado esperado

- Importação do COOPERAGRO.xlsx deixa de falhar com timeout falso.
- O parser respeita o limite de 25MB / 200k linhas, que já é proteção suficiente para a V1 local.
- Banner de etapa atualiza corretamente.
- Botão volta ao estado normal após sucesso ou erro (já estava OK no `finally`, mantém-se).
- Nenhuma regra do motor, matching, snapshot ERP ou exceções é alterada.

### Arquivos alterados

- `src/lib/importer.ts` — remover 2 chamadas de `withTimeout` e adicionar comentários.
- `src/components/ImportDialog.tsx` — pequeno ajuste de feedback de etapa antes do `parseFile`.

Sem mudanças em store, motor, exporters, exceções ou PRDs.
