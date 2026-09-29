import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';
import { ProposalService, Proposal } from '../../services/proposal';
import { ModalService } from '../../services/modal.service';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';
import { ProposalPdfService } from '../../services/proposal-pdf.service';

@Component({
  selector: 'app-proposal-view-page',
  standalone: true,
  imports: [CommonModule, BreadcrumbComponent],
  templateUrl: './proposal-view-page.html',
  styleUrls: ['./proposal-view-page.css']
})
export class ProposalViewPageComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private proposalService = inject(ProposalService);
  private modalService = inject(ModalService);
  private proposalPdfService = inject(ProposalPdfService);
  private subscriptions = new Subscription();

  proposal: Proposal | null = null;
  proposalId: number = 0;
  isLoading = true;
  error = '';
  isEditMode = false;
  activeTab = 'services';
  expandedServices: { [key: number]: boolean } = {};

  ngOnInit() {
    const id = this.route.snapshot.params['id'];
    if (!id) {
      this.error = 'ID da proposta não fornecido';
      this.isLoading = false;
      return;
    }

    this.proposalId = parseInt(id, 10);
    this.loadProposal();
    
    // Verificar se é modo de edição ou visualização
    this.isEditMode = this.route.snapshot.url.some(segment => segment.path === 'edit');
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  async loadProposal() {
    this.isLoading = true;
    this.error = '';
    
    try {
      const response = await firstValueFrom(this.proposalService.getProposal(this.proposalId));
      
      if (response && response.success) {
        this.proposal = response.data;
        console.log('🔍 Proposal data received:', this.proposal);
        console.log('🔍 Proposal status:', this.proposal?.status);
        console.log('🔍 Services array length:', this.proposal?.services?.length);
        console.log('🔍 Services data:', this.proposal?.services);

        if (this.proposal?.status === 'contraproposta') {
          console.log('📋 CONTRAPROPOSTA - Services with selection status:', this.proposal?.services?.map(s => ({
            id: s.id,
            name: s.service_name,
            selected_by_client: s.selected_by_client,
            client_notes: s.client_notes,
            selected_type: typeof s.selected_by_client
          })));
        }

        console.log('🔍 Client info direct fields:', {
          client_name: this.proposal?.client_name,
          client_email: this.proposal?.client_email,
          client_phone: this.proposal?.client_phone
        });
        console.log('🔍 Client nested object:', this.proposal?.client);
        console.log('🔍 All proposal keys:', Object.keys(this.proposal || {}));
      } else {
        this.error = 'Proposta não encontrada';
      }
    } catch (error: any) {
      console.error('❌ Error loading proposal:', error);
      
      if (error?.status === 404) {
        this.error = 'Proposta não encontrada';
      } else if (error?.status === 500) {
        this.error = 'Funcionalidade de propostas ainda não implementada no backend';
      } else {
        this.error = 'Erro ao carregar proposta';
      }
    } finally {
      this.isLoading = false;
    }
  }

  editProposal() {
    this.router.navigate(['/home/propostas/editar', this.proposalId]);
  }

  backToProposals() {
    this.router.navigate(['/home/propostas']);
  }


  async deleteProposal() {
    if (!this.proposal) return;

    if (confirm(`Deseja excluir a proposta "${this.proposal.proposal_number}"?\n\nEsta ação não pode ser desfeita.`)) {
      try {
        await firstValueFrom(this.proposalService.deleteProposal(this.proposalId));
        this.modalService.showSuccess('Proposta excluída com sucesso!');
        this.router.navigate(['/home/propostas']);
      } catch (error: any) {
        console.error('❌ Error deleting proposal:', error);
        if (error?.status === 500 || error?.status === 404) {
          this.modalService.showError('Funcionalidade de excluir propostas ainda não implementada no backend.');
        } else {
          this.modalService.showError('Não foi possível excluir a proposta.');
        }
      }
    }
  }

  async generatePDF() {
    if (!this.proposal) {
      this.modalService.showError('Nenhuma proposta carregada para gerar PDF.');
      return;
    }

    try {
      await this.proposalPdfService.generate(this.proposal, this.clientCurrency);
      this.modalService.showSuccess('PDF gerado com sucesso!');
    } catch (error: any) {
      console.error('❌ Error generating PDF:', error);
      this.modalService.showError('Erro ao gerar o PDF da proposta.');
    }
  }

  async copyPublicLink() {
    if (!this.proposal) return;

    const publicUrl = this.proposalService.getPublicProposalUrl(this.proposal);
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

  get clientCurrency(): 'BRL' | 'USD' {
    const client = (this.proposal as any)?.client;
    return client?.origin === 'international' ? 'USD' : 'BRL';
  }

  formatCurrency(value: number | null | undefined): string {
    return this.proposalService.formatCurrency(value || 0, this.clientCurrency);
  }

  formatDate(dateString: string | null | undefined): string {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  }

  stripHtmlTags(html: string | null | undefined): string {
    if (!html) return '';
    
    // Criar um elemento temporário para remover as tags HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Retornar apenas o texto sem as tags
    return tempDiv.textContent || tempDiv.innerText || '';
  }

  getStatusText(status: string): string {
    return this.proposalService.getStatusText(status);
  }

  getStatusColor(status: string): string {
    return this.proposalService.getStatusColor(status);
  }

  getProposalTypeText(type: string): string {
    const types: { [key: string]: string } = {
      'Full': 'Full',
      'Pontual': 'Pontual',
      'Individual': 'Individual',
      'Recrutamento & Seleção': 'Recrutamento & Seleção'
    };
    return types[type] || type;
  }

  canEditProposal(): boolean {
    return this.proposal ? this.proposalService.canEditProposal(this.proposal) : false;
  }

  canSendProposal(): boolean {
    return this.proposal ? this.proposalService.canSendProposal(this.proposal) : false;
  }

  isProposalExpired(): boolean {
    return this.proposal ? this.proposalService.isProposalExpired(this.proposal) : false;
  }

  hasPublicLink(): boolean {
    return !!(this.proposal && this.proposal.unique_link);
  }


  async generatePublicLink(): Promise<void> {
    if (!this.proposal) return;

    try {
      const response = await firstValueFrom(this.proposalService.generatePublicLink(this.proposalId));
      if (response && response.success) {
        this.modalService.showSuccess('Link público gerado com sucesso! A proposta foi enviada.');
        // Recarregar a proposta para mostrar o novo status e link
        await this.loadProposal();
      }
    } catch (error: any) {
      console.error('❌ Error generating public link:', error);
      if (error?.status === 500 || error?.status === 404) {
        this.modalService.showError('Funcionalidade de gerar link público ainda não implementada no backend.');
      } else {
        this.modalService.showError('Não foi possível gerar o link público.');
      }
    }
  }

  canGeneratePublicLink(): boolean {
    return this.proposal ? 
      (this.proposal.status === 'draft' && this.proposal.services.length > 0) : 
      false;
  }

  isTabActive(tabName: string): boolean {
    return this.activeTab === tabName;
  }

  setActiveTab(tabName: string): void {
    this.activeTab = tabName;
  }

  getClientName(): string {
    if (!this.proposal) return '';

    const client = (this.proposal as any).client;

    if (!client) {
        return this.proposal.client_name || '';
    }

    if (client.type === 'PJ' && client.company) {
        return client.company.trade_name || client.company.company_name || '';
    }

    if (client.type === 'PF' && client.person) {
        return client.person.full_name || '';
    }

    return this.proposal.client_name || client.name || '';
  }

  getClientEmail(): string {
    if (!this.proposal) return '';
    const client = (this.proposal as any).client;
    return client?.company?.email || client?.person?.email || this.proposal.client_email || '';
  }

  getClientPhone(): string {
    if (!this.proposal) return '';
    const client = (this.proposal as any).client;
    return client?.company?.phone || client?.person?.phone || this.proposal.client_phone || '';
  }

  // === PAYMENT INFORMATION METHODS ===
  
  hasPaymentInfo(): boolean {
    if (!this.proposal) return false;
    
    return !!(
      this.proposal.payment_type ||
      this.proposal.payment_method ||
      this.proposal.installments ||
      this.proposal.final_value ||
      (this.proposal.discount_applied && this.proposal.discount_applied > 0)
    );
  }

  getPaymentTypeText(paymentType: string): string {
    switch (paymentType) {
      case 'vista':
        return 'À Vista';
      case 'prazo':
        return 'Parcelado';
      default:
        return paymentType;
    }
  }

  getOriginalValue(): number {
    if (!this.proposal) return 0;
    
    // Se há desconto, o valor original é total_value + discount_applied
    // porque o total_value foi atualizado com o desconto
    if (this.hasDiscount()) {
      return this.proposal.total_value + (this.proposal.discount_applied || 0);
    }
    
    // Se não há desconto, o total_value é o valor original
    return this.proposal.total_value;
  }

  /**
   * Calcula o valor total considerando apenas serviços selecionados em contrapropostas
   * IMPORTANTE: Uma vez que o cliente selecionou serviços, o valor aceito deve ser usado
   * independente de mudanças posteriores no status da proposta
   */
  getCalculatedTotal(): number {
    if (!this.proposal) return 0;

    // Verificar se há serviços com seleção do cliente definida
    // Uma vez que o cliente selecionou/rejeitou serviços, sempre usar o valor aceito
    if (this.proposal.services) {
      // Verificar se há algum serviço com selected_by_client definido (true ou false)
      const hasClientSelection = this.proposal.services.some(s => s.selected_by_client !== null && s.selected_by_client !== undefined);

      if (hasClientSelection) {
        // Contar quantos serviços NÃO foram selecionados
        const unselectedCount = this.proposal.services.filter(s => s.selected_by_client === false).length;
        const totalServices = this.proposal.services.length;

        // Só é seleção parcial se:
        // 1. Houver pelo menos um serviço NÃO selecionado
        // 2. Mas NÃO todos os serviços são não selecionados (se todos forem false, é dados inconsistentes)
        const hasPartialSelection = unselectedCount > 0 && unselectedCount < totalServices;

        if (hasPartialSelection) {
          const selectedServices = this.proposal.services.filter(service => service.selected_by_client !== false);
          const selectedServicesTotal = selectedServices.reduce((sum, service) => sum + (service.total_value || 0), 0);

          return selectedServicesTotal;
        }
      }
    }

    // Para propostas sem seleção parcial, usar o total_value da proposta
    return this.proposal.total_value;
  }

  /**
   * Verifica se tem serviços com seleção parcial (alguns não selecionados)
   */
  isCounterProposalWithChanges(): boolean {
    if (!this.proposal) return false;

    return this.proposal.services?.some(s => s.selected_by_client === false) || false;
  }

  hasDiscount(): boolean {
    if (!this.proposal) return false;

    return !!(
      this.proposal.payment_type === 'vista' &&
      this.proposal.discount_applied &&
      this.proposal.discount_applied > 0
    );
  }

  toggleServiceDetails(serviceId: number) {
    this.expandedServices[serviceId] = !this.expandedServices[serviceId];
  }

  isServiceExpanded(serviceId: number): boolean {
    return this.expandedServices[serviceId] || false;
  }

  hasServiceDetails(service: any): boolean {
    return !!(service.service?.subtitle || service.service?.summary || service.service?.description);
  }

}
