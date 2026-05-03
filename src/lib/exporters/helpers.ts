import type { DatasetLinha, Empresa } from "@/lib/types";

export type ConferenciaStats = {
  total: number;
  ok: number;
  faltantes: number;
  irregulares: number;
  desconsideradas: number;
};

export type FiltrosConferencia = {
  empresaId: string;
  status: string;
  dataIni: string;
  dataFim: string;
  chave: string;
  empresas: Empresa[];
};

export function getDestinatarioNome(l: DatasetLinha): string {
  return l.payload_completo_drawer?.destinatario_apelido
    ?? l.payload_completo_drawer?.destinatario_nome
    ?? l.empresa_nome
    ?? l.payload_completo_drawer?.destinatario_razao_social
    ?? "—";
}

export function getNumeroNota(l: DatasetLinha): string {
  return String(
    l.payload_completo_drawer?.numero_nota_fiscal
      ?? l.payload_resumo_tabela?.numero
      ?? l.payload_resumo_tabela?.numero_nota_fiscal
      ?? "",
  );
}

export function getEmitenteNome(l: DatasetLinha): string {
  return l.payload_resumo_tabela?.emitente
    ?? l.payload_completo_drawer?.emitente_razao_social
    ?? "";
}

export function getEmitenteDoc(l: DatasetLinha): string {
  return l.payload_completo_drawer?.emitente_cnpj_cpf ?? "";
}

export function getValorTotal(l: DatasetLinha): number | string {
  const v = l.payload_resumo_tabela?.valor ?? l.payload_completo_drawer?.valor_total_nota_fiscal;
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim()) {
    const limp = v.replace(/[^\d,.\-]/g, "").replace(/\./g, "").replace(",", ".");
    const n = Number(limp);
    if (!Number.isNaN(n)) return n;
  }
  return "";
}

export function formatDataEmissao(l: DatasetLinha): string {
  if (!l.data_emissao) return "";
  const d = new Date(l.data_emissao);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR");
}

export function formatarFiltrosAplicados(f: FiltrosConferencia): string {
  const partes: string[] = [];
  if (f.empresaId !== "all") {
    const emp = f.empresas.find((e) => e.id === f.empresaId);
    partes.push(`Destinatário: ${emp?.nome ?? f.empresaId}`);
  }
  if (f.status !== "all") partes.push(`Status: ${f.status}`);
  if (f.dataIni) partes.push(`De: ${f.dataIni}`);
  if (f.dataFim) partes.push(`Até: ${f.dataFim}`);
  if (f.chave) partes.push(`Chave contém: ${f.chave}`);
  return partes.length ? partes.join(" · ") : "Nenhum";
}

export function dataHojeISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export function dataHoraGeracao(): string {
  return new Date().toLocaleString("pt-BR");
}
