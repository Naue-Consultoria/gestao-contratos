import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ModalService } from '../../services/modal.service';
import { ProposalService, Proposal, PrepareProposalData } from '../../services/proposal';
import { SendProposalModalComponent } from '../send-proposal-modal/send-proposal-modal';
import { DeleteConfirmationModalComponent } from '../delete-confirmation-modal/delete-confirmation-modal.component';
import { Subscription, firstValueFrom } from 'rxjs';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';
import { ProposalStatsCardsComponent } from '../proposal-stats-cards/proposal-stats-cards';

interface ProposalDisplay {
  id: number;
  proposalNumber: string;
  clientName: string;
  companyName: string;
  status: string;
  statusText: string;
  totalValue: string;
  validUntil: string;
  createdAt: string;
  isExpired: boolean;
  raw: Proposal;
}

@Component({
  selector: 'app-proposals-page',
  standalone: true,
  imports: [CommonModule, SendProposalModalComponent, DeleteConfirmationModalComponent, BreadcrumbComponent, ProposalStatsCardsComponent],
  templateUrl: './proposals-page.html',
  styleUrls: ['./proposals-page.css']
})
export class ProposalsPageComponent implements OnInit, OnDestroy {
  private modalService = inject(ModalService);
  private proposalService = inject(ProposalService);
  private router = inject(Router);
  private subscriptions = new Subscription();

  proposals: ProposalDisplay[] = [];
  isLoading = true;
  error = '';
  
  // Send Proposal Modal
  showSendModal = false;
  selectedProposalForSending: Proposal | null = null;

  // Delete Confirmation Modal
  showDeleteModal = false;
  selectedProposalForDeletion: ProposalDisplay | null = null;
  isDeleting = false;

  // Dropdown control
  activeDropdownId: number | null = null;

  ngOnInit() {
    this.loadData();
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

  async loadData() {
    this.isLoading = true;
    this.error = '';
    try {
      const proposalsResponse = await firstValueFrom(this.proposalService.getProposals());
      
      if (proposalsResponse && proposalsResponse.success) {
        this.proposals = (proposalsResponse.data || []).map((apiProposal: any) => {
          return this.mapApiProposalToTableProposal(apiProposal);
        });
      } else {
        // Se não há dados ou falha na resposta, deixa array vazio
        this.proposals = [];
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
    } finally {
      this.isLoading = false;
    }
  }

  private mapApiProposalToTableProposal(apiProposal: any): ProposalDisplay {
    // Extrair nome do cliente baseado no tipo (PF ou PJ)
    let clientName = 'Cliente não identificado';
    if (apiProposal.client) {
      if (apiProposal.client.clients_pf) {
        clientName = apiProposal.client.clients_pf.full_name;
      } else if (apiProposal.client.clients_pj) {
        clientName = apiProposal.client.clients_pj.company_name;
      }
    }

    return {
      id: apiProposal.id,
      proposalNumber: apiProposal.proposal_number,
      clientName: clientName,
      companyName: clientName,
      status: apiProposal.status,
      statusText: this.proposalService.getStatusText(apiProposal.status),
      totalValue: this.proposalService.formatCurrency(apiProposal.total_value || 0),
      validUntil: apiProposal.end_date ? this.formatDate(apiProposal.end_date) : 'Sem prazo',
      createdAt: this.formatDate(apiProposal.created_at),
      isExpired: this.proposalService.isProposalExpired(apiProposal),
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

  async duplicateProposal(proposal: ProposalDisplay, event: MouseEvent) {
    event.stopPropagation();
    
    if (confirm(`Deseja duplicar a proposta de "${proposal.clientName}" (${proposal.proposalNumber})?`)) {
      try {
        const response = await firstValueFrom(this.proposalService.duplicateProposal(proposal.id));
        if (response && response.success) {
          this.modalService.showSuccess('Proposta duplicada com sucesso!');
          this.loadData();
        }
      } catch (error: any) {
        console.error('❌ Error duplicating proposal:', error);
        if (error?.status === 500 || error?.status === 404) {
          this.modalService.showError('Funcionalidade de duplicar propostas ainda não implementada no backend.');
        } else {
          this.modalService.showError('Não foi possível duplicar a proposta.');
        }
      }
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
      const blob = await firstValueFrom(this.proposalService.generateProposalPDF(proposal.id));
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `proposta-${proposal.proposalNumber.replace(/\s+/g, '-').toLowerCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('❌ Error generating PDF:', error);
      if (error?.status === 500 || error?.status === 404) {
        this.modalService.showError('Funcionalidade de gerar PDF de propostas ainda não implementada no backend.');
      } else {
        this.modalService.showError('Não foi possível gerar o PDF.');
      }
    }
  }

  getProposalTypeText(type: string): string {
    const types: { [key: string]: string } = {
      'Full': 'Full',
      'Pontual': 'Pontual',
      'Individual': 'Individual'
    };
    return types[type] || type || 'Full';
  }

  getStatusColor(status: string): string {
    const statusColors: { [key: string]: string } = {
      'draft': '#6c757d',
      'sent': '#007bff',
      'accepted': '#28a745',
      'rejected': '#dc3545',
      'expired': '#fd7e14'
    };
    return statusColors[status] || '#6c757d';
  }

  private formatDate(dateString: string | null | undefined): string {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
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
          try {
            await navigator.clipboard.writeText(publicUrl);
            this.modalService.showSuccess(`Link público gerado e copiado para a área de transferência!\n\n${publicUrl}`);
          } catch (error) {
            // Fallback para navegadores antigos
            const textArea = document.createElement('textarea');
            textArea.value = publicUrl;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.modalService.showSuccess(`Link público gerado e copiado!\n\n${publicUrl}`);
          }
          
          // Recarregar a lista para mostrar o novo status
          this.loadData();
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

}