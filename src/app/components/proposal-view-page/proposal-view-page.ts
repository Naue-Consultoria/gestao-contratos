import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';
import { ProposalService, Proposal } from '../../services/proposal';
import { ModalService } from '../../services/modal.service';

@Component({
  selector: 'app-proposal-view-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './proposal-view-page.html',
  styleUrls: ['./proposal-view-page.css']
})
export class ProposalViewPageComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private proposalService = inject(ProposalService);
  private modalService = inject(ModalService);
  private subscriptions = new Subscription();

  proposal: Proposal | null = null;
  proposalId: number = 0;
  isLoading = true;
  error = '';
  isEditMode = false;

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
    this.router.navigate(['/home/proposals/edit', this.proposalId]);
  }

  backToProposals() {
    this.router.navigate(['/home/proposals']);
  }

  async duplicateProposal() {
    if (!this.proposal) return;

    if (confirm(`Deseja duplicar a proposta "${this.proposal.proposal_number}"?`)) {
      try {
        const response = await firstValueFrom(this.proposalService.duplicateProposal(this.proposalId));
        if (response && response.success) {
          this.modalService.showSuccess('Proposta duplicada com sucesso!');
          this.router.navigate(['/home/proposals/edit', response.data.id]);
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

  async deleteProposal() {
    if (!this.proposal) return;

    if (confirm(`Deseja excluir a proposta "${this.proposal.proposal_number}"?\n\nEsta ação não pode ser desfeita.`)) {
      try {
        await firstValueFrom(this.proposalService.deleteProposal(this.proposalId));
        this.modalService.showSuccess('Proposta excluída com sucesso!');
        this.router.navigate(['/home/proposals']);
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
    if (!this.proposal) return;

    try {
      const blob = await firstValueFrom(this.proposalService.generateProposalPDF(this.proposalId));
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `proposta-${this.proposal.proposal_number.replace(/\s+/g, '-').toLowerCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('❌ Error generating PDF:', error);
      if (error?.status === 500 || error?.status === 404) {
        this.modalService.showError('Funcionalidade de gerar PDF ainda não implementada no backend.');
      } else {
        this.modalService.showError('Não foi possível gerar o PDF.');
      }
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

  formatCurrency(value: number | null | undefined): string {
    return this.proposalService.formatCurrency(value || 0);
  }

  formatDate(dateString: string | null | undefined): string {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  }

  getStatusText(status: string): string {
    return this.proposalService.getStatusText(status);
  }

  getStatusColor(status: string): string {
    return this.proposalService.getStatusColor(status);
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

  canSignProposal(): boolean {
    if (!this.proposal) return false;
    const isSent = this.proposal.status === 'sent';
    const isNotExpired = !this.isProposalExpired();
    return isSent && isNotExpired;
  }

  signProposal(): void {
    if (!this.proposal) return;
    // Lógica para assinatura - pode abrir um modal ou navegar para uma página de assinatura
    // Por enquanto, vamos apenas simular a ação
    this.modalService.showInfo(`Redirecionando para assinar a proposta ${this.proposal.proposal_number}...`);
    // this.router.navigate(['/sign-proposal', this.proposal.unique_link]);
  }
}
