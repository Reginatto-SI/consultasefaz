# Análise 8 — Destinatários automáticos e exceções locais

## 1. Decisão tomada
A V1 do ConsultaSefaz permanece estritamente client-side, sem banco de dados, sem backend e sem autenticação. Destinatários deixam de ser tratados como cadastro corporativo e passam a ser identificados automaticamente a partir dos arquivos SEFAZ importados, usando `destinatario_cnpj_cpf` e `destinatario_razao_social`. Exceções continuam existindo como regra de negócio prioritária, porém com persistência local no navegador e possibilidade de exportação/importação para backup manual.

## 2. PRDs alterados
Foram ajustados os PRDs 00, 01, 03, 04, 05 e 07 para refletir o comportamento local da V1 sem banco, além do README para alinhar a visão de produto e arquitetura.

## 3. Como ficam destinatários na V1
- Não há cadastro manual corporativo de destinatários na V1.
- Destinatários são derivados automaticamente dos dados SEFAZ importados.
- A tela de destinatários é de consulta/listagem local, com foco em CNPJ/CPF, razão social, quantidade de notas e última importação local quando disponível.
- `empresa_id` segue apenas como identificador técnico local, sem semântica de tenant.

## 4. Como ficam exceções na V1
- Exceções são objetos locais salvos no navegador.
- Campos mínimos definidos: `chave_nfe`, `motivo`, `observacao`, `ativa`, `criada_em`, `atualizada_em` (além de identificadores locais necessários ao contrato).
- Exceção ativa prevalece sobre classificação automática e força status `DESCONSIDERADA`.
- Exceção inativa não altera o resultado do motor.
- UI deve permitir cadastrar, ativar/inativar, excluir localmente, exportar e importar exceções.
- Exportação/importação funciona como mecanismo oficial de backup manual.

## 5. Limitações da abordagem sem banco
- Não há persistência corporativa central.
- Não há auditoria por usuário autenticado.
- Limpeza de dados do navegador pode apagar exceções locais.
- Compartilhamento entre máquinas depende de exportar/importar arquivos manualmente.

## 6. Como evoluir futuramente, se necessário
- Introduzir backend e banco em V2+ para persistência corporativa controlada.
- Separar formalmente `tenant_id` de `destinatario_id` mantendo blindagem do domínio.
- Adicionar autenticação e trilha de auditoria por usuário quando houver requisito de governança.
- Evoluir mecanismo de sincronização de exceções preservando compatibilidade com o comportamento local da V1.

## Commit sugerido
`docs: ajustar destinatarios e excecoes para v1 local`
