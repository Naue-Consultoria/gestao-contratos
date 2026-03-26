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
import { DeleteConfirmationModalComponent } from '../delete-confirmation-modal/delete-confirmation-modal.component';
import { Subscription, firstValueFrom } from 'rxjs';
import { SearchService } from '../../services/search.service'; // Import the new service
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

interface ContractDisplay {
  id: number;
  contractNumber: string;
  clientName: string;
  clientTradeName?: string;
  clientCompanyName?: string;
  clientType?: string;
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
  isExpired: boolean;
  raw: ApiContract;
}

@Component({
  selector: 'app-contracts-table',
  standalone: true,
  imports: [CommonModule, FormsModule, BreadcrumbComponent, ContractStatsCardsComponent, ContractExportModalComponent, DeleteConfirmationModalComponent],
  templateUrl: './contracts-table.html',
  styleUrls: ['./contracts-table.css'],
})
export class ContractsTableComponent implements OnInit, OnDestroy {
  private modalService = inject(ModalService);
  public contractService = inject(ContractService);
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
    typeStats: { Full: 0, Pontual: 0, Individual: 0, 'Recrutamento & Seleção': 0 },
    averageDuration: 0,
  };

  contracts: ContractDisplay[] = [];
  filteredContracts: ContractDisplay[] = [];
  filters = {
    search: '',
    status: '',
    client_id: null as number | null,
    type: '',
    dateType: '',
    month: '',
    year: '',
  };
  clients: any[] = [];
  availableYears: number[] = [];
  isLoading = false;
  isSearching = false;
  error = '';
  currentTab: 'all' | 'Full' | 'Pontual' | 'Individual' | 'Recrutamento & Seleção' = 'all';
  openDropdownId: number | null = null;
  showExportModal = false;
  selectedContract: any = null;

  // Sorting properties
  sortField: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';
  
  // Modal de exclusão
  showDeleteModal = false;
  selectedContractForDeletion: ContractDisplay | null = null;
  isDeleting = false;
  private readonly FILTERS_STORAGE_KEY = 'contracts_filters';

  // Controle de visualização financeira - Admin e Admin Gerencial podem ver valores individuais
  canViewFinancialInfo = false;

  private handleRefresh = () => this.loadInitialData();

  ngOnInit() {
    // Verificar se o usuário pode ver valores financeiros
    const userJson = localStorage.getItem('user');
    if (userJson) {
      try {
        const user = JSON.parse(userJson);
        // Admin e Admin Gerencial podem ver valores individuais dos contratos
        this.canViewFinancialInfo = user.role === 'admin' || user.role === 'admin_gerencial';
      } catch (error) {
        this.canViewFinancialInfo = false;
      }
    }

    this.restoreFilters();
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
      .pipe(
        debounceTime(500), // Aumentado para 500ms para reduzir requisições
        distinctUntilChanged()
      )
      .subscribe((term) => {
        this.filters.search = term;
        // Indicador visual de que está buscando
        if (term && term.trim()) {
          this.isSearching = true;
        }
        // Carregar contratos
        if (term !== undefined) {
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
        this.clients = clientsResponse.clients.sort((a, b) => 
          a.name.toLowerCase().localeCompare(b.name.toLowerCase())
        );
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
      if (clientsResponse?.clients) this.clients = clientsResponse.clients.sort((a, b) => 
        a.name.toLowerCase().localeCompare(b.name.toLowerCase())
      );

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
      // Filtros limpos e organizados
      const cleanFilters: any = {
        search: this.filters.search?.trim(),
        // Não enviar "vencido" para o backend - é filtro frontend
        status: this.filters.status === 'vencido' ? '' : this.filters.status,
        client_id: this.filters.client_id,
        type: this.currentTab === 'all' ? '' : this.currentTab,
        dateType: this.filters.dateType,
        month: this.filters.month,
        year: this.filters.year,
      };

      // Remove filtros vazios para otimizar query
      Object.keys(cleanFilters).forEach(key => {
        if (cleanFilters[key] === '' || cleanFilters[key] === null || cleanFilters[key] === undefined) {
          delete cleanFilters[key];
        }
      });

      console.log('🔍 Carregando contratos com filtros:', cleanFilters);

      const response = await firstValueFrom(
        this.contractService.getContracts(cleanFilters)
      );
      
      if (response?.contracts) {
        // Mapear contratos de forma otimizada
        const mappedContracts = response.contracts.map((contract) =>
          this.mapContractToDisplay(contract)
        );

        this.contracts = mappedContracts;

        // Filtrar contratos vencidos se o filtro estiver ativo
        // Vencidos = contratos com status "active" e que estão expirados (end_date < hoje)
        if (this.filters.status === 'vencido') {
          this.filteredContracts = mappedContracts.filter(contract =>
            contract.isExpired && contract.raw.status === 'active'
          );
        } else {
          this.filteredContracts = [...mappedContracts];
        }

        // Apply sorting if there's a sort field
        if (this.sortField) {
          this.filteredContracts = this.sortContracts(this.filteredContracts);
        }

        this.updateAvailableYears();

        console.log(`✅ Carregados ${mappedContracts.length} contratos`);
      } else {
        this.contracts = [];
        this.filteredContracts = [];
      }
      
    } catch (error: any) {
      console.error('❌ Erro ao carregar contratos:', error);
      
      if (error.status === 400) {
        this.error = 'Filtros de busca inválidos. Tente novamente.';
      } else if (error.status === 500) {
        this.error = 'Erro interno do servidor. Tente novamente em alguns instantes.';
      } else {
        this.error = 'Não foi possível carregar os contratos. Verifique sua conexão.';
      }
      
    } finally {
      this.isLoading = false;
      this.isSearching = false;
      this.saveFilters();
    }
  }

  async loadContracts() {
    // Evita múltiplas chamadas simultâneas
    if (this.isLoading) return;
    
    await this.forceLoadContracts();
  }

  private calculateStatsFromContracts(apiContracts: ApiContract[]) {
    let active = 0, completed = 0, cancelled = 0, suspended = 0;
    let totalValueActive = 0, totalValueAll = 0;
    const typeStats: any = { Full: 0, Pontual: 0, Individual: 0, 'Recrutamento & Seleção': 0 };

    for (const c of apiContracts) {
      const val = this.getAdjustedContractValue(c);
      totalValueAll += val;
      if (c.status === 'active') { active++; totalValueActive += val; }
      else if (c.status === 'completed') completed++;
      else if (c.status === 'cancelled') cancelled++;
      else if (c.status === 'suspended') suspended++;
      if (typeStats[c.type] !== undefined) typeStats[c.type]++;
    }

    this.stats = {
      total: apiContracts.length,
      active,
      completed,
      cancelled,
      suspended,
      totalValueActive,
      totalValueAll,
      averageValue: apiContracts.length > 0 ? totalValueAll / apiContracts.length : 0,
      typeStats,
      averageDuration: 0,
    };
  }

  private mapContractToDisplay(contract: ApiContract): ContractDisplay {
    const client = this.clients.find(c => c.id === contract.client.id);
    let clientName = 'Cliente não encontrado';
    let clientTradeName = '';
    let clientCompanyName = '';
    let clientType = '';

    if (client) {
      clientType = client.type || '';
      if (client.type === 'PJ') {
        clientTradeName = client.trade_name || '';
        clientCompanyName = client.company_name || '';
        // Priorizar trade_name sobre company_name
        clientName = clientTradeName || clientCompanyName || client.name || '';
      } else {
        clientName = client.name || '';
      }
    } else if (contract.client?.name) {
      clientName = contract.client.name;
    }

    // Determinar moeda baseada na origem do cliente
    const clientCurrency: 'BRL' | 'USD' = contract.client?.origin === 'international' ? 'USD' : 'BRL';

    return {
      id: contract.id,
      contractNumber: contract.contract_number,
      clientName: clientName,
      clientTradeName: clientTradeName,
      clientCompanyName: clientCompanyName,
      clientType: clientType,
      type: contract.type,
      startDate: this.contractService.formatDate(contract.start_date),
      endDate: this.contractService.formatDate(contract.end_date || null),
      duration: `${this.contractService.calculateDuration(
        contract.start_date,
        contract.end_date
      )} dias`,
      totalValue: this.contractService.formatValue(this.getAdjustedContractValue(contract), clientCurrency),
      status: this.contractService.getStatusText(contract.status),
      statusColor: this.contractService.getStatusColor(contract.status),
      servicesCount: contract.contract_services?.length || 0,
      paymentMethod: contract.payment_method || '',
      expectedPaymentDate: this.contractService.formatDate(contract.expected_payment_date || null),
      paymentStatus: this.contractService.getPaymentStatusText(contract.payment_status || 'pendente'),
      paymentStatusColor: this.contractService.getPaymentStatusColor(contract.payment_status || 'pendente'),
      paymentStatusIcon: this.contractService.getPaymentStatusIcon(contract.payment_status || 'pendente'),
      isExpired: this.contractService.isContractExpired(contract),
      raw: contract,
    };
  }

  applyFilters() {
    this.loadContracts(); // Simply reload contracts with the new filters
  }

  sortBy(field: string) {
    if (this.sortField === field) {
      // If already sorting by this field, toggle direction
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // If new field, set as ascending
      this.sortField = field;
      this.sortDirection = 'asc';
    }

    // Apply sorting to current contracts
    this.filteredContracts = this.sortContracts(this.filteredContracts);
  }

  private sortContracts(contracts: ContractDisplay[]): ContractDisplay[] {
    const sorted = [...contracts].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (this.sortField) {
        case 'contractNumber':
          aValue = a.contractNumber;
          bValue = b.contractNumber;
          break;
        case 'clientName':
          aValue = a.clientName.toLowerCase();
          bValue = b.clientName.toLowerCase();
          break;
        case 'servicesCount':
          aValue = a.servicesCount;
          bValue = b.servicesCount;
          break;
        case 'totalValue':
          // Convert string value to number for proper sorting
          aValue = this.parseMoneyValue(a.totalValue);
          bValue = this.parseMoneyValue(b.totalValue);
          break;
        case 'endDate':
          // Handle "Indeterminado" (null dates) - put them at the end
          aValue = a.raw.end_date ? new Date(a.raw.end_date).getTime() : Number.MAX_VALUE;
          bValue = b.raw.end_date ? new Date(b.raw.end_date).getTime() : Number.MAX_VALUE;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) {
        return this.sortDirection === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return this.sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return sorted;
  }

  getSortIcon(field: string): string {
    if (this.sortField !== field) {
      return 'fas fa-sort';
    }
    return this.sortDirection === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
  }

  private parseMoneyValue(value: string): number {
    // Remove "R$ " and thousand separators, replace comma with dot
    const cleanValue = value.replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.');
    return parseFloat(cleanValue) || 0;
  }

  changeTab(tab: 'all' | 'Full' | 'Pontual' | 'Individual' | 'Recrutamento & Seleção') {
    this.currentTab = tab;
    this.applyFilters();
  }

  clearFilters() {
    this.filters = { search: '', status: '', client_id: null, type: '', dateType: '', month: '', year: '' };
    this.searchService.setSearchTerm('');
    this.currentTab = 'all';
    this.sortField = '';
    this.sortDirection = 'asc';
    sessionStorage.removeItem(this.FILTERS_STORAGE_KEY);
    this.applyFilters();
  }

  onSearchInput() {
    // Apenas atualiza o searchService, que tem debounce
    this.searchService.setSearchTerm(this.filters.search || '');
  }

  clearSearch() {
    this.filters.search = '';
    this.searchService.setSearchTerm('');
  }

  openNewContractPage() {
    this.router.navigate(['/home/contratos/novo']);
  }

  editContract(id: number, event?: MouseEvent) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    this.openDropdownId = null;
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

  getContractCurrency(contract: ApiContract): 'BRL' | 'USD' {
    return contract.client?.origin === 'international' ? 'USD' : 'BRL';
  }

  formatContractValue(value: number, contract: ApiContract): string {
    return this.contractService.formatValue(value, this.getContractCurrency(contract));
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

  deleteContract(contractId: number, event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();
    this.openDropdownId = null;
    
    const contractToDelete = this.contracts.find((c) => c.id === contractId);
    if (!contractToDelete) return;

    this.selectedContractForDeletion = contractToDelete;
    this.showDeleteModal = true;
  }

  async confirmDeleteContract() {
    if (!this.selectedContractForDeletion) return;
    
    this.isDeleting = true;
    
    try {
      await firstValueFrom(
        this.contractService.deleteContractPermanent(this.selectedContractForDeletion.id)
      );
      this.modalService.showSuccess('Contrato excluído com sucesso!');
      this.showDeleteModal = false;
      this.selectedContractForDeletion = null;
      this.loadInitialData();
    } catch (error) {
      console.error('❌ Error deleting contract:', error);
      this.modalService.showError('Não foi possível excluir o contrato.');
    } finally {
      this.isDeleting = false;
    }
  }

  cancelDeleteContract() {
    this.showDeleteModal = false;
    this.selectedContractForDeletion = null;
    this.isDeleting = false;
  }

  // Funções removidas - funcionalidade implementada via modal de exportação

  // Novos métodos para dropdown e exportação
  toggleDropdown(contractId: number, event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();
    
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

    // Obter a posição do botão na viewport IMEDIATAMENTE
    const buttonRect = button.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    
    // Posição absoluta na página (não relativa à viewport)
    const absoluteTop = buttonRect.top + scrollTop;
    const absoluteLeft = buttonRect.left + scrollLeft;

    // Aguardar o dropdown ser renderizado
    setTimeout(() => {
      const dropdown = button.parentElement?.querySelector('.dropdown-menu') as HTMLElement;
      if (!dropdown) return;

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Posição inicial - abaixo do botão (fixa na viewport)
      let top = buttonRect.bottom + 4;
      let left = buttonRect.left;

      // Verificar se precisa ajustar horizontalmente
      const dropdownWidth = 180;
      if (left + dropdownWidth > viewportWidth - 20) {
        left = buttonRect.right - dropdownWidth;
      }

      // Verificar se precisa ajustar verticalmente  
      const dropdownHeight = 140;
      if (top + dropdownHeight > viewportHeight - 20) {
        top = buttonRect.top - dropdownHeight - 4;
        dropdown.style.transformOrigin = 'bottom left';
      } else {
        dropdown.style.transformOrigin = 'top left';
      }

      // Aplicar posicionamento fixo na viewport
      dropdown.style.top = `${Math.max(10, top)}px`;
      dropdown.style.left = `${Math.max(10, left)}px`;
    }, 0);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    // Fecha o dropdown se clicar fora dele
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown-container') && !target.closest('.dropdown-menu')) {
      this.openDropdownId = null;
    }
  }

  @HostListener('window:scroll')
  @HostListener('document:scroll')
  onScroll() {
    // Fecha o dropdown quando houver scroll
    this.openDropdownId = null;
  }

  viewContract(contractId: number, event: MouseEvent) {
    // Evitar navegação se clicou em botões de ação ou dentro de dropdowns
    const target = event.target as HTMLElement;
    
    if (target.closest('.action-buttons-cell') || 
        target.closest('.dropdown-container') || 
        target.closest('.table-card-actions') ||
        target.closest('.dropdown-menu') ||
        target.classList.contains('dropdown-toggle') ||
        target.classList.contains('action-btn')) {
      return;
    }
    
    event.stopPropagation();
    this.openDropdownId = null;
    this.router.navigate(['/home/contratos/visualizar', contractId]);
  }

  async openExportModal(contract: ContractDisplay, event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();
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

  // Calcular valor ajustado de um contrato considerando serviços cancelados
  getAdjustedContractValue(contract: ApiContract): number {
    if (!contract.contract_services) return contract.total_value || 0;
    
    let totalValue = contract.total_value || 0;
    let cancelledValue = 0;
    
    contract.contract_services.forEach(service => {
      const serviceStatus = this.getServiceStatus(service);
      if (serviceStatus === 'cancelled') {
        cancelledValue += service.total_value || 0;
      }
    });
    
    return Math.max(0, totalValue - cancelledValue);
  }

  // Obter status do serviço (considerando rotinas se existirem)
  getServiceStatus(service: any): string {
    // Se há dados de rotina, usar o status da rotina
    if (service.service_routines && service.service_routines.length > 0) {
      return service.service_routines[0].status || 'not_started';
    }
    // Caso contrário, usar o status do serviço do contrato
    return service.status || 'not_started';
  }

  // Verificar se um contrato possui serviços cancelados
  hasCancelledServices(contract: ApiContract): boolean {
    if (!contract.contract_services) return false;
    
    return contract.contract_services.some(service => {
      const serviceStatus = this.getServiceStatus(service);
      return serviceStatus === 'cancelled';
    });
  }

  // Calcular valor total dos serviços cancelados de um contrato
  getCancelledServicesValue(contract: ApiContract): number {
    if (!contract.contract_services) return 0;
    
    let cancelledValue = 0;
    
    contract.contract_services.forEach(service => {
      const serviceStatus = this.getServiceStatus(service);
      if (serviceStatus === 'cancelled') {
        cancelledValue += service.total_value || 0;
      }
    });
    
    return cancelledValue;
  }

  // Atualizar anos disponíveis baseado nos contratos
  private updateAvailableYears() {
    const years = new Set<number>();
    const currentYear = new Date().getFullYear();

    // Adicionar o ano atual
    years.add(currentYear);

    // Adicionar anos dos contratos
    this.contracts.forEach(contract => {
      if (contract.raw.created_at) {
        const year = new Date(contract.raw.created_at).getFullYear();
        years.add(year);
      }
      if (contract.raw.start_date) {
        const year = new Date(contract.raw.start_date).getFullYear();
        years.add(year);
      }
      if (contract.raw.end_date) {
        const year = new Date(contract.raw.end_date).getFullYear();
        years.add(year);
      }
    });

    // Adicionar anos anteriores e próximo
    years.add(currentYear - 1);
    years.add(currentYear + 1);

    // Converter para array e ordenar
    this.availableYears = Array.from(years).sort((a, b) => b - a);
  }

  // Contar quantidade de filtros ativos
  getActiveFiltersCount(): number {
    let count = 0;
    if (this.filters.search) count++;
    if (this.filters.status) count++;
    if (this.filters.client_id) count++;
    if (this.filters.dateType && (this.filters.month || this.filters.year)) count++;
    return count;
  }

  private saveFilters() {
    const state = {
      filters: this.filters,
      sortField: this.sortField,
      sortDirection: this.sortDirection,
      currentTab: this.currentTab
    };
    sessionStorage.setItem(this.FILTERS_STORAGE_KEY, JSON.stringify(state));
  }

  private restoreFilters() {
    try {
      const saved = sessionStorage.getItem(this.FILTERS_STORAGE_KEY);
      if (saved) {
        const state = JSON.parse(saved);
        if (state.filters) {
          this.filters = { ...this.filters, ...state.filters };
        }
        if (state.sortField) this.sortField = state.sortField;
        if (state.sortDirection) this.sortDirection = state.sortDirection;
        if (state.currentTab) this.currentTab = state.currentTab;
        if (this.filters.search) {
          this.searchService.setSearchTerm(this.filters.search);
        }
      }
    } catch (e) {}
  }

  // Manipular clique no card de estatísticas
  handleStatsCardClick(cardId: string) {
    if (cardId === 'expiring') {
      // Limpar filtros existentes
      this.filters = {
        search: '',
        status: 'active', // Apenas contratos ativos
        client_id: null,
        type: '',
        dateType: '',
        month: '',
        year: ''
      };
      this.currentTab = 'all';

      // Calcular datas para próximos 15 dias
      const now = new Date();
      const fifteenDaysFromNow = new Date();
      fifteenDaysFromNow.setDate(fifteenDaysFromNow.getDate() + 15);

      // Filtrar contratos que vencem nos próximos 15 dias
      this.filteredContracts = this.contracts.filter(contract => {
        if (contract.raw.status !== 'active' || !contract.raw.end_date) return false;
        const endDate = new Date(contract.raw.end_date);
        return endDate >= now && endDate <= fifteenDaysFromNow;
      });

      // Removido toast de informação conforme solicitado
    }
  }

  trackByContractId(index: number, contract: ContractDisplay): number {
    return contract.raw.id;
  }

  trackByClientId(index: number, client: any): number {
    return client.id;
  }

  trackByYear(index: number, year: number): number {
    return year;
  }
}