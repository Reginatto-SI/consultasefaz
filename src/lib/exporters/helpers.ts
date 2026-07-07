import type { DatasetLinha, Empresa } from "@/lib/types";
import { getNatureza as getNaturezaConferencia } from "@/lib/conferencia/helpers";

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

export function getDestinatarioDocumento(l: DatasetLinha): string {
  return l.payload_completo_drawer?.destinatario_cnpj_cpf ?? "";
}

export function getNatureza(l: DatasetLinha): string {
  return getNaturezaConferencia(l);
}

export function formatStatusSefazVisual(status: string | null | undefined): string {
  const texto = (status ?? "").trim();
  if (!texto) return "—";

  // Mesma normalização visual da tabela da tela (classe CSS "capitalize"): primeira letra de cada palavra em maiúsculo.
  return texto
    .toLowerCase()
    .replace(/(^|\s)\S/g, (char) => char.toUpperCase());
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

const STATUS_EXPORT_LABEL: Record<string, string> = {
  OK: "OK",
  FALTANTE: "Faltantes",
  IRREGULAR: "Irregulares",
  DESCONSIDERADA: "Desconsideradas",
};

const MESES_PT_BR = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export type BuildConferenceExportFileNameParams = {
  registros: DatasetLinha[];
  statusSelecionado: string;
  destinatarioSelecionado: string;
  empresas: Empresa[];
  extensao: "xlsx" | "pdf";
};

export function buildConferenceExportFileName({
  registros,
  statusSelecionado,
  destinatarioSelecionado,
  empresas,
  extensao,
}: BuildConferenceExportFileNameParams): string {
  if (registros.length === 0) {
    return sanitizeExportFileName(`Notas Conferencia - Sem registros.${extensao}`);
  }

  const statusLabel = STATUS_EXPORT_LABEL[statusSelecionado] ?? "Conferencia";
  const destinatarioLabel = getDestinatarioExportLabel(destinatarioSelecionado, empresas);
  const periodoLabel = getPeriodoExportLabel(registros);

  return sanitizeExportFileName(`Notas ${statusLabel} ${destinatarioLabel} - ${periodoLabel}.${extensao}`);
}

function getDestinatarioExportLabel(destinatarioSelecionado: string, empresas: Empresa[]): string {
  if (destinatarioSelecionado === "all") return "Todos os Destinatarios";

  const empresa = empresas.find((e) => e.id === destinatarioSelecionado);
  if (!empresa) return sanitizeExportFileName(destinatarioSelecionado) || "Destinatario nao identificado";

  // Usa o mesmo critério visual dos filtros rápidos: apelido, nome não gerado e razão social.
  const apelido = normalizeDestinatarioExportLabel(empresa.destinatario_apelido);
  if (apelido) return apelido;

  const nome = normalizeDestinatarioExportLabel(empresa.nome);
  if (nome && !isGeneratedEmpresaExportLabel(empresa.nome)) return nome;

  return normalizeDestinatarioExportLabel(empresa.razao_social) ?? nome ?? "Destinatario";
}

function getPeriodoExportLabel(registros: DatasetLinha[]): string {
  const dates = registros
    .map((registro) => parseExportDate(registro.data_emissao))
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => a.getTime() - b.getTime());

  if (dates.length === 0) return "Periodo nao identificado";

  const first = dates[0];
  const last = dates[dates.length - 1];
  const firstMonth = first.getUTCMonth();
  const lastMonth = last.getUTCMonth();
  const firstYear = first.getUTCFullYear();
  const lastYear = last.getUTCFullYear();

  if (firstMonth === lastMonth && firstYear === lastYear) {
    return `${MESES_PT_BR[firstMonth]} ${firstYear}`;
  }

  if (firstYear === lastYear) {
    return `${MESES_PT_BR[firstMonth]} a ${MESES_PT_BR[lastMonth]} ${firstYear}`;
  }

  return `${MESES_PT_BR[firstMonth]} ${firstYear} a ${MESES_PT_BR[lastMonth]} ${lastYear}`;
}

function parseExportDate(value?: string): Date | null {
  if (!value) return null;

  const raw = String(value).trim();
  const brDate = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (brDate) {
    const [, day, month, year] = brDate;
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    if (
      date.getUTCFullYear() === Number(year)
      && date.getUTCMonth() === Number(month) - 1
      && date.getUTCDate() === Number(day)
    ) {
      return date;
    }
  }

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function sanitizeExportFileName(filename: string): string {
  const sanitized = filename
    .replace(/[\/\\:*?"<>|]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (sanitized.length <= 140) return sanitized;

  const extensionMatch = sanitized.match(/\.[^.]+$/);
  const extension = extensionMatch?.[0] ?? "";
  return `${sanitized.slice(0, 140 - extension.length).trim()}${extension}`;
}

function normalizeDestinatarioExportLabel(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed.replace(/^Empresa\s+(.+)$/i, "Destinatário $1");
}

function isGeneratedEmpresaExportLabel(value?: string) {
  return /^Empresa\s+/i.test(value?.trim() ?? "");
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
