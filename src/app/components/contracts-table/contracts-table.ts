import { Component, inject, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ModalService } from '../../services/modal.service';
import {
  ContractService,
  ApiContract,
  ContractStats,
} from '../../services/contract';
import { ClientService } from '../../services/client';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';
import { ContractStatsCardsComponent } from '../contract-stats-cards/contract-stats-cards';
import { ContractExportModalComponent } from '../contract-export-modal/contract-export-modal.component';
import { Subscription, firstValueFrom } from 'rxjs';
import { SearchService } from '../../services/search.service'; // Import the new service
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

interface ContractDisplay {
  id: number;
  contractNumber: string;
  clientName: string;
  type: string;
  startDate: string;
  endDate: string;
  duration: string;
  totalValue: string;
  status: string;
  statusColor: string;
  servicesCount: number;
  paymentMethod: string;
  expectedPaymentDate: string;
  paymentStatus: string;
  paymentStatusColor: string;
  paymentStatusIcon: string;
  raw: ApiContract;
}

@Component({
  selector: 'app-contracts-table',
  standalone: true,
  imports: [CommonModule, FormsModule, BreadcrumbComponent, ContractStatsCardsComponent, ContractExportModalComponent],
  templateUrl: './contracts-table.html',
  styleUrls: ['./contracts-table.css'],
})
export class ContractsTableComponent implements OnInit, OnDestroy {
  private modalService = inject(ModalService);
  private contractService = inject(ContractService);
  private clientService = inject(ClientService);
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
    client_id: null as number | null,
    type: '',
  };
  clients: any[] = [];
  isLoading = false;
  error = '';
  currentTab: 'all' | 'Full' | 'Pontual' | 'Individual' = 'all';
  openDropdownId: number | null = null;
  showExportModal = false;
  selectedContract: any = null;

  private handleRefresh = () => this.loadInitialData();

  ngOnInit() {
    this.subscribeToSearch();
    this.subscribeToRefreshEvents();
    this.loadInitialData();
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
        // Só carrega contratos se houve mudança no termo e não está carregando
        if (!this.isLoading && term !== undefined) {
          this.loadContracts();
        }
      });
    this.subscriptions.add(searchSubscription);
  }

  async loadPageData() {
    this.isLoading = true;
    try {
      const [statsResponse, clientsResponse] = await Promise.all([
        firstValueFrom(this.contractService.getStats()),
        firstValueFrom(this.clientService.getClients({ is_active: true })),
      ]);
      if (statsResponse?.stats) this.stats = statsResponse.stats;
      if (clientsResponse?.clients)
        this.clients = clientsResponse.clients;
    } catch (e) {
      this.error = 'Não foi possível carregar os dados da página.';
    } finally {
      this.isLoading = false;
    }
  }

  async loadInitialData() {
    this.error = '';
    try {
      // Carrega clientes e estatísticas primeiro
      const [statsResponse, clientsResponse] = await Promise.all([
        firstValueFrom(this.contractService.getStats()),
        firstValueFrom(this.clientService.getClients({ is_active: true })),
      ]);
      if (statsResponse?.stats) this.stats = statsResponse.stats;
      if (clientsResponse?.clients) this.clients = clientsResponse.clients;

      // Força o carregamento dos contratos
      await this.forceLoadContracts();
    } catch (error: any) {
      this.error = 'Não foi possível carregar os dados da página.';
      console.error('❌ Error loading initial data:', error);
    }
  }

  async forceLoadContracts() {
    // Método para forçar carregamento sem verificar isLoading
    this.isLoading = true;
    this.error = '';
    try {
      const cleanFilters: any = {
        search: this.filters.search,
        status: this.filters.status,
        client_id: this.filters.client_id,
        type: this.currentTab === 'all' ? '' : this.currentTab,
      };

      const response = await firstValueFrom(
        this.contractService.getContracts(cleanFilters)
      );
      
      // Limpa a lista antes de adicionar novos contratos
      this.contracts = [];
      this.filteredContracts = [];
      
      // Mapeia e adiciona os contratos sem duplicação
      const uniqueContracts = response.contracts.map((contract) =>
        this.mapContractToDisplay(contract)
      );
      
      this.contracts = uniqueContracts;
      this.filteredContracts = [...uniqueContracts];
    } catch (error: any) {
      this.error = 'Não foi possível carregar os contratos.';
      console.error('❌ Error loading contracts:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async loadContracts() {
    // Evita múltiplas chamadas simultâneas
    if (this.isLoading) return;
    
    await this.forceLoadContracts();
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
    const client = this.clients.find(c => c.id === contract.client.id);
    const clientName = client ? client.name : (contract.client?.name || 'Cliente não encontrado');

    return {
      id: contract.id,
      contractNumber: contract.contract_number,
      clientName: clientName,
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
      paymentMethod: contract.payment_method || '',
      expectedPaymentDate: this.contractService.formatDate(contract.expected_payment_date || null),
      paymentStatus: this.contractService.getPaymentStatusText(contract.payment_status || 'pendente'),
      paymentStatusColor: this.contractService.getPaymentStatusColor(contract.payment_status || 'pendente'),
      paymentStatusIcon: this.contractService.getPaymentStatusIcon(contract.payment_status || 'pendente'),
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
    this.filters = { search: '', status: '', client_id: null, type: '' };
    this.searchService.setSearchTerm(''); // Also clear the global search
    this.currentTab = 'all';
    this.applyFilters();
  }

  openNewContractPage() {
    this.router.navigate(['/home/contratos/novo']);
  }

  editContract(id: number, event?: MouseEvent) {
    if (event) {
      event.stopPropagation();
    }
    this.router.navigate(['/home/contratos/editar', id]);
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
        this.loadInitialData();
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

  // Novos métodos para dropdown e exportação
  toggleDropdown(contractId: number, event: MouseEvent) {
    event.stopPropagation();
    if (this.openDropdownId === contractId) {
      this.openDropdownId = null;
    } else {
      this.openDropdownId = contractId;
      // Posicionar o dropdown após abrir
      setTimeout(() => this.positionDropdown(event), 0);
    }
  }

  private positionDropdown(event: MouseEvent) {
    const button = (event.target as HTMLElement).closest('.dropdown-toggle') as HTMLElement;
    if (!button) return;

    const buttonRect = button.getBoundingClientRect();
    
    // Aguardar o dropdown ser renderizado
    setTimeout(() => {
      const dropdown = document.querySelector('.dropdown-menu.show') as HTMLElement;
      if (!dropdown) return;

      // Resetar estilos inline anteriores
      dropdown.style.position = 'fixed';
      dropdown.style.left = '';
      dropdown.style.right = '';
      dropdown.style.top = '';
      dropdown.style.bottom = '';

      // Obter dimensões do dropdown
      const dropdownRect = dropdown.getBoundingClientRect();
      const dropdownHeight = dropdown.offsetHeight;
      const dropdownWidth = dropdown.offsetWidth;

      // Calcular espaços disponíveis
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const spaceBelow = viewportHeight - buttonRect.bottom;
      const spaceAbove = buttonRect.top;
      const spaceRight = viewportWidth - buttonRect.left;

      // Posicionar horizontalmente
      if (spaceRight >= dropdownWidth) {
        // Alinhar à esquerda do botão
        dropdown.style.left = `${buttonRect.left}px`;
      } else {
        // Alinhar à direita da viewport
        dropdown.style.right = `${viewportWidth - buttonRect.right}px`;
      }

      // Posicionar verticalmente
      if (spaceBelow >= dropdownHeight + 10) {
        // Abrir para baixo
        dropdown.style.top = `${buttonRect.bottom + 8}px`;
        dropdown.classList.remove('dropup');
      } else if (spaceAbove >= dropdownHeight + 10) {
        // Abrir para cima
        dropdown.style.bottom = `${viewportHeight - buttonRect.top + 8}px`;
        dropdown.classList.add('dropup');
      } else {
        // Se não houver espaço suficiente, abrir para baixo com scroll
        dropdown.style.top = `${buttonRect.bottom + 8}px`;
        dropdown.style.maxHeight = `${spaceBelow - 20}px`;
        dropdown.style.overflowY = 'auto';
        dropdown.classList.remove('dropup');
      }
    }, 10);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    // Fecha o dropdown se clicar fora dele
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown-container')) {
      this.openDropdownId = null;
    }
  }

  viewContract(contractId: number, event: MouseEvent) {
    event.stopPropagation();
    this.openDropdownId = null;
    this.router.navigate(['/home/contratos/visualizar', contractId]);
  }

  async openExportModal(contract: ContractDisplay, event: MouseEvent) {
    event.stopPropagation();
    this.openDropdownId = null;
    
    // Carregar o contrato completo com todos os dados
    try {
      const response = await firstValueFrom(
        this.contractService.getContract(contract.id)
      );
      if (response?.contract) {
        this.selectedContract = response.contract;
        this.showExportModal = true;
      }
    } catch (error) {
      console.error('Erro ao carregar contrato para exportação:', error);
      this.modalService.showError('Não foi possível carregar os dados do contrato.');
    }
  }

  closeExportModal() {
    this.showExportModal = false;
    this.selectedContract = null;
  }
}