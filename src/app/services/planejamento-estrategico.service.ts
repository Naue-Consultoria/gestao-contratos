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
   * Gerar URL pública para preenchimento da matriz
   */
  gerarUrlPublica(token: string): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/planejamento-estrategico/${token}`;
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
}
