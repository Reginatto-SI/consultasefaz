# Análise 12 — Cadastro real de exceções locais

## 1. Problema corrigido

A tela `ExcecoesView` estava em modo placeholder: o botão **Salvar** não persistia a exceção no estado local. Nesta etapa, o fluxo foi conectado ao store real (`addExcecao`), com validações mínimas e reversão pela própria tela.

## 2. Arquivos alterados

- `src/pages/views/ExcecoesView.tsx`
  - Conexão com `useStore` para `addExcecao` e `reverterExcecao`.
  - Validações obrigatórias de destinatário, chave NF-e e motivo.
  - Normalização simples da chave (apenas dígitos) antes de salvar.
  - Tratamento de duplicidade ativa via retorno booleano de `addExcecao`.
  - Aviso explícito de armazenamento local no navegador.
  - Ação de reversão na tabela para inativar exceções ativas.

## 3. Como ficou o cadastro de exceção

- O modal de `Nova exceção` agora salva exceção real no store local.
- Campos usados no cadastro:
  - `empresa_id`
  - `chave_nfe` (normalizada)
  - `motivo`
  - `observacao` (opcional)
- `ativa` e data seguem o contrato atual já aplicado no store (`addExcecao` cria `ativa: true` e `data_registro`).
- Duplicidade ativa por `empresa_id + chave_nfe` segue bloqueada pela regra existente no store.

## 4. Como ficou a persistência local

- Permanece via `zustand/persist` em `localStorage` (`consultasefaz-store`).
- Exceções criadas na tela de Exceções persistem após refresh por estarem no mesmo store persistido.

## 5. Como ficou a aplicação no motor

- Sem mudança de regra do motor.
- Exceção ativa continua prevalecendo e classificando nota como `DESCONSIDERADA` quando houver match por `empresa_id + chave_nfe`.
- Exceção revertida/inativa continua sem interferência.

## 6. O que não foi implementado de propósito

- Sem banco.
- Sem backend.
- Sem autenticação.
- Sem exportação/importação de exceções nesta etapa.
- Sem alteração no matching/motor.
- Sem migração de contrato para `criada_em`/`atualizada_em` nesta etapa para evitar quebra de compatibilidade com dados já persistidos em `localStorage`.

## 7. Como testar manualmente

1. Abrir **Exceções**.
2. Clicar em **Nova exceção**.
3. Selecionar destinatário, informar chave NF-e e motivo.
4. Salvar e confirmar presença na lista.
5. Atualizar a página e confirmar que a exceção permaneceu.
6. Importar SEFAZ/RFT006 com a mesma chave para o mesmo destinatário.
7. Confirmar classificação `DESCONSIDERADA`.
8. Na lista de exceções, clicar em **Reverter** na exceção ativa.
9. Confirmar que o motor volta a classificação automática após recálculo.
10. Tentar cadastrar novamente a mesma chave ativa para o mesmo destinatário e confirmar bloqueio de duplicidade.

## Critérios de sucesso

- Tela de Exceções salva exceção real.
- Exceção persiste após refresh.
- Exceção ativa gera `DESCONSIDERADA`.
- Exceção inativa não interfere.
- Não há duplicidade ativa por destinatário + chave.
- Usuário é informado de que os dados são locais do navegador.
