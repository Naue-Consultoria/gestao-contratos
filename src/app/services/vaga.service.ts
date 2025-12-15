import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Vaga,
  VagaStatusHistory,
  GerarLinkPublicoRequest,
  GerarLinkPublicoResponse
} from '../types/vaga';

@Injectable({
  providedIn: 'root'
})
export class VagaService {
  private apiUrl = `${environment.apiUrl}/vagas`;

  constructor(private http: HttpClient) {}

  getAll(filters?: any): Observable<{ data: Vaga[]; count: number }> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          params = params.set(key, filters[key]);
        }
      });
    }
    return this.http.get<{ data: Vaga[]; count: number }>(this.apiUrl, { params });
  }

  getById(id: number): Observable<Vaga> {
    return this.http.get<Vaga>(`${this.apiUrl}/${id}`);
  }

  create(vaga: Partial<Vaga>): Observable<Vaga> {
    return this.http.post<Vaga>(this.apiUrl, vaga);
  }

  update(id: number, vaga: Partial<Vaga>): Observable<Vaga> {
    return this.http.put<Vaga>(`${this.apiUrl}/${id}`, vaga);
  }

  updateVaga(id: number, data: Partial<Vaga>): Observable<Vaga> {
    return this.update(id, data);
  }

  updateStatus(id: number, status: string): Observable<Vaga> {
    return this.http.patch<Vaga>(`${this.apiUrl}/${id}/status`, { status });
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  getStatistics(filters?: any): Observable<any> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          params = params.set(key, filters[key]);
        }
      });
    }
    return this.http.get(`${this.apiUrl}/statistics`, { params });
  }

  getCandidatos(vagaId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${vagaId}/candidatos`);
  }

  vincularCandidato(vagaId: number, candidatoId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${vagaId}/candidatos`, { candidato_id: candidatoId });
  }

  desvincularCandidato(vagaId: number, candidatoId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${vagaId}/candidatos/${candidatoId}`);
  }

  // ============================================================================
  // MÉTODOS PÚBLICOS (acesso via token)
  // ============================================================================

  getVagaPublica(token: string): Observable<{ success: boolean; data: Vaga; message?: string }> {
    return this.http.get<{ success: boolean; data: Vaga; message?: string }>(
      `${this.apiUrl}/publico/${token}`
    );
  }

  getHistoricoStatusPublico(token: string): Observable<{ success: boolean; data: VagaStatusHistory[] }> {
    return this.http.get<{ success: boolean; data: VagaStatusHistory[] }>(
      `${this.apiUrl}/publico/${token}/historico`
    );
  }

  // ============================================================================
  // MÉTODOS PRIVADOS (requerem autenticação)
  // ============================================================================

  gerarLinkPublico(
    vagaId: number,
    request?: GerarLinkPublicoRequest
  ): Observable<{ success: boolean; data: GerarLinkPublicoResponse; message: string }> {
    return this.http.post<{ success: boolean; data: GerarLinkPublicoResponse; message: string }>(
      `${this.apiUrl}/${vagaId}/gerar-link-publico`,
      request || {}
    );
  }

  removerLinkPublico(vagaId: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(
      `${this.apiUrl}/${vagaId}/remover-link-publico`
    );
  }

  getHistoricoStatusPrivado(vagaId: number): Observable<{ success: boolean; data: VagaStatusHistory[] }> {
    return this.http.get<{ success: boolean; data: VagaStatusHistory[] }>(
      `${this.apiUrl}/${vagaId}/historico-status`
    );
  }
}