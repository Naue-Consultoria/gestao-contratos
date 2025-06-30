import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalService } from '../../services/modal.service';
import { CompanyService, ApiCompany } from '../../services/company';
import { Subscription } from 'rxjs';

interface Company {
  id: number;
  name: string;
  initials: string;
  employees: number;
  location: string;
  market: string;
  contracts: number;
  activeContracts: number;
  totalValue: string;
  since: string;
  gradient: string;
}

@Component({
  selector: 'app-companies-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './companies-table.html',
  styleUrls: ['./companies-table.css']
})
export class CompaniesTableComponent implements OnInit, OnDestroy {
  private modalService = inject(ModalService);
  private companyService = inject(CompanyService);
  private subscriptions = new Subscription();

  // Stats
  stats = {
    total: 0,
    active: 0,
    activePercentage: 0,
    newProspects: 0
  };

  // Companies data
  companies: Company[] = [];
  
  // Loading state
  isLoading = false;
  error = '';

  ngOnInit() {
    this.loadCompanies();
    this.subscribeToRefreshEvents();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  /**
   * Inscrever-se em eventos de atualização
   */
  private subscribeToRefreshEvents() {
    // Escutar evento de atualização de empresas
    window.addEventListener('refreshCompanies', () => {
      this.loadCompanies();
    });
  }

  /**
   * Carregar empresas do servidor
   */
  async loadCompanies() {
    this.isLoading = true;
    this.error = '';

    try {
      const response = await this.companyService.getCompanies().toPromise();
      
      if (response && response.companies) {
        // Mapear empresas da API para o formato da tabela
        this.companies = response.companies.map(apiCompany => this.mapApiCompanyToTableCompany(apiCompany));
        
        // Atualizar estatísticas
        this.updateStats(response.companies);
      }
    } catch (error: any) {
      console.error('❌ Erro ao carregar empresas:', error);
      this.error = 'Erro ao carregar empresas. Tente novamente.';
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Mapear empresa da API para formato da tabela
   */
  private mapApiCompanyToTableCompany(apiCompany: ApiCompany): Company {
    const initials = this.getInitials(apiCompany.name);
    const since = apiCompany.founded_date ? new Date(apiCompany.founded_date).getFullYear().toString() : 'N/A';
    
    return {
      id: apiCompany.id,
      name: apiCompany.name,
      initials: initials,
      employees: apiCompany.employee_count || 0,
      location: apiCompany.headquarters || 'Não informado',
      market: apiCompany.market_sector || 'Não informado',
      contracts: 0, // TODO: Implementar quando tivermos contratos
      activeContracts: 0, // TODO: Implementar quando tivermos contratos
      totalValue: 'R$ 0', // TODO: Implementar quando tivermos contratos
      since: since,
      gradient: this.generateGradient(apiCompany.name)
    };
  }

  /**
   * Gerar iniciais do nome da empresa
   */
  private getInitials(name: string): string {
    const words = name.split(' ').filter(word => word.length > 0);
    
    if (words.length === 0) return 'NN';
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
    
    // Pegar primeira letra das duas primeiras palavras
    return (words[0][0] + words[1][0]).toUpperCase();
  }

  /**
   * Gerar gradiente baseado no nome
   */
  private generateGradient(name: string): string {
    const gradients = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
      'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
      'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)'
    ];
    
    // Usar hash do nome para selecionar gradiente consistente
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = ((hash << 5) - hash) + name.charCodeAt(i);
      hash = hash & hash;
    }
    
    return gradients[Math.abs(hash) % gradients.length];
  }

  /**
   * Atualizar estatísticas
   */
  private updateStats(companies: ApiCompany[]) {
    this.stats.total = companies.length;
    this.stats.active = companies.filter(c => c.is_active).length;
    this.stats.activePercentage = this.stats.total > 0 
      ? Math.round((this.stats.active / this.stats.total) * 100) 
      : 0;
    
    // Calcular novos prospects (empresas criadas nos últimos 30 dias)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    this.stats.newProspects = companies.filter(c => {
      const createdAt = new Date(c.created_at);
      return createdAt > thirtyDaysAgo;
    }).length;
  }

  /**
   * Formatar número de funcionários
   */
  formatEmployees(count: number): string {
    if (count === 0) return 'Não informado';
    if (count < 1000) return count.toString();
    if (count < 1000000) return (count / 1000).toFixed(1) + 'K';
    return (count / 1000000).toFixed(1) + 'M';
  }

  /**
   * Abrir modal de empresa
   */
  openCompanyModal() {
    this.modalService.openCompanyModal$.next();
  }

  /**
   * Editar empresa
   */
  async editCompany(id: number) {
    console.log('Editing company:', id);
    
    try {
      // Buscar dados completos da empresa
      const response = await this.companyService.getCompany(id).toPromise();
      
      if (response && response.company) {
        // Emitir evento para abrir modal com dados da empresa
        this.modalService.openCompanyModal$.next(response.company);
      }
    } catch (error) {
      console.error('❌ Erro ao buscar empresa:', error);
      this.modalService.showNotification('Erro ao carregar dados da empresa', false);
    }
  }

  /**
   * Atualizar lista após criar/editar empresa
   */
  onCompanySaved() {
    this.loadCompanies();
    this.modalService.showNotification('Empresa salva com sucesso!', true);
  }
}