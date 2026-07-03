import type { DatasetLinha, ResultadoMaxysXMLPorNota, RegistroMaxysXML, SituacaoXmlMaxys } from "@/lib/types";
import { normalizeChave } from "@/lib/engine";

const STATUS_PRESENTE = ["armazen", "dispon", "localiz", "baixad", "ok", "importad", "presente", "autorizad"];
const STATUS_NAO_ARMAZENADO = ["nao armazen", "não armazen", "ausent", "erro", "falha", "pendente", "inexist", "nao localiz", "não localiz", "rejeitad"];

function normText(value?: string) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function classificarStatusXmlMaxys(status?: string): "PRESENTE" | "NAO_ARMAZENADO" | "DESCONHECIDO" {
  const text = normText(status);
  if (!text) return "PRESENTE";
  if (STATUS_NAO_ARMAZENADO.some((term) => text.includes(term))) return "NAO_ARMAZENADO";
  if (STATUS_PRESENTE.some((term) => text.includes(term))) return "PRESENTE";
  return "DESCONHECIDO";
}

function pickRegistroPreferencial(registros: RegistroMaxysXML[]) {
  return registros.find((registro) => classificarStatusXmlMaxys(registro.status_xml) === "PRESENTE") ?? registros[0];
}

function toPayload(registros: RegistroMaxysXML[]) {
  return registros.map((registro) => ({
    ...registro.payload_completo_maxysxml,
    chave_acesso: registro.chave_acesso,
    status_xml: registro.status_xml,
    status_erp_maxys: registro.status_erp_maxys,
    status_sefaz_maxys: registro.status_sefaz_maxys,
  }));
}

export function analisarMaxysXML(dataset: DatasetLinha[], registros: RegistroMaxysXML[]): ResultadoMaxysXMLPorNota[] {
  if (!registros.length) return [];

  const maxysByChave = new Map<string, RegistroMaxysXML[]>();
  for (const registro of registros) {
    const chave = normalizeChave(registro.chave_acesso);
    if (!chave || chave.length !== 44) continue;
    const atuais = maxysByChave.get(chave) ?? [];
    atuais.push(registro);
    maxysByChave.set(chave, atuais);
  }

  const chavesSefaz = new Set<string>();
  const resultados: ResultadoMaxysXMLPorNota[] = dataset.map((linha) => {
    const chave = normalizeChave(linha.chave_nfe);
    chavesSefaz.add(chave);
    const encontrados = maxysByChave.get(chave) ?? [];

    if (!encontrados.length) {
      return {
        chave_nfe: chave,
        xml_existe_no_maxysxml: false,
        situacao_xml_maxys: "XML_PENDENTE_MAXYS",
        payload_maxysxml_drawer: [],
        linha_conferencia: linha,
      };
    }

    const preferencial = pickRegistroPreferencial(encontrados);
    const algumPresente = encontrados.some((registro) => classificarStatusXmlMaxys(registro.status_xml) === "PRESENTE");
    const algumNaoArmazenado = encontrados.some((registro) => classificarStatusXmlMaxys(registro.status_xml) === "NAO_ARMAZENADO");
    const situacao: SituacaoXmlMaxys = algumPresente || !algumNaoArmazenado ? "XML_PRESENTE" : "XML_PRESENTE_NAO_ARMAZENADO";

    return {
      chave_nfe: chave,
      xml_existe_no_maxysxml: true,
      situacao_xml_maxys: situacao,
      status_xml_maxys: preferencial?.status_xml,
      status_erp_maxys: preferencial?.status_erp_maxys,
      status_sefaz_maxys: preferencial?.status_sefaz_maxys,
      registro_maxysxml_encontrado: preferencial,
      payload_maxysxml_drawer: toPayload(encontrados),
      linha_conferencia: linha,
    };
  });

  for (const [chave, encontrados] of maxysByChave.entries()) {
    if (chavesSefaz.has(chave)) continue;
    const preferencial = pickRegistroPreferencial(encontrados);
    resultados.push({
      chave_nfe: chave,
      xml_existe_no_maxysxml: true,
      situacao_xml_maxys: "XML_FORA_DA_SEFAZ_ATUAL",
      status_xml_maxys: preferencial?.status_xml,
      status_erp_maxys: preferencial?.status_erp_maxys,
      status_sefaz_maxys: preferencial?.status_sefaz_maxys,
      registro_maxysxml_encontrado: preferencial,
      payload_maxysxml_drawer: toPayload(encontrados),
    });
  }

  return resultados;
}
