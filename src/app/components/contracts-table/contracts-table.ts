import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ModalService } from '../../services/modal.service';
import {
  ContractService,
  ApiContract,
  ContractStats,
} from '../../services/contract';
import { CompanyService } from '../../services/company';
import { Subscription, firstValueFrom } from 'rxjs';
import { SearchService } from '../../services/search.service'; // Import the new service
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

interface ContractDisplay {
  id: number;
  contractNumber: string;
  companyName: string;
  type: string;
  startDate: string;
  endDate: string;
  duration: string;
  totalValue: string;
  status: string;
  statusColor: string;
  servicesCount: number;
  raw: ApiContract;
}

@Component({
  selector: 'app-contracts-table',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contracts-table.html',
  styleUrls: ['./contracts-table.css'],
})
export class ContractsTableComponent implements OnInit, OnDestroy {
  private modalService = inject(ModalService);
  private contractService = inject(ContractService);
  private companyService = inject(CompanyService);
  private router = inject(Router);
  private searchService = inject(SearchService);
  private subscriptions = new Subscription();

  stats: ContractStats = {
    total: 0,
    active: 0,
    completed: 0,
    cancelled: 0,
    suspended: 0,
    totalValueActive: 0,
    totalValueAll: 0,
    averageValue: 0,
    typeStats: { Full: 0, Pontual: 0, Individual: 0 },
    averageDuration: 0,
  };

  contracts: ContractDisplay[] = [];
  filteredContracts: ContractDisplay[] = [];
  filters = {
    search: '',
    status: '',
    company_id: null as number | null,
    type: '',
  };
  companies: any[] = [];
  isLoading = false;
  error = '';
  currentTab: 'all' | 'Full' | 'Pontual' | 'Individual' = 'all';

  private handleRefresh = () => this.loadInitialData();

  ngOnInit() {
    this.loadInitialData();
    this.subscribeToSearch();
    this.subscribeToRefreshEvents();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    window.removeEventListener('refreshContracts', this.handleRefresh);
  }

  private subscribeToRefreshEvents() {
    window.addEventListener('refreshContracts', this.handleRefresh);
  }

  private subscribeToSearch() {
    const searchSubscription = this.searchService.searchTerm$
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((term) => {
        this.filters.search = term;
        this.loadContracts();
      });
    this.subscriptions.add(searchSubscription);
  }

  async loadPageData() {
    this.isLoading = true;
    try {
      const [statsResponse, companiesResponse] = await Promise.all([
        firstValueFrom(this.contractService.getStats()),
        firstValueFrom(this.companyService.getCompanies({ is_active: true })),
      ]);
      if (statsResponse?.stats) this.stats = statsResponse.stats;
      if (companiesResponse?.companies)
        this.companies = companiesResponse.companies;
    } catch (e) {
      this.error = 'Não foi possível carregar os dados da página.';
    } finally {
      this.isLoading = false;
    }
  }

  async loadInitialData() {
    this.isLoading = true;
    this.error = '';
    try {
      const [statsResponse, companiesResponse] = await Promise.all([
        firstValueFrom(this.contractService.getStats()),
        firstValueFrom(this.companyService.getCompanies({ is_active: true })),
      ]);
      if (statsResponse?.stats) this.stats = statsResponse.stats;
      if (companiesResponse?.companies)
        this.companies = companiesResponse.companies;
    } catch (error: any) {
      this.error = 'Não foi possível carregar os dados da página.';
      console.error('❌ Error loading initial data:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async loadContracts() {
    this.isLoading = true;
    this.error = '';
    try {
      const cleanFilters: any = {
        search: this.filters.search,
        status: this.filters.status,
        company_id: this.filters.company_id,
        type: this.currentTab === 'all' ? '' : this.currentTab,
      };

      const response = await firstValueFrom(
        this.contractService.getContracts(cleanFilters)
      );
      this.contracts = response.contracts.map((contract) =>
        this.mapContractToDisplay(contract)
      );
      this.filteredContracts = this.contracts;
    } catch (error: any) {
      this.error = 'Não foi possível carregar os contratos.';
      console.error('❌ Error loading contracts:', error);
    } finally {
      this.isLoading = false;
    }
  }

  private calculateStatsFromContracts(apiContracts: ApiContract[]) {
    this.stats = {
      total: apiContracts.length,
      active: apiContracts.filter((c) => c.status === 'active').length,
      completed: apiContracts.filter((c) => c.status === 'completed').length,
      cancelled: apiContracts.filter((c) => c.status === 'cancelled').length,
      suspended: apiContracts.filter((c) => c.status === 'suspended').length,
      totalValueActive: apiContracts
        .filter((c) => c.status === 'active')
        .reduce((sum, c) => sum + (c.total_value || 0), 0),
      totalValueAll: apiContracts.reduce(
        (sum, c) => sum + (c.total_value || 0),
        0
      ),
      averageValue:
        apiContracts.length > 0
          ? apiContracts.reduce((sum, c) => sum + (c.total_value || 0), 0) /
            apiContracts.length
          : 0,
      typeStats: {
        Full: apiContracts.filter((c) => c.type === 'Full').length,
        Pontual: apiContracts.filter((c) => c.type === 'Pontual').length,
        Individual: apiContracts.filter((c) => c.type === 'Individual').length,
      },
      averageDuration: 0,
    };
  }

  private mapContractToDisplay(contract: ApiContract): ContractDisplay {
    return {
      id: contract.id,
      contractNumber: contract.contract_number,
      companyName: contract.company?.name || 'N/A',
      type: contract.type,
      startDate: this.contractService.formatDate(contract.start_date),
      endDate: this.contractService.formatDate(contract.end_date || null),
      duration: `${this.contractService.calculateDuration(
        contract.start_date,
        contract.end_date
      )} dias`,
      totalValue: this.contractService.formatValue(contract.total_value || 0),
      status: this.contractService.getStatusText(contract.status),
      statusColor: this.contractService.getStatusColor(contract.status),
      servicesCount: contract.contract_services?.length || 0,
      raw: contract,
    };
  }

  applyFilters() {
    this.loadContracts(); // Simply reload contracts with the new filters
  }

  changeTab(tab: 'all' | 'Full' | 'Pontual' | 'Individual') {
    this.currentTab = tab;
    this.applyFilters();
  }

  clearFilters() {
    this.filters = { search: '', status: '', company_id: null, type: '' };
    this.searchService.setSearchTerm(''); // Also clear the global search
    this.currentTab = 'all';
    this.applyFilters();
  }

  openNewContractPage() {
    this.router.navigate(['/home/contracts/new']);
  }

  editContract(id: number, event: MouseEvent) {
    event.stopPropagation();
    this.router.navigate(['/home/contracts/edit', id]);
  }

  viewContract(id: number) {
    this.router.navigate(['/home/contracts/view', id]);
  }

  formatTotalValue(): string {
    return this.contractService.formatValue(this.stats.totalValueAll);
  }

  formatActiveValue(): string {
    return this.contractService.formatValue(this.stats.totalValueActive);
  }

  formatAverageValue(): string {
    return this.contractService.formatValue(this.stats.averageValue);
  }

  getTypeIcon(type: string): string {
    return this.contractService.getTypeIcon(type);
  }

  get typeStatsAsArray() {
    if (!this.stats || !this.stats.typeStats) {
      return [];
    }
    return [
      { name: 'Full', count: this.stats.typeStats.Full, color: '#3b82f6' },
      {
        name: 'Pontual',
        count: this.stats.typeStats.Pontual,
        color: '#8b5cf6',
      },
      {
        name: 'Individual',
        count: this.stats.typeStats.Individual,
        color: '#10b981',
      },
    ];
  }

  async deleteContract(contractId: number, event: MouseEvent) {
    event.stopPropagation();
    const contractToDelete = this.contracts.find((c) => c.id === contractId);
    if (!contractToDelete) return;

    if (
      confirm(
        `Você tem certeza que deseja excluir o contrato ${contractToDelete.contractNumber} permanentemente?`
      )
    ) {
      try {
        await firstValueFrom(
          this.contractService.deleteContractPermanent(contractId)
        );
        this.modalService.showSuccess('Contrato excluído com sucesso!');
        this.loadContracts();
      } catch (error) {
        console.error('❌ Error deleting contract:', error);
        this.modalService.showError('Não foi possível excluir o contrato.');
      }
    }
  }

  exportToPDF() {
    this.modalService.showInfo(
      'A funcionalidade de exportar para PDF será implementada em breve.',
      'Em Desenvolvimento'
    );
  }

  exportToExcel() {
    this.modalService.showInfo(
      'A funcionalidade de exportar para Excel será implementada em breve.',
      'Em Desenvolvimento'
    );
  }
}
