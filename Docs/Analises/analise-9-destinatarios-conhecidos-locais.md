# Análise 9 — Destinatários conhecidos locais

## 1. Problema identificado

A V1 do ConsultaSefaz não possui banco de dados, backend ou autenticação, porém há destinatários recorrentes da operação que precisam ser reconhecidos de forma consistente durante a importação dos relatórios SEFAZ. Sem esse vínculo local por CPF/CNPJ, a interface exibia principalmente razões sociais longas e perdia padronização operacional.

## 2. Solução aplicada

Foi criado um cadastro local fixo de destinatários conhecidos no código-fonte, com chave por CPF/CNPJ normalizado e metadados operacionais (apelido, razão social, perfil, tributação e IE). Durante o fluxo de importação/store, o destinatário é identificado pelo documento e, quando houver correspondência, o sistema passa a usar o apelido como nome principal de exibição, mantendo a razão social oficial disponível.

## 3. Arquivos alterados

- `src/config/destinatariosConhecidos.ts`
- `src/store/useStore.ts`
- `src/lib/types.ts`
- `src/pages/views/DestinatariosView.tsx`
- `Docs/Analises/analise-9-destinatarios-conhecidos-locais.md`

## 4. Como funciona o vínculo

- O relatório SEFAZ fornece o campo `destinatario_cnpj_cpf`.
- O sistema normaliza o documento removendo caracteres não numéricos.
- A store consulta o cadastro local fixo por `cpf_cnpj_normalizado`.
- Se encontrar destinatário conhecido, prioriza `apelido` como nome exibido e usa os demais dados locais (razão social, perfil, tributação e IE).
- Se não encontrar, mantém o comportamento atual com os dados vindos do relatório SEFAZ, sem sobrescrever o payload original.

## 5. O que não foi alterado

- Sem banco de dados.
- Sem backend.
- Sem autenticação.
- Sem seed de notas mockadas.
- Sem alteração no motor de matching.
- Sem alteração no parser SEFAZ/RFT006.

## 6. Como testar manualmente

1. Importar relatório SEFAZ com CNPJ `48.927.637/0001-54`.
   - Esperado: destinatário exibido como `BOAFE`.
2. Importar relatório SEFAZ com CNPJ `36.891.034/0001-60`.
   - Esperado: destinatário exibido como `COAMBE`.
3. Importar relatório SEFAZ com CNPJ não cadastrado.
   - Esperado: sistema usa razão social do relatório.
4. Validar filtro de destinatário.
   - Esperado: usar apelido quando houver.
5. Validar drawer/detalhe.
   - Esperado: apelido pode aparecer como principal, mas razão social completa continua rastreável.

## Critérios de sucesso

- Destinatários conhecidos são reconhecidos por CPF/CNPJ.
- Apelido aparece na interface como nome principal.
- Razão social original continua preservada.
- Não há banco de dados.
- Não há seed de notas fictícias.
- Não há alteração indevida no matching.
- Sistema continua simples e local.
