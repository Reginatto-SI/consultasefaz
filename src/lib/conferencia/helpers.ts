import type { DatasetLinha } from "@/lib/types";

export function getNatureza(l: DatasetLinha): string {
  return l.payload_resumo_tabela?.natureza_operacao
    ?? l.payload_completo_drawer?.["NATUREZA DE OPERAÇÃO"]
    ?? l.payload_completo_drawer?.["NATUREZA OPERACAO"]
    ?? l.payload_completo_drawer?.natureza
    ?? l.payload_completo_drawer?.natureza_da_operacao
    ?? l.payload_completo_drawer?.natureza_operacao
    ?? l.payload_completo_drawer?.naturezaDeOperacao
    ?? l.payload_completo_drawer?.cfo_descricao
    ?? l.payload_completo_drawer?.movimentacao
    ?? l.payload_completo_drawer?.operacao
    ?? "";
}
