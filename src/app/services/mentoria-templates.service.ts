import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface MentoriaTemplate {
  id: number;
  nome: string;
  descricao?: string;
  tipo: 'perguntas' | 'tarefas';
  content: any; // JSON: perguntas: {pergunta: string}[] ou tarefas: {titulo: string, itens: {texto: string}[]}
  created_by?: number;
  created_by_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface MentoriaTemplateCreateDto {
  nome: string;
  descricao?: string;
  tipo: 'perguntas' | 'tarefas';
  content: any;
}

export interface MentoriaTemplateUpdateDto {
  nome?: string;
  descricao?: string;
  tipo?: 'perguntas' | 'tarefas';
  content?: any;
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

@Injectable({
  providedIn: 'root'
})
export class MentoriaTemplatesService {
  private readonly apiUrl = `${environment.apiUrl}/mentoria-templates`;

  constructor(private http: HttpClient) {}

  /**
   * Lista todos os templates ativos
   * @param tipo Filtro opcional por tipo: 'perguntas' ou 'tarefas'
   */
  listarTemplates(tipo?: 'perguntas' | 'tarefas'): Observable<ApiResponse<MentoriaTemplate[]>> {
    let params: Record<string, string> = {};
    if (tipo) {
      params['tipo'] = tipo;
    }
    return this.http.get<ApiResponse<MentoriaTemplate[]>>(this.apiUrl, { params });
  }

  /**
   * Obtém um template específico
   */
  obterTemplate(id: number): Observable<ApiResponse<MentoriaTemplate>> {
    return this.http.get<ApiResponse<MentoriaTemplate>>(`${this.apiUrl}/${id}`);
  }

  /**
   * Cria um novo template
   */
  criarTemplate(template: MentoriaTemplateCreateDto): Observable<ApiResponse<{ id: number }>> {
    return this.http.post<ApiResponse<{ id: number }>>(this.apiUrl, template);
  }

  /**
   * Atualiza um template existente
   */
  atualizarTemplate(id: number, template: MentoriaTemplateUpdateDto): Observable<ApiResponse<void>> {
    return this.http.put<ApiResponse<void>>(`${this.apiUrl}/${id}`, template);
  }

  /**
   * Exclui um template
   */
  excluirTemplate(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`);
  }
}
