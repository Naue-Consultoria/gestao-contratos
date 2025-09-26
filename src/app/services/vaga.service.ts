import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Vaga } from '../types/vaga';

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
}