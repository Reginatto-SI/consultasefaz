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

export const IE_ISENTO_MARKER = "__ISENTO__";

export function normalizeIE(value?: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;

  const textoOriginal = String(value).trim();
  if (!textoOriginal || textoOriginal === "—" || textoOriginal === "-") return undefined;

  // PRD 05: IE do emitente isento precisa de marcador interno determinístico para
  // diferenciar isenção textual de ausência real. Não remova essa regra: sem ela,
  // ERP/RFT006 com "ISENTO" volta a ser tratado como IE ausente/divergente.
  const textoNormalizado = textoOriginal
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

  const numeros = textoOriginal.replace(/\D/g, "");
  if (numeros) {
    // Removemos zeros à esquerda para compatibilizar IE textual da SEFAZ com IE numérica do RFT006/Maxicon no matching.
    const semZerosAEsquerda = numeros.replace(/^0+/, "");
    return semZerosAEsquerda || undefined;
  }

  const termosIsencao = new Set([
    "ISENTO",
    "ISENTA",
    "ISENCAO",
    "SEM IE",
    "SEM INSCRICAO",
    "SEM INSCRICAO ESTADUAL",
    "NAO CONTRIBUINTE",
  ]);

  return termosIsencao.has(textoNormalizado) ? IE_ISENTO_MARKER : undefined;
}

function isIEIsento(ie?: string): boolean {
  return ie === IE_ISENTO_MARKER;
}

function isIECompativel(ieSefaz?: string, ieErp?: string): boolean {
  if (ieSefaz && ieErp && ieSefaz === ieErp) return true;

  // PRD 05: isenção textual em um lado autoriza equivalência com ausência real no outro.
  // Ausência pura contra IE numérica continua divergente.
  return (isIEIsento(ieSefaz) && !ieErp)
    || (!ieSefaz && isIEIsento(ieErp));
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


function getNaturezaOperacao(payload: Record<string, any> | undefined): string | null {
  if (!payload) return null;

  const valor = payload["NATUREZA DE OPERAÇÃO"]
    ?? payload["NATUREZA OPERACAO"]
    ?? payload.natureza_operacao
    ?? payload.naturezaDeOperacao
    ?? payload.natureza
    ?? payload.operacao;

  if (valor === null || valor === undefined) return null;
  const texto = String(valor).trim();
  return texto || null;
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
    let ie_emitente_rft006_encontrada: string | undefined;
    let possuiLinhaErpSemIE = false;
    let possuiLinhaErpComIE = false;

    if (erpMatches.length > 0) {
      chave_existe_no_erp = true;
      // PRD 05/09: comparar IE do emitente da SEFAZ com IE do emitente no RFT006.
      // Diferença crítica: uma linha RFT006 sem IE é inelegível para confirmar matching por chave+IE,
      // porém ainda comprova que a chave existe no ERP. Esse cenário é erro de escrituração (IRREGULAR),
      // não ausência de chave (FALTANTE).
      ie_emitente_confere = erpMatches.some((r) => {
        const ieErp = normalizeIE(r.inscricao_estadual_emitente);
        if (ieErp && !ie_emitente_rft006_encontrada) ie_emitente_rft006_encontrada = ieErp;
        if (ieErp) possuiLinhaErpComIE = true;
        if (!ieErp) possuiLinhaErpSemIE = true;
        return isIECompativel(ieEmitenteSefaz, ieErp);
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
    // Regra explícita de motivo operacional:
    // 1) chave inexistente no ERP => CHAVE_NAO_ENCONTRADA
    // 2) chave existe e IE confirma => sem divergência
    // 3) chave existe e todas as linhas estão sem IE => IE_EMITENTE_AUSENTE_RFT006
    // 4) chave existe e há IE preenchida divergente (inclusive cenário misto com linhas sem IE) => IE_EMITENTE_DIVERGENTE
    // Observação PRD 05: IE isenta compatível com ausência já chega aqui como CONFIRMADO.
    const motivoDivergencia = resultado_matching === "CONFIRMADO"
      ? null
      : resultado_matching === "IE_EMITENTE_DIVERGENTE" && possuiLinhaErpSemIE && !possuiLinhaErpComIE
        ? "IE_EMITENTE_AUSENTE_RFT006"
      : resultado_matching;

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
      motivo_divergencia: motivoDivergencia,
      ie_emitente_sefaz: ieEmitenteSefaz,
      ie_emitente_rft006_encontrada,
      tem_excecao_ativa: !!ex,
      motivo_excecao: ex?.motivo,
      data_emissao: n.data_emissao,
      payload_resumo_tabela: {
        emitente: n.emitente_razao_social ?? n.payload_completo?.emitente_razao_social,
        valor: n.payload_completo?.valor_total_nota_fiscal,
        numero: n.payload_completo?.numero_nota_fiscal,
        // A natureza da operação vem preservada do payload SEFAZ e é exposta no resumo para a tabela evitar leitura direta do payload bruto.
        natureza_operacao: getNaturezaOperacao(n.payload_completo),
      },
      payload_completo_drawer: n.payload_completo,
      referencia_execucao,
    });
  }

  return linhas;
}
