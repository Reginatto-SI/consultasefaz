import { useStore } from "@/store/useStore";

export function seedDemoData() {
  const s = useStore.getState();
  if (s.empresas.length > 0) return;

  const e1 = s.addEmpresa({ nome: "Comercial Aurora Ltda", cnpj: "12345678000190", inscricao_estadual: "110123456" });
  const e2 = s.addEmpresa({ nome: "Distribuidora Norte SA", cnpj: "98765432000110", inscricao_estadual: "220987654" });

  const importacao = "demo-" + Date.now();
  const mk = (
    chave: string,
    empresa_id: string,
    status: any,
    dia: number,
    extra: any = {}
  ) => ({
    empresa_id,
    chave_nfe: chave,
    status_sefaz: status,
    data_emissao: new Date(2025, 3, dia).toISOString(),
    emitente_inscricao_estadual: extra.ie ?? "",
    destinatario_cnpj_cpf: extra.cnpj ?? "",
    inscricao_estadual_destinatario: extra.ie,
    payload_completo: {
      chave_nfe: chave,
      emitente: extra.emit ?? "Fornecedor S/A",
      numero: extra.numero ?? "1001",
      valor_total: extra.valor ?? 1500.5,
      cnpj_destinatario: extra.cnpj,
      cfop: "1102",
      natureza_operacao: "Compra para revenda",
    },
  });

  const notas = [
    mk("35250400000000000000000000000000000000000001", e1.id, "autorizada", 1, { ie: "110123456", emit: "Aurora Sup.", valor: 2300 }),
    mk("35250400000000000000000000000000000000000002", e1.id, "cancelada", 2, { ie: "110123456", emit: "Beta Distrib.", valor: 800 }),
    mk("35250400000000000000000000000000000000000003", e1.id, "autorizada", 3, { ie: "110123456", emit: "Gama Ltda", valor: 4500 }),
    mk("35250400000000000000000000000000000000000004", e2.id, "autorizada fora do prazo", 4, { ie: "220987654", emit: "Delta SA", valor: 1200 }),
    mk("35250400000000000000000000000000000000000005", e2.id, "autorizada", 5, { ie: "220987654", emit: "Epsilon Co", valor: 990 }),
    mk("35250400000000000000000000000000000000000006", e2.id, "rejeitada", 6, { ie: "220987654", emit: "Zeta Ind", valor: 750 }),
  ];

  s.ingestSefaz(notas, importacao, "demo_sefaz.xlsx");

  const erp = [
    { chave_nfe: "35250400000000000000000000000000000000000001", inscricao_estadual: "110123456" },
    { chave_nfe: "35250400000000000000000000000000000000000002", inscricao_estadual: "110123456" },
    { chave_nfe: "35250400000000000000000000000000000000000004", inscricao_estadual: "220987654" },
    { chave_nfe: "35250400000000000000000000000000000000000005" },
  ];
  s.ingestErp(erp, importacao, "demo_erp.xlsx");
}
