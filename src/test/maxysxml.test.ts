import { describe, expect, it } from "vitest";
import { rodarMotor } from "@/lib/engine";
import { analisarMaxysXML } from "@/lib/maxysxml";
import type { Empresa, NotaSefaz, RegistroErp, RegistroMaxysXML } from "@/lib/types";

const CHAVE_A = "1".repeat(44);
const CHAVE_B = "2".repeat(44);
const CHAVE_FORA = "3".repeat(44);

const empresas: Empresa[] = [{ id: "emp-1", nome: "Destinatário", cnpj: "123" }];
const notas: NotaSefaz[] = [
  {
    id: "n1",
    empresa_id: "emp-1",
    chave_nfe: CHAVE_A,
    status_sefaz: "autorizada",
    data_emissao: "2026-01-01T00:00:00.000Z",
    emitente_inscricao_estadual: "123",
    destinatario_cnpj_cpf: "123",
    payload_completo: { numero_nota_fiscal: "10" },
    importacao_id: "imp",
  },
  {
    id: "n2",
    empresa_id: "emp-1",
    chave_nfe: CHAVE_B,
    status_sefaz: "autorizada",
    data_emissao: "2026-01-02T00:00:00.000Z",
    emitente_inscricao_estadual: "456",
    destinatario_cnpj_cpf: "123",
    payload_completo: { numero_nota_fiscal: "11" },
    importacao_id: "imp",
  },
];
const erp: RegistroErp[] = [{ id: "e1", chave_acesso: CHAVE_A, inscricao_estadual_emitente: "123", payload_completo_erp: {}, importacao_id: "imp" }];

function baseDataset() {
  return rodarMotor({ notas, erp, excecoes: [], empresas, referencia_execucao: "ref" });
}

function reg(chave: string, status_xml = "Armazenado"): RegistroMaxysXML {
  return { id: chave, chave_acesso: chave, arquivo_nome: "maxys.xlsx", importacao_id: "imp", status_xml, payload_completo_maxysxml: { "Chave de Acesso": chave } };
}

describe("análise MaxysXML", () => {
  it("não altera status principal quando ausente", () => {
    const dataset = baseDataset();
    expect(analisarMaxysXML(dataset, [])).toEqual([]);
    expect(dataset.find((linha) => linha.chave_nfe === CHAVE_B)?.status_final).toBe("FALTANTE");
  });

  it("classifica chave encontrada como XML_PRESENTE", () => {
    const resultado = analisarMaxysXML(baseDataset(), [reg(CHAVE_A)]);
    expect(resultado.find((item) => item.chave_nfe === CHAVE_A)?.situacao_xml_maxys).toBe("XML_PRESENTE");
  });

  it("classifica chave SEFAZ ausente no MaxysXML como XML_PENDENTE_MAXYS", () => {
    const resultado = analisarMaxysXML(baseDataset(), [reg(CHAVE_A)]);
    expect(resultado.find((item) => item.chave_nfe === CHAVE_B)?.situacao_xml_maxys).toBe("XML_PENDENTE_MAXYS");
  });

  it("classifica chave MaxysXML fora da SEFAZ atual sem criar linha de conferência", () => {
    const resultado = analisarMaxysXML(baseDataset(), [reg(CHAVE_A), reg(CHAVE_FORA)]);
    const fora = resultado.find((item) => item.chave_nfe === CHAVE_FORA);
    expect(fora?.situacao_xml_maxys).toBe("XML_FORA_DA_SEFAZ_ATUAL");
    expect(fora?.linha_conferencia).toBeUndefined();
  });

  it("trata status_xml vazio com chave encontrada como XML_PRESENTE", () => {
    const resultado = analisarMaxysXML(baseDataset(), [reg(CHAVE_A, "")]);
    expect(resultado.find((item) => item.chave_nfe === CHAVE_A)?.situacao_xml_maxys).toBe("XML_PRESENTE");
  });

  it("consolida duplicidade e considera presente se algum registro estiver armazenado", () => {
    const resultado = analisarMaxysXML(baseDataset(), [reg(CHAVE_A, "Erro"), reg(CHAVE_A, "Armazenado")]);
    const item = resultado.find((entry) => entry.chave_nfe === CHAVE_A)!;
    expect(item.situacao_xml_maxys).toBe("XML_PRESENTE");
    expect(item.payload_maxysxml_drawer).toHaveLength(2);
  });
});
