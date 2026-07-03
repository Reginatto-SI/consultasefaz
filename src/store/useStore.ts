import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  DatasetLinha,
  Empresa,
  Excecao,
  LogOperacional,
  NotaSefaz,
  RegistroErp,
  RegistroMaxysXML,
  ResultadoMaxysXMLPorNota,
} from "@/lib/types";
import { rodarMotor, normalizeChave, normalizeCnpj } from "@/lib/engine";
import { analisarMaxysXML, contarChavesMaxysValidas } from "@/lib/maxysxml";
import { findDestinatarioConhecidoByDocumento } from "@/config/destinatariosConhecidos";
import { clearAnalysisSnapshot, loadAnalysisSnapshot, saveAnalysisSnapshot } from "@/lib/analysisStorage";

const uid = () => Math.random().toString(36).slice(2, 11);

const MAX_LOGS = 80;
const MAX_LOG_TEXT = 500;
let localPersistenceWarningShown = false;

function hasAnalysisPayload(state: Pick<State, "notas" | "erp" | "dataset" | "maxysxml">) {
  return state.notas.length > 0 || state.erp.length > 0 || state.dataset.length > 0 || state.maxysxml.length > 0;
}

function persistAnalysisSnapshot(state: Pick<State, "empresas" | "notas" | "erp" | "maxysxml" | "logs" | "dataset">) {
  // Snapshot operacional separado das exceções permanentes: Limpar análise apaga só estes dados.
  if (!hasAnalysisPayload(state)) {
    clearAnalysisSnapshot();
    return true;
  }

  const saved = saveAnalysisSnapshot({
    empresas: state.empresas,
    notas: state.notas,
    erp: state.erp,
    maxysxml: state.maxysxml,
    logs: state.logs.slice(0, MAX_LOGS),
  });

  if (saved) localPersistenceWarningShown = false;
  return saved;
}

function appendLocalPersistenceWarning(set: Parameters<Parameters<typeof create<State>>[0]>[0]) {
  if (localPersistenceWarningShown) return;
  localPersistenceWarningShown = true;

  set((s) => {
    const novo: LogOperacional = {
      id: uid(),
      data_hora: new Date().toISOString(),
      tipo: "processamento",
      nivel: "aviso",
      codigo_evento: "ANALISE_LOCAL_NAO_SALVA",
      mensagem_usuario: "Não foi possível salvar a análise neste navegador. Se a página for atualizada, talvez seja necessário importar os arquivos novamente.",
    };
    const deduped = s.logs.filter((item) => item.codigo_evento !== novo.codigo_evento);
    return { logs: [novo, ...deduped].slice(0, MAX_LOGS) };
  });
}

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
  maxysxml: RegistroMaxysXML[];
  maxysxmlAnalise: ResultadoMaxysXMLPorNota[];
  excecoes: Excecao[];
  logs: LogOperacional[];
  dataset: DatasetLinha[];
  ultimaExecucao?: string;
  analysisSnapshotRestored: boolean;

  addEmpresa: (e: Omit<Empresa, "id">) => Empresa;
  upsertEmpresaByCnpj: (cnpj: string, nome?: string, ie?: string) => Empresa;
  removeEmpresa: (id: string) => void;

  ingestSefaz: (notas: Omit<NotaSefaz, "id" | "importacao_id">[], importacao_id: string, arquivo?: string) => void;
  ingestErp: (rows: Omit<RegistroErp, "id" | "importacao_id">[], importacao_id: string, arquivo?: string) => void;
  ingestMaxysXML: (rows: Omit<RegistroMaxysXML, "id" | "importacao_id" | "arquivo_nome">[], importacao_id: string, arquivo?: string) => void;

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
      maxysxml: [],
      maxysxmlAnalise: [],
      excecoes: [],
      logs: [],
      dataset: [],
      analysisSnapshotRestored: false,

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
          const atualizado: Empresa = {
            ...existing,
            nome: known.apelido,
            inscricao_estadual: known.ie,
            razao_social: known.razao_social,
            perfil: known.perfil,
            tributacao: known.tributacao,
            destinatario_apelido: known.apelido,
          };
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
          analysisSnapshotRestored: false,
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
        set({ erp: novos, analysisSnapshotRestored: false });
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


      ingestMaxysXML: (rows, importacao_id, arquivo) => {
        const novos: RegistroMaxysXML[] = rows.map((r) => ({ ...r, id: uid(), importacao_id, arquivo_nome: arquivo || "MaxysXML" }));
        const contagemMaxys = contarChavesMaxysValidas(novos);
        // Importação MaxysXML sempre substitui integralmente o snapshot anterior; não mescla relatórios antigos.
        set({ maxysxml: novos, maxysxmlAnalise: [], analysisSnapshotRestored: false });
        get().addLog({
          tipo: "importacao",
          nivel: "aviso",
          arquivo_nome: arquivo,
          codigo_evento: "MAXYSXML_SNAPSHOT",
          mensagem_usuario: `MaxysXML importado com ${contagemMaxys.registrosValidos} registros válidos e ${contagemMaxys.chavesUnicasValidas} chaves únicas.`,
        });
        const duplicadas = new Map<string, number>();
        for (const registro of novos) duplicadas.set(registro.chave_acesso, (duplicadas.get(registro.chave_acesso) ?? 0) + 1);
        const totalDuplicadas = [...duplicadas.values()].filter((count) => count > 1).length;
        if (totalDuplicadas > 0) {
          get().addLog({
            tipo: "importacao",
            nivel: "aviso",
            arquivo_nome: arquivo,
            codigo_evento: "MAXYSXML_DUPLICADAS",
            mensagem_usuario: `${totalDuplicadas} chave(s) duplicada(s) no MaxysXML foram consolidadas por chave.`,
          });
        }
        get().rerun();
        const encontrados = get().maxysxmlAnalise.filter((item) => item.situacao_xml_maxys === "XML_PRESENTE").length;
        if (encontrados > contagemMaxys.chavesUnicasValidas) {
          get().addLog({
            tipo: "processamento",
            nivel: "aviso",
            arquivo_nome: arquivo,
            codigo_evento: "MAXYSXML_INCONSISTENCIA_CONTAGEM",
            mensagem_usuario: "Inconsistência na análise MaxysXML: XMLs encontrados excedem chaves únicas importadas.",
            contexto_resumido: `encontrados=${encontrados}; chaves_unicas=${contagemMaxys.chavesUnicasValidas}`,
          });
        }
        const foraSefaz = get().maxysxmlAnalise.filter((item) => item.situacao_xml_maxys === "XML_FORA_DA_SEFAZ_ATUAL").length;
        if (foraSefaz > 0) {
          get().addLog({
            tipo: "processamento",
            nivel: "aviso",
            arquivo_nome: arquivo,
            codigo_evento: "MAXYSXML_FORA_SEFAZ",
            mensagem_usuario: `${foraSefaz} chave(s) MaxysXML não existem no snapshot SEFAZ atual.`,
          });
        }
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

      addLog: (log) => {
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
        });
        if (!persistAnalysisSnapshot(get())) appendLocalPersistenceWarning(set);
      },
      clearLogs: () => {
        set({ logs: [] });
        if (!persistAnalysisSnapshot(get())) appendLocalPersistenceWarning(set);
      },

      rerun: () => {
        const { notas, erp, maxysxml, excecoes, empresas } = get();
        const ref = new Date().toISOString();
        const datasetBase = rodarMotor({
          notas,
          erp,
          excecoes,
          empresas,
          referencia_execucao: ref,
        });
        const maxysResultados = analisarMaxysXML(datasetBase, maxysxml);
        const maxysByChave = new Map(maxysResultados.map((item) => [item.chave_nfe, item]));
        const dataset = datasetBase.map((linha) => ({ ...linha, maxysxml: maxysByChave.get(linha.chave_nfe) }));
        set({ dataset, maxysxmlAnalise: maxysResultados, ultimaExecucao: ref });
        if (!persistAnalysisSnapshot(get())) appendLocalPersistenceWarning(set);
      },
      // Limpa somente o snapshot/análise atual; exceções locais são preservadas por regra de negócio.
      clearAnalysisData: () => {
        set({
          empresas: [],
          notas: [],
          erp: [],
          maxysxml: [],
          maxysxmlAnalise: [],
          logs: [],
          dataset: [],
          ultimaExecucao: undefined,
          analysisSnapshotRestored: false,
        });
        localPersistenceWarningShown = false;
        clearAnalysisSnapshot();
      },
      resetAll: () => {
        set({
          empresas: [],
          notas: [],
          erp: [],
          maxysxml: [],
          maxysxmlAnalise: [],
          excecoes: [],
          logs: [],
          dataset: [],
          ultimaExecucao: undefined,
          analysisSnapshotRestored: false,
        });
        localPersistenceWarningShown = false;
        clearAnalysisSnapshot();
      },
    }),
    {
      name: "consultasefaz-store",
      storage: createJSONStorage(() => safeLocalStorage),
      version: 2,
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const { snapshot, invalid } = loadAnalysisSnapshot();

        if (invalid) {
          state.addLog({
            tipo: "processamento",
            nivel: "aviso",
            codigo_evento: "ANALISE_LOCAL_INVALIDA",
            mensagem_usuario: "A análise local salva neste navegador era incompatível e foi descartada com segurança.",
          });
          return;
        }

        if (!snapshot) return;

        const ref = new Date().toISOString();
        const restoredLogs = snapshot.logs.slice(0, MAX_LOGS);
        const restoreLog: LogOperacional = {
          id: uid(),
          data_hora: ref,
          tipo: "processamento",
          nivel: "aviso",
          codigo_evento: "ANALISE_LOCAL_RESTAURADA",
          mensagem_usuario: "Última análise carregada deste navegador.",
        };
        const datasetBase = rodarMotor({
          notas: snapshot.notas,
          erp: snapshot.erp,
          excecoes: state.excecoes,
          empresas: snapshot.empresas,
          referencia_execucao: ref,
        });
        const maxysResultados = analisarMaxysXML(datasetBase, snapshot.maxysxml || []);
        const maxysByChave = new Map(maxysResultados.map((item) => [item.chave_nfe, item]));
        const dataset = datasetBase.map((linha) => ({ ...linha, maxysxml: maxysByChave.get(linha.chave_nfe) }));


        useStore.setState({
          empresas: snapshot.empresas,
          notas: snapshot.notas,
          erp: snapshot.erp,
          maxysxml: snapshot.maxysxml || [],
          maxysxmlAnalise: maxysResultados,
          logs: [restoreLog, ...restoredLogs].slice(0, MAX_LOGS),
          dataset,
          ultimaExecucao: ref,
          analysisSnapshotRestored: true,
        });
      },
      migrate: (persisted) => {
        const state = (persisted || {}) as Partial<State>;
        return {
          // Versão 2: somente dados permanentes ficam no persist do Zustand.
          // A análise operacional deve ser restaurada exclusivamente por analysisStorage.
          excecoes: state.excecoes || [],
        };
      },
      partialize: (state) => ({
        // Fonte única para restaurar análise: analysisStorage.
        // O persist do Zustand guarda apenas dados locais permanentes.
        excecoes: state.excecoes,
      }),
    }
  )
);
