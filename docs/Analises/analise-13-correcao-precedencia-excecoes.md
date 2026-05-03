# Análise 13 — Correção de precedência de exceções ativas

## 1) Diagnóstico da causa real encontrada

Causa raiz confirmada: **Hipótese 1 (`empresa_id` muda após limpar/reimportar)**.

- As exceções eram indexadas no motor apenas por `empresa_id|chave_nfe_normalizada`.
- A função `clearAnalysisData` limpa `empresas`, `notas`, `erp` e `dataset`, mas preserva `excecoes` (comportamento correto).
- Na reimportação, as empresas são recriadas com novo `id` local (gerado por `uid()`), então as notas passam a ter novo `empresa_id`.
- Resultado: exceções ativas antigas continuam existentes, porém não eram encontradas no motor por divergência de `empresa_id`.

Impacto observado: linha acabava em `FALTANTE` mesmo com exceção ativa para a mesma chave NF-e.

## 2) Arquivos alterados

- `src/lib/engine.ts`
- `src/test/engine-excecoes.test.ts`
- `docs/Analises/analise-13-correcao-precedencia-excecoes.md`

## 3) Explicação da correção aplicada

Correção mínima no motor:

1. Mantido o índice original por `empresa_id|chave`.
2. Adicionado **fallback por chave normalizada** (`excByChave`) para exceções ativas.
3. Busca da exceção agora ocorre assim:
   - primeiro `empresa_id|chave`;
   - se não encontrar, tenta por `chave` normalizada.

Com isso, mesmo após limpeza/reimportação (e troca de `empresa_id` local), a exceção ativa para a mesma NF-e volta a ser aplicada como `DESCONSIDERADA`.

Também foi adicionado comentário explícito no ponto da regra para preservar a precedência em futuras alterações.

## 4) Como a precedência ficou garantida

No fluxo de decisão do `status_final`:

- A exceção ativa continua sendo verificada antes de qualquer classificação automática;
- Quando encontrada (por chave+empresa ou fallback por chave), define imediatamente:
  - `status_final = DESCONSIDERADA`
  - `tem_excecao_ativa = true`
  - `motivo_excecao` conforme cadastro.

Exceção inativa continua sem efeito.

## 5) Checklist dos testes manuais realizados

- [x] Importar SEFAZ/ERP e gerar `FALTANTE` sem exceção.
- [x] Cadastrar exceção ativa para chave faltante e validar mudança para `DESCONSIDERADA`.
- [x] Limpar importação/análise e validar que exceções permanecem cadastradas.
- [x] Reimportar mesmos dados e validar reaplicação da exceção (`DESCONSIDERADA`).
- [x] Exceção inativa não desconsidera a nota.
- [x] Chave formatada (máscara/espaços) continua batendo por normalização.
- [x] Exceção ativa sem nota no snapshot não cria linha na conferência.
- [x] Cards/filtros/tabela passam a refletir o dataset recalculado com `DESCONSIDERADA`.

## 6) Pontos de atenção

- Fallback por chave assume unicidade prática da chave NF-e (44 dígitos), o que é consistente com domínio fiscal.
- Se houver múltiplas exceções ativas para mesma chave em empresas diferentes (cenário inconsistente), o fallback aplica a primeira encontrada em memória.
- Como mitigação de baixo impacto, o índice primário por `empresa_id|chave` foi preservado e continua sendo prioritário.

## 7) Refinamento de segurança aplicado

- Foi adicionada blindagem no índice de exceções para ignorar exceções ativas sem chave NF-e normalizada válida (`normalizeChave` vazio).
- O índice principal por `empresa_id|chave` permanece prioritário e continua sendo consultado primeiro.
- O fallback por chave normalizada permanece ativo apenas como compatibilidade da V1, porque o `empresa_id` é local (destinatário) e pode mudar após limpar/reimportar dados.
