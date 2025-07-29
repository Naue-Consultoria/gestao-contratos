import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ContractServiceItem {
  service_id: number;
  quantity: number;
  unit_value: number; // em centavos
}

export interface CreateContractRequest {
  contract_number?: string;
  company_id: number;
  type: 'Full' | 'Pontual' | 'Individual';
  start_date: string;
  end_date?: string | null;
  status?: 'active' | 'completed' | 'cancelled' | 'suspended';
  services: ContractServiceItem[];
  notes?: string | null;
  assigned_users?: number[];
}

export interface UpdateContractRequest {
  contract_number?: string;
  company_id?: number;
  type?: 'Full' | 'Pontual' | 'Individual';
  start_date?: string;
  end_date?: string | null;
  status?: 'active' | 'completed' | 'cancelled' | 'suspended';
  services?: ContractServiceItem[];
  notes?: string | null;
  assigned_users?: number[]; // <-- ADD THIS LINE
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
  type: 'Full' | 'Pontual' | 'Individual';
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
  assigned_users?: { user: { id: number; name: string } }[];
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
  averageValue: number;
  typeStats: {
    Full: number;
    Pontual: number;
    Individual: number;
  };
  averageDuration: number;
}

@Injectable({
  providedIn: 'root'
})
export class ContractService {
  private readonly API_URL = `${environment.apiUrl}/contracts`;

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  getContracts(filters?: any): Observable<ContractsResponse> {
    const cleanFilters: any = {};
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key] !== null && filters[key] !== '' && filters[key] !== 'null') {
          cleanFilters[key] = filters[key];
        }
      });
    }
    return this.http.get<ContractsResponse>(this.API_URL, { 
      params: cleanFilters,
      headers: this.getAuthHeaders() 
    });
  }

  getContract(id: number): Observable<ContractResponse> {
    return this.http.get<ContractResponse>(`${this.API_URL}/${id}`, {
      headers: this.getAuthHeaders()
    });
  }

  createContract(contractData: CreateContractRequest): Observable<CreateContractResponse> {
    return this.http.post<CreateContractResponse>(this.API_URL, contractData, {
      headers: this.getAuthHeaders()
    });
  }

  updateContract(id: number, contractData: UpdateContractRequest): Observable<any> {
    return this.http.put(`${this.API_URL}/${id}`, contractData, {
      headers: this.getAuthHeaders()
    });
  }

  updateContractStatus(id: number, status: string): Observable<any> {
    return this.http.patch(`${this.API_URL}/${id}/status`, { status }, {
      headers: this.getAuthHeaders()
    });
  }

  generateContractNumber(): Observable<{ contractNumber: string }> {
    return this.http.get<{ contractNumber: string }>(`${this.API_URL}/meta/generate-number`, {
      headers: this.getAuthHeaders()
    });
  }

  getContractTypes(): Observable<{ types: { value: string, label: string }[] }> {
    return this.http.get<{ types: { value: string, label: string }[] }>(`${this.API_URL}/meta/types`, {
      headers: this.getAuthHeaders()
    });
  }
  
  getContractStatuses(): Observable<{ statuses: { value: string, label: string }[] }> {
    return this.http.get<{ statuses: { value: string, label: string }[] }>(`${this.API_URL}/meta/statuses`, {
      headers: this.getAuthHeaders()
    });
  }

  getStats(): Observable<{ stats: ContractStats }> {
    return this.http.get<{ stats: ContractStats }>(`${this.API_URL}/meta/stats`, {
      headers: this.getAuthHeaders()
    });
  }

  deleteContractPermanent(id: number): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.delete(`${this.API_URL}/${id}/permanent`, { headers });
  }

  formatValue(valueInCents: number): string {
    const valueInReais = (valueInCents || 0) / 100;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valueInReais);
  }

  convertToCents(valueInReais: number): number {
    return Math.round((valueInReais || 0) * 100);
  }

  convertToReais(valueInCents: number): number {
    return (valueInCents || 0) / 100;
  }

  formatDate(date: string | null): string {
    if (!date) return 'Indeterminado';
    // Adiciona T00:00:00 para garantir que a data seja interpretada como local
    return new Date(`${date}T00:00:00`).toLocaleDateString('pt-BR');
  }

  calculateDuration(startDate: string, endDate?: string | null): number {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      'active': '#10b981', 'completed': '#3b82f6', 'cancelled': '#ef4444', 'suspended': '#f59e0b'
    };
    return colors[status] || '#6b7280';
  }

  getStatusText(status: string): string {
    const texts: { [key: string]: string } = {
      'active': 'Ativo', 'completed': 'Concluído', 'cancelled': 'Cancelado', 'suspended': 'Suspenso'
    };
    return texts[status] || status;
  }

  getTypeIcon(type: string): string {
    const icons: { [key: string]: string } = {
      'Full': 'fas fa-building', 'Pontual': 'fas fa-calendar-check', 'Individual': 'fas fa-user'
    };
    return icons[type] || 'fas fa-file-contract';
  }
}