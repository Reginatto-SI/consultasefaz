# PRD 09 — ConsultaSefaz — Layout do Relatório RFT006 ERP

## 1. Objetivo
Definir o contrato oficial de interpretação do relatório complementar do ERP (RFT006) para confirmação de escrituração das notas SEFAZ na V1.

## 2. Fonte de verdade
Este documento é a fonte de verdade para layout, mapeamento e validação de entrada do relatório RFT006/ERP.

Referências obrigatórias:
- PRD 00 — semântica de domínio.
- PRD 02 — importação de arquivos.
- PRD 05 — motor de conferência.
- PRD 07 — contrato estrutural.
- PRD 08 — layout oficial de entrada SEFAZ.

## 3. Nome do relatório de origem
- `RFT006 - Relatório de Notas Fiscais`

## 4. Formatos aceitos
Na V1, a importação do relatório RFT006/ERP deve aceitar:
- `.xls`
- `.xlsx`

## 5. Estrutura esperada do relatório RFT006
- Layout tabular com linha de cabeçalho única e linhas de detalhe.
- Pode conter colunas adicionais após o mapeamento base conhecido.
- O campo `Empresa` do relatório ERP é informativo e não define destinatário fiscal SEFAZ.

## 6. Linha de cabeçalho esperada
A linha de cabeçalho deve conter, no mínimo, os títulos necessários para resolução dos campos estruturais obrigatórios da seção 8.

## 7. Mapeamento oficial de colunas (layout base V1)

| Coluna | Nome visível no RFT006 | Campo técnico sugerido | Observação |
|---|---|---|---|
| A | Empresa | rft006_empresa_origem | Campo original do ERP; não deve definir destinatário SEFAZ |
| B | Clifor | clifor | Cliente/fornecedor do ERP |
| C | C.F.O | cfo_descricao | Descrição de CFOP/operação |
| D | Movimentação | movimentacao | Tipo de movimentação |
| G | Emissao | data_emissao_erp | Data de emissão conforme ERP |
| I | Nota | numero_nota_fiscal | Número da nota no ERP |
| J | Espécie | especie | Exemplo: NFE |
| L | C.F.O | cfop | Código CFOP |
| O | Municipio | municipio | Município |
| T | Vl.Total | valor_total | Valor total bruto do item/linha |
| X | Vl.Liq. | valor_liquido | Valor líquido |
| Y | CNPJ | emitente_cnpj_cpf | CNPJ/CPF do emitente/fornecedor no ERP |
| Z | IE | inscricao_estadual_emitente | IE do emitente/fornecedor escriturado |
| AA | Razão Social | emitente_razao_social | Razão social do emitente/fornecedor |
| AB | Série NF. | serie_nota_fiscal | Série da NF |
| AC | Chave de acesso | chave_acesso (fallback) | Fallback legado/informativo; pode representar chave de nota emitida e não deve prevalecer quando existir chave do fornecedor |
| Conforme cabeçalho | Chave de acesso fornecedor | chave_acesso | Chave operacional prioritária para notas fiscais de entrada; aceita variações como `Chave Acesso Fornecedor`, `Chave de Acesso Fornecedor`, `Chave NFe Fornecedor` e `Chave NF-e Fornecedor` |
| AD | Usuáro Lançamento | usuario_lancamento | Usuário que lançou |
| AE | NCM ITEM | ncm_item | NCM do item |
| AF | PIS | pis | Valor ou indicador de PIS |
| AG | COFINS | cofins | Valor ou indicador de COFINS |

Importante:
- Este é o mapeamento base da V1.
- Colunas além de AG podem existir e devem ser preservadas no payload completo.

## 8. Campos obrigatórios absolutos para matching
- `chave_acesso`
- `inscricao_estadual_emitente`
- `payload_completo_erp`

## 9. Campos estruturais recomendados/opcionais
- `emitente_cnpj_cpf`
- `emitente_razao_social`
- `numero_nota_fiscal`
- `data_emissao_erp`
- `cfop`
- `valor_total`
- `valor_liquido`
- `serie_nota_fiscal`
- `usuario_lancamento`
- `ncm_item`
- `pis`
- `cofins`
- `rft006_empresa_origem`
- `clifor`
- `cfo_descricao`
- `movimentacao`
- `especie`
- `municipio`
- Demais colunas não estruturadas do relatório.

## 10. Campos preservados em payload completo
- Todos os campos do relatório de origem devem ser preservados em `payload_completo_erp` (ou estrutura equivalente).
- Campos não mapeados na estrutura mínima não devem ser descartados.

## 11. Regras de normalização
- `chave_acesso`: remover máscara, espaços e caracteres não numéricos a partir da coluna operacional resolvida. Para RFT006 de entrada, priorizar `Chave de acesso fornecedor`; usar `Chave de acesso` apenas como fallback temporário quando a coluna do fornecedor não existir.
- `inscricao_estadual_emitente`: remover máscara e espaços.
- Campos textuais: trim e padronização de caixa conforme PRD 02/07.
- Campos monetários e datas: padronizar para formato interno consumível no pipeline.

## 12. Regras de validação
- Validar presença de `chave_acesso` por linha para elegibilidade de matching.
- Validar presença de `inscricao_estadual_emitente` quando houver `chave_acesso` e intenção de confirmar matching.
- Validar consistência do cabeçalho para mapeamento mínimo da V1.

## 13. Erros bloqueantes
Devem bloquear importação do arquivo RFT006:
- Formato diferente de `.xls` ou `.xlsx`.
- Arquivo vazio.
- Ausência total de coluna mapeável para `chave_acesso` (`Chave de acesso fornecedor` ou fallback `Chave de acesso`).
- Ausência total de coluna mapeável para `inscricao_estadual_emitente`.
- Cabeçalho incompatível que impeça resolução dos campos estruturais mínimos.

## 14. Avisos operacionais
Devem permitir continuidade com registro no PRD 06:
- Linha com `chave_acesso` preenchida e `inscricao_estadual_emitente` ausente não participa do matching; não bloqueia o arquivo inteiro quando as colunas obrigatórias existirem no cabeçalho.
- Linha sem `chave_acesso` não participa do matching; não bloqueia o arquivo inteiro quando as colunas obrigatórias existirem no cabeçalho.
- Linhas inelegíveis devem ser preservadas no payload/registro de importação quando tecnicamente viável.
- Linhas inelegíveis devem gerar aviso operacional quando representarem inconsistência relevante.
- Quando `Chave de acesso fornecedor` e `Chave de acesso` existirem no mesmo arquivo, registrar diagnóstico informando que a chave operacional usada foi a do fornecedor.
- Quando apenas `Chave de acesso` existir, registrar aviso operacional informando fallback temporário por ausência de `Chave de acesso fornecedor`.
- Colunas opcionais ausentes.
- Colunas adicionais preservadas apenas em `payload_completo_erp`.

## 15. Regra oficial de uso da IE do emitente
- `Z = IE` deve ser interpretada como `inscricao_estadual_emitente`.
- Para notas fiscais de entrada, `Chave de acesso fornecedor` deve ser interpretada como `chave_acesso` com prioridade sobre `Chave de acesso`.
- `AC = Chave de acesso` deve ser interpretada como `chave_acesso` somente como fallback temporário quando não existir coluna de chave do fornecedor.
- `chave_acesso` e `inscricao_estadual_emitente` são os campos RFT006 disponibilizados ao motor conforme PRD 05.
- A coluna `IE` pode conter texto operacional de isenção, como `ISENTO`, `ISENTA` ou equivalente; o valor bruto deve ser preservado no payload quando tecnicamente viável, e a normalização/equivalência para matching pertence ao PRD 05.
- Este PRD não define matriz de matching ou classificação; define apenas origem, layout e elegibilidade dos campos RFT006.

## 16. Integração com PRD 02, PRD 05, PRD 06, PRD 07 e PRD 08
- PRD 02: usa este PRD como contrato oficial de parsing do RFT006.
- PRD 05: aplica matching e classificação consumindo campos estruturados, sem interpretar layout bruto.
- PRD 06: registra erros/avisos de importação e elegibilidade de matching.
- PRD 07: formaliza as entidades estruturais de entrada ERP e indicadores do resultado.
- PRD 08: mantém origem do destinatário na SEFAZ e a IE do emitente da SEFAZ para matching.

## 17. Limites da V1
- Não contempla múltiplos layouts RFT006 simultâneos sem versionamento explícito.
- Não aplica heurística para dedução de colunas fora do mapeamento base.
- Mudanças de layout devem ser incorporadas via revisão controlada deste PRD 09 e PRDs dependentes.


## 18. Execução de parsing na V1
- O parsing do layout RFT006/ERP ocorre localmente no navegador.
- O arquivo RFT006/ERP não é enviado para backend na V1.

## 19. Regra de elegibilidade de linha para matching — refinamento vigente

- Linha com chave e IE do emitente preenchida pode confirmar matching por chave + IE.
- Linha com chave e IE ausente é inelegível para confirmar matching por IE.

## 20. Interpretação de linha com chave e IE ausente

- No âmbito deste PRD de layout, linha com chave e IE ausente comprova a presença da chave no RFT006, mas é inelegível para confirmação por IE.
- A classificação resultante desse cenário pertence exclusivamente ao PRD 05.
- Este PRD não deve repetir a matriz de decisão do motor.
