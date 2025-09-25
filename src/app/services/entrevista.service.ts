import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Entrevista {
  id?: number;
  vaga_candidato_id: number;
  data_entrevista: string;
  hora_entrevista: string;
  status?: 'agendada' | 'realizada' | 'cancelada' | 'nao_compareceu' | 'remarcada';
  link_chamada?: string;
  observacoes?: string;
  entrevistador_id?: number;
  entrevistador_nome?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface Entrevistador {
  id: number;
  name: string;
}

@Injectable({
  providedIn: 'root'
})
export class EntrevistaService {
  private apiUrl = `${environment.apiUrl}/entrevistas`;

  constructor(private http: HttpClient) { }

  createEntrevista(entrevista: Entrevista): Observable<Entrevista> {
    return this.http.post<Entrevista>(this.apiUrl, entrevista);
  }

  updateEntrevista(id: number, entrevista: Partial<Entrevista>): Observable<Entrevista> {
    return this.http.put<Entrevista>(`${this.apiUrl}/${id}`, entrevista);
  }

  getEntrevistasByVagaCandidato(vagaCandidatoId: number): Observable<Entrevista[]> {
    return this.http.get<Entrevista[]>(`${this.apiUrl}/vaga-candidato/${vagaCandidatoId}`);
  }

  deleteEntrevista(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getEntrevistadores(): Observable<Entrevistador[]> {
    return this.http.get<Entrevistador[]>(`${environment.apiUrl}/users/entrevistadores`);
  }
}