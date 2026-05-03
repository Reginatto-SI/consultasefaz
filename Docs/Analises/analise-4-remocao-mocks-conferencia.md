# Análise 4 — Remoção de mocks e validação da conferência real

## 1. Diagnóstico

- **Havia dados mockados?** Sim.
- **Onde estavam?** Em `src/lib/seed.ts`, com seed automático de empresas/notas/ERP fictícios (ex.: Comercial Aurora Ltda, Distribuidora Norte SA, chaves e arquivos `demo_*`).
- **A tela usava dados reais ou mockados?** A tela de conferência (`Index`) carregava os mocks na inicialização via `seedDemoData()`; portanto iniciava com dados fictícios.
- **Cards eram dinâmicos ou fixos?** Dinâmicos. Os cards em `Index.tsx` são calculados a partir de `filtered` (que deriva de `dataset` da store), não são valores hardcoded.

## 2. Arquivos alterados

- `src/pages/Index.tsx`
  - Removido import e execução de `seedDemoData()` no `useEffect` inicial.
  - Motivo: impedir carga automática de dados demo na abertura do app.
- `src/lib/seed.ts`
  - Arquivo removido.
  - Motivo: eliminar a fonte de mocks do projeto para evitar reuso acidental.
- `Docs/Analises/analise-4-remocao-mocks-conferencia.md`
  - Documento desta análise e evidências.

## 3. Ajustes realizados

- **Mocks removidos**
  - Removido o seed automático e o arquivo com dados fictícios.
- **Estado vazio**
  - Mantido o comportamento existente da `ConferenciaView`: quando `pageData.length === 0`, exibe “Sem dados para exibir / Importe arquivos...”.
- **Vínculo com store/motor real**
  - Mantido fluxo existente sem mudança arquitetural:
    - `ingestSefaz` e `ingestErp` atualizam `notas`/`erp` na store.
    - `rerun()` executa `rodarMotor(...)` e atualiza `dataset`.
    - `Conferência` consome `dataset` para tabela e filtros.
- **Cards/tabela usando dataset real**
  - Confirmado: cards (`total`, `ok`, `faltantes`, `irregulares`, `desconsideradas`) são computados do `filtered` derivado do `dataset` real.
  - Tabela também usa `pageData` derivado de `filtered`.

## 4. Pontos não alterados

Confirmado que **não houve**:

- criação de banco;
- nova arquitetura;
- novo store;
- novo motor;
- tela nova.

## 5. Como testar manualmente

1. Abrir o sistema sem importar arquivos.
   - **Esperado:** tela sem notas reais e sem dados fictícios.
2. Importar SEFAZ e RFT006 reais.
   - **Esperado:** tabela exibe apenas notas importadas.
3. Validar cards.
   - **Esperado:** números refletem o dataset real após execução do motor.
4. Recarregar a página.
   - **Esperado:** comportamento conforme persistência local existente, sem reaparecimento de mocks automáticos.
5. Limpar dados (se houver ação existente).
   - **Esperado:** retorno ao estado vazio.

## Critérios de sucesso

- Nenhum dado fictício aparece na tela inicial.
- Cards e tabela vêm do dataset real.
- Importação real altera os resultados exibidos.
- Não existe seed automático de dados demo.
- Sistema continua compilando.
- Nenhuma complexidade nova foi adicionada.
