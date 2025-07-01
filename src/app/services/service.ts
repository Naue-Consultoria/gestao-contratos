// src/app/services/service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CreateServiceRequest {
  name: string;
  duration: number; // em dias
  value: number; // em centavos
  description?: string | null;
  category?: string | null;
  is_active?: boolean;
}

export interface UpdateServiceRequest {
  name?: string;
  duration?: number; // em dias
  value?: number; // em centavos
  description?: string | null;
  category?: string | null;
  is_active?: boolean;
}

export interface ApiService {
  id: number;
  name: string;
  duration: number;
  value: number; // em centavos
  description: string | null;
  category: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by_user?: { name: string };
  updated_by_user?: { name: string };
}

export interface ServicesResponse {
  services: ApiService[];
  total: number;
}

export interface ServiceResponse {
  service: ApiService;
}

export interface CreateServiceResponse {
  message: string;
  service: ApiService;
}

@Injectable({
  providedIn: 'root'
})
export class ServiceService {
  private readonly API_URL = 'http://localhost:3000/api/services';

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
   * Listar serviços
   */
  getServices(filters?: any): Observable<ServicesResponse> {
    return this.http.get<ServicesResponse>(this.API_URL, { 
      params: filters || {},
      headers: this.getAuthHeaders() 
    });
  }

  /**
   * Buscar serviço por ID
   */
  getService(id: number): Observable<ServiceResponse> {
    return this.http.get<ServiceResponse>(`${this.API_URL}/${id}`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Criar novo serviço
   */
  createService(serviceData: CreateServiceRequest): Observable<CreateServiceResponse> {
    return this.http.post<CreateServiceResponse>(this.API_URL, serviceData, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Atualizar serviço
   */
  updateService(id: number, serviceData: UpdateServiceRequest): Observable<any> {
    return this.http.put(`${this.API_URL}/${id}`, serviceData, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Alternar status do serviço
   */
  toggleServiceStatus(id: number): Observable<any> {
    return this.http.patch(`${this.API_URL}/${id}/toggle-status`, {}, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Excluir serviço
   */
  deleteService(id: number): Observable<any> {
    return this.http.delete(`${this.API_URL}/${id}`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Formatar duração para exibição
   */
  formatDuration(days: number): string {
    if (days === 1) {
      return '1 dia';
    }
    return `${days} dias`;
  }

  /**
   * Formatar valor para exibição (de centavos para reais)
   */
  formatValue(valueInCents: number): string {
    const valueInReais = valueInCents / 100;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valueInReais);
  }

  /**
   * Converter valor de reais para centavos
   */
  convertToCents(valueInReais: number): number {
    return Math.round(valueInReais * 100);
  }

  /**
   * Converter valor de centavos para reais
   */
  convertToReais(valueInCents: number): number {
    return valueInCents / 100;
  }
}