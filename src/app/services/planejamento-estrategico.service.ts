import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// ===== INTERFACES =====

export interface PlanejamentoEstrategico {
  id: number;
  client_id: number;
  contract_id: number;
  titulo: string;
  descricao?: string | null;
  status: 'ativo' | 'concluido' | 'cancelado';
  data_inicio?: string | null;
  data_fim?: string | null;
  prazo_preenchimento?: string | null;
  unique_token: string;
  created_at: string;
  updated_at: string;
  created_by?: number | null;
  client?: any;
  contract?: any;
  criador?: any;
  departamentos?: Departamento[];
}

export interface Departamento {
  id: number;
  planejamento_id: number;
  nome_departamento: string;
  responsavel_nome?: string | null;
  responsavel_email?: string | null;
  ordem: number;
  created_at: string;
  updated_at: string;
  matriz?: MatrizEvolucao | null;
}

export interface Grupo {
  id: number;
  planejamento_id: number;
  nome_grupo: string;
  integrantes?: string | null;
  unique_token: string;
  created_at: string;
  updated_at: string;
  matriz_swot?: MatrizSwot | null;
  planejamento?: any; // Para quando vem do endpoint público
}

export interface MatrizSwot {
  id: number;
  grupo_id: number;
  forcas?: string | null;
  fraquezas?: string | null;
  oportunidades?: string | null;
  ameacas?: string | null;
  forcas_classificacao?: { [key: string]: string } | null;
  fraquezas_classificacao?: { [key: string]: string } | null;
  oportunidades_classificacao?: { [key: string]: string } | null;
  ameacas_classificacao?: { [key: string]: string } | null;
  preenchido_em?: string | null;
  atualizado_em?: string | null;
}

export interface MatrizSwotFinal {
  id: number;
  planejamento_id: number;
  forcas?: string | null;
  fraquezas?: string | null;
  oportunidades?: string | null;
  ameacas?: string | null;
  observacoes?: string | null;
  created_at: string;
  updated_at: string;
  created_by?: number | null;
  updated_by?: number | null;
  criador?: any;
  atualizador?: any;
}

export interface MatrizEvolucao {
  id: number;
  departamento_id: number;
  vulnerabilidades?: string | null;
  conquistas?: string | null;
  licoes_aprendidas?: string | null;
  compromissos?: string | null;
  preenchido_em?: string | null;
  atualizado_em: string;
}

export interface CreatePlanejamentoRequest {
  client_id: number;
  contract_id: number;
  titulo: string;
  descricao?: string;
  data_inicio?: string;
  data_fim?: string;
  prazo_preenchimento?: string;
}

export interface UpdatePlanejamentoRequest {
  titulo?: string;
  descricao?: string;
  status?: 'ativo' | 'concluido' | 'cancelado';
  data_inicio?: string;
  data_fim?: string;
  prazo_preenchimento?: string;
}

export interface CreateDepartamentoRequest {
  nome_departamento: string;
  responsavel_nome?: string;
  responsavel_email?: string;
  ordem?: number;
}

export interface UpdateDepartamentoRequest {
  nome_departamento?: string;
  responsavel_nome?: string;
  responsavel_email?: string;
}

export interface CreateGrupoRequest {
  nome_grupo: string;
  integrantes?: string;
}

export interface UpdateGrupoRequest {
  nome_grupo?: string;
  integrantes?: string;
}

export interface UpdateMatrizSwotRequest {
  forcas?: string;
  fraquezas?: string;
  oportunidades?: string;
  ameacas?: string;
  forcas_classificacao?: { [key: string]: string };
  fraquezas_classificacao?: { [key: string]: string };
  oportunidades_classificacao?: { [key: string]: string };
  ameacas_classificacao?: { [key: string]: string };
}

export interface UpdateMatrizSwotFinalRequest {
  forcas?: string;
  fraquezas?: string;
  oportunidades?: string;
  ameacas?: string;
  observacoes?: string;
}

export interface MatrizSwotCruzamento {
  id: number;
  planejamento_id: number;
  alavancas: number[][]; // Oportunidades × Forças (array 2D)
  defesas: number[][]; // Ameaças × Forças (array 2D)
  restricoes: number[][]; // Oportunidades × Fraquezas (array 2D)
  problemas: number[][]; // Ameaças × Fraquezas (array 2D)
  created_at: string;
  updated_at: string;
  created_by?: number | null;
  updated_by?: number | null;
  criador?: any;
  atualizador?: any;
}

export interface UpdateMatrizCruzamentoRequest {
  alavancas: number[][];
  defesas: number[][];
  restricoes: number[][];
  problemas: number[][];
}

export interface UpdateMatrizRequest {
  vulnerabilidades?: string;
  conquistas?: string;
  licoes_aprendidas?: string;
  compromissos?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PlanejamentoEstrategicoService {
  private apiUrl = `${environment.apiUrl}/planejamento-estrategico`;

  constructor(private http: HttpClient) {}

  // ===== PLANEJAMENTOS ESTRATÉGICOS =====

  /**
   * Listar todos os planejamentos estratégicos
   */
  listarPlanejamentos(params?: {
    client_id?: number;
    status?: string;
    contract_id?: number;
  }): Observable<{ success: boolean; data: PlanejamentoEstrategico[] }> {
    return this.http.get<{ success: boolean; data: PlanejamentoEstrategico[] }>(
      this.apiUrl,
      { params: params as any }
    );
  }

  /**
   * Obter detalhes de um planejamento com departamentos
   */
  obterPlanejamento(id: number): Observable<{ success: boolean; data: PlanejamentoEstrategico }> {
    return this.http.get<{ success: boolean; data: PlanejamentoEstrategico }>(
      `${this.apiUrl}/${id}`
    );
  }

  /**
   * Criar novo planejamento estratégico
   */
  criarPlanejamento(data: CreatePlanejamentoRequest): Observable<{
    success: boolean;
    message: string;
    data: PlanejamentoEstrategico;
  }> {
    return this.http.post<{
      success: boolean;
      message: string;
      data: PlanejamentoEstrategico;
    }>(this.apiUrl, data);
  }

  /**
   * Criar novo planejamento estratégico com departamentos
   */
  criarPlanejamentoComDepartamentos(data: {
    planejamento: CreatePlanejamentoRequest;
    departamentos: {
      nome_departamento: string;
    }[];
  }): Observable<{
    success: boolean;
    message: string;
    data: PlanejamentoEstrategico;
  }> {
    return this.http.post<{
      success: boolean;
      message: string;
      data: PlanejamentoEstrategico;
    }>(`${this.apiUrl}/com-departamentos`, data);
  }

  /**
   * Atualizar planejamento estratégico
   */
  atualizarPlanejamento(
    id: number,
    data: UpdatePlanejamentoRequest
  ): Observable<{
    success: boolean;
    message: string;
    data: PlanejamentoEstrategico;
  }> {
    return this.http.put<{
      success: boolean;
      message: string;
      data: PlanejamentoEstrategico;
    }>(`${this.apiUrl}/${id}`, data);
  }

  /**
   * Deletar planejamento estratégico
   */
  deletarPlanejamento(id: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(
      `${this.apiUrl}/${id}`
    );
  }

  // ===== DEPARTAMENTOS =====

  /**
   * Listar departamentos de um planejamento
   */
  listarDepartamentos(planejamentoId: number): Observable<{
    success: boolean;
    data: Departamento[];
  }> {
    return this.http.get<{ success: boolean; data: Departamento[] }>(
      `${this.apiUrl}/${planejamentoId}/departamentos`
    );
  }

  /**
   * Adicionar departamento a um planejamento
   */
  adicionarDepartamento(
    planejamentoId: number,
    data: CreateDepartamentoRequest
  ): Observable<{
    success: boolean;
    message: string;
    data: Departamento;
  }> {
    return this.http.post<{
      success: boolean;
      message: string;
      data: Departamento;
    }>(`${this.apiUrl}/${planejamentoId}/departamentos`, data);
  }

  /**
   * Atualizar dados de um departamento
   */
  atualizarDepartamento(
    departamentoId: number,
    data: UpdateDepartamentoRequest
  ): Observable<{
    success: boolean;
    message: string;
    data: Departamento;
  }> {
    return this.http.put<{
      success: boolean;
      message: string;
      data: Departamento;
    }>(`${this.apiUrl}/departamentos/${departamentoId}`, data);
  }

  /**
   * Deletar um departamento
   */
  deletarDepartamento(departamentoId: number): Observable<{
    success: boolean;
    message: string;
  }> {
    return this.http.delete<{ success: boolean; message: string }>(
      `${this.apiUrl}/departamentos/${departamentoId}`
    );
  }

  /**
   * Atualizar ordem de exibição do departamento
   */
  atualizarOrdemDepartamento(
    departamentoId: number,
    ordem: number
  ): Observable<{
    success: boolean;
    message: string;
    data: Departamento;
  }> {
    return this.http.put<{
      success: boolean;
      message: string;
      data: Departamento;
    }>(`${this.apiUrl}/departamentos/${departamentoId}/ordem`, { ordem });
  }

  // ===== MATRIZ DE EVOLUÇÃO CONSCIENTE =====

  /**
   * Obter todas as matrizes de um planejamento
   */
  obterTodasMatrizes(planejamentoId: number): Observable<{
    success: boolean;
    data: Departamento[];
  }> {
    return this.http.get<{ success: boolean; data: Departamento[] }>(
      `${this.apiUrl}/${planejamentoId}/matriz`
    );
  }

  /**
   * Obter matriz de um departamento específico
   */
  obterMatriz(departamentoId: number): Observable<{
    success: boolean;
    data: MatrizEvolucao | null;
  }> {
    return this.http.get<{ success: boolean; data: MatrizEvolucao | null }>(
      `${this.apiUrl}/matriz/${departamentoId}`
    );
  }

  /**
   * Atualizar matriz de evolução consciente (acesso admin)
   */
  atualizarMatriz(
    departamentoId: number,
    data: UpdateMatrizRequest
  ): Observable<{
    success: boolean;
    message: string;
    data: MatrizEvolucao;
  }> {
    return this.http.put<{
      success: boolean;
      message: string;
      data: MatrizEvolucao;
    }>(`${this.apiUrl}/matriz/${departamentoId}`, data);
  }

  // ===== ROTAS PÚBLICAS =====

  /**
   * Obter planejamento via token público (para departamentos preencherem)
   */
  obterPlanejamentoPublico(token: string): Observable<{
    success: boolean;
    data: PlanejamentoEstrategico;
  }> {
    return this.http.get<{ success: boolean; data: PlanejamentoEstrategico }>(
      `${this.apiUrl}/publico/${token}`
    );
  }

  /**
   * Atualizar matriz via link público
   */
  atualizarMatrizPublico(
    departamentoId: number,
    data: UpdateMatrizRequest
  ): Observable<{
    success: boolean;
    message: string;
    data: MatrizEvolucao;
  }> {
    return this.http.put<{
      success: boolean;
      message: string;
      data: MatrizEvolucao;
    }>(`${this.apiUrl}/publico/matriz/${departamentoId}`, data);
  }

  /**
   * Gerar URL pública para preenchimento da Matriz Consciente
   */
  gerarUrlPublica(token: string): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/planejamento-estrategico/${token}`;
  }

  /**
   * Gerar URL pública para preenchimento da Matriz SWOT (por grupo)
   */
  gerarUrlPublicaSwot(grupoToken: string): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/matriz-swot/${grupoToken}`;
  }

  /**
   * Obter grupo via token público
   */
  obterGrupoPublico(token: string): Observable<{ success: boolean; data: Grupo }> {
    return this.http.get<{ success: boolean; data: Grupo }>(
      `${this.apiUrl}/publico/grupo/${token}`
    );
  }

  /**
   * Obter nome do cliente formatado
   */
  getClientName(client: any): string {
    const clientPF = client?.clients_pf?.[0];
    const clientPJ = client?.clients_pj?.[0];

    if (clientPF) {
      return clientPF.full_name || 'N/A';
    } else if (clientPJ) {
      return clientPJ.company_name || clientPJ.trade_name || 'N/A';
    }

    return 'N/A';
  }

  // ===== GRUPOS (MATRIZ SWOT) =====

  /**
   * Listar grupos de um planejamento
   */
  listarGrupos(planejamentoId: number): Observable<{ success: boolean; data: Grupo[] }> {
    return this.http.get<{ success: boolean; data: Grupo[] }>(
      `${this.apiUrl}/${planejamentoId}/grupos`
    );
  }

  /**
   * Adicionar grupo a um planejamento
   */
  adicionarGrupo(planejamentoId: number, data: CreateGrupoRequest): Observable<{
    success: boolean;
    message: string;
    data: Grupo;
  }> {
    return this.http.post<{
      success: boolean;
      message: string;
      data: Grupo;
    }>(`${this.apiUrl}/${planejamentoId}/grupos`, data);
  }

  /**
   * Atualizar grupo
   */
  atualizarGrupo(grupoId: number, data: UpdateGrupoRequest): Observable<{
    success: boolean;
    message: string;
    data: Grupo;
  }> {
    return this.http.put<{
      success: boolean;
      message: string;
      data: Grupo;
    }>(`${this.apiUrl}/grupos/${grupoId}`, data);
  }

  /**
   * Deletar grupo
   */
  deletarGrupo(grupoId: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(
      `${this.apiUrl}/grupos/${grupoId}`
    );
  }

  /**
   * Obter planejamento com grupos e matrizes SWOT
   */
  obterPlanejamentoComSwot(planejamentoId: number): Observable<{
    success: boolean;
    data: PlanejamentoEstrategico & { grupos?: Grupo[] };
  }> {
    return this.http.get<{
      success: boolean;
      data: PlanejamentoEstrategico & { grupos?: Grupo[] };
    }>(`${this.apiUrl}/${planejamentoId}/swot`);
  }

  /**
   * Atualizar matriz SWOT via link público
   */
  atualizarMatrizSwotPublico(grupoId: number, data: UpdateMatrizSwotRequest): Observable<{
    success: boolean;
    message: string;
    data: MatrizSwot;
  }> {
    return this.http.put<{
      success: boolean;
      message: string;
      data: MatrizSwot;
    }>(`${this.apiUrl}/publico/matriz-swot/${grupoId}`, data);
  }

  // ===== MATRIZ SWOT FINAL (CONSOLIDADA) =====

  /**
   * Obter matriz SWOT final consolidada
   */
  obterMatrizSwotFinal(planejamentoId: number): Observable<{
    success: boolean;
    data: MatrizSwotFinal | null;
  }> {
    return this.http.get<{
      success: boolean;
      data: MatrizSwotFinal | null;
    }>(`${this.apiUrl}/${planejamentoId}/swot-final`);
  }

  /**
   * Salvar matriz SWOT final consolidada
   */
  salvarMatrizSwotFinal(planejamentoId: number, data: UpdateMatrizSwotFinalRequest): Observable<{
    success: boolean;
    message: string;
    data: MatrizSwotFinal;
  }> {
    return this.http.put<{
      success: boolean;
      message: string;
      data: MatrizSwotFinal;
    }>(`${this.apiUrl}/${planejamentoId}/swot-final`, data);
  }

  // ===== MATRIZ DE CRUZAMENTO SWOT =====

  /**
   * Obter matriz de cruzamento SWOT
   */
  obterMatrizCruzamento(planejamentoId: number): Observable<{
    success: boolean;
    data: MatrizSwotCruzamento | null;
  }> {
    return this.http.get<{
      success: boolean;
      data: MatrizSwotCruzamento | null;
    }>(`${this.apiUrl}/${planejamentoId}/swot-cruzamento`);
  }

  /**
   * Salvar matriz de cruzamento SWOT
   */
  salvarMatrizCruzamento(planejamentoId: number, data: UpdateMatrizCruzamentoRequest): Observable<{
    success: boolean;
    message: string;
    data: MatrizSwotCruzamento;
  }> {
    return this.http.put<{
      success: boolean;
      message: string;
      data: MatrizSwotCruzamento;
    }>(`${this.apiUrl}/${planejamentoId}/swot-cruzamento`, data);
  }
}
