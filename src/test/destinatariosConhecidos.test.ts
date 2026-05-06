import { describe, expect, it } from "vitest";
import { aplicarDestinatarioConhecidoNaEmpresa, findDestinatarioConhecidoByDocumento } from "@/config/destinatariosConhecidos";

describe("destinatários conhecidos", () => {
  it("deve reconhecer PERFIL pelo CNPJ do XML SEFAZ", () => {
    const destinatario = findDestinatarioConhecidoByDocumento("44.187.258/0001-14");

    expect(destinatario?.apelido).toBe("PERFIL");
    expect(destinatario?.cpf_cnpj_normalizado).toBe("44187258000114");
  });

  it("deve atualizar empresa persistida com fallback pelo cadastro conhecido", () => {
    const empresa = aplicarDestinatarioConhecidoNaEmpresa({
      id: "empresa-perfil",
      nome: "Empresa 44187258",
      cnpj: "44187258000114",
      razao_social: "Empresa 44187258",
    });

    expect(empresa.nome).toBe("PERFIL");
    expect(empresa.destinatario_apelido).toBe("PERFIL");
    expect(empresa.razao_social).toBe("PERFIL E MOCELLIN COM E ARMAZ DE GRAOS LTDA");
  });
});
