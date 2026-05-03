import type {
  DatasetLinha,
  Empresa,
  Excecao,
  NotaSefaz,
  RegistroErp,
  ResultadoMatching,
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

export function normalizeIE(value?: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;

  // Removemos zeros à esquerda para compatibilizar IE textual da SEFAZ com IE numérica do RFT006/Maxicon no matching.
  const numeros = String(value).replace(/\D/g, "");
  const semZerosAEsquerda = numeros.replace(/^0+/, "");

  return semZerosAEsquerda || undefined;
}

export function normalizeStatus(s: string): StatusSefaz {
  const v = (s || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (v.includes("autorizad")) {
    return v.includes("fora do prazo") ? "autorizada fora do prazo" : "autorizada";
  }
  if (v.includes("cancelad")) return "cancelada";
  if (v.includes("rejeitad")) return "rejeitada";
  if (v.includes("denegad")) return "denegada";
  if (v.includes("inutiliz") || v.includes("inexist")) return "inutilizada";
  return "desconhecido";
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

  // PRD 05/07: indexação ERP por chave_acesso para matching determinístico.
  const erpByChave = new Map<string, RegistroErp[]>();
  for (const r of erp) {
    const chaveBase = r.chave_acesso || r.chave_nfe || "";
    const k = normalizeChave(chaveBase);
    if (!k) continue;
    const arr = erpByChave.get(k) ?? [];
    arr.push(r);
    erpByChave.set(k, arr);
  }

  const excIdx = new Map<string, Excecao>();
  const excByChave = new Map<string, Excecao>();
  for (const ex of excecoes) {
    if (!ex.ativa) continue;
    const chaveN = normalizeChave(ex.chave_nfe);
    if (!chaveN) continue;

    excIdx.set(`${ex.empresa_id}|${chaveN}`, ex);
    // Regra de negócio: exceção ativa tem precedência máxima sobre qualquer classificação automática.
    // Na V1, o empresa_id é local (destinatário) e pode mudar após limpar/reimportar; por isso o fallback por chave.
    if (!excByChave.has(chaveN)) excByChave.set(chaveN, ex);
  }

  const linhas: DatasetLinha[] = [];

  for (const n of notas) {
    const chave = normalizeChave(n.chave_nfe);
    if (!chave) continue;
    const ieEmitenteSefaz = normalizeIE(n.emitente_inscricao_estadual);

    const erpMatches = erpByChave.get(chave) ?? [];
    let resultado_matching: ResultadoMatching = "CHAVE_NAO_ENCONTRADA";
    let chave_existe_no_erp = false;
    let ie_emitente_confere = false;
    let encontrada_no_erp = false;

    if (erpMatches.length > 0) {
      chave_existe_no_erp = true;
      // PRD 05/09: comparar IE do emitente da SEFAZ com IE do emitente no RFT006.
      ie_emitente_confere = !!ieEmitenteSefaz && erpMatches.some((r) => {
        const ieErp = normalizeIE(r.inscricao_estadual_emitente);
        return !!ieErp && ieErp === ieEmitenteSefaz;
      });

      if (ie_emitente_confere) {
        resultado_matching = "CONFIRMADO";
        encontrada_no_erp = true;
      } else {
        resultado_matching = "IE_EMITENTE_DIVERGENTE";
      }
    }

    const ex = excIdx.get(`${n.empresa_id}|${chave}`) ?? excByChave.get(chave);
    const statusValido = STATUS_VALIDOS.includes(n.status_sefaz);

    let status_final: StatusFinal;
    if (ex) {
      status_final = "DESCONSIDERADA";
    } else if (!statusValido && resultado_matching === "CHAVE_NAO_ENCONTRADA") {
      continue; // IGNORADA interna
    } else if (!statusValido) {
      status_final = "IRREGULAR";
    } else if (resultado_matching === "CONFIRMADO") {
      status_final = "OK";
    } else if (resultado_matching === "IE_EMITENTE_DIVERGENTE") {
      status_final = "IRREGULAR";
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
      chave_existe_no_erp,
      ie_emitente_confere,
      encontrada_no_erp,
      resultado_matching,
      motivo_divergencia:
        resultado_matching === "CONFIRMADO" ? null : resultado_matching,
      tem_excecao_ativa: !!ex,
      motivo_excecao: ex?.motivo,
      data_emissao: n.data_emissao,
      payload_resumo_tabela: {
        emitente: n.emitente_razao_social ?? n.payload_completo?.emitente_razao_social,
        valor: n.payload_completo?.valor_total_nota_fiscal,
        numero: n.payload_completo?.numero_nota_fiscal,
      },
      payload_completo_drawer: n.payload_completo,
      referencia_execucao,
    });
  }

  return linhas;
}
