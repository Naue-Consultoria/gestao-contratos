// src/app/services/contract.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ContractServiceItem {
  service_id: number;
  quantity: number;
  unit_value: number; // em centavos
}

export interface CreateContractRequest {
  contract_number?: string;
  company_id: number;
  type: 'Grande' | 'Pontual' | 'Individual';
  start_date: string;
  end_date?: string | null;
  services: ContractServiceItem[];
  notes?: string | null;
}

export interface UpdateContractRequest {
  contract_number?: string;
  company_id?: number;
  type?: 'Grande' | 'Pontual' | 'Individual';
  start_date?: string;
  end_date?: string | null;
  status?: 'active' | 'completed' | 'cancelled' | 'suspended';
  services?: ContractServiceItem[];
  notes?: string | null;
}

export interface ApiContractService {
  id: number;
  quantity: number;
  unit_value: number;
  total_value: number;
  service: {
    id: number;
    name: string;
    duration: number;
    category: string;
  };
}

export interface ApiContract {
  id: number;
  contract_number: string;
  type: 'Grande' | 'Pontual' | 'Individual';
  start_date: string;
  end_date: string | null;
  status: 'active' | 'completed' | 'cancelled' | 'suspended';
  total_value: number; // em centavos
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  company: {
    id: number;
    name: string;
  };
  contract_services: ApiContractService[];
  created_by_user?: { name: string };
  updated_by_user?: { name: string };
}

export interface ContractsResponse {
  contracts: ApiContract[];
  total: number;
}

export interface ContractResponse {
  contract: ApiContract;
}

export interface CreateContractResponse {
  message: string;
  contract: ApiContract;
}

export interface ContractStats {
  total: number;
  active: number;
  completed: number;
  cancelled: number;
  suspended: number;
  totalValueActive: number;
  totalValueAll: number;
  typeStats: {
    Grande: number;
    Pontual: number;
    Individual: number;
  };
  averageDuration: number;
}

@Injectable({
  providedIn: 'root'
})
export class ContractService {
  private readonly API_URL = 'http://localhost:3000/api/contracts';

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
   * Listar contratos
   */
  getContracts(filters?: any): Observable<ContractsResponse> {
    // Clean up filters before sending
    const cleanFilters: any = {};
    
    if (filters) {
      if (filters.search) cleanFilters.search = filters.search;
      if (filters.status) cleanFilters.status = filters.status;
      if (filters.type) cleanFilters.type = filters.type;
      if (filters.company_id && filters.company_id !== null && filters.company_id !== 'null') {
        cleanFilters.company_id = filters.company_id;
      }
      if (filters.start_date) cleanFilters.start_date = filters.start_date;
      if (filters.end_date) cleanFilters.end_date = filters.end_date;
    }
    
    return this.http.get<ContractsResponse>(this.API_URL, { 
      params: cleanFilters,
      headers: this.getAuthHeaders() 
    });
  }

  /**
   * Buscar contrato por ID
   */
  getContract(id: number): Observable<ContractResponse> {
    return this.http.get<ContractResponse>(`${this.API_URL}/${id}`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Criar novo contrato
   */
  createContract(contractData: CreateContractRequest): Observable<CreateContractResponse> {
    return this.http.post<CreateContractResponse>(this.API_URL, contractData, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Atualizar contrato
   */
  updateContract(id: number, contractData: UpdateContractRequest): Observable<any> {
    return this.http.put(`${this.API_URL}/${id}`, contractData, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Alterar status do contrato
   */
  updateContractStatus(id: number, status: string): Observable<any> {
    return this.http.patch(`${this.API_URL}/${id}/status`, { status }, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Gerar próximo número de contrato
   */
  generateContractNumber(): Observable<{ contractNumber: string }> {
    return this.http.get<{ contractNumber: string }>(`${this.API_URL}/meta/generate-number`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Obter tipos de contratos
   */
  getContractTypes(): Observable<{ types: string[] }> {
    return this.http.get<{ types: string[] }>(`${this.API_URL}/meta/types`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Obter status de contratos
   */
  getContractStatuses(): Observable<{ statuses: string[] }> {
    return this.http.get<{ statuses: string[] }>(`${this.API_URL}/meta/statuses`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Obter estatísticas
   */
  getStats(): Observable<{ stats: ContractStats }> {
    return this.http.get<{ stats: ContractStats }>(`${this.API_URL}/meta/stats`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Excluir contrato
   */
  deleteContract(id: number): Observable<any> {
    return this.http.delete(`${this.API_URL}/${id}`, {
      headers: this.getAuthHeaders()
    });
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

  /**
   * Formatar data para exibição
   */
  formatDate(date: string): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  }

  /**
   * Calcular duração do contrato em dias
   */
  calculateDuration(startDate: string, endDate?: string | null): number {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  /**
   * Obter cor do status
   */
  getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      'active': '#10b981',
      'completed': '#3b82f6',
      'cancelled': '#ef4444',
      'suspended': '#f59e0b'
    };
    return colors[status] || '#6b7280';
  }

  /**
   * Obter texto do status em português
   */
  getStatusText(status: string): string {
    const texts: { [key: string]: string } = {
      'active': 'Ativo',
      'completed': 'Concluído',
      'cancelled': 'Cancelado',
      'suspended': 'Suspenso'
    };
    return texts[status] || status;
  }

  /**
   * Obter ícone do tipo de contrato
   */
  getTypeIcon(type: string): string {
    const icons: { [key: string]: string } = {
      'Grande': 'fas fa-building',
      'Pontual': 'fas fa-calendar-check',
      'Individual': 'fas fa-user'
    };
    return icons[type] || 'fas fa-file-contract';
  }
}