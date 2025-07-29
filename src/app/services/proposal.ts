import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ProposalServiceItem {
  id: number;
  service_id: number;
  quantity: number;
  custom_value?: number;
  service?: {
    id: number;
    name: string;
    value: number;
    duration: number;
    category: string;
    description?: string;
  };
}

export interface Proposal {
  id: number;
  company_id: number;
  title: string;
  description?: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  total_value: number;
  valid_until?: string;
  observations?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  sent_at?: string;
  company?: {
    id: number;
    name: string;
    headquarters?: string;
    market_sector?: string;
    description?: string;
  };
  services: ProposalServiceItem[];
  created_by_user?: { name: string };
  updated_by_user?: { name: string };
}

export interface CreateProposalData {
  company_id: number;
  title: string;
  description?: string;
  services: {
    service_id: number;
    quantity: number;
    custom_value?: number;
  }[];
  valid_until?: string;
  observations?: string;
}

export interface ProposalFilters {
  is_active?: boolean;
  status?: string;
  company_id?: number;
  search?: string;
  expired_only?: boolean;
}

export interface ProposalStats {
  total: number;
  byStatus: {
    draft: number;
    sent: number;
    accepted: number;
    rejected: number;
    expired: number;
  };
  totalValue: number;
  acceptedValue: number;
  expired: number;
  conversionRate: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProposalService {
  private apiUrl = `${environment.apiUrl}/proposals`;
  private proposalsSubject = new BehaviorSubject<Proposal[]>([]);
  public proposals$ = this.proposalsSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Buscar todas as propostas
   */
  getProposals(filters?: ProposalFilters): Observable<any> {
    let params = new HttpParams();
    
    if (filters) {
      if (filters.is_active !== undefined) {
        params = params.set('is_active', filters.is_active.toString());
      }
      if (filters.status) {
        params = params.set('status', filters.status);
      }
      if (filters.company_id) {
        params = params.set('company_id', filters.company_id.toString());
      }
      if (filters.search) {
        params = params.set('search', filters.search);
      }
      if (filters.expired_only) {
        params = params.set('expired_only', filters.expired_only.toString());
      }
    }

    return this.http.get<any>(this.apiUrl, { params });
  }

  /**
   * Buscar proposta por ID
   */
  getProposal(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  /**
   * Criar nova proposta
   */
  createProposal(proposalData: CreateProposalData): Observable<any> {
    return this.http.post<any>(this.apiUrl, proposalData);
  }

  /**
   * Atualizar proposta
   */
  updateProposal(id: number, proposalData: Partial<CreateProposalData>): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, proposalData);
  }

  /**
   * Alterar status da proposta
   */
  updateProposalStatus(id: number, status: string): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${id}/status`, { status });
  }

  /**
   * Duplicar proposta
   */
  duplicateProposal(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/duplicate`, {});
  }

  /**
   * Excluir proposta
   */
  deleteProposal(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }

  /**
   * Buscar estatísticas das propostas
   */
  getProposalStats(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/stats`);
  }

  /**
   * Enviar proposta por email
   */
  sendProposal(id: number, emailData: {
    email: string;
    subject?: string;
    message?: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/send`, emailData);
  }

  /**
   * Gerar PDF da proposta
   */
  generateProposalPDF(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/pdf`, {
      responseType: 'blob'
    });
  }

  /**
   * Atualizar lista local de propostas
   */
  refreshProposals(filters?: ProposalFilters): void {
    this.getProposals(filters).subscribe({
      next: (response) => {
        if (response.success) {
          this.proposalsSubject.next(response.data);
        }
      },
      error: (error) => {
        console.error('Erro ao carregar propostas:', error);
      }
    });
  }

  /**
   * Obter lista atual de propostas
   */
  getCurrentProposals(): Proposal[] {
    return this.proposalsSubject.value;
  }

  /**
   * Formatar valor monetário
   */
  formatCurrency(value: number | null | undefined): string {
    if (typeof value !== 'number' || value === null || value === undefined) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    }).format(value / 100); // Converter de centavos para reais
  }

  /**
   * Calcular valor total dos serviços
   */
  calculateServicesTotal(services: ProposalServiceItem[]): number {
    return services.reduce((total, service) => {
      const value = service.custom_value || service.service?.value || 0;
      const quantity = service.quantity || 1;
      return total + (value * quantity);
    }, 0);
  }

  /**
   * Validar dados da proposta
   */
  validateProposalData(proposalData: CreateProposalData): string[] {
    const errors: string[] = [];

    if (!proposalData.company_id) {
      errors.push('Empresa é obrigatória');
    }

    if (!proposalData.title || proposalData.title.trim().length < 3) {
      errors.push('Título deve ter pelo menos 3 caracteres');
    }

    if (!proposalData.services || proposalData.services.length === 0) {
      errors.push('Pelo menos um serviço deve ser incluído');
    }

    if (proposalData.services) {
      proposalData.services.forEach((service, index) => {
        if (!service.service_id) {
          errors.push(`Serviço ${index + 1}: Serviço é obrigatório`);
        }
        if (service.quantity && service.quantity < 1) {
          errors.push(`Serviço ${index + 1}: Quantidade deve ser maior que zero`);
        }
        if (service.custom_value && service.custom_value < 0) {
          errors.push(`Serviço ${index + 1}: Valor personalizado não pode ser negativo`);
        }
      });
    }

    if (proposalData.valid_until) {
      const validDate = new Date(proposalData.valid_until);
      if (validDate <= new Date()) {
        errors.push('Data de validade deve ser futura');
      }
    }

    return errors;
  }

  /**
   * Obter cor do status
   */
  getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      'draft': '#6b7280', // Cinza
      'sent': '#3b82f6', // Azul
      'accepted': '#10b981', // Verde
      'rejected': '#ef4444', // Vermelho
      'expired': '#f59e0b' // Amarelo
    };
    return colors[status] || '#6b7280';
  }

  /**
   * Obter texto do status
   */
  getStatusText(status: string): string {
    const texts: { [key: string]: string } = {
      'draft': 'Rascunho',
      'sent': 'Enviada',
      'accepted': 'Aceita',
      'rejected': 'Rejeitada',
      'expired': 'Expirada'
    };
    return texts[status] || status;
  }

  /**
   * Verificar se proposta pode ser editada
   */
  canEditProposal(proposal: Proposal): boolean {
    return proposal.status === 'draft' || proposal.status === 'rejected';
  }

  /**
   * Verificar se proposta pode ser enviada
   */
  canSendProposal(proposal: Proposal): boolean {
    return proposal.status === 'draft' && proposal.services.length > 0;
  }

  /**
   * Verificar se proposta está expirada
   */
  isProposalExpired(proposal: Proposal): boolean {
    if (!proposal.valid_until) return false;
    return new Date(proposal.valid_until) < new Date();
  }

  /**
   * Calcular dias restantes para expiração
   */
  getDaysUntilExpiration(proposal: Proposal): number | null {
    if (!proposal.valid_until) return null;
    const validDate = new Date(proposal.valid_until);
    const today = new Date();
    const diffTime = validDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}