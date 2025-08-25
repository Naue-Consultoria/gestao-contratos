import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ServiceRoutine {
  id?: number;
  contract_service_id: number;
  status: 'not_started' | 'scheduled' | 'in_progress' | 'completed';
  scheduled_date?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface RoutineComment {
  id: number;
  routine_id: number;
  user_id: number;
  comment: string;
  has_attachments: boolean;
  created_at: string;
  user?: {
    id: number;
    name: string;
    email: string;
  };
  attachments?: RoutineAttachment[];
}

export interface RoutineAttachment {
  id: number;
  comment_id: number;
  file_name: string;
  original_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_by: number;
  uploaded_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class RoutineService {
  private apiUrl = `${environment.apiUrl}/routines`;

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  /**
   * Buscar rotina por ID do serviço do contrato
   */
  getRoutineByContractServiceId(contractServiceId: number): Observable<ServiceRoutine | null> {
    return this.http.get<ServiceRoutine | null>(
      `${this.apiUrl}/contract-service/${contractServiceId}`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Buscar rotina por ID da rotina
   */
  getRoutineById(routineId: number): Observable<ServiceRoutine | null> {
    return this.http.get<ServiceRoutine | null>(
      `${this.apiUrl}/${routineId}`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Atualizar status e data da rotina
   */
  updateRoutine(contractServiceId: number, data: Partial<ServiceRoutine>): Observable<ServiceRoutine> {
    return this.http.put<ServiceRoutine>(
      `${this.apiUrl}/contract-service/${contractServiceId}`, 
      data,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Buscar comentários da rotina
   */
  getRoutineComments(routineId: number): Observable<RoutineComment[]> {
    return this.http.get<RoutineComment[]>(
      `${this.apiUrl}/${routineId}/comments`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Adicionar comentário à rotina
   */
  addComment(routineId: number, comment: string): Observable<RoutineComment> {
    return this.http.post<RoutineComment>(
      `${this.apiUrl}/${routineId}/comments`, 
      { comment },
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Adicionar anexo ao comentário
   */
  addAttachment(commentId: number, attachmentData: any): Observable<RoutineAttachment> {
    return this.http.post<RoutineAttachment>(
      `${this.apiUrl}/comments/${commentId}/attachments`, 
      attachmentData,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Deletar comentário da rotina
   */
  deleteComment(commentId: number): Observable<{success: boolean, message: string}> {
    return this.http.delete<{success: boolean, message: string}>(
      `${this.apiUrl}/comments/${commentId}`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Buscar todas as rotinas de um contrato
   */
  getRoutinesByContractId(contractId: number): Observable<ServiceRoutine[]> {
    return this.http.get<ServiceRoutine[]>(
      `${this.apiUrl}/contract/${contractId}`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Helper methods for status
   */
  getRoutineStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      'not_started': '#6b7280',
      'scheduled': '#3b82f6',
      'in_progress': '#f59e0b',
      'completed': '#10b981'
    };
    return colors[status] || '#6b7280';
  }

  getRoutineStatusText(status: string): string {
    const texts: { [key: string]: string } = {
      'not_started': 'Não iniciado',
      'scheduled': 'Agendado',
      'in_progress': 'Em andamento',
      'completed': 'Finalizado'
    };
    return texts[status] || status;
  }

  getRoutineStatusIcon(status: string): string {
    const icons: { [key: string]: string } = {
      'not_started': 'fas fa-circle',
      'scheduled': 'fas fa-calendar-alt',
      'in_progress': 'fas fa-spinner',
      'completed': 'fas fa-check-circle'
    };
    return icons[status] || 'fas fa-circle';
  }
}