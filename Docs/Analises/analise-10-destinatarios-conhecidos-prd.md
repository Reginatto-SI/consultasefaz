# Análise 10 — Destinatários conhecidos locais nos PRDs

## 1. Decisão tomada
A V1 permanece client-side, sem banco, sem backend e sem autenticação. Além dos destinatários derivados da SEFAZ, foi documentado um cadastro local fixo de destinatários conhecidos para enriquecimento operacional da exibição (apelido), sem alterar a fonte de verdade da nota.

## 2. PRDs alterados
Foram ajustados PRD 00, PRD 01, PRD 03, PRD 07 e README para refletir o uso de destinatários conhecidos locais com vínculo por CPF/CNPJ normalizado.

## 3. Como funciona o cadastro local conhecido
- É um registro fixo no código da V1.
- Não é banco de dados, não é cadastro corporativo e não é mock.
- Pode conter apelido, razão social, CPF/CNPJ, IE, perfil e tributação.
- Serve apenas para enriquecer a exibição quando há correspondência com CPF/CNPJ do destinatário da SEFAZ.

## 4. Como a UI deve usar apelido
- Quando houver correspondência no cadastro local conhecido, mostrar apelido como nome principal.
- Quando não houver, usar razão social da SEFAZ como nome principal.
- Filtros de destinatário devem priorizar apelido quando disponível.
- Drawer/detalhe deve preservar a razão social original da SEFAZ.

## 5. O que não muda
- SEFAZ continua fonte de verdade da nota e do destinatário fiscal.
- Continua sem banco de dados, sem backend e sem autenticação na V1.
- Continua sem CRUD completo de destinatários.
- Continua sem alteração na regra de matching (chave + IE emitente).
- Continua sem alteração na regra de exceções.

## Commit sugerido
`docs: documentar destinatarios conhecidos locais`
