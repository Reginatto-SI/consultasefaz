# Análise 3 — Governança documental, desduplicação e fonte única por assunto

## Duplicações encontradas

- O README repetia regras de matching, tratamento de exceções, logs e persistência local em nível próximo de PRD, tornando-se uma fonte paralela de regra.
- PRD 01 citava princípios globais e também continha observação de matching apontando para contrato estrutural, quando matching deve pertencer ao PRD 05.
- PRD 02 detalhava campos e elegibilidade RFT006 em nível que misturava importação com interpretação do motor.
- PRD 03 repetia diretamente condições de `resultado_matching`/`motivo_divergencia` para exibir `Verificar IE`, aproximando UI de regra de algoritmo.
- PRD 04 repetia uma ordem de decisão que entrava em validade SEFAZ e matching, assuntos do PRD 05.
- PRD 07 continha uma seção completa de regra oficial de matching, duplicando o PRD 05.
- PRD 07 também listava valores de `motivo_divergencia` como contrato sem separar claramente campo estrutural de semântica do algoritmo.
- PRD 08 tinha seção “Regra oficial de matching com RFT006/ERP”, misturando layout SEFAZ com algoritmo.
- PRD 09 declarava consequência de classificação para chave com IE ausente, misturando layout/elegibilidade com matriz do motor.

## PRDs com overlap

- **README x PRD 01/04/05/06/07**: visão geral estava repetindo regras que pertencem aos PRDs.
- **PRD 01 x PRD 05**: status públicos e observação de matching precisavam separar escopo global de matriz do motor.
- **PRD 02 x PRD 07/08/09/05**: importação precisava referenciar campos e layouts sem copiar contratos ou interpretar classificação.
- **PRD 03 x PRD 05/07**: UI precisava exibir indicadores sem redefinir semântica de matching.
- **PRD 04 x PRD 05**: exceção precisava manter apenas precedência e devolver classificação automática ao motor.
- **PRD 07 x PRD 05**: contrato de dados duplicava matching e motivos de divergência.
- **PRD 08 x PRD 05**: layout SEFAZ repetia regra de matching.
- **PRD 09 x PRD 05**: layout RFT006 repetia consequência de classificação para IE ausente.

## Ajustes realizados

- README foi reduzido para visão geral, arquitetura conceitual, fluxo resumido, governança, ordem de leitura/implementação, limites e direcionamento aos PRDs.
- Criado `docs/PRD/GOVERNANCA-DOCUMENTAL.md` com responsabilidade de cada PRD, fonte única por assunto, precedência, referências e regras para Codex/Lovable.
- PRD 00 foi ajustado para focar em nomenclatura, semântica, conceitos, blindagem e distinção entre tenant, destinatário, emitente, empresa, ERP, SEFAZ, snapshot, exceção e status.
- PRD 01 foi ajustado para concentrar visão funcional, escopo, princípios globais e status públicos, com blindagem explícita de `IGNORADA`.
- PRD 02 passou a referenciar PRD 07/08/09/05 para campos, layout, elegibilidade e classificação, mantendo foco em importação/snapshot.
- PRD 03 passou a definir apresentação visual e mensagens de UI, referenciando PRD 05 para semântica de matching e PRD 07 para campos do dataset.
- PRD 04 passou a explicitar apenas a precedência da exceção e referenciar PRD 05 para a classificação automática.
- PRD 05 foi consolidado como fonte única de matching, classificação, matriz de decisão, `resultado_matching`, `motivo_divergencia`, `Verificar IE` e `IGNORADA` interno.
- PRD 06 foi ajustado para reforçar que logs não reclassificam notas e não substituem PRD 05/07.
- PRD 07 foi reestruturado como contrato de dados/pipeline sem repetir matriz de matching.
- PRD 08 passou a declarar apenas a origem dos campos SEFAZ consumidos pelo motor, referenciando PRD 05 para matching.
- PRD 09 passou a manter layout/elegibilidade RFT006 e referenciar PRD 05 para classificação decorrente.

## Assuntos centralizados

| Assunto | Fonte central definida |
|---|---|
| Nomenclatura e semântica | PRD 00 |
| Status públicos | PRD 01 |
| Blindagem de `IGNORADA` | PRD 01 e PRD 05 |
| Importação e snapshot de entrada | PRD 02 |
| UI, badges e drawers | PRD 03 |
| Exceções | PRD 04 |
| Matching, IE, classificação e `Verificar IE` | PRD 05 |
| Logs operacionais | PRD 06 |
| Entidades, campos, tipos, payloads e dataset | PRD 07 |
| Layout SEFAZ | PRD 08 |
| Layout RFT006/ERP e elegibilidade | PRD 09 |
| Governança documental | `docs/PRD/GOVERNANCA-DOCUMENTAL.md` |

## Regras movidas para referência

- README deixou de detalhar a regra de matching e passou a apontar para PRD 05.
- README deixou de detalhar tratamento de exceções/logs/persistência e passou a apontar para PRD 04/06/07.
- PRD 02 deixou de explicar impacto de linhas RFT006 inelegíveis na classificação e passou a referenciar PRD 05.
- PRD 03 deixou de definir semântica de `resultado_matching`/`motivo_divergencia` e passou a referenciar PRD 05.
- PRD 04 deixou de repetir etapas de validade SEFAZ/matching e passou a referenciar PRD 05.
- PRD 07 removeu a matriz de matching e passou a manter apenas campos estruturais e referência semântica ao PRD 05.
- PRD 08 removeu regra de matching e passou a manter apenas origem dos campos SEFAZ consumidos pelo motor.
- PRD 09 removeu consequência de classificação completa e passou a manter apenas elegibilidade/layout, referenciando PRD 05.

## Estrutura final de governança

- `README.md`: visão governamental do projeto e ponte para PRDs.
- `docs/PRD/GOVERNANCA-DOCUMENTAL.md`: matriz oficial de responsabilidade documental.
- `docs/PRD/PRD-00-*` a `PRD-09-*`: fontes principais por assunto.
- `docs/Analises/`: histórico de diagnósticos e decisões, sem substituir PRDs.

Ordem de precedência documental final:
1. Instruções explícitas da tarefa atual.
2. Governança documental.
3. PRD 00.
4. PRD 01.
5. PRD 07.
6. PRD específico do assunto.
7. Análises como histórico/diagnóstico.

## Riscos restantes

- Ainda existem termos técnicos legados (`empresa_id`, `Empresa`) por compatibilidade da V1; a mitigação é manter PRD 00 como fonte semântica obrigatória.
- `IGNORADA` aparece como resultado interno necessário ao motor; a mitigação é a blindagem explícita no PRD 01 e PRD 05.
- Regras de IE são sensíveis e podem voltar a ser copiadas para PRDs de layout/UI; a mitigação é a governança exigir referência ao PRD 05.
- Análises antigas podem conter histórico com caminhos ou interpretações anteriores; a mitigação é tratá-las como histórico, não como fonte superior aos PRDs.

## Dúvidas pendentes

- Se a pasta histórica `Docs/Analises/` deve ser migrada em tarefa futura para eliminar a última duplicidade de caixa fora dos PRDs.
- Se a V2 adotará migração técnica formal de `empresa_id` para `destinatario_id`.
- Se haverá versionamento explícito de múltiplos layouts SEFAZ/RFT006 no futuro.
- Se exportações futuras deverão separar exportação operacional padrão de auditoria técnica de resultados internos.
