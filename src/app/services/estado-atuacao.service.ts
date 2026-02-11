import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface EstadoAtuacao {
  id: number;
  numero: number;
  estado: string;
  sigla: string;
  ativo: boolean;
  ordem: number;
  created_at?: string;
  updated_at?: string;
  created_by_user?: { name: string };
  updated_by_user?: { name: string };
}

export interface EstadoAtuacaoSimples {
  id: number;
  numero: number;
  estado: string;
  sigla: string;
  ordem: number;
}

export interface CreateEstadoRequest {
  numero?: number;
  estado: string;
  sigla: string;
  ativo?: boolean;
  ordem?: number;
}

export interface UpdateEstadoRequest {
  numero?: number;
  estado?: string;
  sigla?: string;
  ativo?: boolean;
  ordem?: number;
}

export interface EstadosResponse {
  estados: EstadoAtuacao[];
  total: number;
}

export interface EstadosActivesResponse {
  estados: EstadoAtuacaoSimples[];
  total: number;
}

export interface EstadoResponse {
  estado: EstadoAtuacao;
}

export interface CreateEstadoResponse {
  message: string;
  estado: EstadoAtuacao;
}

export interface EstadoStats {
  total: number;
  ativos: number;
  inativos: number;
}

export interface EstadoFilters {
  ativo?: boolean;
  sigla?: string;
  search?: string;
}

@Injectable({
  providedIn: 'root'
})
export class EstadoAtuacaoService {
  private readonly API_URL = `${environment.apiUrl}/estados-atuacao`;

  constructor(private http: HttpClient) {}

  /**
   * Obter headers com autorização
   */
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  /**
   * Listar estados de atuação (protegido)
   */
  getEstados(filters?: EstadoFilters): Observable<EstadosResponse> {
    let params: any = {};

    if (filters) {
      if (filters.ativo !== undefined) {
        params.ativo = filters.ativo.toString();
      }
      if (filters.sigla) {
        params.sigla = filters.sigla;
      }
      if (filters.search) {
        params.search = filters.search;
      }
    }

    return this.http.get<EstadosResponse>(this.API_URL, {
      params,
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Listar estados ativos para exibição pública
   */
  getEstadosAtivos(): Observable<EstadosActivesResponse> {
    return this.http.get<EstadosActivesResponse>(`${this.API_URL}/public/active`);
  }

  /**
   * Buscar estado por ID
   */
  getEstado(id: number): Observable<EstadoResponse> {
    return this.http.get<EstadoResponse>(`${this.API_URL}/${id}`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Criar novo estado de atuação
   */
  createEstado(estadoData: CreateEstadoRequest): Observable<CreateEstadoResponse> {
    return this.http.post<CreateEstadoResponse>(this.API_URL, estadoData, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Atualizar estado
   */
  updateEstado(id: number, estadoData: UpdateEstadoRequest): Observable<any> {
    return this.http.put(`${this.API_URL}/${id}`, estadoData, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Alternar status do estado
   */
  toggleEstadoStatus(id: number): Observable<any> {
    return this.http.patch(`${this.API_URL}/${id}/toggle-status`, {}, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Excluir estado (soft delete)
   */
  deleteEstado(id: number): Observable<any> {
    return this.http.delete(`${this.API_URL}/${id}`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Excluir estado permanentemente (apenas admin)
   */
  deleteEstadoPermanent(id: number): Observable<any> {
    return this.http.delete(`${this.API_URL}/${id}/permanent`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Reordenar estados
   */
  reorderEstados(estados: EstadoAtuacao[]): Observable<any> {
    return this.http.post(`${this.API_URL}/reorder`, { estados }, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Obter estatísticas dos estados
   */
  getEstadoStats(): Observable<{ stats: EstadoStats }> {
    return this.http.get<{ stats: EstadoStats }>(`${this.API_URL}/meta/stats`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Formatar exibição do estado
   */
  formatEstado(estado: EstadoAtuacao | EstadoAtuacaoSimples): string {
    return `${estado.numero}. ${estado.estado}-${estado.sigla}`;
  }

  /**
   * Validar sigla do estado
   */
  isValidSigla(sigla: string): boolean {
    const siglasValidas = [
      'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
      'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
      'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
    ];

    return siglasValidas.includes(sigla.toUpperCase());
  }

  /**
   * Obter nome completo do estado pela sigla
   */
  getEstadoNameBySigla(sigla: string): string {
    const estadosMap: { [key: string]: string } = {
      'AC': 'Acre',
      'AL': 'Alagoas',
      'AP': 'Amapá',
      'AM': 'Amazonas',
      'BA': 'Bahia',
      'CE': 'Ceará',
      'DF': 'Distrito Federal',
      'ES': 'Espírito Santo',
      'GO': 'Goiás',
      'MA': 'Maranhão',
      'MT': 'Mato Grosso',
      'MS': 'Mato Grosso do Sul',
      'MG': 'Minas Gerais',
      'PA': 'Pará',
      'PB': 'Paraíba',
      'PR': 'Paraná',
      'PE': 'Pernambuco',
      'PI': 'Piauí',
      'RJ': 'Rio de Janeiro',
      'RN': 'Rio Grande do Norte',
      'RS': 'Rio Grande do Sul',
      'RO': 'Rondônia',
      'RR': 'Roraima',
      'SC': 'Santa Catarina',
      'SP': 'São Paulo',
      'SE': 'Sergipe',
      'TO': 'Tocantins'
    };

    return estadosMap[sigla.toUpperCase()] || sigla;
  }
}
