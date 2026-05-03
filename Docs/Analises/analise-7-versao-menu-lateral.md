# Análise 7 — Versão e última atualização no menu lateral

## 1. Objetivo

Exibir no menu lateral (sidebar) uma informação estática e discreta com a versão atual do sistema e a data/hora da última atualização, sem uso de banco de dados, backend ou automações de build/commit.

## 2. Arquivos alterados

- `src/config/appVersion.ts`
  - Novo arquivo de configuração estática contendo `version` e `updatedAt`.
- `src/pages/Index.tsx`
  - Importação de `APP_VERSION`.
  - Inclusão do bloco no rodapé da sidebar com:
    - `Versão {APP_VERSION.version}`
    - `Atualizado em {APP_VERSION.updatedAt}`

## 3. Como atualizar a versão manualmente

Para atualizar a informação exibida no menu lateral, basta editar o arquivo:

- `src/config/appVersion.ts`

Exemplo:

```ts
export const APP_VERSION = {
  version: "0.1.1",
  updatedAt: "10/05/2026 14:30",
};
```

Formato recomendado:

- Data: `dd/mm/aaaa`
- Hora: `hh:mm`

## 4. O que não foi alterado

Confirmações desta implementação:

- sem banco de dados;
- sem backend;
- sem automação complexa (build date / hash de commit);
- sem alteração no motor/importação.
