import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ModalService } from '../../services/modal.service';
import { ContractService, ApiContract, ContractStats } from '../../services/contract';
import { CompanyService } from '../../services/company';
import { Subscription, firstValueFrom } from 'rxjs';

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

  stats: ContractStats = {
    total: 0,
    active: 0,
    completed: 0,
    cancelled: 0,
    suspended: 0,
    totalValueActive: 0,
    totalValueAll: 0,
    typeStats: { Full: 0, Pontual: 0, Individual: 0 },
    averageDuration: 0
  };

  contracts: ContractDisplay[] = [];
  filteredContracts: ContractDisplay[] = [];
  filters = { search: '', status: '', type: '', company_id: null as number | null };
  companies: any[] = [];
  isLoading = false;
  error = '';
  currentTab: 'all' | 'Full' | 'Pontual' | 'Individual' = 'all';

  ngOnInit() {
    this.loadContracts();
    this.loadCompanies();
    this.subscribeToRefreshEvents();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    window.removeEventListener('refreshContracts', this.loadContracts);
  }

  private subscribeToRefreshEvents() {
    window.addEventListener('refreshContracts', this.loadContracts.bind(this));
  }

  async loadContracts() {
    this.isLoading = true;
    this.error = '';
    try {
      const statsResponse = await firstValueFrom(this.contractService.getStats());
      if (statsResponse?.stats) {
        this.stats = statsResponse.stats;
      }

      const cleanFilters: any = {};
      if (this.filters.search) cleanFilters.search = this.filters.search;
      if (this.filters.status) cleanFilters.status = this.filters.status;
      if (this.filters.type) cleanFilters.type = this.filters.type;
      if (this.filters.company_id) cleanFilters.company_id = this.filters.company_id;

      const response = await firstValueFrom(this.contractService.getContracts(cleanFilters));
      
      this.contracts = response.contracts.map(contract => this.mapContractToDisplay(contract));
      this.applyFilters();

    } catch (error: any) {
      this.error = 'Não foi possível carregar os contratos. Tente novamente mais tarde.';
      console.error('❌ Error loading contracts:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async loadCompanies() {
    try {
      const response = await firstValueFrom(this.companyService.getCompanies({ is_active: true }));
      if (response?.companies) {
        this.companies = response.companies;
      }
    } catch (error) {
      console.error('❌ Error loading companies:', error);
    }
  }

  private mapContractToDisplay(contract: ApiContract): ContractDisplay {
    return {
      id: contract.id,
      contractNumber: contract.contract_number,
      companyName: contract.company?.name || 'N/A',
      type: contract.type,
      startDate: this.contractService.formatDate(contract.start_date),
      endDate: this.contractService.formatDate(contract.end_date || null),
      duration: `${this.contractService.calculateDuration(contract.start_date, contract.end_date)} dias`,
      totalValue: this.contractService.formatValue(contract.total_value || 0),
      status: this.contractService.getStatusText(contract.status),
      statusColor: this.contractService.getStatusColor(contract.status),
      servicesCount: contract.contract_services?.length || 0,
      raw: contract
    };
  }

  applyFilters() {
    let filtered = [...this.contracts];
    if (this.currentTab !== 'all') {
      filtered = filtered.filter(c => c.type === this.currentTab);
    }
    if (this.filters.search) {
      const search = this.filters.search.toLowerCase();
      filtered = filtered.filter(c => c.contractNumber.toLowerCase().includes(search) || c.companyName.toLowerCase().includes(search));
    }
    if (this.filters.status) {
      filtered = filtered.filter(c => c.raw.status === this.filters.status);
    }
    if (this.filters.company_id) {
      filtered = filtered.filter(c => c.raw.company.id === this.filters.company_id);
    }
    this.filteredContracts = filtered;
  }

  changeTab(tab: 'all' | 'Full' | 'Pontual' | 'Individual') {
    this.currentTab = tab;
    this.applyFilters();
  }

  clearFilters() {
    this.filters = { search: '', status: '', type: '', company_id: null };
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

  async updateContractStatus(id: number, currentStatus: string, event: Event) {
    event.stopPropagation();
    const nextStatusMap: { [key: string]: string } = {
      'active': 'completed', 'completed': 'active', 'cancelled': 'active', 'suspended': 'active'
    };
    const newStatus = nextStatusMap[currentStatus] || 'active';
    try {
      await firstValueFrom(this.contractService.updateContractStatus(id, newStatus));
      this.loadContracts();
      this.modalService.showNotification('Status do contrato atualizado!', true);
    } catch (error) {
      this.modalService.showNotification('Erro ao alterar status do contrato', false);
    }
  }

  formatTotalValue(): string {
    return this.contractService.formatValue(this.stats.totalValueAll);
  }

  formatActiveValue(): string {
    return this.contractService.formatValue(this.stats.totalValueActive);
  }

  getTypeIcon(type: string): string {
    return this.contractService.getTypeIcon(type);
  }

  async deleteContract(contractId: number, event: MouseEvent) {
    event.stopPropagation();
    const contractToDelete = this.contracts.find(c => c.id === contractId);
    if (!contractToDelete) return;
    
    // Using a simple browser confirm pop-up for simplicity
    const confirmed = confirm(`Você tem certeza que deseja excluir o contrato ${contractToDelete.contractNumber} permanentemente?`);
    
    if (confirmed) {
      try {
        await firstValueFrom(this.contractService.deleteContractPermanent(contractId));
        this.modalService.showSuccess('Contrato excluído com sucesso!');
        this.contracts = this.contracts.filter(c => c.id !== contractId);
        this.applyFilters(); // Re-apply filters to update the view
      } catch (error) {
        console.error('❌ Error deleting contract:', error);
        this.modalService.showError('Não foi possível excluir o contrato.');
      }
    }
  }

  exportToPDF() {
    this.modalService.showNotification('Exportando contratos para PDF...', true);
  }

  exportToExcel() {
    this.modalService.showNotification('Exportando contratos para Excel...', true);
  }
}