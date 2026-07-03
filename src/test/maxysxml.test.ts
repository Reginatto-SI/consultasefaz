import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { rodarMotor } from "@/lib/engine";
import { parseFile } from "@/lib/importer";
import { analisarMaxysXML } from "@/lib/maxysxml";
import { labelSituacaoXmlConferencia } from "@/pages/views/ConferenciaView";
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

  it("classifica chave igual na SEFAZ e no MaxysXML como XML_PRESENTE", () => {
    const resultado = analisarMaxysXML(baseDataset(), [reg(CHAVE_A)]);
    expect(resultado.find((item) => item.chave_nfe === CHAVE_A)?.situacao_xml_maxys).toBe("XML_PRESENTE");
  });

  it("normaliza chave MaxysXML importada como texto com pontuação", () => {
    const resultado = analisarMaxysXML(baseDataset(), [reg(`${CHAVE_A.slice(0, 4)}.${CHAVE_A.slice(4)}`)]);
    expect(resultado.find((item) => item.chave_nfe === CHAVE_A)?.situacao_xml_maxys).toBe("XML_PRESENTE");
  });

  it("classifica chave existente na SEFAZ e ausente no MaxysXML como XML_PENDENTE_MAXYS", () => {
    const resultado = analisarMaxysXML(baseDataset(), [reg(CHAVE_A)]);
    expect(resultado.find((item) => item.chave_nfe === CHAVE_B)?.situacao_xml_maxys).toBe("XML_PENDENTE_MAXYS");
  });

  it("não altera status principal OK quando XML está encontrado ou pendente", () => {
    const dataset = baseDataset();
    const statusOriginal = dataset.find((linha) => linha.chave_nfe === CHAVE_A)?.status_final;
    const encontrado = analisarMaxysXML(dataset, [reg(CHAVE_A)]);
    const pendente = analisarMaxysXML(dataset, [reg(CHAVE_B)]);

    expect(statusOriginal).toBe("OK");
    expect(dataset.find((linha) => linha.chave_nfe === CHAVE_A)?.status_final).toBe("OK");
    expect(encontrado.find((item) => item.chave_nfe === CHAVE_A)?.situacao_xml_maxys).toBe("XML_PRESENTE");
    expect(pendente.find((item) => item.chave_nfe === CHAVE_A)?.situacao_xml_maxys).toBe("XML_PENDENTE_MAXYS");
    expect(dataset.find((linha) => linha.chave_nfe === CHAVE_A)?.status_final).toBe("OK");
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


describe("importação e UI MaxysXML", () => {
  it("preserva chave de 44 dígitos ao importar XLSX com célula texto", async () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([["Chave de Acesso", "Status XML"], [CHAVE_A, "Armazenado"]]);
    XLSX.utils.book_append_sheet(wb, ws, "MaxysXML");
    const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    const result = await parseFile(new File([buffer], "maxys.xlsx"), "MAXYSXML");

    expect(result.ok).toBe(true);
    expect(result.registrosMaxysXML?.[0].chave_acesso).toBe(CHAVE_A);
    expect(result.registrosMaxysXML?.[0].chave_acesso).toHaveLength(44);
  });

  it("exibe situação XML complementar sem alterar status principal", () => {
    expect(labelSituacaoXmlConferencia("XML_PRESENTE")).toBe("Encontrado");
    expect(labelSituacaoXmlConferencia("XML_PENDENTE_MAXYS")).toBe("Pendente");
    expect(labelSituacaoXmlConferencia("XML_PRESENTE_NAO_ARMAZENADO")).toBe("Verificar armazenamento");
    expect(labelSituacaoXmlConferencia()).toBe("Não analisado");
  });

  it("permite combinar filtro de status principal e situação XML em memória", () => {
    const dataset = baseDataset();
    const maxys = analisarMaxysXML(dataset, [reg(CHAVE_B)]);
    const byChave = new Map(maxys.map((item) => [item.chave_nfe, item]));
    const linhas = dataset.map((linha) => ({ ...linha, maxysxml: byChave.get(linha.chave_nfe) }));

    expect(linhas.filter((linha) => linha.status_final === "OK" && linha.maxysxml?.situacao_xml_maxys === "XML_PENDENTE_MAXYS")).toHaveLength(1);
    expect(linhas.filter((linha) => linha.status_final === "OK" && linha.maxysxml?.situacao_xml_maxys === "XML_PRESENTE")).toHaveLength(0);
  });
});

describe("importação SEFAZ/RFT006 sem regressão de leitura bruta", () => {
  it("mantém datas, valores, chave NF-e, IE e CNPJ na importação SEFAZ", async () => {
    const headers = Array.from({ length: 25 }, (_, index) => `col_${index}`);
    headers[0] = "Data Emissão";
    headers[2] = "Número NF";
    headers[3] = "Chave de Acesso";
    headers[8] = "Situação";
    headers[9] = "CNPJ Emitente";
    headers[10] = "Razão Emitente";
    headers[11] = "Inscrição Estadual";
    headers[14] = "CNPJ Destinatário";
    headers[15] = "IE Destinatário";
    headers[16] = "Razão Destinatário";
    headers[24] = "Valor Total";
    const row = [new Date("2026-02-03T00:00:00.000Z"), null, 123, CHAVE_A, null, null, null, null, "Autorizada", "12345678000190", "Emitente Teste", "001234", null, null, "00987654000100", "ISENTO", "Destinatário Teste"];
    row[24] = 1500.75;
    const result = await parseFile(xlsxFile([headers, row], "sefaz.xlsx"), "SEFAZ");
    const nota = result.notasSefaz?.[0];

    expect(result.ok).toBe(true);
    expect(nota?.chave_nfe).toBe(CHAVE_A);
    expect(nota?.status_sefaz).toBe("autorizada");
    expect(nota?.data_emissao).toBe("2026-02-03T00:00:00.000Z");
    expect(nota?.emitente_inscricao_estadual).toBe("1234");
    expect(nota?.emitente_cnpj_cpf).toBe("12345678000190");
    expect(nota?.destinatario_cnpj_cpf).toBe("00987654000100");
    expect(nota?.payload_completo.valor_total_nota_fiscal).toBe(1500.75);
  });

  it("mantém campos usados pelo motor na importação RFT006/ERP", async () => {
    const headers = Array.from({ length: 29 }, (_, index) => `col_${index}`);
    headers[6] = "Data Emissão";
    headers[8] = "Número NF";
    headers[11] = "CFOP";
    headers[19] = "Valor Total";
    headers[24] = "CNPJ CPF";
    headers[25] = "IE";
    headers[26] = "Emitente";
    headers[28] = "Chave de acesso fornecedor";
    const row = Array.from({ length: 29 }, () => null);
    row[6] = new Date("2026-02-04T00:00:00.000Z");
    row[8] = 456;
    row[11] = 1102;
    row[19] = 2300.5;
    row[24] = "12345678000190";
    row[25] = "0005678";
    row[26] = "Emitente ERP";
    row[28] = CHAVE_A;
    const result = await parseFile(xlsxFile([headers, row], "rft006.xlsx"), "ERP");
    const registro = result.registrosErp?.[0];

    expect(result.ok).toBe(true);
    expect(registro?.chave_acesso).toBe(CHAVE_A);
    expect(registro?.inscricao_estadual_emitente).toBe("5678");
    expect(registro?.payload_completo_erp.emitente_cnpj_cpf).toBe("12345678000190");
    expect(registro?.payload_completo_erp.data_emissao_erp).toBe("2026-02-04T00:00:00.000Z");
    expect(registro?.payload_completo_erp.valor_total).toBe(2300.5);
    expect(registro?.payload_completo_erp.numero_nota_fiscal).toBe(456);
    expect(registro?.payload_completo_erp.cfop).toBe(1102);
  });
});

function xlsxFile(rows: unknown[][], name: string) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "Planilha");
  const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return new File([buffer], name);
}
