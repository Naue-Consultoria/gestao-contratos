import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ModalService } from '../../services/modal.service';
import { ProposalService, Proposal } from '../../services/proposal';
import { Subscription, firstValueFrom } from 'rxjs';

interface ProposalDisplay {
  id: number;
  title: string;
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
  imports: [CommonModule],
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

  ngOnInit() {
    this.loadData();
    window.addEventListener('refreshProposals', this.loadData.bind(this));
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
        this.proposals = (proposalsResponse.data || []).map((apiProposal: Proposal) => this.mapApiProposalToTableProposal(apiProposal));
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

  private mapApiProposalToTableProposal(apiProposal: Proposal): ProposalDisplay {
    return {
      id: apiProposal.id,
      title: apiProposal.title,
      companyName: apiProposal.company?.name || 'N/A',
      status: apiProposal.status,
      statusText: this.proposalService.getStatusText(apiProposal.status),
      totalValue: this.proposalService.formatCurrency(apiProposal.total_value || 0),
      validUntil: apiProposal.valid_until ? this.formatDate(apiProposal.valid_until) : 'Sem prazo',
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
    this.router.navigate(['/home/proposals/new']);
  }

  editProposal(id: number) {
    if (this.error && this.error.includes('ainda não está implementada no backend')) {
      this.modalService.showError('A funcionalidade de editar propostas ainda não está implementada no backend.');
      return;
    }
    this.router.navigate(['/home/proposals/edit', id]);
  }

  viewProposal(id: number) {
    if (this.error && this.error.includes('ainda não está implementada no backend')) {
      this.modalService.showError('A funcionalidade de visualizar propostas ainda não está implementada no backend.');
      return;
    }
    this.router.navigate(['/home/proposals/view', id]);
  }

  async duplicateProposal(proposal: ProposalDisplay, event: MouseEvent) {
    event.stopPropagation();
    
    if (confirm(`Deseja duplicar a proposta "${proposal.title}"?`)) {
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

  async deleteProposal(proposal: ProposalDisplay, event: MouseEvent) {
    event.stopPropagation();
    
    if (confirm(`Deseja excluir a proposta "${proposal.title}"?`)) {
      try {
        await firstValueFrom(this.proposalService.deleteProposal(proposal.id));
        this.modalService.showSuccess('Proposta excluída com sucesso!');
        this.loadData();
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

  async generatePDF(proposal: ProposalDisplay, event: MouseEvent) {
    event.stopPropagation();
    
    try {
      const blob = await firstValueFrom(this.proposalService.generateProposalPDF(proposal.id));
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `proposta-${proposal.title.replace(/\s+/g, '-').toLowerCase()}.pdf`;
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
    return new Date(dateString).toLocaleDateString('pt-BR');
  }
}