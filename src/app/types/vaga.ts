export interface Vaga {
  id: number;
  codigo: string;
  client_id: number;
  client?: any;
  user_id: number;
  user?: any;
  cargo: string;
  tipo_cargo: 'administrativo' | 'comercial' | 'estagio' | 'gestao' | 'operacional' | 'jovem_aprendiz';
  tipo_abertura: 'nova' | 'reposicao';
  status: 'aberta' | 'divulgacao_prospec' | 'entrevista_nc' | 'entrevista_empresa' | 'testes' |
          'fechada' | 'fechada_rep' | 'cancelada_cliente' | 'standby' | 'nao_cobrada' | 'encerramento_cont';
  fonte_recrutamento: 'catho' | 'email' | 'indicacao' | 'linkedin' | 'whatsapp' | 'trafego' | 'outros';
  salario: number;
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