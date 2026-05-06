# Análise 1 — Importação RFT006, quota de localStorage e mensagens operacionais

## 1. Diagnóstico técnico

### PRDs consultados

Os arquivos solicitados em `public/PRD` não existem neste repositório. Foram usados os PRDs equivalentes disponíveis em `docs/PRD`:

- `docs/PRD/PRD-05-motor-conferencia.md`
- `docs/PRD/PRD-06-logs-erros-operacionais.md`
- `docs/PRD/PRD-07-contrato-dados-pipeline.md`
- `docs/PRD/PRD-09-layout-relatorio-rft006-erp.md`
- `docs/PRD/PRD-03-interface-experiencia-usuario.md`

PRDs solicitados e não encontrados:

- `public/PRD/PRD 00 — ConsultaSefaz — Dicionário de Domínio.txt`
- `public/PRD/PRD 02 — ConsultaSefaz — Módulo de Importação de Arquivos.txt`
- `public/PRD/PRD 05 — ConsultaSefaz — Motor de Conferência.txt`
- `public/PRD/PRD 06 — ConsultaSefaz — Logs de Erros Operacionais.txt`
- `public/PRD/PRD 07 — ConsultaSefaz — Contrato de Dados e Pipeline Estrutural.txt`
- `public/PRD/PRD 09 — ConsultaSefaz — Layout do Relatório RFT006 ERP.txt`

### Onde o estado `consultasefaz-store` é persistido

A persistência ocorre no store Zustand `src/store/useStore.ts`, por meio do middleware `persist`, usando a chave `consultasefaz-store`.

Antes da correção, o middleware não tinha `partialize`, portanto todo o estado serializável era gravado no `localStorage` a cada `set`.

### Quais partes do estado eram gravadas no localStorage

Antes da correção, eram persistidos integralmente:

- `empresas`;
- `notas` SEFAZ;
- `erp` RFT006/ERP;
- `excecoes`;
- `logs`;
- `dataset` completo da conferência;
- `ultimaExecucao`.

Isso incluía também os payloads pesados:

- `payload_completo` em cada nota SEFAZ;
- `payload_completo_erp` em cada registro RFT006/ERP;
- `payload_completo_drawer` dentro do dataset final.

### Registros SEFAZ, ERP, payloads e logs

Foi confirmado que os registros SEFAZ e ERP são montados no parser com payload bruto da linha inteira. Em seguida, o store salva esses arrays no estado. Como o `persist` gravava todo o estado, esses dados eram serializados no `localStorage`.

Em lotes RFT006 com múltiplos arquivos, o volume de `erp`, `notas`, `dataset` e payloads pode ultrapassar rapidamente o limite do navegador para `localStorage`.

### `addLog` e crescimento dos logs

`addLog` já limitava a lista a 200 itens, mas:

- cada `set` de log também disparava persistência do estado completo;
- os logs podiam repetir o mesmo erro por arquivo/lote;
- o limite de 200 ainda era alto para uma persistência curta de V1;
- uma falha de persistência durante `addLog` podia mascarar o erro real de importação.

Não foi identificado loop lógico explícito em `addLog`, mas a combinação de muitos `set`s + persistência completa aumentava o risco de falha por quota e mensagens genéricas.

### Mensagem “Erro no arquivo”

A mensagem genérica era usada como estado visual do modal em falhas totais e exceções inesperadas. Com o erro do navegador `QuotaExceededError`, a importação podia cair no fluxo genérico mesmo quando o arquivo RFT006 era estruturalmente válido.

Assim, o sintoma “Erro no arquivo” podia ser causado por falha ao persistir o estado, não necessariamente por falha real de parsing.

### Validação RFT006 conforme PRD 09

O importador já aceitava `.xls` e `.xlsx` e lia, por posição, os campos técnicos principais:

- `AC` / índice 28 para `chave_acesso`;
- `Z` / índice 25 para `inscricao_estadual_emitente`;
- `payload_completo_erp` com a linha original.

Ponto encontrado: a validação aceitava o arquivo apenas pela quantidade de colunas (`headers.length > índice`) ou por qualquer cabeçalho com nome compatível, sem garantir que o cabeçalho real da coluna esperada estivesse presente. Isso podia aceitar cabeçalho deslocado e dificultar a mensagem clara quando o arquivo estava incompatível.

### Arquivos válidos rejeitados

Não foi encontrada rejeição por extensão para `.xls`/`.xlsx`; ambas já eram aceitas. O risco maior era:

- erro de quota após parse válido;
- cabeçalho incompatível exibido como erro genérico;
- linha sem chave ou chave sem IE virar ruído operacional sem resumo claro.

## 2. Causa raiz provável

A causa raiz mais provável do erro informado pelo navegador é a persistência integral do estado de análise no `localStorage`.

O lote RFT006/ERP aumenta o array `erp`, preservando payloads completos por linha. Depois o motor gera `dataset`, que também inclui payload completo para drawer. O middleware `persist` tentava serializar tudo em `consultasefaz-store`, excedendo a quota do navegador e gerando:

```text
QuotaExceededError: Failed to execute 'setItem' on 'Storage': Setting the value of 'consultasefaz-store' exceeded the quota.
```

## 3. Arquivos analisados

- `src/store/useStore.ts`
- `src/lib/importer.ts`
- `src/components/ImportDialog.tsx`
- `src/lib/engine.ts`
- `src/lib/types.ts`
- `src/pages/views/ConferenciaView.tsx`
- `src/components/DetailDrawer.tsx`
- `src/components/LogsDrawer.tsx`
- `src/pages/views/LogsView.tsx`
- `docs/PRD/PRD-03-interface-experiencia-usuario.md`
- `docs/PRD/PRD-05-motor-conferencia.md`
- `docs/PRD/PRD-06-logs-erros-operacionais.md`
- `docs/PRD/PRD-07-contrato-dados-pipeline.md`
- `docs/PRD/PRD-09-layout-relatorio-rft006-erp.md`

## 4. Arquivos alterados

- `src/store/useStore.ts`
- `src/lib/importer.ts`
- `src/components/ImportDialog.tsx`
- `docs/Analises/analise-1-importacao-rft006-quota-localstorage.md`

## 5. Correção aplicada

### Persistência leve no `localStorage`

Foi adicionado `partialize` no `persist` para manter no `localStorage` apenas dados leves:

- `empresas`;
- `excecoes`;
- logs operacionais curtos e limitados.

Foram removidos da persistência local:

- notas SEFAZ completas;
- registros RFT006/ERP completos;
- `payload_completo`;
- `payload_completo_erp`;
- `dataset` completo da conferência;
- `payload_completo_drawer` do resultado.

Esses dados permanecem em memória durante a sessão de análise.

### Proteção contra falha de persistência

Foi criado um storage seguro para o Zustand. Se o navegador negar `localStorage.setItem`, a aplicação registra aviso no console e mantém o estado em memória, sem disparar novo log no store e sem criar loop.

### Aviso de sessão na interface

A tela de conferência e o modal de importação informam que a análise importada fica apenas na sessão atual do navegador e pode ser perdida ao atualizar ou fechar a página.

### Validação do botão “Limpar análise”

A ação `clearAnalysisData` foi revisada e preserva `excecoes`, enquanto remove `empresas`, `notas` SEFAZ, `erp` RFT006/ERP, `logs`, `dataset` e `ultimaExecucao`. A confirmação da UI foi ajustada para citar explicitamente relatórios SEFAZ/RFT006, resultados, logs, execução atual e filtros.

### Limite e deduplicação de logs

`addLog` agora:

- mantém apenas os últimos 80 logs;
- remove duplicatas com mesmo arquivo, código de evento e mensagem;
- limita textos longos de mensagem/contexto;
- evita retenção operacional longa, alinhado ao PRD 06.

### Mensagens claras no modal

O modal agora mostra o primeiro erro real do lote quando todos os arquivos falham, em vez de exibir apenas “Erro no arquivo”. Também há tratamento explícito para `QuotaExceededError` caso alguma camada externa ainda lance essa exceção.

### Validação RFT006

A validação do cabeçalho RFT006 agora verifica nomes compatíveis para:

- coluna `AC` / `Chave de acesso`;
- coluna `Z` / `IE` do emitente.

Quando o cabeçalho é incompatível, o parser retorna mensagens acionáveis:

- `Cabeçalho RFT006 incompatível: coluna 'Chave de acesso' não encontrada.`
- `Cabeçalho RFT006 incompatível: coluna 'IE' não encontrada.`
- `Arquivo vazio ou sem linhas válidas para conferência.`

Linhas sem chave continuam sendo ignoradas no matching. Linhas com chave e sem IE continuam gerando aviso, não confirmam matching por IE, mas preservam a evidência de que a chave existe no ERP conforme PRD 09.

## 6. Como testar

### Validação automatizada desejada

1. Rodar `npm install` ou corrigir o `package-lock.json` para permitir `npm ci`.
2. Rodar `npm run build`.
3. Rodar `npm test`.

### Checklist manual obrigatório

1. Importar SEFAZ normalmente e confirmar que a conferência é recalculada.
2. Importar RFT006 válido `.xlsx`.
3. Importar múltiplos arquivos RFT006 no mesmo lote.
4. Importar RFT006 sem cabeçalho `Chave de acesso` e confirmar mensagem específica.
5. Importar RFT006 com linha sem chave e confirmar aviso, sem bloquear arquivo válido.
6. Importar RFT006 com chave sem IE e confirmar aviso operacional.
7. Limpar análise e importar novamente.
8. Confirmar que exceções locais não são apagadas ao limpar apenas dados da análise.
9. Confirmar que a UI não mostra apenas “Erro no arquivo” sem motivo.
10. Confirmar que o console não mostra mais `Uncaught (in promise) QuotaExceededError` durante importação RFT006 válida.
11. Após importar lote grande, verificar no DevTools que `localStorage.consultasefaz-store` não contém arrays `notas`, `erp`, `dataset`, `payload_completo` ou `payload_completo_erp`.

## 7. Riscos restantes

- Como a análise pesada agora fica apenas em memória, recarregar a página limpa snapshots SEFAZ/RFT006/dataset da sessão atual. Isso é compatível com a correção mínima para evitar quota, mas deve ser comunicado ao usuário se houver expectativa de persistência longa da análise.
- Arquivos RFT006 com chave já corrompida pelo Excel antes da importação ainda podem gerar chave com tamanho diferente de 44 dígitos.
- O fallback por nome de cabeçalho foi mantido de forma conservadora para não rejeitar exportações com pequenas variações, mas a fonte de verdade continua sendo Z = IE e AC = Chave de acesso.
- O ambiente local não permitiu instalar dependências via `npm ci`/`npm install` porque o registry retornou 403 para `@supabase/supabase-js`.
- O caminho oficial dos PRDs versionados foi padronizado no `README.md` como `docs/PRD/`; referências antigas a `/PRD` ou `public/PRD` devem ser tratadas como referências legadas.

## 8. Perguntas pendentes

1. A V1 deve preservar análise completa entre refreshes ou apenas exceções locais/preferências leves? A correção atual assume exceções/preferências/logs leves persistidos e análise pesada apenas em memória.
2. Existe arquivo RFT006 real de homologação para testar o caso de múltiplos arquivos e medir o tamanho do `consultasefaz-store` após a importação?
