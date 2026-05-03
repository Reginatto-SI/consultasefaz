import * as XLSX from "xlsx";
import {
  normalizeChave,
  normalizeCnpj,
  normalizeIE,
  normalizeStatus,
} from "@/lib/engine";
import type { NotaSefaz, RegistroErp } from "@/lib/types";

export type TipoImportacao = "SEFAZ" | "ERP";

function detectHeaderRow(rows: any[][]): number {
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const row = rows[i] || [];
    const filled = row.filter((c) => c !== null && c !== undefined && String(c).trim() !== "").length;
    if (filled >= 2) {
      const txt = row.map((c) => String(c ?? "").toLowerCase()).join(" ");
      if (/(chave|status|cnpj|inscricao|emissao|nfe|nota)/.test(txt)) return i;
    }
  }
  return 0;
}

function parseDate(v: any): string {
  if (!v) return new Date().toISOString();
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return new Date(Date.UTC(d.y, d.m - 1, d.d, d.H || 0, d.M || 0, d.S || 0)).toISOString();
  }
  const s = String(v).trim();
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
    // PRD 08: layout oficial por posição (base 0).
    const COL_A_DATA_EMISSAO = 0;
    const COL_C_NUMERO_NF = 2;
    const COL_D_CHAVE_NFE = 3;
    const COL_I_STATUS = 8;
    const COL_J_EMITENTE_CNPJ = 9;
    const COL_K_EMITENTE_RAZAO = 10;
    const COL_L_IE_EMITENTE = 11; // PRD 08: coluna L = IE do emitente
    const COL_O_DEST_CNPJ = 14; // PRD 08: coluna O = CNPJ destinatário
    const COL_P_DEST_IE = 15;
    const COL_Q_DEST_RAZAO = 16;
    const COL_Y_VALOR_TOTAL = 24;

    if (headers.length <= COL_O_DEST_CNPJ || headers.length <= COL_D_CHAVE_NFE || headers.length <= COL_I_STATUS) {
      result.errors.push("Cabeçalho incompatível com layout SEFAZ base (PRD 08).");
      return result;
    }

    const notas: ParseResult["notasSefaz"] = [];
    let descartadas = 0;

    for (const r of dataRows) {
      if (!r) continue;
      const chave = normalizeChave(String(r[COL_D_CHAVE_NFE] ?? ""));
      const destCnpj = normalizeCnpj(String(r[COL_O_DEST_CNPJ] ?? ""));
      const status = normalizeStatus(String(r[COL_I_STATUS] ?? ""));
      const ieEmitente = normalizeIE(String(r[COL_L_IE_EMITENTE] ?? ""));
      if (!chave || !destCnpj || !ieEmitente) {
        descartadas++;
        continue;
      }

      const payload: Record<string, any> = {};
      headers.forEach((h, idx) => {
        payload[h || `col_${idx}`] = r[idx] ?? null;
      });

      payload.chave_nfe = chave;
      payload.status_sefaz = status;
      payload.emitente_inscricao_estadual = ieEmitente;
      payload.destinatario_cnpj_cpf = destCnpj;

      notas!.push({
        chave_nfe: chave,
        status_sefaz: status,
        data_emissao: parseDate(r[COL_A_DATA_EMISSAO]),
        emitente_inscricao_estadual: ieEmitente,
        emitente_cnpj_cpf: normalizeCnpj(String(r[COL_J_EMITENTE_CNPJ] ?? "")) || undefined,
        emitente_razao_social: String(r[COL_K_EMITENTE_RAZAO] ?? "").trim() || undefined,
        destinatario_cnpj_cpf: destCnpj,
        destinatario_razao_social: String(r[COL_Q_DEST_RAZAO] ?? "").trim() || undefined,
        inscricao_estadual_destinatario: normalizeIE(String(r[COL_P_DEST_IE] ?? "")) || undefined,
        payload_completo: {
          ...payload,
          numero_nota_fiscal: r[COL_C_NUMERO_NF] ?? null,
          valor_total_nota_fiscal: r[COL_Y_VALOR_TOTAL] ?? null,
        },
        cnpj_destinatario: destCnpj,
      });
    }

    if (descartadas > 0) result.warnings.push(`${descartadas} linha(s) SEFAZ descartada(s) por ausência de chave, destinatário ou IE do emitente.`);
    if (!notas!.length) {
      result.errors.push("Nenhuma linha válida encontrada.");
      return result;
    }

    const statusDesconhecido = notas!.filter((n) => n.status_sefaz === "desconhecido").length;
    if (statusDesconhecido > 0) {
      result.warnings.push(`${statusDesconhecido} linha(s) SEFAZ com status desconhecido tratado como inválido.`);
    }

    result.notasSefaz = notas;
    result.ok = true;
    return result;
  }

  // PRD 09: layout oficial por posição (base 0).
  const COL_G_DATA_EMISSAO_ERP = 6;
  const COL_I_NUMERO_NF = 8;
  const COL_L_CFOP = 11;
  const COL_T_VALOR_TOTAL = 19;
  const COL_Y_EMIT_CNPJ = 24;
  const COL_Z_IE_EMITENTE = 25; // PRD 09: coluna Z = IE do emitente no RFT006
  const COL_AA_EMIT_RAZAO = 26;
  const COL_AC_CHAVE = 28; // PRD 09: coluna AC = chave de acesso

  if (headers.length <= COL_AC_CHAVE || headers.length <= COL_Z_IE_EMITENTE) {
    result.errors.push("Cabeçalho incompatível com layout RFT006 base (PRD 09).");
    return result;
  }

  const regs: ParseResult["registrosErp"] = [];
  let semChave = 0;
  let semIE = 0;

  for (const r of dataRows) {
    if (!r) continue;

    const chave = normalizeChave(String(r[COL_AC_CHAVE] ?? ""));
    const ieEmitente = normalizeIE(String(r[COL_Z_IE_EMITENTE] ?? ""));

    const payload: Record<string, any> = {};
    headers.forEach((h, idx) => {
      payload[h || `col_${idx}`] = r[idx] ?? null;
    });

    if (!chave) {
      semChave++;
      regs!.push({
        chave_acesso: "",
        inscricao_estadual_emitente: ieEmitente,
        payload_completo_erp: payload,
      });
      continue;
    }

    if (!ieEmitente) semIE++;

    regs!.push({
      chave_acesso: chave,
      inscricao_estadual_emitente: ieEmitente,
      payload_completo_erp: {
        ...payload,
        emitente_cnpj_cpf: normalizeCnpj(String(r[COL_Y_EMIT_CNPJ] ?? "")) || null,
        emitente_razao_social: String(r[COL_AA_EMIT_RAZAO] ?? "").trim() || null,
        numero_nota_fiscal: r[COL_I_NUMERO_NF] ?? null,
        data_emissao_erp: parseDate(r[COL_G_DATA_EMISSAO_ERP]),
        cfop: r[COL_L_CFOP] ?? null,
        valor_total: r[COL_T_VALOR_TOTAL] ?? null,
      },
      // Compatibilidade legada (sem uso no motor novo).
      chave_nfe: chave,
      inscricao_estadual: ieEmitente,
    });
  }

  if (semChave > 0) result.warnings.push(`${semChave} linha(s) RFT006 sem chave de acesso. Elas foram ignoradas no matching.`);
  if (semIE > 0) result.warnings.push(`${semIE} linha(s) RFT006 com chave de acesso, mas sem IE do emitente. Elas foram ignoradas no matching.`);

  const elegiveis = regs!.filter((r) => !!r.chave_acesso && !!r.inscricao_estadual_emitente);
  if (!regs!.length || !elegiveis.length) {
    result.errors.push("Nenhuma linha elegível para matching encontrada no RFT006.");
    return result;
  }

  result.registrosErp = regs;
  result.ok = true;
  return result;
}
