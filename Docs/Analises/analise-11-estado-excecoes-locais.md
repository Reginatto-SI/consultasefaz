# Análise 11 — Estado atual das exceções operacionais locais

## 1. Resumo executivo

- **Já existe tela de exceções?** Sim, existe a view `ExcecoesView` com cards-resumo, listagem e modal visual.
- **Já grava localmente?** Sim, o estado global usa `zustand` com `persist` em `localStorage` (`name: consultasefaz-store`), e a coleção `excecoes` faz parte do store persistido.
- **Já persiste após refresh?** Sim para exceções que entram no store (ex.: via `DetailDrawer` -> `addExcecao`).
- **Já aplica no motor?** Sim. O motor indexa exceções ativas por `empresa_id + chave_nfe` e força `status_final = DESCONSIDERADA`.
- **Está pronto para V1 ou precisa ajuste?** **Parcialmente pronto**. O núcleo (store + motor + persistência) está implementado, porém a tela de Exceções ainda está em modo placeholder e não cadastra exceção de fato por ela. Também não há exportação/importação de exceções.

## 2. Arquivos analisados

- `src/pages/views/ExcecoesView.tsx`
  - Implementa UI de exceções (resumo, tabela e modal), mas o `Salvar` não chama store; mostra toast de etapa futura.
- `src/components/DetailDrawer.tsx`
  - Fluxo funcional de desconsideração: cria exceção ativa (`addExcecao`) e permite reversão (`reverterExcecao`).
- `src/store/useStore.ts`
  - Define estado `excecoes`, ações `addExcecao/reverterExcecao`, `rerun` do motor e persistência local com `persist`.
- `src/lib/engine.ts`
  - Aplica exceções ativas antes da classificação final e define `DESCONSIDERADA` quando há correspondência ativa.
- `src/lib/types.ts`
  - Contrato tipado de `Excecao` e `StatusFinal`.
- `src/pages/Index.tsx`
  - Liga navegação para a tela de Exceções e injeta dados do store na view.

## 3. O que já está funcionando

1. **Tela/listagem de exceções existe** (com contadores e tabela).
2. **Persistência local no navegador existe** via `zustand/persist`.
3. **Manutenção após refresh existe** para dados já persistidos no store.
4. **Aplicação no motor existe** e ocorre por chave normalizada + destinatário.
5. **Exceção ativa força `DESCONSIDERADA`** (prevalece sobre classificação normal).
6. **Exceção inativa não interfere** (motor ignora `ativa=false`).
7. **Inativação/reversão local existe** (`reverterExcecao`).
8. **Sem dependência obrigatória de backend/banco para exceções** no fluxo analisado.
9. **Proteção contra duplicidade de exceção ativa por destinatário+chave** no `addExcecao`.

## 4. O que está parcialmente funcionando

1. **Cadastro de nova exceção pela tela de Exceções (`ExcecoesView`)**
   - UI existe, campos existem, mas persistência não ocorre: `handleSave` é placeholder com toast.
2. **Campos mínimos vs contrato esperado no enunciado**
   - Existem `chave_nfe`, `motivo`, `observacao`, `ativa`.
   - Datas existem com nomenclatura diferente: `data_registro` (não há `criada_em` e `atualizada_em`).
   - Não há atualização de timestamp em reversão (logo não há equivalente de `atualizada_em`).
3. **Exclusão local de exceção**
   - Não existe exclusão física; existe apenas reversão/inativação.
4. **Indicação visual de localidade no navegador**
   - Não há sinalização explícita na tela de Exceções de que o dado é local e pode ser perdido ao limpar storage.

## 5. O que está faltando para V1

### Obrigatório

1. **Conectar o botão Salvar da `ExcecoesView` ao store (`addExcecao`)** para permitir cadastro real por essa tela.
2. **Definir/alinhar contrato de datas da exceção para V1**
   - Ou ajustar expectativa para `data_registro`,
   - ou adicionar `criada_em`/`atualizada_em` conforme regra final aprovada.
3. **Adicionar indicação textual explícita de armazenamento local** (e risco de perda ao limpar navegador).
4. **Validar fluxo fim-a-fim pedido nos critérios** (cadastro -> refresh -> importações -> rerun -> DESCONSIDERADA -> inativar -> retorno ao motor).

### Pode ficar para depois

1. **Exportação/importação de exceções** para backup manual (não encontrado no código atual).
2. **Exclusão física de exceção** (se a regra aceitar apenas inativação, pode não ser obrigatório agora).

## 6. Riscos

1. **Perda de dados locais**
   - Como o armazenamento é local (`localStorage`), limpeza de dados do navegador remove exceções.
2. **Exceção não aplicar no motor**
   - Risco baixo no código atual, desde que a exceção entre no store corretamente.
   - Principal risco prático hoje: cadastro pela `ExcecoesView` não persiste, logo usuário pode achar que cadastrou mas não aplicou.
3. **Exceção aplicar indevidamente**
   - Critério de chave considera `empresa_id + chave_nfe`; reduz risco de colisão entre destinatários.
4. **Duplicidade de chave**
   - Há bloqueio para duplicidade ativa por `empresa_id + chave`; não há bloqueio para histórico inativo (o que pode ser aceitável).
5. **Falta de backup**
   - Sem exportação/importação, recuperação depende do próprio `localStorage` do navegador.

## 7. Recomendação de próximo passo

**Recomendação: fazer microajuste + teste dirigido.**

- Microajuste: conectar `ExcecoesView` ao `addExcecao` real e mensagem clara de armazenamento local.
- Em seguida, executar teste funcional manual dos 6 critérios de avaliação.
- Exportação/importação pode entrar como incremento logo após estabilizar o fluxo mínimo.

## 8. Perguntas em aberto

1. O contrato oficial para V1 deve manter `data_registro` ou migrar para `criada_em` e `atualizada_em`?
2. “Exclusão” no requisito significa exclusão física ou inativação já atende?
3. Cadastro de exceção deve obrigar vínculo com destinatário (`empresa_id`) ou aceitar chave global?
4. Exportação/importação de exceções é requisito de aceite da V1 ou apenas desejável?

---

## Verificação objetiva dos critérios de avaliação solicitados

1. **Cadastrar uma chave de exceção**
   - **Parcial**: hoje funciona pelo `DetailDrawer`, não pela tela `ExcecoesView`.
2. **Atualizar a página e manter a exceção**
   - **Atende** para exceções gravadas no store persistido.
3. **Importar SEFAZ/RFT006**
   - **Atende** (fluxo existente no app).
4. **Recalcular motor**
   - **Atende** (`rerun` é chamado após importações e após add/reverter exceção).
5. **Marcar nota como `DESCONSIDERADA`**
   - **Atende** quando houver exceção ativa correspondente.
6. **Inativar exceção e voltar classificação automática**
   - **Atende** via `reverterExcecao` + `rerun`.
