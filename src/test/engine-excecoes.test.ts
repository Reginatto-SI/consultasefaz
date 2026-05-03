import { describe, expect, it } from "vitest";
import { rodarMotor } from "@/lib/engine";
import type { Empresa, Excecao, NotaSefaz, RegistroErp } from "@/lib/types";

const notaBase: NotaSefaz = {
  id: "n1",
  empresa_id: "empresa-nova",
  chave_nfe: "5126012931659600468550020001698091027317497",
  status_sefaz: "autorizada",
  data_emissao: "2026-01-18",
  emitente_inscricao_estadual: "123",
  destinatario_cnpj_cpf: "12345678000190",
  payload_completo: {},
  importacao_id: "i1",
};

describe("rodarMotor - precedência de exceção ativa", () => {
  it("deve desconsiderar por chave normalizada mesmo com empresa_id alterado após reimportação", () => {
    const empresas: Empresa[] = [{ id: "empresa-nova", nome: "MTCOTTON", cnpj: "12345678000190" }];
    const excecoes: Excecao[] = [
      {
        id: "ex1",
        empresa_id: "empresa-antiga",
        chave_nfe: "5126.0129 3165 9600 4685 5002 0001 6980 9102 7317 497",
        tipo_excecao: "DESCONSIDERACAO",
        motivo: "Dev. Própria",
        data_registro: "2026-01-19T00:00:00.000Z",
        ativa: true,
      },
    ];

    const dataset = rodarMotor({
      notas: [notaBase],
      erp: [] as RegistroErp[],
      excecoes,
      empresas,
      referencia_execucao: "2026-05-03T00:00:00.000Z",
    });

    expect(dataset).toHaveLength(1);
    expect(dataset[0].status_final).toBe("DESCONSIDERADA");
    expect(dataset[0].tem_excecao_ativa).toBe(true);
    expect(dataset[0].motivo_excecao).toBe("Dev. Própria");
  });

  it("não deve desconsiderar quando exceção ativa tiver chave inválida", () => {
    const dataset = rodarMotor({
      notas: [notaBase],
      erp: [] as RegistroErp[],
      empresas: [{ id: "empresa-nova", nome: "MTCOTTON", cnpj: "12345678000190" }],
      excecoes: [
        {
          id: "ex3",
          empresa_id: "empresa-nova",
          chave_nfe: "   ",
          tipo_excecao: "DESCONSIDERACAO",
          motivo: "Invalida",
          data_registro: "2026-01-19T00:00:00.000Z",
          ativa: true,
        },
      ],
      referencia_execucao: "2026-05-03T00:00:00.000Z",
    });

    expect(dataset[0].status_final).toBe("FALTANTE");
    expect(dataset[0].tem_excecao_ativa).toBe(false);
  });

  it("não deve aplicar exceção inativa", () => {
    const dataset = rodarMotor({
      notas: [notaBase],
      erp: [] as RegistroErp[],
      empresas: [{ id: "empresa-nova", nome: "MTCOTTON", cnpj: "12345678000190" }],
      excecoes: [
        {
          id: "ex2",
          empresa_id: "empresa-nova",
          chave_nfe: notaBase.chave_nfe,
          tipo_excecao: "DESCONSIDERACAO",
          motivo: "Teste",
          data_registro: "2026-01-19T00:00:00.000Z",
          ativa: false,
        },
      ],
      referencia_execucao: "2026-05-03T00:00:00.000Z",
    });

    expect(dataset[0].status_final).toBe("FALTANTE");
    expect(dataset[0].tem_excecao_ativa).toBe(false);
  });
});
