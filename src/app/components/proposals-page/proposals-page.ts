import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ModalService } from '../../services/modal.service';
import { ProposalService, Proposal, PrepareProposalData } from '../../services/proposal';
import { ClientService } from '../../services/client';
import { SendProposalModalComponent } from '../send-proposal-modal/send-proposal-modal';
import { DeleteConfirmationModalComponent } from '../delete-confirmation-modal/delete-confirmation-modal.component';
import { ProposalToContractModalComponent } from '../proposal-to-contract-modal/proposal-to-contract-modal';
import { DuplicateProposalModalComponent } from '../duplicate-proposal-modal/duplicate-proposal-modal';
import { Subscription, firstValueFrom } from 'rxjs';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';
import { ProposalStatsCardsComponent } from '../proposal-stats-cards/proposal-stats-cards';
import { SearchService } from '../../services/search.service';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ProposalPdfService } from '../../services/proposal-pdf.service';

interface ProposalDisplay {
  id: number;
  proposalNumber: string;
  clientName: string;
  companyName: string;
  tradeName: string;
  clientType: string;
  status: string;
  statusText: string;
  totalValue: string;
  validUntil: string;
  createdAt: string;
  isExpired: boolean;
  sla: string;
  raw: Proposal;
}

@Component({
  selector: 'app-proposals-page',
  standalone: true,
  imports: [CommonModule, FormsModule, SendProposalModalComponent, DeleteConfirmationModalComponent, BreadcrumbComponent, ProposalStatsCardsComponent, ProposalToContractModalComponent, DuplicateProposalModalComponent],
  templateUrl: './proposals-page.html',
  styleUrls: ['./proposals-page.css']
})
export class ProposalsPageComponent implements OnInit, OnDestroy {
  private modalService = inject(ModalService);
  public proposalService = inject(ProposalService); // public para acessar getStatusText no template
  private clientService = inject(ClientService);
  private searchService = inject(SearchService);
  private proposalPdfService = inject(ProposalPdfService);
  private router = inject(Router);
  private subscriptions = new Subscription();

  proposals: ProposalDisplay[] = [];
  filteredProposals: ProposalDisplay[] = [];
  clients: any[] = [];
  isLoading = true;
  isSearching = false;
  error = '';

  // Filters
  filters = {
    search: '',
    status: '',
    client_id: null as number | null,
    type: '',
    month: '',
    year: ''
  };
  availableYears: number[] = [];

  // Send Proposal Modal
  showSendModal = false;
  selectedProposalForSending: Proposal | null = null;

  // Delete Confirmation Modal
  showDeleteModal = false;
  selectedProposalForDeletion: ProposalDisplay | null = null;
  isDeleting = false;

  // Convert to Contract Modal
  showConvertModal = false;
  selectedProposalForConversion: Proposal | null = null;

  // Duplicate Proposal Modal
  showDuplicateModal = false;
  selectedProposalForDuplication: Proposal | null = null;

  // Status Nature Modal
  showStatusNatureModal = false;
  selectedProposalForStatusNature: ProposalDisplay | null = null;
  statusNatureText = '';
  isSavingStatusNature = false;

  // Dropdown control
  activeDropdownId: number | null = null;

  // Sorting
  sortField: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  private readonly FILTERS_STORAGE_KEY = 'proposals_filters';

  ngOnInit() {
    this.restoreFilters();
    this.subscribeToSearch();
    this.loadData();
    this.loadClients();
    window.addEventListener('refreshProposals', this.loadData.bind(this));

    // Fechar dropdown quando clicar fora
    document.addEventListener('click', () => {
      this.activeDropdownId = null;
    });
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    window.removeEventListener('refreshProposals', this.loadData.bind(this));
  }

  private subscribeToSearch() {
    const searchSubscription = this.searchService.searchTerm$
      .pipe(
        debounceTime(500),
        distinctUntilChanged()
      )
      .subscribe((term) => {
        this.filters.search = term;
        if (term && term.trim()) {
          this.isSearching = true;
        }
        this.applyFilters();
      });
    this.subscriptions.add(searchSubscription);
  }

  async loadClients() {
    try {
      const response = await firstValueFrom(this.clientService.getClients({ is_active: true }));
      if (response?.clients) {
        this.clients = response.clients.sort((a: any, b: any) =>
          a.name.toLowerCase().localeCompare(b.name.toLowerCase())
        );
      }
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    }
  }

  async loadData() {
    this.isLoading = true;
    this.error = '';
    try {
      const proposalsResponse = await firstValueFrom(this.proposalService.getProposals());

      if (proposalsResponse && proposalsResponse.success) {
        this.proposals = (proposalsResponse.data || []).map((apiProposal: any) => {
          return this.mapApiProposalToTableProposal(apiProposal);
        });
        this.filteredProposals = [...this.proposals];
        this.updateAvailableYears();
        this.applyFilters();
      } else {
        // Se não há dados ou falha na resposta, deixa array vazio
        this.proposals = [];
        this.filteredProposals = [];
      }
    } catch (error: any) {
      console.error('❌ Error loading proposals data:', error);

      // Se é erro 500 ou endpoint não existe, mostra que funcionalidade não está disponível
      if (error?.status === 500 || error?.status === 404) {
        this.error = 'A funcionalidade de propostas ainda não está implementada no backend.';
      } else {
        this.error = 'Não foi possível carregar os dados das propostas.';
      }

      // Define array vazio para não quebrar a UI
      this.proposals = [];
      this.filteredProposals = [];
    } finally {
      this.isLoading = false;
      this.isSearching = false;
    }
  }

  private saveFilters() {
    const state = {
      filters: this.filters,
      sortField: this.sortField,
      sortDirection: this.sortDirection
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
        if (state.sortField) {
          this.sortField = state.sortField;
        }
        if (state.sortDirection) {
          this.sortDirection = state.sortDirection;
        }
        // Sincronizar o search service com o termo restaurado
        if (this.filters.search) {
          this.searchService.setSearchTerm(this.filters.search);
        }
      }
    } catch (e) {
      // Se houver erro ao restaurar, usar filtros padrão
    }
  }

  applyFilters() {
    let filtered = [...this.proposals];

    // Filtro de busca
    if (this.filters.search) {
      const searchTerm = this.filters.search.toLowerCase();
      filtered = filtered.filter(p =>
        p.proposalNumber.toLowerCase().includes(searchTerm) ||
        p.clientName.toLowerCase().includes(searchTerm)
      );
    }

    // Filtro de status
    if (this.filters.status) {
      filtered = filtered.filter(p => p.status === this.filters.status);
    }

    // Filtro de cliente
    if (this.filters.client_id) {
      filtered = filtered.filter(p => {
        // Verificar diferentes formas de ter o client_id
        const clientId = p.raw.client?.id || p.raw.client_id;
        return clientId === Number(this.filters.client_id);
      });
    }

    // Filtro de tipo
    if (this.filters.type) {
      filtered = filtered.filter(p => p.raw.type === this.filters.type);
    }

    // Filtro de mês/ano
    if (this.filters.month || this.filters.year) {
      filtered = filtered.filter(p => {
        const date = new Date(p.raw.created_at);
        if (this.filters.month && date.getMonth() + 1 !== parseInt(this.filters.month)) {
          return false;
        }
        if (this.filters.year && date.getFullYear() !== parseInt(this.filters.year)) {
          return false;
        }
        return true;
      });
    }

    // Aplicar ordenação se houver
    if (this.sortField) {
      filtered = this.sortProposals(filtered);
    }

    this.filteredProposals = filtered;
    this.isSearching = false;
    this.saveFilters();
  }

  sortBy(field: string) {
    if (this.sortField === field) {
      // Se já está ordenando por este campo, inverte a direção
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // Se é um novo campo, define como ascendente
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    this.applyFilters();
  }

  private sortProposals(proposals: ProposalDisplay[]): ProposalDisplay[] {
    const sorted = [...proposals].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (this.sortField) {
        case 'proposalNumber':
          aValue = a.proposalNumber;
          bValue = b.proposalNumber;
          break;
        case 'clientName':
          aValue = a.clientName.toLowerCase();
          bValue = b.clientName.toLowerCase();
          break;
        case 'status':
          aValue = (a.statusText || '').toLowerCase();
          bValue = (b.statusText || '').toLowerCase();
          break;
        case 'totalValue':
          // Converter string de valor para número
          aValue = this.parseMoneyValue(a.totalValue);
          bValue = this.parseMoneyValue(b.totalValue);
          break;
        case 'sla':
          // Ordenar pelo número de dias do SLA
          aValue = this.parseSLADays(a.sla);
          bValue = this.parseSLADays(b.sla);
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

  private parseMoneyValue(value: string): number {
    // Remove "R$ " e pontos de milhares, substitui vírgula por ponto
    const cleanValue = value.replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.');
    return parseFloat(cleanValue) || 0;
  }

  private parseSLADays(sla: string): number {
    // Se for "-" retorna um número muito alto para ir para o final da ordenação
    if (sla === '-') {
      return 999999;
    }

    // Extrai o número de dias da string (ex: "5 dias" -> 5)
    const match = sla.match(/(\d+)/);
    if (match) {
      return parseInt(match[1], 10);
    }

    return 999999; // Caso não consiga extrair, vai para o final
  }

  getSortIcon(field: string): string {
    if (this.sortField !== field) {
      return 'fas fa-sort';
    }
    return this.sortDirection === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
  }

  clearFilters() {
    this.filters = { search: '', status: '', client_id: null, type: '', month: '', year: '' };
    this.sortField = '';
    this.sortDirection = 'asc';
    this.searchService.setSearchTerm('');
    sessionStorage.removeItem(this.FILTERS_STORAGE_KEY);
    this.applyFilters();
  }

  onSearchInput() {
    this.searchService.setSearchTerm(this.filters.search || '');
  }

  clearSearch() {
    this.filters.search = '';
    this.searchService.setSearchTerm('');
  }

  private updateAvailableYears() {
    const years = new Set<number>();
    const currentYear = new Date().getFullYear();

    years.add(currentYear);
    years.add(currentYear - 1);
    years.add(currentYear + 1);

    this.proposals.forEach(proposal => {
      if (proposal.raw.created_at) {
        const year = new Date(proposal.raw.created_at).getFullYear();
        years.add(year);
      }
    });

    this.availableYears = Array.from(years).sort((a, b) => b - a);
  }

  getActiveFiltersCount(): number {
    let count = 0;
    if (this.filters.search) count++;
    if (this.filters.status) count++;
    if (this.filters.client_id) count++;
    if (this.filters.type) count++;
    if (this.filters.month || this.filters.year) count++;
    return count;
  }

  private mapApiProposalToTableProposal(apiProposal: any): ProposalDisplay {
    let clientName = 'Cliente não identificado';
    let companyName = '';
    let tradeName = '';
    let clientType = '';
    const client = apiProposal.client;

    if (client) {
        clientType = client.type || '';
        if (client.type === 'PJ' && client.company) {
            tradeName = client.company.trade_name || '';
            companyName = client.company.company_name || '';
            clientName = tradeName || companyName || apiProposal.client_name || '';
        } else if (client.type === 'PF' && client.person) {
            clientName = client.person.full_name || apiProposal.client_name || '';
        } else {
            clientName = apiProposal.client_name || client.name || '';
        }
    } else if (apiProposal.client_name) {
        clientName = apiProposal.client_name;
    }

    // Calcular valor total considerando seleção parcial de serviços
    // IMPORTANTE: Uma vez que o cliente selecionou serviços, o valor aceito deve ser usado
    // independente de mudanças posteriores no status da proposta
    let totalValue = apiProposal.total_value || 0;

    // Verificar se há serviços com seleção do cliente definida
    if (apiProposal.services && apiProposal.services.length > 0) {
      // Verificar se há algum serviço com selected_by_client definido (true ou false)
      const hasClientSelection = apiProposal.services.some((s: any) => s.selected_by_client !== null && s.selected_by_client !== undefined);

      if (hasClientSelection) {
        // Contar quantos serviços NÃO foram selecionados
        const unselectedCount = apiProposal.services.filter((s: any) => s.selected_by_client === false).length;
        const totalServices = apiProposal.services.length;

        // Só é seleção parcial se:
        // 1. Houver pelo menos um serviço NÃO selecionado
        // 2. Mas NÃO todos os serviços são não selecionados (se todos forem false, é dados inconsistentes)
        const hasPartialSelection = unselectedCount > 0 && unselectedCount < totalServices;

        if (hasPartialSelection) {
          // Calcular apenas o valor dos serviços selecionados
          // Filtra por !== false para incluir serviços selecionados (true ou undefined/null)
          const selectedServices = apiProposal.services.filter((service: any) => service.selected_by_client !== false);
          totalValue = selectedServices.reduce((sum: number, service: any) => sum + (service.total_value || 0), 0);
        }
      }
    }

    // Determinar moeda baseada na origem do cliente
    const clientCurrency = this.getProposalCurrency(apiProposal);

    return {
      id: apiProposal.id,
      proposalNumber: apiProposal.proposal_number,
      clientName: clientName,
      companyName: companyName,
      tradeName: tradeName,
      clientType: clientType,
      status: apiProposal.status,
      statusText: this.proposalService.getStatusText(apiProposal.status),
      totalValue: this.proposalService.formatCurrency(totalValue, clientCurrency),
      validUntil: apiProposal.end_date ? this.formatDate(apiProposal.end_date) : 'Sem prazo',
      createdAt: this.formatDate(apiProposal.created_at),
      isExpired: this.proposalService.isProposalExpired(apiProposal),
      sla: this.calculateSLA(apiProposal),
      raw: apiProposal
    };
  }

  openNewProposalPage() {
    // Verifica se há erro de backend antes de navegar
    if (this.error && this.error.includes('ainda não está implementada no backend')) {
      this.modalService.showError('A funcionalidade de criar propostas ainda não está implementada no backend.');
      return;
    }
    this.router.navigate(['/home/propostas/nova']);
  }

  editProposal(id: number) {
    if (this.error && this.error.includes('ainda não está implementada no backend')) {
      this.modalService.showError('A funcionalidade de editar propostas ainda não está implementada no backend.');
      return;
    }
    this.router.navigate(['/home/propostas/editar', id]);
  }

  viewProposal(id: number) {
    if (this.error && this.error.includes('ainda não está implementada no backend')) {
      this.modalService.showError('A funcionalidade de visualizar propostas ainda não está implementada no backend.');
      return;
    }
    this.router.navigate(['/home/propostas/visualizar', id]);
  }

  duplicateProposal(proposal: ProposalDisplay, event: MouseEvent) {
    event.stopPropagation();
    this.selectedProposalForDuplication = proposal.raw;
    this.showDuplicateModal = true;
  }

  onDuplicateModalClose() {
    this.showDuplicateModal = false;
    this.selectedProposalForDuplication = null;
  }

  onProposalDuplicated(newProposal: any) {
    this.modalService.showSuccess('Proposta duplicada com sucesso!');
    this.showDuplicateModal = false;
    this.selectedProposalForDuplication = null;
    this.loadData(); // Recarregar a lista de propostas

    // Perguntar se deseja editar a nova proposta
    const editNewProposal = confirm('Deseja editar a proposta duplicada?');
    if (editNewProposal && newProposal?.id) {
      this.router.navigate(['/home/propostas/editar', newProposal.id]);
    }
  }

  deleteProposal(proposal: ProposalDisplay, event: MouseEvent) {
    event.stopPropagation();
    this.selectedProposalForDeletion = proposal;
    this.showDeleteModal = true;
  }

  confirmDeleteProposal() {
    if (!this.selectedProposalForDeletion) return;
    
    this.isDeleting = true;
    
    firstValueFrom(this.proposalService.deleteProposal(this.selectedProposalForDeletion.id))
      .then(() => {
        this.modalService.showSuccess('Proposta excluída com sucesso!');
        this.showDeleteModal = false;
        this.selectedProposalForDeletion = null;
        this.loadData();
      })
      .catch((error: any) => {
        console.error('❌ Error deleting proposal:', error);
        if (error?.status === 500 || error?.status === 404) {
          this.modalService.showError('Funcionalidade de excluir propostas ainda não implementada no backend.');
        } else {
          this.modalService.showError('Não foi possível excluir a proposta.');
        }
      })
      .finally(() => {
        this.isDeleting = false;
      });
  }

  cancelDeleteProposal() {
    this.showDeleteModal = false;
    this.selectedProposalForDeletion = null;
    this.isDeleting = false;
  }

  async generatePDF(proposal: ProposalDisplay, event: MouseEvent) {
    event.stopPropagation();

    try {
      // Buscar detalhes completos da proposta
      const proposalResponse = await firstValueFrom(this.proposalService.getProposal(proposal.id));

      if (!proposalResponse || !proposalResponse.success || !proposalResponse.data) {
        this.modalService.showError('Não foi possível carregar os dados da proposta.');
        return;
      }

      const fullProposal = proposalResponse.data;
      await this.proposalPdfService.generate(fullProposal, this.getProposalCurrency(fullProposal));

      this.modalService.showSuccess('PDF gerado com sucesso!');
    } catch (error: any) {
      console.error('❌ Error generating PDF:', error);
      this.modalService.showError('Erro ao gerar o PDF da proposta.');
    }
  }

  getProposalTypeText(type: string): string {
    const types: { [key: string]: string } = {
      'Full': 'Full',
      'Pontual': 'Pontual',
      'Individual': 'Individual',
      'Recrutamento & Seleção': 'R&S'
    };
    return types[type] || type || 'Full';
  }

  getStatusColor(status: string): string {
    const statusColors: { [key: string]: string } = {
      'draft': '#6c757d',
      'sent': '#007bff',
      'signed': '#003b2b',  // Verde escuro (Fechada)
      'accepted': '#28a745',
      'rejected': '#dc3545',
      'expired': '#fd7e14',
      'converted': '#10b981',  // Verde claro (Assinada)
      'contraproposta': '#0a8560',  // Verde mais claro que o 'signed'
      'standby': '#eab308',  // Amarelo/Dourado para Standby
      'sem_retorno': '#9ca3af',  // Cinza claro para Sem Retorno
      'em_negociacao': '#8b5cf6'  // Roxo para Em Negociação
    };
    return statusColors[status] || '#6c757d';
  }

  private calculateSLA(proposal: any): string {
    if (!proposal.created_at) return '-';

    const createdDate = new Date(proposal.created_at);
    let endDate: Date;

    // Para propostas assinadas, usar a data de assinatura
    if (proposal.status === 'signed' && proposal.signed_at) {
      endDate = new Date(proposal.signed_at);
    }
    // Para propostas convertidas, usar a data de conversão (ou assinatura)
    else if (proposal.status === 'converted') {
      if (proposal.converted_at) {
        endDate = new Date(proposal.converted_at);
      } else if (proposal.signed_at) {
        endDate = new Date(proposal.signed_at);
      } else {
        return '-';
      }
    }
    // Para propostas com contraproposta (assinadas parcialmente), usar data de assinatura
    else if (proposal.status === 'contraproposta' && proposal.signed_at) {
      endDate = new Date(proposal.signed_at);
    }
    // Para propostas enviadas, usar a data atual
    else if (proposal.status === 'sent') {
      endDate = new Date();
    }
    // Para outros status, não mostrar SLA
    else {
      return '-';
    }

    // Calcular diferença em milissegundos
    const timeDiff = endDate.getTime() - createdDate.getTime();

    // Converter para dias (24h = 1 dia)
    const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

    // Retornar formatado
    if (daysDiff === 0) {
      return '0 dia';
    } else if (daysDiff === 1) {
      return '1 dia';
    } else {
      return `${daysDiff} dias`;
    }
  }

  getSLAClass(sla: string): string {
    if (sla === '-') return '';

    // Extrair número de dias
    const days = parseInt(sla.split(' ')[0]);

    // Retornar classe baseada na quantidade de dias
    // 0-3 dias: success (verde)
    // 4+ dias: warning (amarelo/laranja)
    if (days <= 3) {
      return 'sla-success';
    } else {
      return 'sla-warning';
    }
  }

  private formatDate(dateString: string | null | undefined): string {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  }

  private formatCurrency(value: number | null | undefined, currency: 'BRL' | 'USD' = 'BRL'): string {
    if (typeof value !== 'number' || value === null || value === undefined) {
      return currency === 'USD' ? '$ 0.00' : 'R$ 0,00';
    }
    if (currency === 'USD') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
      }).format(value);
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    }).format(value);
  }

  private getProposalCurrency(proposal: any): 'BRL' | 'USD' {
    return proposal?.client?.origin === 'international' ? 'USD' : 'BRL';
  }

  private getClientName(proposal: any): string {
    if (!proposal) return 'Cliente não informado';

    const client = proposal.client;

    if (!client) {
        return proposal.client_name || 'Cliente não informado';
    }

    if (client.type === 'PJ' && client.company) {
        return client.company.trade_name || client.company.company_name || proposal.client_name || '';
    }

    if (client.type === 'PF' && client.person) {
        return client.person.full_name || proposal.client_name || '';
    }

    return proposal.client_name || client.name || 'Cliente não informado';
  }

  private getClientEmail(proposal: any): string {
    if (!proposal) return '';
    return proposal.client?.company?.email || proposal.client?.person?.email || proposal.client_email || '';
  }

  private getClientPhone(proposal: any): string {
    if (!proposal) return '';
    return proposal.client?.company?.phone || proposal.client?.person?.phone || proposal.client_phone || '';
  }

  private addSectionHeader(doc: any, title: string, y: number, margin: number, pageWidth: number): void {
    doc.setFillColor(240, 242, 245);
    doc.rect(margin, y - 3, pageWidth - (margin * 2), 12, 'F');
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 59, 43);
    doc.text(title, margin + 5, y + 5);
    doc.setTextColor(0, 0, 0);
  }

  private addInfoRow(doc: any, label: string, value: string, y: number, margin: number): void {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(label, margin, y);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(64, 64, 64);
    doc.text(value, margin + 40, y);
    doc.setTextColor(0, 0, 0);
  }

  convertToContract(proposal: ProposalDisplay, event: MouseEvent) {
    event.stopPropagation();
    this.selectedProposalForConversion = proposal.raw;
    this.showConvertModal = true;
  }

  openSendProposalModal(proposal: ProposalDisplay, event: MouseEvent) {
    event.stopPropagation();
    
    // Verificar se a proposta pode ser preparada para envio
    if (!this.proposalService.canPrepareForSending(proposal.raw)) {
      this.modalService.showError('Esta proposta não pode ser preparada para envio no momento.');
      return;
    }

    this.selectedProposalForSending = proposal.raw;
    this.showSendModal = true;
  }

  onSendModalClose() {
    this.showSendModal = false;
    this.selectedProposalForSending = null;
  }

  onProposalSent(proposal: Proposal) {
    this.modalService.showSuccess('Proposta enviada com sucesso!');
    this.showSendModal = false;
    this.selectedProposalForSending = null;
    this.loadData(); // Recarregar a lista de propostas
  }

  async generatePublicLink(proposal: ProposalDisplay, event: MouseEvent) {
    event.stopPropagation();
    
    try {
      const response = await firstValueFrom(
        this.proposalService.prepareProposalForSending(proposal.id)
      );
      
      if (response && response.success) {
        const publicUrl = this.proposalService.getPublicProposalUrl(response.data);
        
        if (publicUrl) {
          // Copiar automaticamente para a área de transferência
          const copySuccess = await this.copyLinkToClipboard(publicUrl);
          
          if (copySuccess) {
            // Se copiou com sucesso, atualizar o status da proposta
            const statusUpdateSuccess = await this.updateProposalStatusToSent(proposal.id);
            
            if (statusUpdateSuccess) {
              this.modalService.showSuccess(`Link público gerado e copiado para a área de transferência!\n\n${publicUrl}`);
            } else {
              this.modalService.showWarning(`Link público gerado e copiado para a área de transferência!\n\n${publicUrl}\n\nAviso: O status da proposta pode não ter sido atualizado automaticamente.`);
            }
            
            // Recarregar a lista para mostrar o novo status
            this.loadData();
          } else {
            this.modalService.showError('Link gerado, mas não foi possível copiá-lo para a área de transferência.');
          }
        } else {
          this.modalService.showError('Erro ao gerar link público.');
        }
      } else {
        this.modalService.showError(response?.message || 'Erro ao gerar link público.');
      }
    } catch (error: any) {
      console.error('❌ Error generating public link:', error);
      this.modalService.showError('Não foi possível gerar o link público.');
    }
  }

  /**
   * Função auxiliar para copiar link para a área de transferência
   */
  private async copyLinkToClipboard(url: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch (error) {
      // Fallback para navegadores antigos
      try {
        const textArea = document.createElement('textarea');
        textArea.value = url;
        document.body.appendChild(textArea);
        textArea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textArea);
        return success;
      } catch (fallbackError) {
        console.error('❌ Erro ao copiar link:', error, fallbackError);
        return false;
      }
    }
  }

  /**
   * Função auxiliar para atualizar o status da proposta para "Enviada"
   */
  private async updateProposalStatusToSent(proposalId: number): Promise<boolean> {
    try {
      const statusResponse = await firstValueFrom(
        this.proposalService.updateProposalStatus(proposalId, 'sent')
      );
      
      if (statusResponse && statusResponse.success) {
        return true;
      } else {
        console.error('⚠️ Aviso: Não foi possível atualizar o status da proposta:', statusResponse?.message);
        return false;
      }
    } catch (statusError: any) {
      console.error('⚠️ Erro ao atualizar status da proposta:', statusError);
      return false;
    }
  }

  async copyPublicLink(proposal: ProposalDisplay, event: MouseEvent) {
    event.stopPropagation();
    
    const publicUrl = this.proposalService.getPublicProposalUrl(proposal.raw);
    if (!publicUrl) {
      this.modalService.showError('Esta proposta não possui um link público.');
      return;
    }

    try {
      await navigator.clipboard.writeText(publicUrl);
      this.modalService.showSuccess('Link copiado para a área de transferência!');
    } catch (error) {
      // Fallback para navegadores antigos
      const textArea = document.createElement('textarea');
      textArea.value = publicUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      this.modalService.showSuccess('Link copiado para a área de transferência!');
    }
  }

  // Métodos para controlar dropdown
  toggleDropdown(proposalId: number, event: MouseEvent) {
    event.stopPropagation();
    if (this.activeDropdownId === proposalId) {
      this.activeDropdownId = null;
    } else {
      this.activeDropdownId = proposalId;
      
      // Calcular posição para position: fixed
      setTimeout(() => {
        const target = event.target as HTMLElement;
        const button = target.closest('.dropdown-btn') as HTMLElement;
        const buttonRect = button.getBoundingClientRect();
        const dropdown = document.querySelector('.dropdown-menu') as HTMLElement;
        
        if (dropdown) {
          dropdown.style.top = `${buttonRect.bottom + 4}px`;
          dropdown.style.left = `${buttonRect.right - dropdown.offsetWidth}px`;
        }
      }, 0);
    }
  }

  closeDropdown() {
    this.activeDropdownId = null;
  }

  // New methods for modal conversion
  onConversionCompleted(result: any) {
    this.showConvertModal = false;
    this.selectedProposalForConversion = null;
    
    // Reload the data to show updated status
    this.loadData();
    
    // Ask if user wants to navigate to the created contract
    if (result.contractId) {
      const goToContract = confirm('Deseja visualizar o contrato criado?');
      if (goToContract) {
        this.router.navigate(['/home/contratos/visualizar', result.contractId]);
      }
    }
  }

  closeConvertModal() {
    this.showConvertModal = false;
    this.selectedProposalForConversion = null;
  }

  /**
   * Atualizar status da proposta diretamente da tabela
   */
  async updateProposalStatus(proposal: ProposalDisplay, event: Event) {
    event.stopPropagation();

    const newStatus = proposal.status as 'draft' | 'sent' | 'signed' | 'rejected' | 'expired' | 'converted' | 'contraproposta' | 'standby' | 'sem_retorno' | 'em_negociacao';
    const previousStatus = proposal.raw.status;

    // Se o status não mudou, não faz nada
    if (newStatus === previousStatus) {
      return;
    }

    try {
      const response = await firstValueFrom(
        this.proposalService.updateProposalStatus(proposal.id, newStatus)
      );

      if (response && response.success) {
        // Atualizar o status no objeto raw também
        proposal.raw.status = newStatus;
        proposal.statusText = this.proposalService.getStatusText(newStatus);

        this.modalService.showSuccess('Status da proposta atualizado com sucesso!');
      } else {
        // Se falhou, reverter o status no select
        proposal.status = previousStatus;
        this.modalService.showError(response?.message || 'Erro ao atualizar o status da proposta.');
      }
    } catch (error: any) {
      console.error('❌ Error updating proposal status:', error);

      // Reverter o status no select
      proposal.status = previousStatus;

      if (error?.status === 404) {
        this.modalService.showError('Proposta não encontrada.');
      } else if (error?.status === 403) {
        this.modalService.showError('Você não tem permissão para alterar o status desta proposta.');
      } else {
        this.modalService.showError('Não foi possível atualizar o status da proposta.');
      }
    }
  }

  /**
   * Abrir modal para editar natureza do status
   */
  openStatusNatureModal(proposal: ProposalDisplay, event: MouseEvent) {
    event.stopPropagation();
    this.selectedProposalForStatusNature = proposal;
    this.statusNatureText = proposal.raw.status_natureza || '';
    this.showStatusNatureModal = true;
  }

  /**
   * Fechar modal de natureza do status
   */
  closeStatusNatureModal() {
    this.showStatusNatureModal = false;
    this.selectedProposalForStatusNature = null;
    this.statusNatureText = '';
    this.isSavingStatusNature = false;
  }

  /**
   * Salvar natureza do status
   */
  async saveStatusNature() {
    if (!this.selectedProposalForStatusNature) return;

    this.isSavingStatusNature = true;

    try {
      const response = await firstValueFrom(
        this.proposalService.updateProposal(this.selectedProposalForStatusNature.id, {
          status_natureza: this.statusNatureText
        } as any)
      );

      if (response && response.success) {
        // Atualizar o objeto local
        this.selectedProposalForStatusNature.raw.status_natureza = this.statusNatureText;

        this.modalService.showSuccess('Natureza do status salva com sucesso!');
        this.closeStatusNatureModal();
      } else {
        this.modalService.showError(response?.message || 'Erro ao salvar a natureza do status.');
      }
    } catch (error: any) {
      console.error('❌ Error saving status nature:', error);
      this.modalService.showError('Não foi possível salvar a natureza do status.');
    } finally {
      this.isSavingStatusNature = false;
    }
  }

}