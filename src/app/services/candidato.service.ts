import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Candidato {
  id?: number;
  nome: string;
  email?: string;
  telefone?: string;
  status?: 'pendente' | 'aprovado' | 'reprovado' | 'desistiu';
  observacoes?: string; // Adicionado
  created_at?: Date;
  updated_at?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class CandidatoService {
  private apiUrl = `${environment.apiUrl}/candidatos`;

  constructor(private http: HttpClient) {}

  getCandidatos(): Observable<Candidato[]> {
    return this.http.get<Candidato[]>(this.apiUrl);
  }

  getCandidatoById(id: number): Observable<Candidato> {
    return this.http.get<Candidato>(`${this.apiUrl}/${id}`);
  }

  createCandidato(candidato: Candidato): Observable<Candidato> {
    return this.http.post<Candidato>(this.apiUrl, candidato);
  }

  updateCandidato(id: number, candidato: Candidato): Observable<Candidato> {
    return this.http.put<Candidato>(`${this.apiUrl}/${id}`, candidato);
  }

  updateCandidatoVagaStatus(vagaCandidatoId: number, data: { status: string, observacoes?: string }): Observable<any> {
    return this.http.patch(`${this.apiUrl}/vaga-candidato/${vagaCandidatoId}/status`, data);
  }

  deleteCandidato(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  searchCandidatos(search: string): Observable<{ data: Candidato[]; count: number }> {
    return this.http.get<{ data: Candidato[]; count: number }>(this.apiUrl, {
      params: { search }
    });
  }
}