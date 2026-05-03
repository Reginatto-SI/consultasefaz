export type StatusSefaz =
  | "autorizada"
  | "autorizada fora do prazo"
  | "cancelada"
  | "rejeitada"
  | "denegada"
  | "inutilizada"
  | "desconhecido";

export type StatusFinal = "OK" | "FALTANTE" | "IRREGULAR" | "DESCONSIDERADA";

export type ResultadoMatching =
  | "CONFIRMADO"
  | "IE_EMITENTE_DIVERGENTE"
  | "CHAVE_NAO_ENCONTRADA";

export type MotivoDivergencia =
  | "IE_EMITENTE_DIVERGENTE"
  | "IE_EMITENTE_AUSENTE_RFT006"
  | "CHAVE_NAO_ENCONTRADA";

export interface Empresa {
  id: string;
  nome: string;
  cnpj: string;
  inscricao_estadual?: string;
  razao_social?: string;
  perfil?: string;
  tributacao?: string;
  destinatario_apelido?: string;
}

export interface NotaSefaz {
  id: string;
  empresa_id: string;
  chave_nfe: string;
  status_sefaz: StatusSefaz;
  data_emissao: string; // ISO
  emitente_inscricao_estadual: string;
  emitente_cnpj_cpf?: string;
  emitente_razao_social?: string;
  destinatario_cnpj_cpf: string;
  destinatario_razao_social?: string;
  inscricao_estadual_destinatario?: string;
  payload_completo: Record<string, any>;
  importacao_id: string;
}

export interface RegistroErp {
  id: string;
  chave_acesso: string;
  inscricao_estadual_emitente?: string;
  payload_completo_erp: Record<string, any>;
  importacao_id: string;
  // Compatibilidade da V1: mantemos campos legados opcionais sem uso no motor.
  chave_nfe?: string;
  inscricao_estadual?: string;
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
  chave_existe_no_erp: boolean;
  ie_emitente_confere: boolean;
  encontrada_no_erp: boolean;
  resultado_matching: ResultadoMatching;
  motivo_divergencia: MotivoDivergencia | null;
  ie_emitente_sefaz?: string;
  ie_emitente_rft006_encontrada?: string;
  tem_excecao_ativa: boolean;
  motivo_excecao?: string;
  data_emissao: string;
  payload_resumo_tabela: Record<string, any>;
  payload_completo_drawer: Record<string, any>;
  referencia_execucao: string;
}
