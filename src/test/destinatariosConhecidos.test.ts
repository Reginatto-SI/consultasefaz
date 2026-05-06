import { describe, expect, it } from "vitest";
import { findDestinatarioConhecidoByDocumento } from "@/config/destinatariosConhecidos";

describe("destinatários conhecidos", () => {
  it("deve reconhecer PERFIL pelo CNPJ do XML SEFAZ", () => {
    const destinatario = findDestinatarioConhecidoByDocumento("44.187.258/0001-14");

    expect(destinatario?.apelido).toBe("PERFIL");
    expect(destinatario?.cpf_cnpj_normalizado).toBe("44187258000114");
  });
});
