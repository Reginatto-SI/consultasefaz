# Análise 7 — Separação do `Index.tsx` em Views

## 1) Diagnóstico do problema anterior

O arquivo `src/pages/Index.tsx` concentrava, em um único componente, múltiplas responsabilidades de renderização:

- Navegação local por `activeView`.
- Estrutura global (sidebar + header).
- Renderização integral das áreas de Conferência, Importação, Destinatários, Exceções e Logs.
- Estado de filtros, paginação e seleção de nota.

Isso aumentava o tamanho do arquivo e dificultava manutenção/legibilidade, apesar do comportamento funcional estar correto.

## 2) Arquivos criados

Foi criada a pasta:

- `src/pages/views/`

E os seguintes arquivos:

- `src/pages/views/ConferenciaView.tsx`
- `src/pages/views/ImportacaoView.tsx`
- `src/pages/views/DestinatariosView.tsx`
- `src/pages/views/ExcecoesView.tsx`
- `src/pages/views/LogsView.tsx`

## 3) Código movido para cada view

### `ConferenciaView.tsx`

Conteúdo movido:
- cards de resumo;
- card de filtros;
- tabela de conferência;
- paginação;
- interação de seleção da nota (`setSelected`) para abrir o drawer existente.

Recebe via props todo o estado/handlers necessários, sem criar regra nova.

### `ImportacaoView.tsx`

Conteúdo movido:
- card “Importação de Arquivos”;
- cards SEFAZ e ERP;
- botão para abertura do modal de importação (handler recebido por props).

### `DestinatariosView.tsx`

Conteúdo movido:
- título “Destinatários SEFAZ”;
- mensagem de próxima etapa;
- botão “Novo destinatário” (placeholder).

### `ExcecoesView.tsx`

Conteúdo movido:
- título “Exceções Operacionais”;
- resumo de exceções ativas/revertidas;
- tabela/lista de exceções;
- empty state;
- botão “Nova exceção” com callback para toast.

### `LogsView.tsx`

Conteúdo movido:
- título “Logs Operacionais”;
- totais de avisos e erros;
- lista de logs;
- botão limpar com callback para toast;
- empty state.

## 4) Confirmação de não alteração funcional

A refatoração foi estritamente organizacional:

- `Index.tsx` permanece como orquestrador principal de layout e estado global da página.
- `activeView` continua controlando navegação local temporária por estado.
- Modais/drawers globais existentes foram mantidos em `Index.tsx`.
- Não houve mudança de backend, banco, store, motor de conferência, rotas reais ou regras de negócio.
- Nomenclatura de UI foi mantida em “Destinatário”, conforme PRD 00 e PRD 03.
- `empresa_id` foi mantido como legado técnico de destinatário fiscal, sem uso como tenant.

## 5) Pontos futuros

- Evolução de navegação local (`activeView`) para roteamento real.
- Implementação de CRUD de destinatários.
- Implementação de CRUD de exceções.
- Implementação de exportação Excel/PDF real.
