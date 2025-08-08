import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CreateClientRequest {
  type: 'PF' | 'PJ';
  email: string;
  phone?: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipcode: string;
  // Optional fields
  employee_count?: number;
  business_segment?: string;
  // PF fields
  cpf?: string;
  full_name?: string;
  // PJ fields
  cnpj?: string;
  company_name?: string;
  trade_name?: string;
}

export interface UpdateClientRequest {
  email?: string;
  phone?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  // Optional fields
  employee_count?: number;
  business_segment?: string;
  // PF fields
  cpf?: string;
  full_name?: string;
  // PJ fields
  cnpj?: string;
  company_name?: string;
  trade_name?: string;
}

export interface ApiClient {
  id: number;
  type: 'PF' | 'PJ';
  name: string; // full_name for PF or company_name for PJ
  email: string;
  phone: string | null;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  zipcode: string;
  created_at: string;
  updated_at: string;
  created_by?: number;
  updated_by?: number;
  created_by_user?: { name: string };
  updated_by_user?: { name: string };
  // PF specific
  cpf?: string;
  full_name?: string;
  // PJ specific
  cnpj?: string;
  company_name?: string;
  trade_name?: string;
  // New optional fields
  employee_count?: number | null;
  business_segment?: string | null;
  // Logo fields
  logo_path?: string | null;
  logo_original_name?: string | null;
  logo_mime_type?: string | null;
  logo_size?: number | null;
  logo_uploaded_at?: string | null;
  // Legacy fields for compatibility
  founded_date?: string | null;
  headquarters?: string | null;
  market_sector?: string | null;
}

export interface ClientsResponse {
  clients: ApiClient[];
  total: number;
  filters?: any;
}

export interface ClientResponse {
  client: ApiClient;
}

export interface CreateClientResponse {
  message: string;
  client: ApiClient;
}

export interface ClientStats {
  total: number;
  totalPF: number;
  totalPJ: number;
  byCity: { [key: string]: number };
  byState: { [key: string]: number };
}

export interface ClientFilters {
  type?: 'PF' | 'PJ';
  city?: string;
  state?: string;
  search?: string;
  is_active?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ClientService {
  private readonly API_URL = `${environment.apiUrl}/clients`;

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
   * Listar clientes
   */
  getClients(filters?: ClientFilters): Observable<ClientsResponse> {
    let params: any = {};
    
    if (filters) {
      if (filters.type) {
        params.type = filters.type;
      }
      if (filters.city) {
        params.city = filters.city;
      }
      if (filters.state) {
        params.state = filters.state;
      }
      if (filters.search) {
        params.search = filters.search;
      }
      if (filters.is_active !== undefined) {
        params.is_active = filters.is_active.toString();
      }
    }

    return this.http.get<ClientsResponse>(this.API_URL, { 
      params,
      headers: this.getAuthHeaders() 
    });
  }

  /**
   * Buscar cliente por ID
   */
  getClient(id: number): Observable<ClientResponse> {
    return this.http.get<ClientResponse>(`${this.API_URL}/${id}`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Criar novo cliente
   */
  createClient(clientData: CreateClientRequest): Observable<CreateClientResponse> {
    return this.http.post<CreateClientResponse>(this.API_URL, clientData, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Atualizar cliente
   */
  updateClient(id: number, clientData: UpdateClientRequest): Observable<any> {
    return this.http.put(`${this.API_URL}/${id}`, clientData, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Excluir cliente (soft delete)
   */
  deleteClient(id: number): Observable<any> {
    return this.http.delete(`${this.API_URL}/${id}`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Excluir cliente permanentemente (apenas admin)
   */
  deleteClientPermanent(id: number): Observable<any> {
    return this.http.delete(`${this.API_URL}/${id}/permanent`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Obter estatísticas dos clientes
   */
  getClientStats(): Observable<{ stats: ClientStats }> {
    return this.http.get<{ stats: ClientStats }>(`${this.API_URL}/meta/stats`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Formatar CPF
   */
  formatCPF(cpf: string): string {
    if (!cpf) return '';
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  /**
   * Formatar CNPJ
   */
  formatCNPJ(cnpj: string): string {
    if (!cnpj) return '';
    return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }

  /**
   * Formatar CEP
   */
  formatZipCode(zipcode: string): string {
    if (!zipcode) return '';
    return zipcode.replace(/(\d{5})(\d{3})/, '$1-$2');
  }

  /**
   * Formatar telefone
   */
  formatPhone(phone: string): string {
    if (!phone) return '';
    if (phone.length === 11) {
      return phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (phone.length === 10) {
      return phone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return phone;
  }

  /**
   * Obter endereço completo formatado
   */
  getFullAddress(client: ApiClient): string {
    let address = `${client.street}, ${client.number}`;
    if (client.complement) {
      address += ` - ${client.complement}`;
    }
    address += ` - ${client.neighborhood}, ${client.city}/${client.state}`;
    address += ` - CEP: ${this.formatZipCode(client.zipcode)}`;
    return address;
  }

  /**
   * Obter documento formatado (CPF ou CNPJ)
   */
  getFormattedDocument(client: ApiClient): string {
    if (client.type === 'PF' && client.cpf) {
      return this.formatCPF(client.cpf);
    } else if (client.type === 'PJ' && client.cnpj) {
      return this.formatCNPJ(client.cnpj);
    }
    return '';
  }
}