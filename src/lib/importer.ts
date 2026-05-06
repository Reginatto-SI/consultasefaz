import * as XLSX from "xlsx";
import {
  normalizeChave,
  normalizeCnpj,
  normalizeIE,
  normalizeStatus,
} from "@/lib/engine";
import type { NotaSefaz, RegistroErp } from "@/lib/types";

export type TipoImportacao = "SEFAZ" | "ERP";

// PROTEÇÃO CONTRA TRAVAMENTO: limite seguro de tamanho para processamento local na V1.
// Acima disso o navegador pode travar — bloqueamos antes de tentar ler o arquivo.
const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB
// Limite máximo de linhas processadas no laço pesado (proteção V1).
const MAX_DATA_ROWS = 200_000;
// Cooperative yield: a cada N linhas devolvemos o controle ao event loop para a UI respirar.
const YIELD_EVERY = 2_000;
const VALID_EXTS = [".xls", ".xlsx"];

function hasValidExtension(name: string): boolean {
  const lower = (name || "").toLowerCase();
  return VALID_EXTS.some((ext) => lower.endsWith(ext));
}

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

// Pequena pausa para devolver o controle ao event loop e impedir o travamento da UI.
function yieldToUi(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

export interface ParseResult {
  ok: boolean;
  arquivo: string;
  tipo: TipoImportacao;
  notasSefaz?: Array<Omit<NotaSefaz, "id" | "importacao_id" | "empresa_id"> & { cnpj_destinatario: string }>;
  registrosErp?: Array<Omit<RegistroErp, "id" | "importacao_id">>;
  errors: string[];
  warnings: string[];
  diagnostics?: Record<string, any>;
}

export async function parseFile(file: File, tipo: TipoImportacao): Promise<ParseResult> {
  const t0 = performance.now();
  const result: ParseResult = {
    ok: false,
    arquivo: file.name,
    tipo,
    errors: [],
    warnings: [],
  };

  // PROTEÇÃO 1: validar extensão antes de tocar no arquivo.
  if (!hasValidExtension(file.name)) {
    result.errors.push("Arquivo inválido: extensão não suportada. Use .xls ou .xlsx.");
    return result;
  }

  // PROTEÇÃO 2: validar tamanho. Acima do limite seguro, abortamos com mensagem amigável.
  if (file.size > MAX_FILE_BYTES) {
    result.errors.push(
      "Arquivo muito grande para processamento local nesta versão. Divida o relatório em partes menores ou exporte novamente com período reduzido."
    );
    result.diagnostics = {
      tamanho_bytes: file.size,
      limite_bytes: MAX_FILE_BYTES,
      motivo_bloqueio: "ARQUIVO_GRANDE",
      tempo_ms: Math.round(performance.now() - t0),
    };
    return result;
  }

  // PROTEÇÃO 3: leitura do binário e parse do XLSX com timeout duro.
  let rows: any[][] = [];
  let headers: string[] = [];
  let dataRows: any[][] = [];
  let headerRow = 0;

  try {
    // PROTEÇÃO CONTRA TRAVAMENTO (lição aprendida):
    // NÃO envolver file.arrayBuffer() nem XLSX.read() em withTimeout.
    // - arrayBuffer() é nativo e não pode ser cancelado; o setTimeout só polui o event loop.
    // - XLSX.read() é SÍNCRONO e CPU-bound: ele bloqueia o thread, então o setTimeout
    //   acumula atraso e dispara um falso "Tempo limite excedido" mesmo em arquivos válidos.
    // As proteções reais já são: validação de extensão, limite de 25MB e limite de 200k linhas.
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array", cellDates: true });

    if (!wb.SheetNames || wb.SheetNames.length === 0) {
      result.errors.push("Arquivo inválido: nenhuma planilha encontrada.");
      return result;
    }

    const sheet = wb.Sheets[wb.SheetNames[0]];
    if (!sheet) {
      result.errors.push("Arquivo inválido: planilha principal ausente.");
      return result;
    }

    rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as any[][];
  } catch (e: any) {
    result.errors.push(e?.message || "Não foi possível ler o arquivo Excel.");
    result.diagnostics = {
      motivo_bloqueio: "FALHA_LEITURA",
      tempo_ms: Math.round(performance.now() - t0),
    };
    return result;
  }

  if (!rows.length) {
    result.errors.push("Arquivo vazio.");
    return result;
  }

  headerRow = detectHeaderRow(rows);
  headers = (rows[headerRow] || []).map((h) => String(h ?? ""));
  dataRows = rows.slice(headerRow + 1);

  // PROTEÇÃO 4: limite de linhas processadas no laço pesado.
  if (dataRows.length > MAX_DATA_ROWS) {
    result.errors.push(
      "Arquivo excede o limite seguro de processamento local. Divida o relatório em partes menores."
    );
    result.diagnostics = {
      total_linhas_lidas: dataRows.length,
      limite_linhas: MAX_DATA_ROWS,
      motivo_bloqueio: "EXCESSO_DE_LINHAS",
      tempo_ms: Math.round(performance.now() - t0),
    };
    return result;
  }

  if (tipo === "SEFAZ") {
    // PRD 08: layout oficial por posição (base 0).
    const COL_A_DATA_EMISSAO = 0;
    const COL_C_NUMERO_NF = 2;
    const COL_D_CHAVE_NFE = 3;
    const COL_I_STATUS = 8;
    const COL_J_EMITENTE_CNPJ = 9;
    const COL_K_EMITENTE_RAZAO = 10;
    const COL_L_IE_EMITENTE = 11;
    const COL_O_DEST_CNPJ = 14;
    const COL_P_DEST_IE = 15;
    const COL_Q_DEST_RAZAO = 16;
    const COL_Y_VALOR_TOTAL = 24;

    // VALIDAÇÃO RÁPIDA DE LAYOUT antes do laço pesado (PRD 08).
    if (headers.length <= COL_O_DEST_CNPJ) {
      result.errors.push("Arquivo SEFAZ inválido: cabeçalho não contém o bloco de destinatário esperado (PRD 08).");
      result.diagnostics = {
        total_linhas_lidas: dataRows.length,
        linha_cabecalho: headerRow,
        motivo_bloqueio: "SEFAZ_LAYOUT_INVALIDO",
        tempo_ms: Math.round(performance.now() - t0),
      };
      return result;
    }
    if (headers.length <= COL_D_CHAVE_NFE) {
      result.errors.push("Arquivo SEFAZ inválido: coluna obrigatória 'CHAVE DE ACESSO' não encontrada.");
      result.diagnostics = {
        total_linhas_lidas: dataRows.length,
        linha_cabecalho: headerRow,
        motivo_bloqueio: "SEFAZ_LAYOUT_CHAVE_AUSENTE",
        tempo_ms: Math.round(performance.now() - t0),
      };
      return result;
    }
    if (headers.length <= COL_I_STATUS) {
      result.errors.push("Arquivo SEFAZ inválido: coluna obrigatória 'SITUAÇÃO' não encontrada.");
      result.diagnostics = {
        total_linhas_lidas: dataRows.length,
        linha_cabecalho: headerRow,
        motivo_bloqueio: "SEFAZ_LAYOUT_STATUS_AUSENTE",
        tempo_ms: Math.round(performance.now() - t0),
      };
      return result;
    }
    if (headers.length <= COL_L_IE_EMITENTE) {
      result.errors.push("Arquivo SEFAZ inválido: coluna obrigatória 'INSCRIÇÃO ESTADUAL' do emitente não encontrada (PRD 08).");
      result.diagnostics = {
        total_linhas_lidas: dataRows.length,
        linha_cabecalho: headerRow,
        motivo_bloqueio: "SEFAZ_LAYOUT_IE_EMITENTE_AUSENTE",
        tempo_ms: Math.round(performance.now() - t0),
      };
      return result;
    }

    const notas: ParseResult["notasSefaz"] = [];
    let descartadas = 0;

    for (let i = 0; i < dataRows.length; i++) {
      const r = dataRows[i];
      // PROTEÇÃO 5: yield cooperativo para a UI continuar respirando em laços longos.
      if (i > 0 && i % YIELD_EVERY === 0) await yieldToUi();
      if (!r) continue;
      const chave = normalizeChave(String(r[COL_D_CHAVE_NFE] ?? ""));
      const destCnpj = normalizeCnpj(String(r[COL_O_DEST_CNPJ] ?? ""));
      const status = normalizeStatus(String(r[COL_I_STATUS] ?? ""));
      const ieEmitente = normalizeIE(String(r[COL_L_IE_EMITENTE] ?? ""));
      if (!chave || !destCnpj) {
        descartadas++;
        continue;
      }

      const payload: Record<string, any> = {};
      headers.forEach((h, idx) => {
        payload[h || `col_${idx}`] = r[idx] ?? null;
      });

      payload.chave_nfe = chave;
      payload.status_sefaz = status;
      payload.emitente_inscricao_estadual = ieEmitente ?? "";
      payload.destinatario_cnpj_cpf = destCnpj;

      notas!.push({
        chave_nfe: chave,
        status_sefaz: status,
        data_emissao: parseDate(r[COL_A_DATA_EMISSAO]),
        emitente_inscricao_estadual: ieEmitente ?? "",
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

    if (descartadas > 0)
      result.warnings.push(`${descartadas} linha(s) SEFAZ descartada(s) por ausência de chave ou destinatário.`);
    if (!notas!.length) {
      result.errors.push("Nenhuma linha válida encontrada no arquivo SEFAZ.");
      result.diagnostics = {
        total_linhas_lidas: dataRows.length,
        linha_cabecalho: headerRow,
        motivo_bloqueio: "SEFAZ_SEM_LINHAS_VALIDAS",
        tempo_ms: Math.round(performance.now() - t0),
      };
      return result;
    }

    const statusDesconhecido = notas!.filter((n) => n.status_sefaz === "desconhecido").length;
    if (statusDesconhecido > 0) {
      result.warnings.push(`${statusDesconhecido} linha(s) SEFAZ com status desconhecido tratado como inválido.`);
    }

    result.notasSefaz = notas;
    result.diagnostics = {
      total_linhas_lidas: dataRows.length,
      linha_cabecalho: headerRow,
      total_estruturado: notas!.length,
      tempo_ms: Math.round(performance.now() - t0),
    };
    result.ok = true;
    return result;
  }

  // ---------- RFT006 / ERP ----------
  // PRD 09: layout oficial por posição (base 0).
  const COL_G_DATA_EMISSAO_ERP = 6;
  const COL_I_NUMERO_NF = 8;
  const COL_L_CFOP = 11;
  const COL_T_VALOR_TOTAL = 19;
  const COL_Y_EMIT_CNPJ = 24;
  const COL_Z_IE_EMITENTE = 25; // Z = IE emitente
  const COL_AA_EMIT_RAZAO = 26;
  const COL_AC_CHAVE = 28; // AC = Chave de acesso

  // PRD 09: o layout oficial usa Z = IE do emitente e AC = Chave de acesso.
  // Validamos por nome para não aceitar apenas "quantidade de colunas" quando o cabeçalho está deslocado.
  const normalizeHeader = (h: string) => h
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  const headerNorm = headers.map((h) => normalizeHeader(h ?? ""));
  const isChaveHeader = (h: string) => h.includes("chave") && h.includes("acesso");
  const isIeHeader = (h: string) => h === "ie" || h.includes("inscricao estadual");

  const chaveHeaderNaAC = isChaveHeader(headerNorm[COL_AC_CHAVE] || "");
  const ieHeaderNaZ = isIeHeader(headerNorm[COL_Z_IE_EMITENTE] || "");
  const chaveFallback = headerNorm.findIndex(isChaveHeader);
  const ieFallback = headerNorm.findIndex((h, idx) => idx >= COL_Z_IE_EMITENTE && isIeHeader(h));
  const chaveCol = chaveHeaderNaAC ? COL_AC_CHAVE : chaveFallback;
  const ieCol = ieHeaderNaZ ? COL_Z_IE_EMITENTE : ieFallback;
  const chaveColExiste = chaveCol >= 0;
  const ieColExiste = ieCol >= 0;

  if (!chaveColExiste) {
    result.errors.push("Cabeçalho RFT006 incompatível: coluna 'Chave de acesso' não encontrada.");
    result.diagnostics = {
      total_linhas_lidas: dataRows.length,
      linha_cabecalho: headerRow,
      coluna_chave_encontrada: false,
      coluna_ie_encontrada: ieColExiste,
      motivo_bloqueio: "ERP_LAYOUT_CHAVE_AUSENTE",
      tempo_ms: Math.round(performance.now() - t0),
    };
    return result;
  }
  if (!ieColExiste) {
    result.errors.push("Cabeçalho RFT006 incompatível: coluna 'IE' não encontrada.");
    result.diagnostics = {
      total_linhas_lidas: dataRows.length,
      linha_cabecalho: headerRow,
      coluna_chave_encontrada: chaveColExiste,
      coluna_ie_encontrada: false,
      motivo_bloqueio: "ERP_LAYOUT_IE_AUSENTE",
      tempo_ms: Math.round(performance.now() - t0),
    };
    return result;
  }
  if (dataRows.length === 0) {
    result.errors.push("Arquivo vazio ou sem linhas válidas para conferência.");
    result.diagnostics = {
      total_linhas_lidas: 0,
      linha_cabecalho: headerRow,
      motivo_bloqueio: "ERP_SEM_LINHAS",
      tempo_ms: Math.round(performance.now() - t0),
    };
    return result;
  }

  const regs: ParseResult["registrosErp"] = [];
  let semChave = 0;
  let semIE = 0;
  let chaveInvalidaTamanho = 0;
  const chavesAmostra: string[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const r = dataRows[i];
    // PROTEÇÃO 5: yield cooperativo a cada N linhas.
    if (i > 0 && i % YIELD_EVERY === 0) await yieldToUi();
    if (!r) continue;

    // Chave de acesso é texto: nunca converter para número.
    const chaveBruta = String(r[chaveCol] ?? "").trim();
    const chave = normalizeChave(chaveBruta);
    const ieEmitente = normalizeIE(String(r[ieCol] ?? ""));

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

    if (chave.length !== 44) {
      chaveInvalidaTamanho++;
      // Limita o ruído de avisos para não inflar logs em arquivos muito grandes.
      if (chaveInvalidaTamanho <= 5) {
        result.warnings.push(`Linha RFT006 com chave fora do padrão de 44 dígitos (${chave.length}).`);
      }
    }

    if (chavesAmostra.length < 5) chavesAmostra.push(chave);
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

  if (semChave > 0)
    result.warnings.push(`${semChave} linha(s) RFT006 sem chave de acesso. Elas foram ignoradas no matching.`);
  if (semIE > 0)
    result.warnings.push(`${semIE} linha(s) RFT006 com chave de acesso, mas sem IE do emitente. Elas serão avaliadas pelo motor; a chave continua considerada existente no ERP.`);

  const comChaveEstruturada = regs!.filter((r) => !!r.chave_acesso);
  const tempoMs = Math.round(performance.now() - t0);

  if (!regs!.length || !comChaveEstruturada.length) {
    // PRD 05/09: linha com chave e IE ausente continua estruturada para o motor decidir
    // entre divergência real e equivalência fiscal de isenção. Só bloqueamos se não houver chave.
    result.errors.push("Arquivo vazio ou sem linhas válidas para conferência.");
    result.diagnostics = {
      total_linhas_lidas: dataRows.length,
      total_registros_estruturados: regs!.length,
      total_com_chave_acesso: regs!.filter((r) => !!r.chave_acesso).length,
      total_com_inscricao_estadual_emitente: regs!.filter((r) => !!r.inscricao_estadual_emitente).length,
      total_sem_chave: semChave,
      total_sem_ie: semIE,
      total_chave_tamanho_invalido: chaveInvalidaTamanho,
      chaves_amostra_5: chavesAmostra,
      linha_cabecalho: headerRow,
      motivo_bloqueio: "ERP_SEM_LINHAS_COM_CHAVE",
      tempo_ms: tempoMs,
      tempo_parse_ms: tempoMs,
    };
    return result;
  }

  result.registrosErp = regs;
  const comChave = regs.filter((r) => !!r.chave_acesso).length;
  const comIE = regs.filter((r) => !!r.inscricao_estadual_emitente).length;
  result.diagnostics = {
    total_linhas_lidas: dataRows.length,
    total_registros_estruturados: regs.length,
    total_com_chave_acesso: comChave,
    total_com_inscricao_estadual_emitente: comIE,
    total_sem_chave: semChave,
    total_sem_ie: semIE,
    total_chave_tamanho_invalido: chaveInvalidaTamanho,
    chaves_amostra_5: chavesAmostra,
    linha_cabecalho: headerRow,
    coluna_chave_encontrada: true,
    coluna_ie_encontrada: true,
    coluna_chave_indice: chaveCol,
    coluna_ie_indice: ieCol,
    tempo_ms: tempoMs,
    tempo_parse_ms: tempoMs,
  };
  result.ok = true;
  return result;
}
