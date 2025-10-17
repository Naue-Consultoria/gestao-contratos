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
  unique_token?: string;
  foto_url?: string;
  testes?: any; // JSONB field for storing test links
  mentorado_nome?: string; // Nome do mentorado
  mentorado_idade?: number; // Idade do mentorado
  mentorado_profissao?: string; // Profissão do mentorado
  mentorado_email?: string; // Email do mentorado
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
  foto_encontro_url?: string;
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
    mentorado_idade?: number; // Idade do mentorado
    mentorado_profissao?: string; // Profissão do mentorado
    mentorado_email?: string; // Email do mentorado
    testes?: any; // Optional test links array
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
   * Excluir mentoria (exclui todos os encontros associados)
   */
  excluirMentoria(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/mentorias/${id}`);
  }

  /**
   * Excluir encontro individual
   */
  excluirEncontro(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/encontros/${id}`);
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

  /**
   * Upload de foto do encontro
   */
  uploadFotoEncontro(encontroId: number, formData: FormData): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/encontros/${encontroId}/foto`, formData);
  }

  /**
   * Upload de foto da mentoria
   */
  uploadFotoMentoria(mentoriaId: number, formData: FormData): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/mentorias/${mentoriaId}/foto`, formData);
  }

  // ===== ENDPOINTS PÚBLICOS =====

  /**
   * Obter encontro via token público (sem autenticação)
   */
  obterEncontroPublico(token: string): Observable<ApiResponse<MentoriaEncontro>> {
    return this.http.get<ApiResponse<MentoriaEncontro>>(`${this.apiUrl}/publico/${token}`);
  }

  /**
   * Obter mentoria completa via token público (sem autenticação)
   */
  obterMentoriaPublica(token: string): Observable<ApiResponse<Mentoria>> {
    return this.http.get<ApiResponse<Mentoria>>(`${this.apiUrl}/publico/mentoria/${token}`);
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

  // ===== MAPA MENTAL =====

  /**
   * Obter mapa mental de um encontro via token público
   */
  obterMapaMentalPublico(token: string): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/publico/${token}/mapa-mental`);
  }

  /**
   * Obter mapa mental de um encontro (autenticado)
   */
  obterMapaMental(encontroId: number): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/encontros/${encontroId}/mapa-mental`);
  }

  /**
   * Salvar mapa mental completo (via token público)
   */
  salvarMapaMentalCompleto(mapaId: number, dados: {
    colunas: any[];
    cards: { [key: string]: any[] };
    conexoes: any[];
  }): Observable<ApiResponse<void>> {
    return this.http.put<ApiResponse<void>>(
      `${this.apiUrl}/mapa-mental/${mapaId}/salvar-completo`,
      dados
    );
  }

  /**
   * Adicionar card ao mapa mental
   */
  adicionarCardMapaMental(mapaId: number, card: {
    card_id: string;
    coluna_id: string;
    meta?: string;
    indicador?: string;
    prazo?: string;
  }): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${this.apiUrl}/mapa-mental/${mapaId}/cards`,
      card
    );
  }

  /**
   * Atualizar card do mapa mental
   */
  atualizarCardMapaMental(cardIdDb: number, dados: {
    meta?: string;
    indicador?: string;
    prazo?: string;
    coluna_id?: string;
  }): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(
      `${this.apiUrl}/mapa-mental/cards/${cardIdDb}`,
      dados
    );
  }

  /**
   * Remover card do mapa mental
   */
  removerCardMapaMental(cardId: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(
      `${this.apiUrl}/mapa-mental/cards/${cardId}`
    );
  }

  /**
   * Adicionar coluna ao mapa mental
   */
  adicionarColunaMapaMental(mapaId: number, coluna: {
    coluna_id: string;
    nome: string;
    cor: string;
    cor_bg: string;
    cor_borda: string;
    sort_order?: number;
  }): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${this.apiUrl}/mapa-mental/${mapaId}/colunas`,
      coluna
    );
  }

  /**
   * Remover coluna do mapa mental
   */
  removerColunaMapaMental(colunaId: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(
      `${this.apiUrl}/mapa-mental/colunas/${colunaId}`
    );
  }

  /**
   * Adicionar conexão entre cards
   */
  adicionarConexaoMapaMental(mapaId: number, conexao: {
    card_origem_id: string;
    card_destino_id: string;
  }): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${this.apiUrl}/mapa-mental/${mapaId}/conexoes`,
      conexao
    );
  }

  /**
   * Remover conexão entre cards
   */
  removerConexaoMapaMental(mapaId: number, conexao: {
    card_origem_id: string;
    card_destino_id: string;
  }): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(
      `${this.apiUrl}/mapa-mental/${mapaId}/conexoes`,
      { body: conexao }
    );
  }

  /**
   * Ativar/desativar mapa mental
   */
  toggleMapaMentalAtivo(encontroId: number, ativo: boolean): Observable<ApiResponse<any>> {
    return this.http.patch<ApiResponse<any>>(
      `${this.apiUrl}/encontros/${encontroId}/mapa-mental/ativo`,
      { ativo }
    );
  }

  // ===== MODELO ABC =====

  /**
   * Obter Modelo ABC por token público
   */
  obterModeloABCPublico(token: string): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/publico/${token}/modelo-abc`);
  }

  /**
   * Salvar Modelo ABC (via token público)
   */
  salvarModeloABC(token: string, dados: {
    adversidade: string;
    pensamento: string;
    consequencia: string;
    antidoto_exigencia: string;
    antidoto_rotulo: string;
    frase_nocaute: string;
    plano_acao: string;
    nivel_disposicao: number;
    impedimentos: string;
    acao_impedimentos: string;
  }): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${this.apiUrl}/publico/${token}/modelo-abc`,
      dados
    );
  }

  // ===== ZONAS DE APRENDIZADO =====

  /**
   * Obter Zonas de Aprendizado por token público
   */
  obterZonasAprendizadoPublico(token: string): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/publico/${token}/zonas-aprendizado`);
  }

  /**
   * Salvar Zonas de Aprendizado (via token público)
   */
  salvarZonasAprendizado(token: string, dados: {
    zona_ansiedade: any[];
    zona_aprendizado: any[];
    zona_apatia: any[];
    zona_conforto: any[];
  }): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${this.apiUrl}/publico/${token}/zonas-aprendizado`,
      dados
    );
  }

  // ===== THE GOLDEN CIRCLE =====

  /**
   * Obter Golden Circle por token público
   */
  obterGoldenCirclePublico(token: string): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/publico/${token}/golden-circle`);
  }

  /**
   * Salvar Golden Circle (via token público)
   */
  salvarGoldenCircle(token: string, dados: {
    why: string;
    how: string;
    what: string;
  }): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${this.apiUrl}/publico/${token}/golden-circle`,
      dados
    );
  }
}
