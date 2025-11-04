import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ClientVagasHub,
  ClientComHub,
  VagaComVisibilidade,
  GerarHubTokenRequest,
  GerarHubTokenResponse,
  AtualizarVisibilidadeRequest
} from '../types/vagas-hub';

@Injectable({
  providedIn: 'root'
})
export class VagasHubService {
  private apiUrl = `${environment.apiUrl}/vagas-hub`;

  constructor(private http: HttpClient) {}

  // ============================================================================
  // MÉTODOS PÚBLICOS (acesso via token)
  // ============================================================================

  getHubPublico(token: string): Observable<{ success: boolean; data: ClientVagasHub }> {
    return this.http.get<{ success: boolean; data: ClientVagasHub }>(
      `${this.apiUrl}/publico/${token}`
    );
  }

  getHistoricoVagaNoHub(token: string, vagaId: number): Observable<{ success: boolean; data: any[] }> {
    return this.http.get<{ success: boolean; data: any[] }>(
      `${this.apiUrl}/publico/${token}/vaga/${vagaId}/historico`
    );
  }

  // ============================================================================
  // MÉTODOS PRIVADOS (requerem autenticação)
  // ============================================================================

  getClientesComRsAtivo(): Observable<{ success: boolean; data: ClientComHub[]; total: number }> {
    return this.http.get<{ success: boolean; data: ClientComHub[]; total: number }>(
      `${this.apiUrl}/clientes-rs`
    );
  }

  gerarTokenHub(
    clientId: number,
    request?: GerarHubTokenRequest
  ): Observable<{ success: boolean; data: GerarHubTokenResponse; message: string }> {
    return this.http.post<{ success: boolean; data: GerarHubTokenResponse; message: string }>(
      `${this.apiUrl}/cliente/${clientId}/gerar-token`,
      request || {}
    );
  }

  removerTokenHub(clientId: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(
      `${this.apiUrl}/cliente/${clientId}/remover-token`
    );
  }

  getVagasComVisibilidade(clientId: number): Observable<{ success: boolean; data: VagaComVisibilidade[] }> {
    return this.http.get<{ success: boolean; data: VagaComVisibilidade[] }>(
      `${this.apiUrl}/cliente/${clientId}/vagas`
    );
  }

  getClienteComHub(clientId: number): Observable<{ success: boolean; data: ClientComHub }> {
    return this.http.get<{ success: boolean; data: ClientComHub }>(
      `${this.apiUrl}/cliente/${clientId}`
    );
  }

  atualizarVisibilidade(
    vagaId: number,
    request: AtualizarVisibilidadeRequest
  ): Observable<{ success: boolean; message: string }> {
    return this.http.put<{ success: boolean; message: string }>(
      `${this.apiUrl}/vaga/${vagaId}/visibilidade`,
      request
    );
  }
}
