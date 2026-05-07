import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  DatasetLinha,
  Empresa,
  Excecao,
  LogOperacional,
  NotaSefaz,
  RegistroErp,
} from "@/lib/types";
import { rodarMotor, normalizeChave, normalizeCnpj } from "@/lib/engine";
import { aplicarDestinatarioConhecidoNaEmpresa, findDestinatarioConhecidoByDocumento } from "@/config/destinatariosConhecidos";

const uid = () => Math.random().toString(36).slice(2, 11);

const MAX_LOGS = 80;
const MAX_LOG_TEXT = 500;

function truncateForLog(value: string | undefined): string | undefined {
  if (!value) return value;
  return value.length > MAX_LOG_TEXT ? `${value.slice(0, MAX_LOG_TEXT)}…` : value;
}

const safeLocalStorage = {
  getItem: (name: string) => window.localStorage.getItem(name),
  removeItem: (name: string) => window.localStorage.removeItem(name),
  setItem: (name: string, value: string) => {
    try {
      window.localStorage.setItem(name, value);
    } catch (error) {
      // O estado pesado da análise fica em memória; se o navegador negar persistência,
      // a sessão atual continua funcional e evitamos novo set/addLog que causaria loop.
      console.warn("ConsultaSefaz: falha ao persistir estado leve no localStorage.", error);
    }
  },
};

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
  clearAnalysisData: () => void;
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
        const cnpjN = normalizeCnpj(cnpj || "");
        const known = findDestinatarioConhecidoByDocumento(cnpjN);
        const existing = get().empresas.find((e) => e.cnpj === cnpjN);
        if (existing) {
          if (!known) return existing;
          const atualizado = aplicarDestinatarioConhecidoNaEmpresa(existing);
          set((s) => ({ empresas: s.empresas.map((e) => (e.id === existing.id ? atualizado : e)) }));
          return atualizado;
        }
        const novo: Empresa = {
          id: uid(),
          nome: known?.apelido || nome || `Empresa ${cnpjN.slice(0, 8) || "?"}`,
          cnpj: cnpjN,
          inscricao_estadual: known?.ie || ie,
          razao_social: known?.razao_social || nome,
          perfil: known?.perfil,
          tributacao: known?.tributacao,
          destinatario_apelido: known?.apelido,
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
        const chaveSet = new Set(
          novos
            .map((r) => normalizeChave(r.chave_acesso || r.chave_nfe || ""))
            .filter(Boolean)
        );
        // PRD 09: linha com chave sem IE é inelegível e deve gerar aviso resumido.
        const semIE = novos.filter((r) => !!r.chave_acesso && !r.inscricao_estadual_emitente).length;
        if (semIE > 0) {
          get().addLog({
            tipo: "importacao",
            nivel: "aviso",
            arquivo_nome: arquivo,
            codigo_evento: "ERP_SEM_IE",
            mensagem_usuario: `${semIE} registro(s) RFT006 com chave sem IE do emitente. O motor avaliará se há isenção compatível ou divergência real.`,
          });
        }
        const t0 = performance.now();
        get().rerun();
        const motorMs = Math.round(performance.now() - t0);
        get().addLog({
          tipo: "processamento",
          nivel: "aviso",
          arquivo_nome: arquivo,
          codigo_evento: "ERP_INDEX_MOTOR",
          mensagem_usuario: `Snapshot ERP atualizado com ${novos.length} registro(s) e índice por chave com ${chaveSet.size} chave(s) única(s). Motor executado em ~${motorMs}ms.`,
        });
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
        set((s) => {
          const novo: LogOperacional = {
            ...log,
            mensagem_usuario: truncateForLog(log.mensagem_usuario) || "Evento operacional sem mensagem.",
            contexto_resumido: truncateForLog(log.contexto_resumido),
            id: uid(),
            data_hora: new Date().toISOString(),
          };
          const deduped = s.logs.filter(
            (item) => !(
              item.codigo_evento === novo.codigo_evento
              && item.arquivo_nome === novo.arquivo_nome
              && item.mensagem_usuario === novo.mensagem_usuario
            )
          );

          // PRD 06: logs operacionais são curtos e não podem crescer indefinidamente.
          return { logs: [novo, ...deduped].slice(0, MAX_LOGS) };
        }),
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
      // Limpa somente o snapshot/análise atual; exceções locais são preservadas por regra de negócio.
      clearAnalysisData: () =>
        set({
          empresas: [],
          notas: [],
          erp: [],
          logs: [],
          dataset: [],
          ultimaExecucao: undefined,
        }),
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
    {
      name: "consultasefaz-store",
      storage: createJSONStorage(() => safeLocalStorage),
      version: 2,
      migrate: (persisted) => {
        const state = (persisted || {}) as Partial<State>;
        return {
          empresas: (state.empresas || []).map(aplicarDestinatarioConhecidoNaEmpresa),
          excecoes: state.excecoes || [],
          logs: (state.logs || []).slice(0, MAX_LOGS),
        };
      },
      partialize: (state) => ({
        // Correção de quota: notas SEFAZ, RFT006/ERP, payloads e dataset são snapshots
        // pesados da análise e permanecem somente em memória durante a sessão V1.
        empresas: state.empresas,
        excecoes: state.excecoes,
        logs: state.logs.slice(0, MAX_LOGS),
      }),
    }
  )
);
