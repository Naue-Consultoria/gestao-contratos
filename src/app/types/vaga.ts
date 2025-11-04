export interface Vaga {
  id: number;
  codigo: string;
  client_id: number;
  client?: any;
  contract_id?: number;
  contract?: any;
  user_id: number;
  user?: any;
  cargo: string;
  tipo_cargo: 'administrativo' | 'comercial' | 'estagio' | 'gestao' | 'operacional' | 'jovem_aprendiz';
  tipo_abertura: 'nova' | 'reposicao';
  status: 'aberta' | 'divulgacao_prospec' | 'entrevista_nc' | 'entrevista_empresa' | 'testes' |
          'fechada' | 'fechada_rep' | 'cancelada_cliente' | 'standby' | 'nao_cobrada' | 'encerramento_cont';
  fonte_recrutamento: 'catho' | 'email' | 'indicacao' | 'linkedin' | 'whatsapp' | 'trafego' | 'outros';
  salario: number;
  pretensao_salarial?: number;
  data_abertura: Date | string;
  data_fechamento_cancelamento?: Date | string;
  candidato_aprovado_id?: number;
  candidato_aprovado?: any;
  total_candidatos: number;
  observacoes?: string;
  porcentagem_faturamento: number;
  valor_faturamento: number;
  sigilosa: boolean;
  imposto_estado: number;
  created_at: Date | string;
  updated_at: Date | string;
  created_by?: number;
  updated_by?: number;
  vaga_candidatos?: VagaCandidato[];
  // Campos para acesso público
  unique_token?: string;
  token_expires_at?: Date | string;
  is_public?: boolean;
}

export interface VagaCandidato {
  id: number;
  vaga_id: number;
  candidato_id: number;
  candidato?: Candidato;
  data_inscricao: Date | string;
  status: 'inscrito' | 'triagem' | 'entrevista_agendada' | 'entrevista_realizada' |
          'aprovado' | 'reprovado' | 'desistiu';
  observacoes?: string;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface Candidato {
  id: number;
  nome: string;
  email?: string;
  telefone?: string;
  status: 'pendente' | 'aprovado' | 'reprovado';
  observacoes?: string;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface Entrevista {
  id: number;
  vaga_candidato_id: number;
  data_entrevista: Date | string;
  hora_entrevista: string;
  status: 'agendada' | 'realizada' | 'cancelada' | 'nao_compareceu' | 'remarcada';
  link_chamada?: string;
  observacoes?: string;
  created_at: Date | string;
  updated_at: Date | string;
  created_by?: number;
}

export interface VagaStatusHistory {
  id: number;
  vaga_id: number;
  status_anterior: string | null;
  status_novo: string;
  motivo?: string;
  changed_by?: number;
  changed_at: Date | string;
  metadata?: any;
  user?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface VagaPublicAccessLog {
  id: number;
  vaga_id: number;
  ip_address?: string;
  user_agent?: string;
  accessed_at: Date | string;
  metadata?: any;
}

export interface GerarLinkPublicoRequest {
  expires_in_days?: number;
}

export interface GerarLinkPublicoResponse {
  id: number;
  unique_token: string;
  token_expires_at: Date | string | null;
  is_public: boolean;
  public_url: string;
}