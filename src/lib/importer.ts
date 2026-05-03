import * as XLSX from "xlsx";
import {
  normalizeChave,
  normalizeCnpj,
  normalizeIE,
  normalizeStatus,
} from "@/lib/engine";
import type { NotaSefaz, RegistroErp, StatusSefaz } from "@/lib/types";

export type TipoImportacao = "SEFAZ" | "ERP";

const SEFAZ_ALIASES: Record<string, string[]> = {
  chave: ["chave", "chave nfe", "chave_nfe", "chave de acesso", "chave_acesso", "chaveacesso"],
  cnpj_dest: ["cnpj destinatario", "cnpj_destinatario", "cnpj dest", "cnpj_dest", "destinatario cnpj"],
  status: ["status", "situacao", "status sefaz", "status_sefaz"],
  data: ["data emissao", "data_emissao", "dt emissao", "emissao", "data"],
  ie_dest: ["ie destinatario", "ie_destinatario", "inscricao estadual destinatario", "ie dest"],
  emitente: ["emitente", "razao social emitente", "razao_social_emitente", "fornecedor"],
  numero: ["numero", "nr nota", "numero nota", "nf"],
  valor: ["valor", "valor total", "valor_total", "vl total"],
};

const ERP_ALIASES: Record<string, string[]> = {
  chave: ["chave", "chave nfe", "chave_nfe", "chave de acesso", "chave_acesso"],
  ie: ["ie", "inscricao estadual", "inscricao_estadual", "ie destinatario"],
};

function normHeader(s: any): string {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function findCol(headers: string[], aliases: string[]): number {
  const norm = headers.map(normHeader);
  for (const a of aliases) {
    const idx = norm.findIndex((h) => h === a || h.includes(a));
    if (idx >= 0) return idx;
  }
  return -1;
}

function detectHeaderRow(rows: any[][]): number {
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const row = rows[i] || [];
    const filled = row.filter((c) => c !== null && c !== undefined && String(c).trim() !== "").length;
    if (filled >= 2) {
      const txt = row.map(normHeader).join(" ");
      if (/(chave|status|cnpj|inscricao|emissao|nfe)/.test(txt)) return i;
    }
  }
  return 0;
}

function parseDate(v: any): string {
  if (!v) return new Date().toISOString();
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "number") {
    // excel serial
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return new Date(Date.UTC(d.y, d.m - 1, d.d, d.H || 0, d.M || 0, d.S || 0)).toISOString();
  }
  const s = String(v).trim();
  // try dd/mm/yyyy
  const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (br) {
    const [, d, m, y] = br;
    const yyyy = y.length === 2 ? "20" + y : y;
    return new Date(`${yyyy}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`).toISOString();
  }
  const t = Date.parse(s);
  return isNaN(t) ? new Date().toISOString() : new Date(t).toISOString();
}

export interface ParseResult {
  ok: boolean;
  arquivo: string;
  tipo: TipoImportacao;
  notasSefaz?: Array<Omit<NotaSefaz, "id" | "importacao_id" | "empresa_id"> & { cnpj_destinatario: string }>;
  registrosErp?: Array<Omit<RegistroErp, "id" | "importacao_id">>;
  errors: string[];
  warnings: string[];
}

export async function parseFile(file: File, tipo: TipoImportacao): Promise<ParseResult> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

  const result: ParseResult = {
    ok: false,
    arquivo: file.name,
    tipo,
    errors: [],
    warnings: [],
  };

  if (!rows.length) {
    result.errors.push("Arquivo vazio.");
    return result;
  }

  const headerRow = detectHeaderRow(rows);
  const headers = (rows[headerRow] || []).map((h) => String(h ?? ""));
  const dataRows = rows.slice(headerRow + 1);

  if (tipo === "SEFAZ") {
    const colChave = findCol(headers, SEFAZ_ALIASES.chave);
    const colCnpj = findCol(headers, SEFAZ_ALIASES.cnpj_dest);
    const colStatus = findCol(headers, SEFAZ_ALIASES.status);
    const colData = findCol(headers, SEFAZ_ALIASES.data);
    const colIE = findCol(headers, SEFAZ_ALIASES.ie_dest);
    const colEmit = findCol(headers, SEFAZ_ALIASES.emitente);
    const colNum = findCol(headers, SEFAZ_ALIASES.numero);
    const colVal = findCol(headers, SEFAZ_ALIASES.valor);

    const missing: string[] = [];
    if (colChave < 0) missing.push("chave_nfe");
    if (colCnpj < 0) missing.push("cnpj_destinatario");
    if (colStatus < 0) missing.push("status_sefaz");
    if (colData < 0) missing.push("data_emissao");
    if (missing.length) {
      result.errors.push(`Colunas obrigatórias ausentes: ${missing.join(", ")}.`);
      return result;
    }

    const notas: ParseResult["notasSefaz"] = [];
    let descartadas = 0;
    for (const r of dataRows) {
      if (!r) continue;
      const chave = normalizeChave(String(r[colChave] ?? ""));
      const cnpj = normalizeCnpj(String(r[colCnpj] ?? ""));
      const status = normalizeStatus(String(r[colStatus] ?? ""));
      if (!chave || !cnpj || !status) {
        descartadas++;
        continue;
      }
      notas!.push({
        chave_nfe: chave,
        status_sefaz: status as StatusSefaz,
        data_emissao: parseDate(r[colData]),
        inscricao_estadual_destinatario: colIE >= 0 ? normalizeIE(String(r[colIE] ?? "")) : undefined,
        payload_completo: {
          chave_nfe: chave,
          cnpj_destinatario: cnpj,
          status: status,
          emitente: colEmit >= 0 ? r[colEmit] : undefined,
          numero: colNum >= 0 ? r[colNum] : undefined,
          valor_total: colVal >= 0 ? r[colVal] : undefined,
          ie_destinatario: colIE >= 0 ? r[colIE] : undefined,
        },
        cnpj_destinatario: cnpj,
      });
    }
    if (descartadas > 0) result.warnings.push(`${descartadas} linha(s) descartada(s) por dados inválidos.`);
    if (!notas!.length) {
      result.errors.push("Nenhuma linha válida encontrada.");
      return result;
    }
    result.notasSefaz = notas;
    result.ok = true;
    return result;
  } else {
    const colChave = findCol(headers, ERP_ALIASES.chave);
    const colIE = findCol(headers, ERP_ALIASES.ie);
    if (colChave < 0) {
      result.errors.push("Coluna obrigatória ausente: chave_nfe.");
      return result;
    }
    const regs: ParseResult["registrosErp"] = [];
    let descartadas = 0;
    let semIE = 0;
    for (const r of dataRows) {
      if (!r) continue;
      const chave = normalizeChave(String(r[colChave] ?? ""));
      if (!chave) {
        descartadas++;
        continue;
      }
      const ie = colIE >= 0 ? normalizeIE(String(r[colIE] ?? "")) : undefined;
      if (!ie) semIE++;
      regs!.push({ chave_nfe: chave, inscricao_estadual: ie });
    }
    if (descartadas) result.warnings.push(`${descartadas} linha(s) sem chave NFe.`);
    if (semIE) result.warnings.push(`${semIE} linha(s) sem IE — matching apenas por chave.`);
    if (!regs!.length) {
      result.errors.push("Nenhuma linha válida encontrada.");
      return result;
    }
    result.registrosErp = regs;
    result.ok = true;
    return result;
  }
}
