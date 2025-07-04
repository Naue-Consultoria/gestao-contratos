import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ModalService } from '../../services/modal.service';
import { ContractService, ApiContract, ContractStats } from '../../services/contract';
import { CompanyService } from '../../services/company';
import { Subscription } from 'rxjs';

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
  styleUrls: ['./contracts-table.css']
})
export class ContractsTableComponent implements OnInit, OnDestroy {
  private modalService = inject(ModalService);
  private contractService = inject(ContractService);
  private companyService = inject(CompanyService);
  private router = inject(Router);
  private subscriptions = new Subscription();

  // Stats
  stats: ContractStats = {
    total: 0,
    active: 0,
    completed: 0,
    cancelled: 0,
    suspended: 0,
    totalValueActive: 0,
    totalValueAll: 0,
    typeStats: {
      Grande: 0,
      Pontual: 0,
      Individual: 0
    },
    averageDuration: 0
  };

  // Contracts data
  contracts: ContractDisplay[] = [];
  filteredContracts: ContractDisplay[] = [];
  
  // Filters
  filters = {
    search: '',
    status: '',
    type: '',
    company_id: null as number | null
  };

  // Companies for filter
  companies: any[] = [];
  
  // Loading state
  isLoading = false;
  error = '';

  // Tabs
  currentTab: 'all' | 'Grande' | 'Pontual' | 'Individual' = 'all';

  ngOnInit() {
    console.log('🚀 ContractsTableComponent initialized');
    this.loadContracts();
    this.loadCompanies();
    this.subscribeToRefreshEvents();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  /**
   * Subscribe to refresh events
   */
  private subscribeToRefreshEvents() {
    // Listen for contract refresh events
    window.addEventListener('refreshContracts', () => {
      this.loadContracts();
    });
  }

  /**
   * Load contracts from server
   */
  async loadContracts() {
    this.isLoading = true;
    this.error = '';

    try {
      // Load stats
      try {
        const statsResponse = await this.contractService.getStats().toPromise();
        if (statsResponse && statsResponse.stats) {
          this.stats = statsResponse.stats;
        }
      } catch (statsError) {
        console.warn('⚠️ Error loading stats:', statsError);
        // Continue loading contracts even if stats fail
      }

      // Build clean filters
      const cleanFilters: any = {};
      if (this.filters.search) cleanFilters.search = this.filters.search;
      if (this.filters.status) cleanFilters.status = this.filters.status;
      if (this.filters.type) cleanFilters.type = this.filters.type;
      if (this.filters.company_id) cleanFilters.company_id = this.filters.company_id;

      // Load contracts
      const response = await this.contractService.getContracts(cleanFilters).toPromise();
      
      if (response && response.contracts) {
        // Map contracts to display format
        this.contracts = response.contracts.map(contract => this.mapContractToDisplay(contract));
        this.applyFilters();
      } else {
        // If no contracts, ensure empty array
        this.contracts = [];
        this.filteredContracts = [];
      }
    } catch (error: any) {
      console.error('❌ Error loading contracts:', error);
      
      // Check if it's a network error
      if (!error.status) {
        this.error = 'Erro de conexão. Verifique se o servidor está rodando.';
      } else if (error.status === 401) {
        this.error = 'Sessão expirada. Faça login novamente.';
      } else if (error.status === 404) {
        this.error = 'Endpoint não encontrado. Verifique se as rotas estão configuradas.';
      } else if (error.status === 500) {
        this.error = 'Erro no servidor. Tente novamente mais tarde.';
      } else {
        this.error = error?.error?.error || 'Erro ao carregar contratos. Tente novamente.';
      }
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Load companies for filter
   */
  async loadCompanies() {
    try {
      const response = await this.companyService.getCompanies({ is_active: true }).toPromise();
      if (response && response.companies) {
        this.companies = response.companies;
      }
    } catch (error) {
      console.error('❌ Error loading companies:', error);
    }
  }

  /**
   * Map API contract to display format
   */
  private mapContractToDisplay(contract: ApiContract): ContractDisplay {
    return {
      id: contract.id,
      contractNumber: contract.contract_number,
      companyName: contract.company?.name || 'N/A',
      type: contract.type,
      startDate: this.contractService.formatDate(contract.start_date),
      endDate: this.contractService.formatDate(contract.end_date || ''),
      duration: `${this.contractService.calculateDuration(contract.start_date, contract.end_date)} dias`,
      totalValue: this.contractService.formatValue(contract.total_value || 0),
      status: this.contractService.getStatusText(contract.status),
      statusColor: this.contractService.getStatusColor(contract.status),
      servicesCount: contract.contract_services?.length || 0,
      raw: contract
    };
  }

  /**
   * Apply filters to contracts
   */
  applyFilters() {
    let filtered = [...this.contracts];

    // Filter by tab
    if (this.currentTab !== 'all') {
      filtered = filtered.filter(c => c.type === this.currentTab);
    }

    // Filter by search
    if (this.filters.search) {
      const search = this.filters.search.toLowerCase();
      filtered = filtered.filter(c => 
        c.contractNumber.toLowerCase().includes(search) ||
        c.companyName.toLowerCase().includes(search)
      );
    }

    // Filter by status
    if (this.filters.status) {
      filtered = filtered.filter(c => c.raw.status === this.filters.status);
    }

    // Filter by company
    if (this.filters.company_id) {
      filtered = filtered.filter(c => c.raw.company.id === this.filters.company_id);
    }

    this.filteredContracts = filtered;
  }

  /**
   * Change tab
   */
  changeTab(tab: 'all' | 'Grande' | 'Pontual' | 'Individual') {
    this.currentTab = tab;
    this.applyFilters();
  }

  /**
   * Clear filters
   */
  clearFilters() {
    this.filters = {
      search: '',
      status: '',
      type: '',
      company_id: null
    };
    this.currentTab = 'all';
    this.applyFilters();
  }

  /**
   * Navigate to new contract page
   */
  openNewContractPage() {
    this.router.navigate(['/home/contracts/new']);
  }

  /**
   * Navigate to edit contract page
   */
  editContract(id: number) {
    this.router.navigate(['/home/contracts/edit', id]);
  }

  /**
   * View contract details
   */
  viewContract(id: number) {
    this.router.navigate(['/home/contracts/view', id]);
  }

  /**
   * Update contract status
   */
  async updateContractStatus(id: number, currentStatus: string, event: Event) {
    event.stopPropagation();
    
    // Definir próximo status baseado no atual
    const nextStatus: { [key: string]: string } = {
      'active': 'completed',
      'completed': 'active',
      'cancelled': 'active',
      'suspended': 'active'
    };

    const newStatus = nextStatus[currentStatus] || 'active';
    
    try {
      await this.contractService.updateContractStatus(id, newStatus).toPromise();
      this.loadContracts();
      this.modalService.showNotification('Status do contrato atualizado!', true);
    } catch (error) {
      console.error('❌ Error updating status:', error);
      this.modalService.showNotification('Erro ao alterar status do contrato', false);
    }
  }

  /**
   * Format total value of all contracts
   */
  formatTotalValue(): string {
    return this.contractService.formatValue(this.stats.totalValueAll);
  }

  /**
   * Format active contracts value
   */
  formatActiveValue(): string {
    return this.contractService.formatValue(this.stats.totalValueActive);
  }

  /**
   * Get type icon
   */
  getTypeIcon(type: string): string {
    return this.contractService.getTypeIcon(type);
  }

  /**
   * Delete contract
   */
  async deleteContract(id: number, event: Event) {
    event.stopPropagation();
    
    if (confirm('Tem certeza que deseja excluir este contrato?')) {
      try {
        await this.contractService.deleteContract(id).toPromise();
        this.loadContracts();
        this.modalService.showNotification('Contrato excluído com sucesso!', true);
      } catch (error) {
        console.error('❌ Error deleting contract:', error);
        this.modalService.showNotification('Erro ao excluir contrato', false);
      }
    }
  }

  /**
   * Export contracts to PDF
   */
  exportToPDF() {
    // TODO: Implementar exportação para PDF
    this.modalService.showNotification('Exportando contratos para PDF...', true);
  }

  /**
   * Export contracts to Excel
   */
  exportToExcel() {
    // TODO: Implementar exportação para Excel
    this.modalService.showNotification('Exportando contratos para Excel...', true);
  }
}