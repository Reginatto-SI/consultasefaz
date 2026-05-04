// Data fiscal (emissão de nota) deve ser tratada como data civil do relatório,
// e não como instante UTC. Isso evita deslocar um dia na exibição por fuso horário.
export function formatFiscalDateBR(value?: string | null): string {
  if (!value) return "—";

  const raw = String(value).trim();
  const isoDate = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDate) {
    const [, y, m, d] = isoDate;
    return `${d}/${m}/${y}`;
  }

  const brDate = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (brDate) return raw.slice(0, 10);

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("pt-BR");
}

