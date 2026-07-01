import type { Empresa, LogOperacional, NotaSefaz, RegistroErp } from "@/lib/types";

export const ANALYSIS_SNAPSHOT_SCHEMA_VERSION = 1;
export const ANALYSIS_SNAPSHOT_STORAGE_KEY = "consultasefaz:analysis-snapshot";

export interface AnalysisSnapshot {
  schemaVersion: typeof ANALYSIS_SNAPSHOT_SCHEMA_VERSION;
  savedAt: string;
  empresas: Empresa[];
  notas: NotaSefaz[];
  erp: RegistroErp[];
  logs: LogOperacional[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function isValidAnalysisSnapshot(value: unknown): value is AnalysisSnapshot {
  if (!isRecord(value)) return false;
  if (value.schemaVersion !== ANALYSIS_SNAPSHOT_SCHEMA_VERSION) return false;
  if (typeof value.savedAt !== "string") return false;
  return Array.isArray(value.empresas)
    && Array.isArray(value.notas)
    && Array.isArray(value.erp)
    && Array.isArray(value.logs);
}

function getLocalStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

export function loadAnalysisSnapshot(): { snapshot: AnalysisSnapshot | null; invalid: boolean } {
  const storage = getLocalStorage();
  if (!storage) return { snapshot: null, invalid: false };

  try {
    const raw = storage.getItem(ANALYSIS_SNAPSHOT_STORAGE_KEY);
    if (!raw) return { snapshot: null, invalid: false };

    const parsed = JSON.parse(raw);
    if (!isValidAnalysisSnapshot(parsed)) {
      clearAnalysisSnapshot();
      return { snapshot: null, invalid: true };
    }

    return { snapshot: parsed, invalid: false };
  } catch (error) {
    console.warn("ConsultaSefaz: snapshot local de análise inválido descartado.", error);
    clearAnalysisSnapshot();
    return { snapshot: null, invalid: true };
  }
}

export function saveAnalysisSnapshot(snapshot: Omit<AnalysisSnapshot, "schemaVersion" | "savedAt">): boolean {
  const storage = getLocalStorage();
  if (!storage) return false;

  try {
    storage.setItem(
      ANALYSIS_SNAPSHOT_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: ANALYSIS_SNAPSHOT_SCHEMA_VERSION,
        savedAt: new Date().toISOString(),
        empresas: snapshot.empresas,
        notas: snapshot.notas,
        erp: snapshot.erp,
        logs: snapshot.logs,
      })
    );
    return true;
  } catch (error) {
    console.warn("ConsultaSefaz: falha ao salvar snapshot local da análise.", error);
    return false;
  }
}

export function clearAnalysisSnapshot() {
  const storage = getLocalStorage();
  if (!storage) return;
  storage.removeItem(ANALYSIS_SNAPSHOT_STORAGE_KEY);
}
