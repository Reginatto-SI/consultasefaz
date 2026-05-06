import { describe, expect, it } from "vitest";
import { IE_ISENTO_MARKER, normalizeIE, rodarMotor } from "@/lib/engine";
import type { Empresa, Excecao, NotaSefaz, RegistroErp } from "@/lib/types";
import { shouldShowVerificarIE } from "@/pages/views/ConferenciaView";

const chave = "5126012931659600468550020001698091027317497";
const empresa: Empresa = { id: "dest-1", nome: "Destinatário Teste", cnpj: "12345678000190" };

function montarNota(ie: string, status: NotaSefaz["status_sefaz"] = "autorizada"): NotaSefaz {
  return {
    id: "n1",
    empresa_id: empresa.id,
    chave_nfe: chave,
    status_sefaz: status,
    data_emissao: "2026-01-18",
    emitente_inscricao_estadual: ie,
    destinatario_cnpj_cpf: empresa.cnpj,
    payload_completo: {},
    importacao_id: "imp-sefaz",
  };
}

function montarErp(ie?: string): RegistroErp {
  return {
    id: "e1",
    chave_acesso: chave,
    inscricao_estadual_emitente: ie,
    payload_completo_erp: {},
    importacao_id: "imp-erp",
  };
}

function conferir(ieSefaz: string, ieErp?: string, excecoes: Excecao[] = []) {
  return rodarMotor({
    notas: [montarNota(ieSefaz)],
    erp: [montarErp(ieErp)],
    excecoes,
    empresas: [empresa],
    referencia_execucao: "2026-05-06T00:00:00.000Z",
  })[0];
}

describe("rodarMotor - IE de emitente isento", () => {
  it("normaliza IE numérica e textos de isenção de forma determinística", () => {
    expect(normalizeIE("13.568.263-0")).toBe("135682630");
    expect(normalizeIE("ISENTO")).toBe(IE_ISENTO_MARKER);
    expect(normalizeIE("Sem inscrição estadual")).toBe(IE_ISENTO_MARKER);
    expect(normalizeIE("NÃO CONTRIBUINTE")).toBe(IE_ISENTO_MARKER);
    expect(normalizeIE("—")).toBeUndefined();
  });

  it("cenário 1: confirma IE numérica igual", () => {
    const linha = conferir("135682630", "135682630");

    expect(linha.resultado_matching).toBe("CONFIRMADO");
    expect(linha.motivo_divergencia).toBeNull();
    expect(linha.ie_emitente_confere).toBe(true);
  });

  it("cenário 2: mantém divergência quando IE numérica da SEFAZ está ausente no RFT006", () => {
    const linha = conferir("135682630", "");

    expect(linha.resultado_matching).toBe("IE_EMITENTE_DIVERGENTE");
    expect(linha.motivo_divergencia).toBe("IE_EMITENTE_AUSENTE_RFT006");
    expect(linha.ie_emitente_confere).toBe(false);
    expect(shouldShowVerificarIE(linha)).toBe(true);
  });

  it("cenário 3: confirma SEFAZ ausente com RFT006 ISENTO", () => {
    const linha = conferir("", "ISENTO");

    expect(linha.resultado_matching).toBe("CONFIRMADO");
    expect(linha.motivo_divergencia).toBeNull();
    expect(linha.ie_emitente_confere).toBe(true);
    expect(shouldShowVerificarIE(linha)).toBe(false);
  });

  it("cenário 4: confirma SEFAZ ISENTO com RFT006 vazio", () => {
    const linha = conferir("ISENTO", "");

    expect(linha.resultado_matching).toBe("CONFIRMADO");
    expect(linha.motivo_divergencia).toBeNull();
    expect(linha.ie_emitente_confere).toBe(true);
    expect(shouldShowVerificarIE(linha)).toBe(false);
  });

  it("cenário 5: mantém divergência quando SEFAZ numérica e RFT006 ISENTO", () => {
    const linha = conferir("135682630", "ISENTO");

    expect(linha.resultado_matching).toBe("IE_EMITENTE_DIVERGENTE");
    expect(linha.motivo_divergencia).toBe("IE_EMITENTE_DIVERGENTE");
    expect(linha.ie_emitente_confere).toBe(false);
    expect(shouldShowVerificarIE(linha)).toBe(true);
  });

  it("cenário 6: mantém divergência para IE numérica diferente", () => {
    const linha = conferir("135682630", "139362410");

    expect(linha.resultado_matching).toBe("IE_EMITENTE_DIVERGENTE");
    expect(linha.motivo_divergencia).toBe("IE_EMITENTE_DIVERGENTE");
    expect(linha.ie_emitente_confere).toBe(false);
  });

  it("cenário 7: exceção ativa continua prevalecendo sobre divergência de IE", () => {
    const linha = conferir("135682630", "139362410", [
      {
        id: "ex1",
        empresa_id: empresa.id,
        chave_nfe: chave,
        tipo_excecao: "DESCONSIDERACAO",
        motivo: "Decisão operacional",
        data_registro: "2026-05-06T00:00:00.000Z",
        ativa: true,
      },
    ]);

    expect(linha.status_final).toBe("DESCONSIDERADA");
    expect(linha.resultado_matching).toBe("IE_EMITENTE_DIVERGENTE");
    expect(linha.ie_emitente_confere).toBe(false);
  });
});
