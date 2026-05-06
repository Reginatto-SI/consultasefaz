# PRD 08 — ConsultaSefaz — Layout do Relatório SEFAZ

## 1. Objetivo
Definir o contrato oficial de interpretação do relatório base da SEFAZ na V1, garantindo leitura determinística mesmo quando houver colunas com nomes repetidos.

## 2. Fonte de verdade deste PRD
Este documento é a fonte de verdade para layout de entrada do relatório SEFAZ e para o mapeamento estrutural inicial da V1.

Referências obrigatórias:
- PRD 00 — semântica oficial dos termos de domínio.
- PRD 02 — regras de importação e parsing.
- PRD 07 — contrato estrutural do pipeline.

## 3. Formatos aceitos
Na V1, o importador SEFAZ deve aceitar exclusivamente:
- `.xls`
- `.xlsx`

## 4. Estrutura esperada do relatório SEFAZ
- O relatório pode conter cabeçalho multinível (grupo superior + nome visível da coluna).
- O relatório pode conter nomes de coluna repetidos em grupos diferentes.
- A posição da coluna no layout faz parte da identificação técnica do campo.
- A estrutura base desta V1 considera o layout conhecido e mapeado na seção 7.

## 5. Regra para colunas com nomes repetidos
É proibido identificar campo SEFAZ apenas pelo nome visível da coluna.

Exemplo crítico:
- `CNPJ/CPF` em `DADOS EMISSOR` representa `emitente_cnpj_cpf`.
- `CNPJ/CPF` em `DADOS DESTINATÁRIO` representa `destinatario_cnpj_cpf`.

## 6. Regra de identificação por grupo + nome + posição
A identificação de cada campo do layout SEFAZ deve usar obrigatoriamente a combinação:
1. Grupo superior da coluna (quando existir).
2. Nome visível da coluna.
3. Posição da coluna no layout (referência alfabética A, B, C...).
4. Semântica oficial do PRD 00.

Se houver conflito entre itens, prevalece a semântica de domínio do PRD 00 aplicada ao grupo correto da coluna.

## 7. Mapeamento oficial dos campos do relatório SEFAZ (layout base V1)

| Coluna | Grupo | Nome visível | Campo técnico sugerido |
|---|---|---|---|
| A | Nota | DATA EMISSÃO | data_emissao |
| C | Nota | NUMERO NOTA FISCAL | numero_nota_fiscal |
| D | Nota | CHAVE DE ACESSO | chave_nfe |
| I | Nota | SITUAÇÃO | status_sefaz |
| J | DADOS EMISSOR | CNPJ/CPF | emitente_cnpj_cpf |
| K | DADOS EMISSOR | NOME/RAZÃO SOCIAL | emitente_razao_social |
| L | DADOS EMISSOR | INSCRIÇÃO ESTADUAL | emitente_inscricao_estadual |
| O | DADOS DESTINATÁRIO | CNPJ/CPF | destinatario_cnpj_cpf |
| P | DADOS DESTINATÁRIO | INSCRIÇÃO ESTADUAL | destinatario_inscricao_estadual |
| Q | DADOS DESTINATÁRIO | NOME/RAZÃO SOCIAL | destinatario_razao_social |
| R | DADOS DESTINATÁRIO | UF | destinatario_uf |
| Y | Valores | VALR TOTAL NOTA FISCAL | valor_total_nota_fiscal |

Importante:
- Este mapeamento é o layout SEFAZ base da V1.
- Este mapeamento não deve ser tratado como layout eterno.
- Divergências futuras devem ser tratadas por evolução controlada de mapeamento, sem quebrar retrocompatibilidade operacional da V1.

## 8. Campos estruturais obrigatórios
Campos mínimos estruturais derivados da importação SEFAZ:
- `chave_nfe`
- `status_sefaz`
- `data_emissao`
- `destinatario_cnpj_cpf`
- `destinatario_razao_social`
- `emitente_cnpj_cpf`
- `emitente_razao_social`
- `emitente_inscricao_estadual` (campo estrutural para matching com RFT006/ERP)
- `valor_total_nota_fiscal` (quando disponível no arquivo)

Regra crítica de destinatário:
- O destinatário fiscal deve ser identificado no bloco `DADOS DESTINATÁRIO`.
- No layout base da V1, `destinatario_cnpj_cpf` é a coluna `O`.
- Nunca usar `CNPJ/CPF` do emitente para identificar destinatário.

## 9. Campos opcionais
São opcionais na estrutura mínima V1, mas devem ser capturados quando presentes:
- `numero_nota_fiscal`
- `destinatario_inscricao_estadual` (informativo na V1; não participa da chave principal de matching com RFT006)
- `destinatario_uf`
- Outros campos adicionais do layout original.

## 10. Campos que devem ir para `payload_completo`
- Todos os campos lidos do relatório SEFAZ, inclusive os não mapeados na estrutura mínima.
- Metadados úteis de leitura (quando aplicável), como grupo e nome original de coluna.
- Valores brutos e valores normalizados podem coexistir, desde que o valor final estruturado permaneça determinístico.

## 11. Regras de normalização
- `chave_nfe`: remover máscara, espaços e caracteres não numéricos.
- `CNPJ/CPF` e `inscricao_estadual`: remover máscara e espaços.
- Campos textuais: aplicar trim de borda e padronização de caixa conforme PRD 02/07.
- Datas e valores: padronizar para formato consumível pelo pipeline estrutural do PRD 07.

## 12. Regras de validação
- Validar presença dos campos estruturais obrigatórios para cada linha válida.
- Validar consistência de identificação de coluna com base em grupo + nome + posição.
- Validar que `destinatario_cnpj_cpf` foi resolvido pelo bloco `DADOS DESTINATÁRIO`.
- Divergências de layout devem gerar erro bloqueante ou aviso operacional conforme seção 13 e 14.

## 13. Erros bloqueantes
Devem bloquear importação do arquivo SEFAZ:
- Formato diferente de `.xls` ou `.xlsx`.
- Impossibilidade de identificar coluna obrigatória por grupo + nome + posição.
- Ausência de `chave_nfe` ou `status_sefaz` estruturável.
- Ambiguidade não resolvida entre colunas repetidas que impeça identificar destinatário corretamente.

## 14. Avisos operacionais
Devem permitir continuidade com registro no PRD 06:
- Campos opcionais ausentes.
- Colunas extras não mapeadas na estrutura mínima, mas preservadas em `payload_completo`.
- Inconsistências pontuais de preenchimento em linhas isoladas, quando não inviabilizarem os campos mínimos estruturais.


## 15. Campos SEFAZ consumidos pelo matching

Este PRD define apenas a origem no layout SEFAZ dos campos que o motor poderá consumir. A regra de matching pertence exclusivamente ao PRD 05.

- `destinatario_cnpj_cpf` vem do bloco `DADOS DESTINATÁRIO` e define pertencimento fiscal da nota conforme PRD 00.
- `emitente_inscricao_estadual` vem do bloco `DADOS EMISSOR` e é campo estrutural disponibilizado ao motor conforme PRD 07.
- `destinatario_inscricao_estadual` é campo informativo na V1.
- O motor não deve reinterpretar layout bruto SEFAZ; deve consumir campos estruturados pela importação.

## 16. Integração com PRD 02, PRD 05, PRD 06 e PRD 07
- PRD 02 deve usar este PRD 08 como contrato oficial de parsing de layout SEFAZ.
- PRD 05 deve consumir apenas campos estruturais resolvidos pela importação, sem reinterpretar layout bruto.
- PRD 06 deve registrar erros/avisos decorrentes de divergência de layout conforme seções 13 e 14.
- PRD 07 deve considerar este PRD 08 como contrato de entrada da entidade Nota SEFAZ e do `payload_completo`.
- PRD 09 define o layout complementar RFT006/ERP usado para confirmação de escrituração.

## 17. Limites da V1
- Não contempla múltiplos layouts SEFAZ ativos simultaneamente sem versionamento explícito.
- Não inclui heurística para adivinhar colunas por similaridade textual.
- Não substitui governança de domínio do PRD 00.
- Evoluções de layout devem ocorrer por revisão controlada deste PRD 08 e alinhamento dos PRDs dependentes.


## 18. Origem e normalização do texto de status SEFAZ
- Este PRD define a origem do campo `status_sefaz` no layout SEFAZ.
- A importação deve entregar valor estruturado/normalizado para consumo do pipeline.
- A interpretação de validade e efeito na classificação pertence ao PRD 05.
- Status textual desconhecido deve gerar aviso operacional conforme PRD 06.


## 19. Execução de parsing na V1
- O parsing do layout SEFAZ ocorre localmente no navegador.
- O arquivo SEFAZ não é enviado para backend na V1.
