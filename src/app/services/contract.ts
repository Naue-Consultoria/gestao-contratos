import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ContractServiceItem {
  service_id: number;
  unit_value: number; // em reais
  scheduled_start_date?: string | null;
  status?: 'not_started' | 'scheduled' | 'in_progress' | 'completed';
}

export interface ContractInstallment {
  due_date: string;
  amount: number;
  notes?: string | null;
}

export interface ApiContractInstallment {
  id: number;
  installment_number: number;
  due_date: string;
  amount: number;
  payment_status: 'pago' | 'pendente' | 'atrasado';
  paid_date?: string | null;
  paid_amount?: number | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateContractRequest {
  contract_number?: string;
  client_id: number;
  type: 'Full' | 'Pontual' | 'Individual';
  start_date: string;
  end_date?: string | null;
  status?: 'active' | 'completed' | 'cancelled' | 'suspended';
  services: ContractServiceItem[];
  notes?: string | null;
  assigned_users?: number[];
  payment_method?: string | null;
  expected_payment_date?: string | null;
  payment_status?: 'pago' | 'pendente';
  installment_count?: number;
  installments?: ContractInstallment[];
}

export interface UpdateContractRequest {
  contract_number?: string;
  client_id?: number;
  type?: 'Full' | 'Pontual' | 'Individual';
  start_date?: string;
  end_date?: string | null;
  status?: 'active' | 'completed' | 'cancelled' | 'suspended';
  services?: ContractServiceItem[];
  notes?: string | null;
  assigned_users?: number[];
  payment_method?: string | null;
  expected_payment_date?: string | null;
  payment_status?: 'pago' | 'pendente';
  installment_count?: number;
  installments?: ContractInstallment[];
}

export interface ApiContractService {
  id: number;
  unit_value: number;
  total_value: number;
  scheduled_start_date?: string | null;
  status?: 'not_started' | 'scheduled' | 'in_progress' | 'completed';
  updated_at?: string;
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
  total_value: number; // em reais
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  payment_method?: string | null;
  expected_payment_date?: string | null;
  payment_status?: 'pago' | 'pendente';
  installment_count?: number;
  installment_value?: number | null;
  installments?: ApiContractInstallment[];
  client: {
    id: number;
    name: string;
  };
  contract_services: ApiContractService[];
  created_by_user?: { name: string };
  updated_by_user?: { name: string };
  assigned_users?: { user: { id: number; name: string; email: string }; role: string }[];
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

  updateUserRole(contractId: number, userId: number, role: string): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.patch(`${this.API_URL}/${contractId}/assign/${userId}`, { role }, { headers });
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

  getStats(filters?: any): Observable<{ stats: ContractStats }> {
    return this.http.get<{ stats: ContractStats }>(`${this.API_URL}/meta/stats`, {
      headers: this.getAuthHeaders(),
      params: filters
    });
  }

  deleteContractPermanent(id: number): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.delete(`${this.API_URL}/${id}/permanent`, { headers });
  }

  formatValue(valueInReais: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valueInReais || 0);
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

  // Métodos para serviços do contrato
  updateContractService(serviceId: number, data: { status?: string; scheduled_start_date?: string | null }): Observable<any> {
    return this.http.patch(`${this.API_URL}/services/${serviceId}`, data, {
      headers: this.getAuthHeaders()
    });
  }

  getServiceComments(serviceId: number): Observable<{ comments: ServiceComment[]; total: number }> {
    return this.http.get<{ comments: ServiceComment[]; total: number }>(
      `${this.API_URL}/services/${serviceId}/comments`,
      { headers: this.getAuthHeaders() }
    );
  }

  addServiceComment(serviceId: number, comment: string): Observable<any> {
    return this.http.post(
      `${this.API_URL}/services/${serviceId}/comments`,
      { comment },
      { headers: this.getAuthHeaders() }
    );
  }

  updateServiceComment(commentId: number, comment: string): Observable<any> {
    return this.http.put(
      `${this.API_URL}/comments/${commentId}`,
      { comment },
      { headers: this.getAuthHeaders() }
    );
  }

  deleteServiceComment(commentId: number): Observable<any> {
    return this.http.delete(`${this.API_URL}/comments/${commentId}`, {
      headers: this.getAuthHeaders()
    });
  }

  // Helpers para status de serviços
  getServiceStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      'not_started': '#6b7280',
      'scheduled': '#3b82f6',
      'in_progress': '#f59e0b',
      'completed': '#10b981'
    };
    return colors[status] || '#6b7280';
  }

  getServiceStatusText(status: string): string {
    const texts: { [key: string]: string } = {
      'not_started': 'Não iniciado',
      'scheduled': 'Agendado',
      'in_progress': 'Em andamento',
      'completed': 'Finalizado'
    };
    return texts[status] || status;
  }

  getServiceStatusIcon(status: string): string {
    const icons: { [key: string]: string } = {
      'not_started': 'fas fa-circle',
      'scheduled': 'fas fa-calendar-alt',
      'in_progress': 'fas fa-spinner',
      'completed': 'fas fa-check-circle'
    };
    return icons[status] || 'fas fa-circle';
  }

  // Métodos para status de pagamento
  getPaymentStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      'pago': '#10b981',
      'pendente': '#f59e0b'
    };
    return colors[status] || '#6b7280';
  }

  getPaymentStatusText(status: string): string {
    const texts: { [key: string]: string } = {
      'pago': 'Pago',
      'pendente': 'Pendente'
    };
    return texts[status] || status;
  }

  getPaymentStatusIcon(status: string): string {
    const icons: { [key: string]: string } = {
      'pago': 'fas fa-check-circle',
      'pendente': 'fas fa-clock'
    };
    return icons[status] || 'fas fa-question-circle';
  }

  // Métodos de pagamento comuns
  getPaymentMethods(): { value: string, label: string }[] {
    return [
      { value: 'PIX', label: 'PIX' },
      { value: 'Transferência', label: 'Transferência Bancária' },
      { value: 'Boleto', label: 'Boleto Bancário' },
      { value: 'Cartão de Crédito', label: 'Cartão de Crédito' },
      { value: 'Cartão de Débito', label: 'Cartão de Débito' },
      { value: 'Dinheiro', label: 'Dinheiro' },
      { value: 'Cheque', label: 'Cheque' },
      { value: 'Outros', label: 'Outros' }
    ];
  }

  // Verificar se forma de pagamento permite parcelamento
  isPaymentMethodInstallable(paymentMethod: string): boolean {
    const installableMethods = ['Boleto', 'Cartão de Crédito'];
    return installableMethods.includes(paymentMethod);
  }

  // Gerar parcelas automaticamente
  generateInstallments(totalValue: number, installmentCount: number, firstDueDate: string, intervalDays: number = 30): ContractInstallment[] {
    const installments: ContractInstallment[] = [];
    const installmentValue = totalValue / installmentCount;
    let currentDate = new Date(firstDueDate);

    for (let i = 0; i < installmentCount; i++) {
      installments.push({
        due_date: currentDate.toISOString().split('T')[0],
        amount: installmentValue,
        notes: `Parcela ${i + 1} de ${installmentCount}`
      });

      // Próxima data (soma intervalDays)
      currentDate = new Date(currentDate.getTime() + (intervalDays * 24 * 60 * 60 * 1000));
    }

    return installments;
  }

  // Métodos para API de parcelas
  getContractInstallments(contractId: number): Observable<{ installments: ApiContractInstallment[]; total: number }> {
    return this.http.get<{ installments: ApiContractInstallment[]; total: number }>(
      `${environment.apiUrl}/contracts/${contractId}/installments`,
      { headers: this.getAuthHeaders() }
    );
  }

  updateInstallmentStatus(installmentId: number, statusData: { payment_status: string; paid_amount?: number; paid_date?: string; notes?: string }): Observable<any> {
    return this.http.put(
      `${environment.apiUrl}/installments/${installmentId}/status`,
      statusData,
      { headers: this.getAuthHeaders() }
    );
  }

  markInstallmentAsPaid(installmentId: number, paidAmount: number, paidDate?: string): Observable<any> {
    return this.http.put(
      `${environment.apiUrl}/installments/${installmentId}/pay`,
      { paid_amount: paidAmount, paid_date: paidDate },
      { headers: this.getAuthHeaders() }
    );
  }

  getOverdueInstallments(): Observable<{ installments: ApiContractInstallment[]; total: number }> {
    return this.http.get<{ installments: ApiContractInstallment[]; total: number }>(
      `${environment.apiUrl}/installments/overdue`,
      { headers: this.getAuthHeaders() }
    );
  }

  getInstallmentsByDateRange(startDate: string, endDate: string, status?: string): Observable<{ installments: ApiContractInstallment[]; total: number }> {
    const params: any = { start_date: startDate, end_date: endDate };
    if (status) params.status = status;

    return this.http.get<{ installments: ApiContractInstallment[]; total: number }>(
      `${environment.apiUrl}/installments/date-range`,
      { params, headers: this.getAuthHeaders() }
    );
  }

  // Helper para status de parcelas
  getInstallmentStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      'pago': '#10b981',
      'pendente': '#f59e0b',
      'atrasado': '#ef4444'
    };
    return colors[status] || '#6b7280';
  }

  getInstallmentStatusText(status: string): string {
    const texts: { [key: string]: string } = {
      'pago': 'Pago',
      'pendente': 'Pendente',
      'atrasado': 'Atrasado'
    };
    return texts[status] || status;
  }

  getInstallmentStatusIcon(status: string): string {
    const icons: { [key: string]: string } = {
      'pago': 'fas fa-check-circle',
      'pendente': 'fas fa-clock',
      'atrasado': 'fas fa-exclamation-triangle'
    };
    return icons[status] || 'fas fa-question-circle';
  }
}

export interface ServiceComment {
  id: number;
  comment: string;
  created_at: string;
  updated_at: string;
  has_attachments?: boolean;
  user: {
    id: number;
    name: string;
    email: string;
  };
}