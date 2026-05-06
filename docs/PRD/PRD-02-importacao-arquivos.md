# PRD 02 — ConsultaSefaz — Importação de Arquivos

## 1. Objetivo
Definir a importação de arquivos SEFAZ e ERP com baixa fricção e consistência para o motor de conferência.

## 2. Fonte de verdade deste PRD
Este documento é a fonte de verdade de upload, parsing, validação de arquivo e snapshot de entrada.

Referências obrigatórias de layout:
- PRD 08 — Layout do Relatório SEFAZ.
- PRD 09 — Layout do Relatório RFT006 ERP.

## 3. Entradas suportadas (V1)
- SEFAZ: arquivos `.xls` e `.xlsx`
- ERP: Excel `.xlsx` e `.xls`
- Upload múltiplo por lote
- Tipos: SEFAZ e ERP

## 4. Regras obrigatórias
- Detectar cabeçalho automaticamente, com ajuste manual quando necessário.
- Para SEFAZ, identificar colunas obrigatórias conforme PRD 08 (grupo + nome visível + posição).
- Não depender apenas do nome visível da coluna em arquivos SEFAZ.
- Tratar corretamente cabeçalhos SEFAZ com nomes repetidos em grupos distintos.
- Processar arquivos de forma independente no lote.
- Falha de um arquivo não deve bloquear os demais.
- Ao finalizar lote válido, disparar conferência automática (PRD 05).

## 5. Campos mínimos por tipo
A importação deve entregar ao pipeline os campos estruturais mínimos definidos no PRD 07, respeitando a origem e os mapeamentos de layout do PRD 08 (SEFAZ) e do PRD 09 (RFT006/ERP).

Diretrizes de importação:
- Campos SEFAZ devem ser resolvidos a partir do layout oficial do PRD 08.
- Campos RFT006/ERP devem ser resolvidos a partir do layout oficial do PRD 09.
- A elegibilidade de linhas RFT006 com chave/IE ausente pertence ao PRD 09.
- A interpretação do impacto dessas linhas na classificação pertence exclusivamente ao PRD 05.

## 6. Normalização obrigatória
- chave_nfe sem máscara e sem espaços.
- CNPJ/CPF e IE sem máscara.
- textos com trim e padronização de caixa.

## 7. Snapshot
- SEFAZ: identificar os destinatários presentes no próprio arquivo importado por `destinatario_cnpj_cpf` e substituir apenas as notas desses destinatários impactados.
- Destinatários não presentes no arquivo importado não devem ter seus dados SEFAZ apagados.
- ERP: substitui globalmente a base ERP/RFT006 vigente.
- Exceções não são apagadas pelo snapshot (PRD 04).

## 8. Erros e avisos
Erros bloqueantes por arquivo: formato inválido, arquivo vazio, ausência de chave, cabeçalho inválido.
Avisos: linhas RFT006 inelegíveis para matching (ex.: chave sem IE do emitente), linhas descartadas por inconsistência relevante.

Mensagens e histórico curto seguem PRD 06.

## 9. Conexão com outros PRDs
- PRD 01: princípios globais e escopo V1.
- PRD 05: consumo das entradas estruturadas pelo motor, sem repetir regras de matching neste PRD.
- PRD 06: exibição de feedback operacional.
- PRD 07: contrato de dados mínimo.
- PRD 08: contrato oficial de layout e mapeamento da entrada SEFAZ.
- PRD 09: contrato oficial de layout e mapeamento da entrada RFT006/ERP.

Regras adicionais obrigatórias:
- Todos os dados lidos do relatório SEFAZ devem ser preservados em `payload_completo`, mesmo quando não fizerem parte dos campos estruturais mínimos.
- Todos os dados lidos do relatório RFT006 devem ser preservados em `payload_completo_erp` (ou estrutura equivalente), mesmo quando não fizerem parte dos campos estruturais mínimos.


## 10. Regras de execução local (V1)
- A importação ocorre no navegador (client-side).
- Os arquivos são lidos localmente na máquina do usuário.
- Não há upload para servidor na V1.
- O snapshot de entrada é local, em memória e/ou armazenamento local do navegador.
- O snapshot SEFAZ substitui localmente as notas dos destinatários impactados.
- O snapshot ERP/RFT006 substitui localmente a base complementar vigente.
- Ao limpar dados locais ou reiniciar conforme estratégia local, o usuário deve importar novamente.
- Exportação é recomendada como meio oficial para guardar o resultado final da conferência.
