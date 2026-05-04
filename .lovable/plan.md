Li os PRDs solicitados e confirmei as regras críticas:

- V1 é 100% local no navegador, sem backend, banco ou autenticação.
- SEFAZ é a base principal; ERP/RFT006 é complementar.
- Matching oficial continua sendo somente `chave_nfe/chave_acesso + IE do emitente`.
- Nunca usar IE do destinatário para matching.
- RFT006 inválido não deve substituir o snapshot ERP vigente nem disparar o motor.
- Logs operacionais precisam registrar erros/avisos claros conforme PRD 06.

Plano de correção mínima e focada:

1. Fortalecer o parser de importação em `src/lib/importer.ts`
   - Adicionar validação inicial de extensão `.xls/.xlsx` antes de ler o arquivo.
   - Adicionar limite operacional seguro de tamanho para processamento local V1.
   - Validar existência de planilha antes de converter para linhas.
   - Envolver leitura/conversão do Excel em proteção com timeout de segurança e erro amigável.
   - Fazer validação rápida do layout antes de percorrer todas as linhas.
   - Para RFT006:
     - validar cabeçalho compatível;
     - confirmar coluna `Z = IE` ou coluna detectável como `IE`;
     - confirmar coluna `AC = Chave de acesso` ou coluna detectável como `Chave de acesso`;
     - bloquear importação com mensagens objetivas quando faltar coluna obrigatória;
     - registrar diagnóstico com nome do arquivo, linhas, cabeçalho encontrado, coluna chave encontrada, coluna IE encontrada, motivo do bloqueio e tempo aproximado.
   - Para SEFAZ:
     - validar campos obrigatórios do PRD 08 nas posições esperadas;
     - confirmar chave de acesso, situação/status, IE do emitente e CNPJ do destinatário no bloco correto;
     - bloquear arquivo incompatível antes do processamento completo.
   - Inserir pequenos `yield`s durante laços grandes para permitir que a UI respire.
   - Manter payload completo e regra oficial de normalização já existente.

2. Corrigir o fluxo do modal em `src/components/ImportDialog.tsx`
   - Substituir o estado booleano simples de `processing` por um status textual de etapa, mantendo também o bloqueio de duplo clique.
   - Exibir mensagens de etapa no modal:
     - “Lendo arquivo...”
     - “Validando layout...”
     - “Processando linhas...”
     - “Atualizando conferência...”
     - “Finalizado com sucesso”
     - “Erro no arquivo”
   - Garantir `try/catch/finally` em toda a cadeia dos botões SEFAZ e RFT006.
   - Garantir que o botão nunca fique preso em “Processando...”.
   - Após erro, permitir fechar, voltar e trocar o arquivo normalmente.
   - Impedir múltiplas importações simultâneas.

3. Proteger snapshot e execução do motor
   - Ajustar o fluxo para chamar `store.ingestErp(...)` somente se o parse RFT006 retornar sucesso e registros elegíveis.
   - Se RFT006 falhar, não chamar `ingestErp`, não limpar `erp`, não rodar `rerun` e não recalcular tudo como FALTANTE.
   - Manter o comportamento SEFAZ atual de substituir somente destinatários impactados quando o lote SEFAZ for válido.
   - Não alterar `rodarMotor` nem a regra de matching, exceto se necessário para comentários de proteção; a regra atual já usa chave + IE do emitente.

4. Melhorar logs operacionais conforme PRD 06
   - Registrar erros bloqueantes com códigos claros, por exemplo:
     - `ERP_LAYOUT_CHAVE_AUSENTE`
     - `ERP_LAYOUT_IE_AUSENTE`
     - `ERP_ARQUIVO_GRANDE`
     - `ERP_SEM_LINHAS_ELEGIVEIS`
     - `SEFAZ_LAYOUT_CHAVE_AUSENTE`
     - `SEFAZ_LAYOUT_INVALIDO`
   - Incluir `contexto_resumido` com:
     - total de linhas detectadas;
     - linha de cabeçalho;
     - índice/nome da coluna chave;
     - índice/nome da coluna IE;
     - tempo aproximado;
     - motivo do bloqueio.
   - Evitar stack trace técnico na interface.

5. Comentários pontuais no código
   - Adicionar comentários curtos apenas nos pontos de proteção contra travamento:
     - limite de arquivo local;
     - timeout/yield;
     - bloqueio de snapshot ERP quando parse falha;
     - validação de layout antes do loop pesado.

6. Validação após implementar
   - Verificar que RFT006 inválido mostra erro e libera o modal.
   - Verificar que arquivo grande demais mostra aviso amigável.
   - Verificar que o botão volta ao estado normal após sucesso ou erro.
   - Verificar que falha no RFT006 não destrói dados SEFAZ nem ERP anterior.
   - Verificar que importação válida continua funcionando.
   - Verificar que matching permanece por chave + IE do emitente.

Arquivos previstos para alteração:

- `src/lib/importer.ts`
- `src/components/ImportDialog.tsx`
- Possivelmente `src/store/useStore.ts` apenas se for necessário reforçar a proteção contra ingestão vazia/inválida, sem alterar o motor.

Não vou criar backend, banco, autenticação, migrations nem refatorar a arquitetura.