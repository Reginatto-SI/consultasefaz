import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { parseFile } from "@/lib/importer";

const chaveLegada = "11111111111111111111111111111111111111111111";
const chaveFornecedor = "22222222222222222222222222222222222222222222";

function makeRft006File(headers: string[], row: any[], name = "rft006.xlsx"): File {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, row]);
  XLSX.utils.book_append_sheet(wb, ws, "RFT006");
  const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return new File([buffer], name, { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

function baseHeaders(): string[] {
  const headers = Array.from({ length: 30 }, (_, idx) => `Col ${idx}`);
  headers[6] = "Data emissão";
  headers[8] = "Nota";
  headers[11] = "CFOP";
  headers[19] = "Valor";
  headers[24] = "CNPJ";
  headers[25] = "IE";
  headers[26] = "Razão Social";
  headers[28] = "Chave de acesso";
  return headers;
}

function baseRow(): any[] {
  const row = Array.from({ length: 30 }, () => null);
  row[6] = "01/01/2026";
  row[8] = "123";
  row[11] = "1102";
  row[19] = 100;
  row[24] = "12.345.678/0001-90";
  row[25] = "12345678";
  row[26] = "Fornecedor Teste";
  row[28] = chaveLegada;
  return row;
}

describe("parseFile RFT006 chave operacional", () => {
  it("prioriza Chave de acesso fornecedor quando a coluna existe", async () => {
    const headers = baseHeaders();
    const row = baseRow();
    headers[29] = "Chave de acesso fornecedor";
    row[29] = chaveFornecedor;

    const result = await parseFile(makeRft006File(headers, row), "ERP");

    expect(result.ok).toBe(true);
    expect(result.registrosErp?.[0].chave_acesso).toBe(chaveFornecedor);
    expect(result.registrosErp?.[0].payload_completo_erp["Chave de acesso"]).toBe(chaveLegada);
    expect(result.diagnostics?.coluna_chave_operacional_nome).toBe("Chave de acesso fornecedor");
    expect(result.diagnostics?.auditoria_total_chaves_unicas_rft006).toBe(1);
    expect(result.warnings).not.toContain("A coluna `Chave de acesso fornecedor` não foi encontrada. O sistema usou `Chave de acesso` como fallback. Verifique se o relatório é adequado para conferência de notas de entrada.");
  });

  it("usa Chave de acesso como fallback temporário quando fornecedor não existe", async () => {
    const result = await parseFile(makeRft006File(baseHeaders(), baseRow()), "ERP");

    expect(result.ok).toBe(true);
    expect(result.registrosErp?.[0].chave_acesso).toBe(chaveLegada);
    expect(result.diagnostics?.coluna_chave_operacional_nome).toBe("Chave de acesso");
    expect(result.warnings).toContain("A coluna `Chave de acesso fornecedor` não foi encontrada. O sistema usou `Chave de acesso` como fallback. Verifique se o relatório é adequado para conferência de notas de entrada.");
  });
});
