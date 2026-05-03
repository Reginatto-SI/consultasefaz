import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  DatasetLinha,
  Empresa,
  Excecao,
  LogOperacional,
  NotaSefaz,
  RegistroErp,
} from "@/lib/types";
import { rodarMotor, normalizeChave } from "@/lib/engine";

const uid = () => Math.random().toString(36).slice(2, 11);

interface State {
  empresas: Empresa[];
  notas: NotaSefaz[];
  erp: RegistroErp[];
  excecoes: Excecao[];
  logs: LogOperacional[];
  dataset: DatasetLinha[];
  ultimaExecucao?: string;

  addEmpresa: (e: Omit<Empresa, "id">) => Empresa;
  upsertEmpresaByCnpj: (cnpj: string, nome?: string, ie?: string) => Empresa;
  removeEmpresa: (id: string) => void;

  ingestSefaz: (notas: Omit<NotaSefaz, "id" | "importacao_id">[], importacao_id: string, arquivo?: string) => void;
  ingestErp: (rows: Omit<RegistroErp, "id" | "importacao_id">[], importacao_id: string, arquivo?: string) => void;

  addExcecao: (e: Omit<Excecao, "id" | "data_registro" | "ativa" | "tipo_excecao">) => boolean;
  reverterExcecao: (id: string) => void;

  addLog: (log: Omit<LogOperacional, "id" | "data_hora">) => void;
  clearLogs: () => void;

  rerun: () => void;
  resetAll: () => void;
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      empresas: [],
      notas: [],
      erp: [],
      excecoes: [],
      logs: [],
      dataset: [],

      addEmpresa: (e) => {
        const novo: Empresa = { ...e, id: uid(), cnpj: (e.cnpj || "").replace(/\D/g, "") };
        set((s) => ({ empresas: [...s.empresas, novo] }));
        return novo;
      },
      upsertEmpresaByCnpj: (cnpj, nome, ie) => {
        const cnpjN = (cnpj || "").replace(/\D/g, "");
        const existing = get().empresas.find((e) => e.cnpj === cnpjN);
        if (existing) return existing;
        const novo: Empresa = {
          id: uid(),
          nome: nome || `Empresa ${cnpjN.slice(0, 8) || "?"}`,
          cnpj: cnpjN,
          inscricao_estadual: ie,
        };
        set((s) => ({ empresas: [...s.empresas, novo] }));
        return novo;
      },
      removeEmpresa: (id) =>
        set((s) => ({
          empresas: s.empresas.filter((e) => e.id !== id),
          notas: s.notas.filter((n) => n.empresa_id !== id),
        })),

      ingestSefaz: (rows, importacao_id, arquivo) => {
        const novas: NotaSefaz[] = rows.map((r) => ({ ...r, id: uid(), importacao_id }));
        const empresasImpactadas = new Set(novas.map((n) => n.empresa_id));
        set((s) => ({
          notas: [
            ...s.notas.filter((n) => !empresasImpactadas.has(n.empresa_id)),
            ...novas,
          ],
        }));
        get().addLog({
          tipo: "importacao",
          nivel: "aviso",
          arquivo_nome: arquivo,
          codigo_evento: "SEFAZ_OK",
          mensagem_usuario: `${novas.length} notas SEFAZ importadas (${empresasImpactadas.size} destinatário(s)).`,
        });
        get().rerun();
      },

      ingestErp: (rows, importacao_id, arquivo) => {
        const novos: RegistroErp[] = rows.map((r) => ({ ...r, id: uid(), importacao_id }));
        set({ erp: novos });
        // PRD 09: linha com chave sem IE é inelegível e deve gerar aviso resumido.
        const semIE = novos.filter((r) => !!r.chave_acesso && !r.inscricao_estadual_emitente).length;
        if (semIE > 0) {
          get().addLog({
            tipo: "importacao",
            nivel: "aviso",
            arquivo_nome: arquivo,
            codigo_evento: "ERP_SEM_IE",
            mensagem_usuario: `${semIE} registro(s) RFT006 com chave sem IE do emitente (inelegíveis para matching).`,
          });
        }
        get().rerun();
      },

      addExcecao: (e) => {
        const chaveN = normalizeChave(e.chave_nfe);
        const dup = get().excecoes.find(
          (x) => x.ativa && x.empresa_id === e.empresa_id && normalizeChave(x.chave_nfe) === chaveN
        );
        if (dup) return false;
        const nova: Excecao = {
          ...e,
          chave_nfe: chaveN,
          id: uid(),
          tipo_excecao: "DESCONSIDERACAO",
          data_registro: new Date().toISOString(),
          ativa: true,
        };
        set((s) => ({ excecoes: [...s.excecoes, nova] }));
        get().rerun();
        return true;
      },
      reverterExcecao: (id) => {
        set((s) => ({
          excecoes: s.excecoes.map((e) => (e.id === id ? { ...e, ativa: false } : e)),
        }));
        get().rerun();
      },

      addLog: (log) =>
        set((s) => ({
          logs: [
            { ...log, id: uid(), data_hora: new Date().toISOString() },
            ...s.logs,
          ].slice(0, 200),
        })),
      clearLogs: () => set({ logs: [] }),

      rerun: () => {
        const { notas, erp, excecoes, empresas } = get();
        const ref = new Date().toISOString();
        const dataset = rodarMotor({
          notas,
          erp,
          excecoes,
          empresas,
          referencia_execucao: ref,
        });
        set({ dataset, ultimaExecucao: ref });
      },
      resetAll: () =>
        set({
          empresas: [],
          notas: [],
          erp: [],
          excecoes: [],
          logs: [],
          dataset: [],
          ultimaExecucao: undefined,
        }),
    }),
    { name: "consultasefaz-store" }
  )
);
