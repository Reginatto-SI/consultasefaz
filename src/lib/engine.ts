import type {
  DatasetLinha,
  Empresa,
  Excecao,
  NotaSefaz,
  RegistroErp,
  StatusFinal,
  StatusSefaz,
} from "./types";

export const STATUS_VALIDOS: StatusSefaz[] = ["autorizada", "autorizada fora do prazo"];

export function normalizeChave(s: string): string {
  return (s || "").replace(/\D/g, "").trim();
}

export function normalizeCnpj(s: string): string {
  return (s || "").replace(/\D/g, "").trim();
}

export function normalizeIE(s?: string): string | undefined {
  if (!s) return undefined;
  const n = s.replace(/\D/g, "").trim();
  return n || undefined;
}

export function normalizeStatus(s: string): StatusSefaz | null {
  const v = (s || "").trim().toLowerCase();
  const map: Record<string, StatusSefaz> = {
    "autorizada": "autorizada",
    "autorizado": "autorizada",
    "autorizada fora do prazo": "autorizada fora do prazo",
    "autorizado fora do prazo": "autorizada fora do prazo",
    "cancelada": "cancelada",
    "cancelado": "cancelada",
    "rejeitada": "rejeitada",
    "rejeitado": "rejeitada",
    "denegada": "denegada",
    "denegado": "denegada",
    "inutilizada": "inutilizada",
    "inutilizado": "inutilizada",
  };
  return map[v] ?? null;
}

export interface MotorInput {
  notas: NotaSefaz[];
  erp: RegistroErp[];
  excecoes: Excecao[];
  empresas: Empresa[];
  referencia_execucao: string;
}

export function rodarMotor(input: MotorInput): DatasetLinha[] {
  const { notas, erp, excecoes, empresas, referencia_execucao } = input;
  const empresaById = new Map(empresas.map((e) => [e.id, e]));

  // Index ERP by chave -> list of IEs (or undefined)
  const erpByChave = new Map<string, RegistroErp[]>();
  for (const r of erp) {
    const k = normalizeChave(r.chave_nfe);
    if (!k) continue;
    const arr = erpByChave.get(k) ?? [];
    arr.push(r);
    erpByChave.set(k, arr);
  }

  // Excecoes index: empresa_id|chave -> excecao ativa
  const excIdx = new Map<string, Excecao>();
  for (const ex of excecoes) {
    if (!ex.ativa) continue;
    excIdx.set(`${ex.empresa_id}|${normalizeChave(ex.chave_nfe)}`, ex);
  }

  const linhas: DatasetLinha[] = [];

  for (const n of notas) {
    const chave = normalizeChave(n.chave_nfe);
    if (!chave) continue;

    const erpMatches = erpByChave.get(chave) ?? [];
    // matching rule: if any ERP record has IE filled → match by chave + IE
    // else match by chave only (pure existence)
    let encontrada = false;
    if (erpMatches.length > 0) {
      const comIE = erpMatches.filter((r) => normalizeIE(r.inscricao_estadual));
      if (comIE.length > 0) {
        const ieDest = normalizeIE(n.inscricao_estadual_destinatario);
        encontrada = ieDest
          ? comIE.some((r) => normalizeIE(r.inscricao_estadual) === ieDest)
          : false;
        // fallback: also accept records without IE
        const semIE = erpMatches.filter((r) => !normalizeIE(r.inscricao_estadual));
        if (!encontrada && semIE.length > 0) encontrada = true;
      } else {
        encontrada = true;
      }
    }

    const ex = excIdx.get(`${n.empresa_id}|${chave}`);
    const valido = STATUS_VALIDOS.includes(n.status_sefaz);

    let status_final: StatusFinal;
    if (ex) {
      status_final = "DESCONSIDERADA";
    } else if (!valido && encontrada) {
      status_final = "IRREGULAR";
    } else if (!valido && !encontrada) {
      continue; // IGNORADA — não exibir
    } else if (valido && encontrada) {
      status_final = "OK";
    } else {
      status_final = "FALTANTE";
    }

    const empresa = empresaById.get(n.empresa_id);
    linhas.push({
      empresa_id: n.empresa_id,
      empresa_nome: empresa?.nome ?? "—",
      chave_nfe: chave,
      status_final,
      status_sefaz: n.status_sefaz,
      encontrada_no_erp: encontrada,
      tem_excecao_ativa: !!ex,
      motivo_excecao: ex?.motivo,
      data_emissao: n.data_emissao,
      payload_resumo_tabela: {
        emitente: n.payload_completo?.emitente ?? n.payload_completo?.razao_social_emitente,
        valor: n.payload_completo?.valor_total ?? n.payload_completo?.valor,
        numero: n.payload_completo?.numero,
      },
      payload_completo_drawer: n.payload_completo,
      referencia_execucao,
    });
  }

  return linhas;
}
