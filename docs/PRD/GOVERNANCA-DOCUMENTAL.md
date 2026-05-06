# Governança Documental — ConsultaSefaz

## Objetivo da governança documental

Definir como os PRDs do ConsultaSefaz devem ser mantidos para evitar duplicação, contradição e mistura de responsabilidades entre documentos.

Esta governança existe para garantir que:
- cada assunto tenha uma fonte principal;
- README e análises apontem para PRDs, sem virar fonte paralela de regra;
- futuras mudanças do Codex/Lovable consultem o documento correto;
- regras funcionais, contratos estruturais, layouts e interface evoluam de forma controlada.

## Responsabilidade de cada PRD

| Documento | Responsabilidade principal | Não deve assumir |
|---|---|---|
| README | Visão geral, arquitetura conceitual, fluxo resumido, ordem de leitura/implementação e direcionamento para PRDs. | Algoritmo completo, contratos estruturais completos, tabelas de layout ou matriz detalhada de matching. |
| PRD 00 — Dicionário de Domínio | Nomenclatura, semântica, conceitos, blindagem conceitual e interpretação de termos. | Matching, classificação, layout técnico ou contrato completo de dados. |
| PRD 01 — Regras Globais | Objetivo funcional, escopo, princípios, comportamento macro, limitações e status públicos. | Entidades completas, layouts ou algoritmo do motor. |
| PRD 02 — Importação | Upload, parsing, validação, normalização, snapshot de entrada e erros/avisos de importação. | Matriz de matching/classificação. |
| PRD 03 — Interface | UX/UI, filtros, badges, drawers, estados de tela e comportamento visual. | Semântica do algoritmo ou contrato estrutural completo. |
| PRD 04 — Exceções | Precedência, criação, ativação/inativação, backup/importação/exportação e compatibilidade local das exceções. | Matriz de classificação automática. |
| PRD 05 — Motor de Conferência | Matching, algoritmo, classificação, matriz de decisão, determinismo, `resultado_matching`, `motivo_divergencia`, `Verificar IE` e status final. | Layout bruto de arquivos ou definição completa de entidades. |
| PRD 06 — Logs | Categorias, mensagens, avisos, erros, retenção curta e exibição operacional de logs. | Reclassificar notas ou substituir o motor. |
| PRD 07 — Contrato de Dados | Entidades, campos, tipos, pipeline estrutural, dataset final, payloads e snapshots. | Semântica/matriz completa do algoritmo de matching. |
| PRD 08 — Layout SEFAZ | Layout, colunas, mapeamentos e origem dos campos SEFAZ. | Matching/classificação completa. |
| PRD 09 — Layout RFT006 ERP | Layout, colunas, mapeamentos, elegibilidade e origem dos campos RFT006. | Matriz de classificação completa. |
| Governança Documental | Responsabilidades, precedência, fonte única por assunto e regras de manutenção documental. | Regra funcional nova do produto. |

## Fonte única por assunto

| Assunto | Fonte principal | Documentos que podem referenciar |
|---|---|---|
| Nomenclatura e semântica | PRD 00 | Todos |
| Status públicos | PRD 01 | README, PRD 03, PRD 05, PRD 07 |
| Status interno `IGNORADA` | PRD 01 e PRD 05 | PRD 03, PRD 07, PRD 06 |
| Importação/parsing/snapshot de entrada | PRD 02 | PRD 07, PRD 08, PRD 09 |
| UX/UI, badges e drawers | PRD 03 | README, PRD 05, PRD 07 |
| Exceções | PRD 04 | PRD 05, PRD 07, PRD 03 |
| Matching e classificação | PRD 05 | README, PRD 01, PRD 03, PRD 07, PRD 08, PRD 09 |
| `resultado_matching` e `motivo_divergencia` | PRD 05 | PRD 03 e PRD 07 para exibição/contrato de campo |
| Logs operacionais | PRD 06 | PRD 02, PRD 03, PRD 05, PRD 09 |
| Entidades, campos e dataset final | PRD 07 | Todos os PRDs que consomem contrato |
| Layout SEFAZ | PRD 08 | PRD 02, PRD 07, PRD 05 |
| Layout RFT006/ERP | PRD 09 | PRD 02, PRD 07, PRD 05 |
| Persistência corporativa fora da V1 | PRD 01 para escopo; PRD 07 para contrato estrutural | README e análises |

## Ordem de precedência

1. Instruções explícitas da tarefa atual.
2. Esta governança documental para responsabilidade e manutenção.
3. PRD 00 para semântica e nomenclatura.
4. PRD 01 para regras globais e status públicos.
5. PRD 07 para contratos estruturais.
6. PRD específico do tema:
   - PRD 02 para importação;
   - PRD 03 para interface;
   - PRD 04 para exceções;
   - PRD 05 para motor;
   - PRD 06 para logs;
   - PRD 08 para layout SEFAZ;
   - PRD 09 para layout RFT006.
7. Análises em `docs/Analises/` como histórico/diagnóstico, não como fonte superior aos PRDs.

## Como evitar duplicação futura

- Antes de adicionar regra a um PRD, identificar a fonte principal do assunto nesta governança.
- Se o assunto pertencer a outro PRD, adicionar apenas referência explícita.
- Não copiar matriz de matching fora do PRD 05.
- Não copiar lista completa de entidades fora do PRD 07.
- Não copiar mapeamentos de layout fora do PRD 08/09.
- Não transformar o README em “super PRD”.
- Preferir frases como “conforme PRD 05” quando a regra já existir em fonte principal.
- Ao encontrar conflito, registrar análise antes de mudar regra funcional.

## Como referenciar outros PRDs

Referências devem indicar o motivo da dependência:

- “Matching conforme PRD 05”.
- “Campos estruturais conforme PRD 07”.
- “Layout SEFAZ conforme PRD 08”.
- “Elegibilidade RFT006 conforme PRD 09”.
- “Exceções conforme PRD 04”.
- “Status públicos conforme PRD 01”.
- “Nomenclatura conforme PRD 00”.

Evitar referências genéricas como “ver PRD” sem indicar assunto.

## Convenções obrigatórias

- Caminho oficial dos PRDs: `docs/PRD/`.
- Caminho oficial das análises novas: `docs/Analises/`.
- Não criar `/PRD`, `public/PRD` ou `Docs/PRD`.
- PRDs devem usar Markdown (`.md`).
- PRDs numerados devem manter prefixo `PRD-NN-*`.
- Documento de governança não cria regra funcional nova; ele organiza responsabilidades.

## Regras de nomenclatura

- Usar “Destinatário” ou “Destinatário SEFAZ” na UI e documentação operacional.
- Interpretar `empresa_id` como legado técnico/local do destinatário fiscal na V1.
- Não interpretar `empresa_id` como tenant, organização, usuário ou chave de segurança.
- Usar “ERP/RFT006” como fonte complementar de confirmação, nunca como fonte de pertencimento da nota.
- Usar “SEFAZ” como fonte de verdade do universo de notas.

## Regras para novas análises/documentações

Toda nova análise deve conter:
- PRDs consultados;
- fonte principal do assunto analisado;
- divergências encontradas, se houver;
- decisão documental ou funcional tomada;
- riscos e dúvidas pendentes quando aplicável.

Análises não devem:
- criar regra permanente sem atualizar o PRD responsável;
- duplicar contratos completos sem necessidade;
- substituir o PRD como fonte oficial.

## Regras para Codex/Lovable

- Ler esta governança antes de alterar README ou PRDs.
- Ler PRD 00, PRD 01 e PRD 07 antes de alterações de domínio/contrato.
- Para matching, IE, classificação, `Verificar IE`, `resultado_matching` e `motivo_divergencia`, alterar somente o PRD 05 como fonte principal e referenciar nos demais.
- Para layout, alterar PRD 08/09 e apenas referenciar em importação/motor/contrato.
- Para UI, alterar PRD 03 sem redefinir algoritmo.
- Para logs, alterar PRD 06 sem redefinir classificação.
- Não introduzir backend, banco, autenticação, status novo ou regra funcional fora do PRD responsável.
- Se houver dúvida, criar análise em `docs/Analises/` antes de mudar regra de negócio.
