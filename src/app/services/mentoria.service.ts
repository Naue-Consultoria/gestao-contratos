import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Mentoria {
  id: number;
  client_id: number;
  contract_id: number;
  numero_encontros: number;
  status: 'ativa' | 'concluida' | 'cancelada';
  created_at: string;
  updated_at: string;
  created_by?: number;
  updated_by?: number;
  contract?: any;
  client?: any;
  criador?: any;
  encontros?: MentoriaEncontro[];
}

export interface MentoriaEncontro {
  id: number;
  mentoria_id?: number;
  contract_id: number;
  mentorado_nome: string;
  numero_encontro?: number;
  data_encontro: string;
  visao_geral?: string;
  conteudo_html?: string;
  unique_token: string;
  token_expira_em?: string;
  status: 'draft' | 'published' | 'archived';
  encontro_status?: 'em_andamento' | 'finalizado';
  criado_por?: number;
  atualizado_por?: number;
  criado_em: string;
  atualizado_em: string;
  contract?: any;
  criador?: any;
  blocos?: EncontroBloco[];
  outros_encontros?: OutroEncontro[];
}

export interface OutroEncontro {
  id: number;
  numero_encontro: number;
  mentorado_nome: string;
  unique_token: string;
  is_current: boolean;
}

export interface EncontroBloco {
  id: number;
  encontro_id: number;
  tipo: 'titulo' | 'texto' | 'lista' | 'tabela' | 'imagem' | 'video_link' |
        'pergunta' | 'secao_perguntas' | 'checkbox_lista' | 'destaque' | 'grafico';
  ordem: number;
  configuracao: any; // JSONB com configuração específica do tipo
  criado_em: string;
  atualizado_em: string;
  interacoes?: BlocoInteracao[];
}

export interface BlocoInteracao {
  id: number;
  bloco_id: number;
  tipo_interacao: 'resposta' | 'checkbox' | 'comentario';
  chave_item?: string;
  valor: any;
  dados_interacao?: any;
  ip_address?: string;
  user_agent?: string;
  criado_em: string;
  atualizado_em: string;
}

export interface EncontroEstatisticas {
  total_acessos: number;
  total_interacoes: number;
  ultimo_acesso: string | null;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class MentoriaService {
  private apiUrl = `${environment.apiUrl}/mentoria`;

  constructor(private http: HttpClient) {}

  // ===== ENDPOINTS DE MENTORIAS =====

  /**
   * Listar todas as mentorias
   */
  listarMentorias(clientId?: number, status?: string, contractId?: number): Observable<ApiResponse<Mentoria[]>> {
    let url = `${this.apiUrl}/mentorias`;
    const params: string[] = [];

    if (clientId) params.push(`client_id=${clientId}`);
    if (status) params.push(`status=${status}`);
    if (contractId) params.push(`contract_id=${contractId}`);

    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }

    return this.http.get<ApiResponse<Mentoria[]>>(url);
  }

  /**
   * Obter detalhes de uma mentoria com todos os encontros
   */
  obterMentoria(id: number): Observable<ApiResponse<Mentoria>> {
    return this.http.get<ApiResponse<Mentoria>>(`${this.apiUrl}/mentorias/${id}`);
  }

  /**
   * Criar nova mentoria e gerar encontros automaticamente
   */
  criarMentoria(dados: {
    client_id: number;
    contract_id: number;
    numero_encontros: number;
    mentorado_nome: string;
  }): Observable<ApiResponse<Mentoria>> {
    return this.http.post<ApiResponse<Mentoria>>(`${this.apiUrl}/mentorias`, dados);
  }

  /**
   * Atualizar mentoria
   */
  atualizarMentoria(id: number, dados: Partial<Mentoria>): Observable<ApiResponse<Mentoria>> {
    return this.http.put<ApiResponse<Mentoria>>(`${this.apiUrl}/mentorias/${id}`, dados);
  }

  /**
   * Deletar mentoria (e todos os encontros)
   */
  deletarMentoria(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/mentorias/${id}`);
  }

  /**
   * Adicionar novos encontros a uma mentoria existente
   */
  adicionarEncontros(mentoriaId: number, quantidade: number): Observable<ApiResponse<MentoriaEncontro[]>> {
    return this.http.post<ApiResponse<MentoriaEncontro[]>>(
      `${this.apiUrl}/mentorias/${mentoriaId}/encontros`,
      { quantidade }
    );
  }

  // ===== ENDPOINTS DE ENCONTROS =====

  /**
   * Listar todos os encontros
   */
  listarEncontros(contractId?: number, status?: string): Observable<ApiResponse<MentoriaEncontro[]>> {
    let url = `${this.apiUrl}/encontros`;
    const params: string[] = [];

    if (contractId) params.push(`contract_id=${contractId}`);
    if (status) params.push(`status=${status}`);

    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }

    return this.http.get<ApiResponse<MentoriaEncontro[]>>(url);
  }

  /**
   * Obter detalhes de um encontro
   */
  obterEncontro(id: number): Observable<ApiResponse<MentoriaEncontro>> {
    return this.http.get<ApiResponse<MentoriaEncontro>>(`${this.apiUrl}/encontros/${id}`);
  }

  /**
   * Criar novo encontro
   */
  criarEncontro(encontro: Partial<MentoriaEncontro>): Observable<ApiResponse<MentoriaEncontro>> {
    return this.http.post<ApiResponse<MentoriaEncontro>>(`${this.apiUrl}/encontros`, encontro);
  }

  /**
   * Atualizar encontro
   */
  atualizarEncontro(id: number, encontro: Partial<MentoriaEncontro>): Observable<ApiResponse<MentoriaEncontro>> {
    return this.http.put<ApiResponse<MentoriaEncontro>>(`${this.apiUrl}/encontros/${id}`, encontro);
  }

  /**
   * Deletar encontro
   */
  deletarEncontro(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/encontros/${id}`);
  }

  /**
   * Publicar encontro
   */
  publicarEncontro(id: number): Observable<ApiResponse<MentoriaEncontro>> {
    return this.http.post<ApiResponse<MentoriaEncontro>>(`${this.apiUrl}/encontros/${id}/publicar`, {});
  }

  /**
   * Obter estatísticas de um encontro
   */
  obterEstatisticas(id: number): Observable<ApiResponse<EncontroEstatisticas>> {
    return this.http.get<ApiResponse<EncontroEstatisticas>>(`${this.apiUrl}/encontros/${id}/estatisticas`);
  }

  // ===== BLOCOS =====

  /**
   * Adicionar bloco ao encontro
   */
  adicionarBloco(encontroId: number, bloco: Partial<EncontroBloco>): Observable<ApiResponse<EncontroBloco>> {
    return this.http.post<ApiResponse<EncontroBloco>>(`${this.apiUrl}/encontros/${encontroId}/blocos`, bloco);
  }

  /**
   * Atualizar bloco
   */
  atualizarBloco(blocoId: number, bloco: Partial<EncontroBloco>): Observable<ApiResponse<EncontroBloco>> {
    return this.http.put<ApiResponse<EncontroBloco>>(`${this.apiUrl}/blocos/${blocoId}`, bloco);
  }

  /**
   * Deletar bloco
   */
  deletarBloco(blocoId: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/blocos/${blocoId}`);
  }

  /**
   * Reordenar blocos
   */
  reordenarBlocos(encontroId: number, blocos: { id: number; ordem: number }[]): Observable<ApiResponse<void>> {
    return this.http.put<ApiResponse<void>>(`${this.apiUrl}/encontros/${encontroId}/blocos/reordenar`, { blocos });
  }

  // ===== UPLOAD =====

  /**
   * Upload de imagem
   */
  uploadImagem(file: File): Observable<ApiResponse<{ url: string; filename: string; originalName: string; size: number }>> {
    const formData = new FormData();
    formData.append('imagem', file);

    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/upload-imagem`, formData);
  }

  // ===== ENDPOINTS PÚBLICOS =====

  /**
   * Obter encontro via token público (sem autenticação)
   */
  obterEncontroPublico(token: string): Observable<ApiResponse<MentoriaEncontro>> {
    return this.http.get<ApiResponse<MentoriaEncontro>>(`${this.apiUrl}/publico/${token}`);
  }

  /**
   * Salvar interação do mentorado (sem autenticação)
   */
  salvarInteracao(token: string, interacao: {
    bloco_id: number;
    tipo_interacao: string;
    chave_item?: string;
    valor: any;
  }): Observable<ApiResponse<BlocoInteracao>> {
    return this.http.post<ApiResponse<BlocoInteracao>>(
      `${this.apiUrl}/publico/${token}/interacao`,
      interacao
    );
  }

  /**
   * Obter interações salvas do mentorado
   */
  obterInteracoes(token: string): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(
      `${this.apiUrl}/publico/${token}/interacoes`
    );
  }

  // ===== UTILITÁRIOS =====

  /**
   * Gerar URL do link público
   */
  gerarLinkPublico(token: string): string {
    // Assumindo que o frontend está na mesma origem ou em um domínio conhecido
    const baseUrl = window.location.origin;
    return `${baseUrl}/mentoria/${token}`;
  }

  /**
   * Verificar se o token está expirado
   */
  isTokenExpirado(encontro: MentoriaEncontro): boolean {
    if (!encontro.token_expira_em) return false;

    const dataExpiracao = new Date(encontro.token_expira_em);
    return dataExpiracao < new Date();
  }

  /**
   * Obter configuração padrão por tipo de bloco
   */
  getConfiguracaoPadrao(tipo: string): any {
    const padroes: { [key: string]: any } = {
      'titulo': {
        texto: 'Novo Título',
        nivel: 2,
        cor: '#00B74F'
      },
      'texto': {
        conteudo: '<p>Digite o conteúdo...</p>'
      },
      'lista': {
        titulo: 'Lista',
        itens: [
          { principal: 'Item 1', descricao: '', destaque: null }
        ]
      },
      'tabela': {
        titulo: 'Tabela',
        colunas: ['Coluna 1', 'Coluna 2'],
        linhas: [
          ['Célula 1', 'Célula 2']
        ]
      },
      'imagem': {
        url: '',
        legenda: '',
        largura: 'medium'
      },
      'video_link': {
        titulo: 'Vídeo',
        url: '',
        autor: '',
        thumbnail_url: 'auto'
      },
      'pergunta': {
        id: `p${Date.now()}`,
        pergunta: 'Digite a pergunta...',
        placeholder: 'Sua resposta...',
        resposta_exemplo: '',
        tipo_resposta: 'texto'
      },
      'secao_perguntas': {
        titulo: 'Perguntas',
        perguntas: [
          { id: `p${Date.now()}`, texto: 'Pergunta 1', resposta: '' }
        ]
      },
      'checkbox_lista': {
        titulo: 'Tarefas',
        itens: [
          { id: `ch${Date.now()}`, texto: 'Tarefa 1', checked: false }
        ]
      },
      'destaque': {
        titulo: 'Título do Destaque',
        subtitulo: 'Subtítulo',
        cor: '#1a237e',
        imagem_fundo: ''
      },
      'grafico': {
        titulo: 'Gráfico',
        subtitulo: '',
        imagem_url: '',
        tipo_grafico: 'imagem'
      }
    };

    return padroes[tipo] || {};
  }

  /**
   * Formatar data para exibição
   */
  formatarData(data: string): string {
    return new Date(data).toLocaleDateString('pt-BR');
  }
}
