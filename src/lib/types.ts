export type StatusSefaz =
  | "autorizada"
  | "autorizada fora do prazo"
  | "cancelada"
  | "rejeitada"
  | "denegada"
  | "inutilizada";

export type StatusFinal = "OK" | "FALTANTE" | "IRREGULAR" | "DESCONSIDERADA";

export interface Empresa {
  id: string;
  nome: string;
  cnpj: string;
  inscricao_estadual?: string;
}

export interface NotaSefaz {
  id: string;
  empresa_id: string;
  chave_nfe: string;
  status_sefaz: StatusSefaz;
  data_emissao: string; // ISO
  inscricao_estadual_destinatario?: string;
  payload_completo: Record<string, any>;
  importacao_id: string;
}

export interface RegistroErp {
  id: string;
  chave_nfe: string;
  inscricao_estadual?: string;
  importacao_id: string;
  payload?: Record<string, any>;
}

export interface Excecao {
  id: string;
  empresa_id: string;
  chave_nfe: string;
  tipo_excecao: "DESCONSIDERACAO";
  motivo: string;
  observacao?: string;
  usuario?: string;
  data_registro: string;
  ativa: boolean;
}

export interface LogOperacional {
  id: string;
  tipo: "importacao" | "processamento";
  nivel: "erro" | "aviso";
  arquivo_nome?: string;
  codigo_evento: string;
  mensagem_usuario: string;
  contexto_resumido?: string;
  data_hora: string;
}

export interface DatasetLinha {
  empresa_id: string;
  empresa_nome: string;
  chave_nfe: string;
  status_final: StatusFinal;
  status_sefaz: StatusSefaz;
  encontrada_no_erp: boolean;
  tem_excecao_ativa: boolean;
  motivo_excecao?: string;
  data_emissao: string;
  payload_resumo_tabela: Record<string, any>;
  payload_completo_drawer: Record<string, any>;
  referencia_execucao: string;
}
