import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ModalService } from '../../services/modal.service';
import { CompanyService, ApiCompany } from '../../services/company';
import { ContractService, ApiContract } from '../../services/contract';
import { Subscription, firstValueFrom } from 'rxjs';
import { AuthService } from '../../services/auth';

interface CompanyDisplay {
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
  actionMenuOpen: boolean;
  raw: ApiCompany;
}

@Component({
  selector: 'app-companies-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './companies-table.html',
  styleUrls: ['./companies-table.css']
})
export class CompaniesTableComponent implements OnInit, OnDestroy {
  public authService = inject(AuthService);
  private modalService = inject(ModalService);
  private companyService = inject(CompanyService);
  private contractService = inject(ContractService);
  private router = inject(Router);

  private subscriptions = new Subscription();

  stats = {
    total: 0,
    active: 0,
    activePercentage: 0,
    newProspects: 0
  };

  companies: CompanyDisplay[] = [];
  isLoading = true;
  error = '';

  ngOnInit() {
    this.loadData();
    window.addEventListener('refreshCompanies', this.loadData.bind(this));
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    window.removeEventListener('refreshCompanies', this.loadData.bind(this));
  }

  async loadData() {
    this.isLoading = true;
    this.error = '';
    try {
      const companiesResponse = await firstValueFrom(this.companyService.getCompanies({ is_active: true }));
      const contractsResponse = await firstValueFrom(this.contractService.getContracts());
      
      this.companies = companiesResponse.companies.map(apiCompany => {
        const companyContracts = contractsResponse.contracts.filter(c => c.company.id === apiCompany.id);
        const aggregates = {
          totalCount: companyContracts.length,
          activeCount: companyContracts.filter(c => c.status === 'active').length,
          totalValue: companyContracts.reduce((sum, c) => sum + c.total_value, 0)
        };
        return this.mapApiCompanyToTableCompany(apiCompany, aggregates);
      });

    } catch (err) {
      console.error('❌ Error loading company data:', err);
      this.error = 'Não foi possível carregar os dados das empresas.';
    } finally {
      this.isLoading = false;
    }
  }

  async softDeleteCompany(company: CompanyDisplay, event: MouseEvent) {
    event.stopPropagation();
    if (confirm(`Tem certeza que deseja DESATIVAR a empresa "${company.name}"? A empresa sairá da lista principal, mas o histórico será mantido.`)) {
      try {
        await firstValueFrom(this.companyService.deleteCompany(company.id));
        this.modalService.showSuccess('Empresa desativada com sucesso!');
        this.loadData();
      } catch (error) {
        this.modalService.showError('Não foi possível desativar a empresa.');
      }
    }
  }

  async hardDeleteCompany(company: CompanyDisplay, event: MouseEvent) {
    event.stopPropagation();
    const confirmation = prompt(`Esta ação é irreversível e excluirá PERMANENTEMENTE a empresa "${company.name}" e todos os dados associados. Para confirmar, digite o nome da empresa:`);
    if (confirmation === company.name) {
      try {
        await firstValueFrom(this.companyService.deleteCompanyPermanent(company.id));
        this.modalService.showSuccess('Empresa excluída permanentemente!');
        this.loadData();
      } catch (error) {
        this.modalService.showError('Não foi possível excluir a empresa permanentemente.');
      }
    } else if (confirmation !== null) {
      this.modalService.showWarning('O nome digitado não confere. A exclusão foi cancelada.');
    }
  }

  private mapApiCompanyToTableCompany(apiCompany: ApiCompany, aggregates?: { totalCount: number, activeCount: number, totalValue: number }): CompanyDisplay {
    const initials = this.getInitials(apiCompany.name);
    const since = apiCompany.founded_date ? new Date(apiCompany.founded_date).getFullYear().toString() : 'N/A';
    
    return {
      id: apiCompany.id,
      name: apiCompany.name,
      initials: initials,
      employees: apiCompany.employee_count || 0,
      location: apiCompany.headquarters || 'Não informado',
      market: apiCompany.market_sector || 'Não informado',
      contracts: aggregates?.totalCount || 0,
      activeContracts: aggregates?.activeCount || 0,
      totalValue: this.contractService.formatValue(aggregates?.totalValue || 0),
      since: since,
      gradient: this.generateGradient(apiCompany.name),
      actionMenuOpen: false, // Initialize as closed
      raw: apiCompany
    };
  }

  private getInitials(name: string): string {
    const words = name.split(' ').filter(word => word.length > 0);
    
    if (words.length === 0) return 'NN';
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
    
    return (words[0][0] + words[1][0]).toUpperCase();
  }

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
    
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = ((hash << 5) - hash) + name.charCodeAt(i);
      hash = hash & hash;
    }
    
    return gradients[Math.abs(hash) % gradients.length];
  }

  formatEmployees(count: number): string {
    if (count === 0) return 'Não informado';
    if (count < 1000) return count.toString();
    if (count < 1000000) return (count / 1000).toFixed(1) + 'K';
    return (count / 1000000).toFixed(1) + 'M';
  }

  openNewCompanyPage() {
    this.router.navigate(['/home/companies/new']);
  }

  editCompany(id: number) {
    this.router.navigate(['/home/companies/edit', id]);
  }

  toggleActionMenu(company: CompanyDisplay, event: MouseEvent) {
    event.stopPropagation();
    this.companies.forEach(c => c.actionMenuOpen = (c.id === company.id) ? !c.actionMenuOpen : false);
  }

  onCompanySaved() {
    this.loadData();
    this.modalService.showNotification('Empresa salva com sucesso!', true);
  }
}