import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface ServiceStage {
  id: number;
  service_id: number;
  name: string;
  description: string | null;
  category: string | null;
  sort_order: number;
  status: 'pending' | 'completed';
  is_active: boolean;
  is_not_applicable?: boolean;
  created_at: string;
  updated_at: string;
  created_by_user?: { name: string };
  updated_by_user?: { name: string };
}

export interface ServiceProgress {
  totalStages: number;
  completedStages: number;
  progressPercentage: number;
  stages: ServiceStage[];
}

export interface CreateServiceStageRequest {
  service_id: number;
  name: string;
  description?: string | null;
  category?: string | null;
  sort_order?: number;
}

export interface UpdateServiceStageRequest {
  name?: string;
  description?: string | null;
  category?: string | null;
  sort_order?: number;
  status?: 'pending' | 'completed';
  is_active?: boolean;
}

export interface ServiceStagesResponse {
  stages: ServiceStage[];
  progress: ServiceProgress;
  service: {
    id: number;
    name: string;
  };
}

export interface ServiceProgressResponse {
  progress: ServiceProgress;
  service: {
    id: number;
    name: string;
  };
}

export interface CreateServiceStageResponse {
  message: string;
  stage: ServiceStage;
}

export interface UpdateServiceStageResponse {
  message: string;
  stage: ServiceStage;
  progress?: ServiceProgress;
}

export interface StageStatusUpdate {
  id: number;
  status: 'pending' | 'completed';
}

export interface MultipleStageUpdatesRequest {
  updates: StageStatusUpdate[];
}

export interface MultipleStageUpdatesResponse {
  message: string;
  stages: ServiceStage[];
  progressData: { [serviceId: number]: ServiceProgress };
}

export interface StageReorderItem {
  id: number;
  sort_order: number;
}

@Injectable({
  providedIn: 'root'
})
export class ServiceStageService {
  private readonly API_URL = `${environment.apiUrl}`;
  private stagesCache = new Map<number, { data: ServiceStagesResponse; timestamp: number }>();
  private progressCache = new Map<number, { data: ServiceProgressResponse; timestamp: number }>();
  private readonly CACHE_DURATION = 30000; // 30 segundos
  private readonly PROGRESS_CACHE_DURATION = 60000; // 1 minuto para progresso

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  /**
   * Buscar etapas de um serviço (com cache)
   */
  getServiceStages(serviceId: number): Observable<ServiceStagesResponse> {
    // Verificar cache primeiro
    const cached = this.stagesCache.get(serviceId);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < this.CACHE_DURATION) {
      console.log(`📄 Usando cache para etapas do serviço ${serviceId}`);
      return of(cached.data);
    }

    return this.http.get<ServiceStagesResponse>(`${this.API_URL}/services/${serviceId}/stages`, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap((response: ServiceStagesResponse) => {
        // Salvar no cache
        this.stagesCache.set(serviceId, {
          data: response,
          timestamp: now
        });
      }),
      catchError((error: any) => {
        console.error(`Erro ao buscar etapas do serviço ${serviceId}:`, error);

        // Se tiver cache expirado, usar mesmo assim em caso de erro
        if (cached) {
          console.warn(`🗃️ Usando cache expirado para etapas do serviço ${serviceId} devido ao erro`);
          return of(cached.data);
        }

        return throwError(() => error);
      })
    );
  }

  /**
   * Buscar progresso de um serviço (com cache)
   */
  getServiceProgress(serviceId: number): Observable<ServiceProgressResponse> {
    // Verificar cache primeiro
    const cached = this.progressCache.get(serviceId);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < this.PROGRESS_CACHE_DURATION) {
      return of(cached.data);
    }

    return this.http.get<ServiceProgressResponse>(`${this.API_URL}/services/${serviceId}/stages/progress`, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap((response: ServiceProgressResponse) => {
        // Salvar no cache
        this.progressCache.set(serviceId, {
          data: response,
          timestamp: now
        });
      }),
      catchError((error: any) => {

        // Se tiver cache expirado, usar mesmo assim em caso de erro
        if (cached) {
          return of(cached.data);
        }

        // Se o serviço não tiver etapas configuradas (404), retornar progresso vazio
        if (error?.status === 404) {
          const fallbackResponse = {
            progress: {
              totalStages: 0,
              completedStages: 0,
              progressPercentage: 0,
              stages: []
            },
            service: {
              id: serviceId,
              name: 'Unknown Service'
            }
          } as ServiceProgressResponse;

          // Cache também a resposta de fallback para evitar chamadas repetidas
          this.progressCache.set(serviceId, {
            data: fallbackResponse,
            timestamp: now
          });

          return of(fallbackResponse);
        }

        // Para outros erros, propagar o erro
        return throwError(() => error);
      })
    );
  }

  /**
   * Criar nova etapa
   */
  createStage(stageData: CreateServiceStageRequest): Observable<CreateServiceStageResponse> {
    return this.http.post<CreateServiceStageResponse>(`${this.API_URL}/stages`, stageData, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Criar etapas padrão para um serviço
   */
  createDefaultStages(serviceId: number): Observable<CreateServiceStageResponse> {
    return this.http.post<CreateServiceStageResponse>(`${this.API_URL}/services/${serviceId}/stages/default`, {}, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Buscar etapa por ID
   */
  getStage(id: number): Observable<{ stage: ServiceStage }> {
    return this.http.get<{ stage: ServiceStage }>(`${this.API_URL}/stages/${id}`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Atualizar etapa
   */
  updateStage(id: number, stageData: UpdateServiceStageRequest): Observable<UpdateServiceStageResponse> {
    return this.http.put<UpdateServiceStageResponse>(`${this.API_URL}/stages/${id}`, stageData, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Atualizar status de uma etapa
   */
  updateStageStatus(id: number, status: 'pending' | 'completed'): Observable<UpdateServiceStageResponse> {
    return this.http.patch<UpdateServiceStageResponse>(`${this.API_URL}/stages/${id}/status`, { status }, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap((response: UpdateServiceStageResponse) => {
        // Invalidar cache do serviço após atualização
        if (response.stage?.service_id) {
          this.invalidateCache(response.stage.service_id);
        }
      })
    );
  }

  /**
   * Atualizar is_not_applicable de uma etapa
   */
  updateStageNotApplicable(id: number, is_not_applicable: boolean): Observable<UpdateServiceStageResponse> {
    return this.http.patch<UpdateServiceStageResponse>(`${this.API_URL}/stages/${id}/not-applicable`, { is_not_applicable }, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap((response: UpdateServiceStageResponse) => {
        // Invalidar cache do serviço após atualização
        if (response.stage?.service_id) {
          this.invalidateCache(response.stage.service_id);
        }
      })
    );
  }

  /**
   * Atualizar status de múltiplas etapas
   */
  updateMultipleStageStatuses(updates: StageStatusUpdate[]): Observable<MultipleStageUpdatesResponse> {
    return this.http.patch<MultipleStageUpdatesResponse>(`${this.API_URL}/stages/status/bulk`, { updates }, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Reordenar etapas de um serviço
   */
  reorderStages(serviceId: number, stageOrders: StageReorderItem[]): Observable<{ message: string; stages: ServiceStage[] }> {
    return this.http.put<{ message: string; stages: ServiceStage[] }>(`${this.API_URL}/services/${serviceId}/stages/reorder`, { stageOrders }, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Excluir etapa (soft delete)
   */
  deleteStage(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.API_URL}/stages/${id}`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Excluir etapa permanentemente (apenas admin)
   */
  deleteStagepermanently(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.API_URL}/stages/${id}/permanent`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Utilitários
   */

  /**
   * Obter cor do status da etapa
   */
  getStatusColor(status: 'pending' | 'completed'): string {
    switch (status) {
      case 'completed':
        return '#28a745'; // Verde
      case 'pending':
      default:
        return '#6c757d'; // Cinza
    }
  }

  /**
   * Obter ícone do status da etapa
   */
  getStatusIcon(status: 'pending' | 'completed'): string {
    switch (status) {
      case 'completed':
        return 'fas fa-check-circle';
      case 'pending':
      default:
        return 'fas fa-circle';
    }
  }

  /**
   * Obter texto do status da etapa
   */
  getStatusText(status: 'pending' | 'completed'): string {
    switch (status) {
      case 'completed':
        return 'Concluída';
      case 'pending':
      default:
        return 'Pendente';
    }
  }

  /**
   * Calcular progresso em porcentagem
   */
  calculateProgress(stages: ServiceStage[]): number {
    // Filtrar apenas etapas aplicáveis (não marcadas como N/A)
    const applicableStages = stages.filter(stage => !stage.is_not_applicable);
    if (applicableStages.length === 0) return 0;
    const completedStages = applicableStages.filter(stage => stage.status === 'completed').length;
    return Math.round((completedStages / applicableStages.length) * 100);
  }

  /**
   * Verificar se todas as etapas estão concluídas
   */
  isServiceCompleted(stages: ServiceStage[]): boolean {
    const applicableStages = stages.filter(stage => !stage.is_not_applicable);
    return applicableStages.length > 0 && applicableStages.every(stage => stage.status === 'completed');
  }

  /**
   * Obter próxima etapa pendente
   */
  getNextPendingStage(stages: ServiceStage[]): ServiceStage | null {
    const pendingStages = stages.filter(stage => stage.status === 'pending' && !stage.is_not_applicable);
    return pendingStages.length > 0 ? pendingStages[0] : null;
  }

  /**
   * Obter estatísticas das etapas
   */
  getStageStats(stages: ServiceStage[]): { total: number; completed: number; pending: number; progress: number } {
    const applicableStages = stages.filter(stage => !stage.is_not_applicable);
    const total = applicableStages.length;
    const completed = applicableStages.filter(stage => stage.status === 'completed').length;
    const pending = total - completed;
    const progress = this.calculateProgress(stages);

    return {
      total,
      completed,
      pending,
      progress
    };
  }

  /**
   * Limpar cache de etapas e progresso
   */
  clearCache(serviceId?: number): void {
    if (serviceId) {
      this.stagesCache.delete(serviceId);
      this.progressCache.delete(serviceId);
      console.log(`🗑️ Cache limpo para serviço ${serviceId}`);
    } else {
      this.stagesCache.clear();
      this.progressCache.clear();
      console.log('🗑️ Cache de etapas e progresso totalmente limpo');
    }
  }

  /**
   * Invalidar cache após atualização de etapa
   */
  private invalidateCache(serviceId: number): void {
    this.clearCache(serviceId);
  }
}