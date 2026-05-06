import { normalizeCnpj, normalizeIE } from "@/lib/engine";
import type { Empresa } from "@/lib/types";

export type DestinatarioConhecido = {
  apelido: string;
  razao_social: string;
  perfil: string;
  tributacao: string;
  cpf_cnpj: string;
  cpf_cnpj_normalizado: string;
  ie: string;
  ie_normalizada?: string;
};

const baseDestinatariosConhecidos: Array<Omit<DestinatarioConhecido, "cpf_cnpj_normalizado" | "ie_normalizada">> = [
  { apelido: "BOAFE", razao_social: "COOP. BOA FE COOPERATIVA DO AGRONEGOCIO BOAFECOOP", perfil: "COOPERATIVA", tributacao: "LUCRO REAL", cpf_cnpj: "48.927.637/0001-54", ie: "13.974.449-5" },
  { apelido: "COAMBE", razao_social: "COOP. AGROP MISTA BOA ESPERANCA LTDA", perfil: "COOPERATIVA", tributacao: "LUCRO REAL", cpf_cnpj: "36.891.034/0001-60", ie: "13.137.074-0" },
  // Destinatário conhecido informado via XML de exemplo para exibir apelido PERFIL no dropdown.
  { apelido: "PERFIL", razao_social: "PERFIL E MOCELLIN COM E ARMAZ DE GRAOS LTDA", perfil: "", tributacao: "", cpf_cnpj: "44.187.258/0001-14", ie: "139066217" },
  { apelido: "COOPERAGRO M.", razao_social: "COOP. AGROPECUARIA DE NOVA MUTUM COOPERAGRO MUTUM", perfil: "COOPERATIVA", tributacao: "LUCRO REAL", cpf_cnpj: "46.203.786/0001-45", ie: "13.936.241-0" },
  { apelido: "COAFORTE", razao_social: "COOP. AGROPECUARIA FORTE COAFORTE", perfil: "COOPERATIVA", tributacao: "LUCRO REAL", cpf_cnpj: "52.898.785/0001-65", ie: "14.028.685-3" },
  { apelido: "COAVERDE", razao_social: "COOP. AGROPECUARIA RIOVERDENSE COAVERDE", perfil: "COOPERATIVA", tributacao: "LUCRO REAL", cpf_cnpj: "53.062.948/0001-38", ie: "14.031.846-1" },
  { apelido: "COOAN", razao_social: "COOP. AGRICOLA NORTE - COOAN", perfil: "COOPERATIVA", tributacao: "LUCRO REAL", cpf_cnpj: "54.408.546/0001-05", ie: "14.049.699-8" },
  { apelido: "MTCOTTON", razao_social: "COOP. MTCOTTON COOPERATIVA DOS ALGODOEIROS DE NOVA MUTUM", perfil: "COOPERATIVA", tributacao: "LUCRO REAL", cpf_cnpj: "57.046.846/0001-80", ie: "14.078.067-0" },
  { apelido: "OURO VERDE", razao_social: "OURO VERDE COOP", perfil: "COOPERATIVA", tributacao: "LUCRO REAL", cpf_cnpj: "57.509.420/0001-15", ie: "14.083.802-3" },
  { apelido: "COANOVA", razao_social: "COANOVA COOPERATIVA", perfil: "COOPERATIVA", tributacao: "LUCRO REAL", cpf_cnpj: "57.624.081/0001-18", ie: "14.085.103-8" },
  { apelido: "COOPERAGRO F.", razao_social: "COOPERAGRO MUTUM FILIAL", perfil: "COOPERATIVA", tributacao: "LUCRO REAL", cpf_cnpj: "46.203.786/0002-26", ie: "14.129.094-3" },
  { apelido: "COOPERPLAN", razao_social: "COOPERPLAN", perfil: "COOPERATIVA", tributacao: "LUCRO REAL", cpf_cnpj: "60.090.599/0001-23", ie: "14.115.152-8" },
];

export const DESTINATARIOS_CONHECIDOS: DestinatarioConhecido[] = baseDestinatariosConhecidos.map((item) => ({
  ...item,
  cpf_cnpj_normalizado: normalizeCnpj(item.cpf_cnpj),
  ie_normalizada: normalizeIE(item.ie),
}));

export function findDestinatarioConhecidoByDocumento(cpfCnpj: string): DestinatarioConhecido | undefined {
  const docNormalizado = normalizeCnpj(cpfCnpj);
  if (!docNormalizado) return undefined;
  return DESTINATARIOS_CONHECIDOS.find((item) => item.cpf_cnpj_normalizado === docNormalizado);
}

export function aplicarDestinatarioConhecidoNaEmpresa(empresa: Empresa): Empresa {
  const known = findDestinatarioConhecidoByDocumento(empresa.cnpj);
  if (!known) return empresa;

  // Garante que empresas já persistidas com fallback (ex.: "Empresa 44187258")
  // também passem a exibir o apelido conhecido sem exigir limpeza manual do navegador.
  return {
    ...empresa,
    nome: known.apelido,
    inscricao_estadual: known.ie,
    razao_social: known.razao_social,
    perfil: known.perfil,
    tributacao: known.tributacao,
    destinatario_apelido: known.apelido,
  };
}
