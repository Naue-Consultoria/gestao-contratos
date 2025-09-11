import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ModalService } from '../../services/modal.service';
import { ProposalService, Proposal, PrepareProposalData } from '../../services/proposal';
import { SendProposalModalComponent } from '../send-proposal-modal/send-proposal-modal';
import { DeleteConfirmationModalComponent } from '../delete-confirmation-modal/delete-confirmation-modal.component';
import { ProposalToContractModalComponent } from '../proposal-to-contract-modal/proposal-to-contract-modal';
import { Subscription, firstValueFrom } from 'rxjs';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';
import { ProposalStatsCardsComponent } from '../proposal-stats-cards/proposal-stats-cards';
import jsPDF from 'jspdf';

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
  raw: Proposal;
}

@Component({
  selector: 'app-proposals-page',
  standalone: true,
  imports: [CommonModule, SendProposalModalComponent, DeleteConfirmationModalComponent, BreadcrumbComponent, ProposalStatsCardsComponent, ProposalToContractModalComponent],
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

  // Convert to Contract Modal
  showConvertModal = false;
  selectedProposalForConversion: Proposal | null = null;

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

    // Calcular valor total baseado no status
    let totalValue = apiProposal.total_value || 0;
    if (apiProposal.status === 'contraproposta' && apiProposal.services) {
      // Para contrapropostas, calcular apenas o valor dos serviços selecionados
      totalValue = apiProposal.services
        .filter((service: any) => service.selected_by_client === true)
        .reduce((sum: number, service: any) => sum + (service.total_value || 0), 0);
    }

    return {
      id: apiProposal.id,
      proposalNumber: apiProposal.proposal_number,
      clientName: clientName,
      companyName: companyName,
      tradeName: tradeName,
      clientType: clientType,
      status: apiProposal.status,
      statusText: this.proposalService.getStatusText(apiProposal.status),
      totalValue: this.proposalService.formatCurrency(totalValue),
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
      // Buscar detalhes completos da proposta
      const proposalResponse = await firstValueFrom(this.proposalService.getProposal(proposal.id));
      
      if (!proposalResponse || !proposalResponse.success || !proposalResponse.data) {
        this.modalService.showError('Não foi possível carregar os dados da proposta.');
        return;
      }
      
      const fullProposal = proposalResponse.data;
      
      // Gerar PDF usando jsPDF
      const doc = new jsPDF();
      
      // Configurações básicas
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 25;
      let currentY = margin;

      // === CABEÇALHO PRINCIPAL ===
      doc.setFillColor(0, 59, 43);
      doc.rect(0, 0, pageWidth, 35, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('PROPOSTA COMERCIAL', margin, 22);
      
      currentY = 50;
      doc.setTextColor(0, 0, 0);

      // === INFO BOX ===
      doc.setFillColor(248, 249, 250);
      doc.setDrawColor(220, 220, 220);
      doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 25, 3, 3, 'FD');
      
      currentY += 8;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`Proposta: ${fullProposal.proposal_number}`, margin + 8, currentY);
      
      currentY += 7;
      doc.setFont('helvetica', 'normal');
      doc.text(`Data de geração: ${new Date().toLocaleDateString('pt-BR')}`, margin + 8, currentY);
      
      if (fullProposal.status === 'signed') {
        currentY += 7;
        doc.setTextColor(0, 59, 43);
        doc.setFont('helvetica', 'bold');
        doc.text('✓ STATUS: ASSINADA', margin + 8, currentY);
        doc.setTextColor(0, 0, 0);
      }

      currentY += 25;

      // === DADOS DO CLIENTE ===
      this.addSectionHeader(doc, 'DADOS DO CLIENTE', currentY, margin, pageWidth);
      currentY += 15;

      const clientName = this.getClientName(fullProposal);
      if (clientName) {
        this.addInfoRow(doc, 'Cliente:', clientName, currentY, margin);
        currentY += 10;
      }

      const clientEmail = this.getClientEmail(fullProposal);
      if (clientEmail) {
        this.addInfoRow(doc, 'E-mail:', clientEmail, currentY, margin);
        currentY += 10;
      }

      const clientPhone = this.getClientPhone(fullProposal);
      if (clientPhone) {
        this.addInfoRow(doc, 'Telefone:', clientPhone, currentY, margin);
        currentY += 10;
      }

      // === SERVIÇOS ===
      if (fullProposal.services && fullProposal.services.length > 0) {
        currentY += 10;
        this.addSectionHeader(doc, 'SERVIÇOS PROPOSTOS', currentY, margin, pageWidth);
        currentY += 15;

        fullProposal.services.forEach((service: any, index: number) => {
          const descriptionLines = service.service_description ? 
            doc.splitTextToSize(service.service_description, pageWidth - (margin * 2) - 10).length : 0;
          const serviceHeight = 35 + (descriptionLines * 4);

          if (currentY + serviceHeight > pageHeight - 40) {
            doc.addPage();
            currentY = margin + 20;
          }

          const boxHeight = Math.max(25, 15 + (descriptionLines * 4));
          doc.setFillColor(252, 253, 254);
          doc.setDrawColor(229, 231, 235);
          doc.roundedRect(margin, currentY, pageWidth - (margin * 2), boxHeight, 2, 2, 'FD');

          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(0, 59, 43);
          doc.text(`${index + 1}. ${service.service_name}`, margin + 5, currentY + 8);
          
          let serviceY = currentY + 15;
          
          if (service.service_description) {
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            const description = doc.splitTextToSize(service.service_description, pageWidth - (margin * 2) - 10);
            doc.text(description, margin + 5, serviceY);
            serviceY += description.length * 4;
          }
          
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(0, 59, 43);
          doc.setFontSize(10);
          doc.text(`Valor: ${this.formatCurrency(service.total_value)}`, margin + 5, serviceY + 5);
          
          currentY += boxHeight + 8;
          doc.setTextColor(0, 0, 0);
        });
      }

      // === VALOR TOTAL ===
      currentY += 10;
      
      doc.setFillColor(0, 59, 43);
      doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 20, 5, 5, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(`VALOR TOTAL: ${this.formatCurrency(fullProposal.total_value)}`, margin + 10, currentY + 13);

      // === ASSINATURA ===
      if (fullProposal.status === 'signed') {
        currentY += 20;

        if (currentY > pageHeight - 120) {
          doc.addPage();
          currentY = margin + 20;
        }

        this.addSectionHeader(doc, 'ASSINATURA DIGITAL', currentY, margin, pageWidth);
        currentY += 15;

        doc.setFillColor(248, 249, 250);
        doc.setDrawColor(220, 220, 220);
        doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 85, 3, 3, 'FD');

        if (fullProposal.signature_data) {
          try {
            const imgWidth = 80;
            const imgHeight = 40;
            const imgX = (pageWidth - imgWidth) / 2;
            doc.addImage(fullProposal.signature_data, 'PNG', imgX, currentY + 10, imgWidth, imgHeight);
            
            currentY += 55;
          } catch (error) {
            console.warn('Erro ao adicionar assinatura ao PDF:', error);
            doc.setTextColor(0, 59, 43);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('✓ Assinatura Digital Válida', margin + 10, currentY + 25);
            currentY += 40;
          }
        } else {
          currentY += 40;
        }

        if (fullProposal.signer_name || fullProposal.signed_at) {
          doc.setTextColor(0, 59, 43);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          
          // Primeira linha: Nome e Data
          let firstLineInfo = [];
          if (fullProposal.signer_name) firstLineInfo.push(`Assinado por: ${fullProposal.signer_name}`);
          if (fullProposal.signed_at) firstLineInfo.push(`Data: ${this.formatDate(fullProposal.signed_at)}`);
          
          if (firstLineInfo.length > 0) {
            const firstLineText = firstLineInfo.join(' | ');
            const firstLineWidth = doc.getTextWidth(firstLineText);
            const firstLineX = (pageWidth - firstLineWidth) / 2;
            doc.text(firstLineText, firstLineX, currentY + 15);
          }
          
          // Segunda linha: E-mail e Documento (se existirem)
          let secondLineInfo = [];
          if (fullProposal.signer_email) secondLineInfo.push(`E-mail: ${fullProposal.signer_email}`);
          if (fullProposal.signer_document) secondLineInfo.push(`Documento: ${fullProposal.signer_document}`);
          
          if (secondLineInfo.length > 0) {
            const secondLineText = secondLineInfo.join(' | ');
            const secondLineWidth = doc.getTextWidth(secondLineText);
            const secondLineX = (pageWidth - secondLineWidth) / 2;
            doc.text(secondLineText, secondLineX, currentY + 25);
          }
        }
      }

      // === RODAPÉ ===
      const finalY = pageHeight - 20;
      doc.setTextColor(128, 128, 128);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('NAUE Consultoria - Documento gerado automaticamente', margin, finalY);
      doc.text(`Página 1 de ${doc.getNumberOfPages()}`, pageWidth - margin - 20, finalY);
      
      // Salvar o PDF
      const fileName = `proposta-${fullProposal.proposal_number.replace(/\s+/g, '-').toLowerCase()}.pdf`;
      doc.save(fileName);
      
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
      'Recrutamento & Seleção': 'Recrutamento & Seleção'
    };
    return types[type] || type || 'Full';
  }

  getStatusColor(status: string): string {
    const statusColors: { [key: string]: string } = {
      'draft': '#6c757d',
      'sent': '#007bff',
      'signed': '#003b2b',
      'accepted': '#28a745',
      'rejected': '#dc3545',
      'expired': '#fd7e14',
      'contraproposta': '#dc3545'  // Vermelho para contraproposta
    };
    return statusColors[status] || '#6c757d';
  }

  private formatDate(dateString: string | null | undefined): string {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  }

  private formatCurrency(value: number | null | undefined): string {
    if (typeof value !== 'number' || value === null || value === undefined) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    }).format(value);
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

}