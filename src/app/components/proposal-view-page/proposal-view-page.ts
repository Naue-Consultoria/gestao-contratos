import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';
import { ProposalService, Proposal } from '../../services/proposal';
import { ModalService } from '../../services/modal.service';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';
import { jsPDF } from 'jspdf';

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
  private subscriptions = new Subscription();

  proposal: Proposal | null = null;
  proposalId: number = 0;
  isLoading = true;
  error = '';
  isEditMode = false;
  activeTab = 'services';

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
      const doc = new jsPDF();
      
      // Configurações básicas
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 25;
      let currentY = margin;

      // === CABEÇALHO PRINCIPAL ===
      // Fundo verde para o cabeçalho
      doc.setFillColor(0, 59, 43);
      doc.rect(0, 0, pageWidth, 35, 'F');
      
      // Título principal em branco
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('PROPOSTA COMERCIAL', margin, 22);
      
      currentY = 50;
      doc.setTextColor(0, 0, 0); // Voltar para preto

      // === INFO BOX ===
      // Box de informações básicas
      doc.setFillColor(248, 249, 250);
      doc.setDrawColor(220, 220, 220);
      doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 25, 3, 3, 'FD');
      
      currentY += 8;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`Proposta: ${this.proposal.proposal_number}`, margin + 8, currentY);
      
      currentY += 7;
      doc.setFont('helvetica', 'normal');
      doc.text(`Data de geração: ${new Date().toLocaleDateString('pt-BR')}`, margin + 8, currentY);
      
      // Status da proposta
      if (this.proposal.status === 'signed') {
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

      const clientName = this.getClientName();
      if (clientName) {
        this.addInfoRow(doc, 'Cliente:', clientName, currentY, margin);
        currentY += 10;
      }

      const clientEmail = this.getClientEmail();
      if (clientEmail) {
        this.addInfoRow(doc, 'E-mail:', clientEmail, currentY, margin);
        currentY += 10;
      }

      const clientPhone = this.getClientPhone();
      if (clientPhone) {
        this.addInfoRow(doc, 'Telefone:', clientPhone, currentY, margin);
        currentY += 10;
      }

      // === SERVIÇOS ===
      if (this.proposal.services && this.proposal.services.length > 0) {
        currentY += 10;
        this.addSectionHeader(doc, 'SERVIÇOS PROPOSTOS', currentY, margin, pageWidth);
        currentY += 15;

        this.proposal.services.forEach((service, index) => {
          // Calcular altura necessária para este serviço
          const descriptionLines = service.service_description ? 
            doc.splitTextToSize(service.service_description, pageWidth - (margin * 2) - 10).length : 0;
          const serviceHeight = 35 + (descriptionLines * 4);

          // Verificar se precisa de nova página
          if (currentY + serviceHeight > pageHeight - 40) {
            doc.addPage();
            currentY = margin + 20;
          }

          // Box para cada serviço
          const boxHeight = Math.max(25, 15 + (descriptionLines * 4));
          doc.setFillColor(252, 253, 254);
          doc.setDrawColor(229, 231, 235);
          doc.roundedRect(margin, currentY, pageWidth - (margin * 2), boxHeight, 2, 2, 'FD');

          // Número e nome do serviço
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(0, 59, 43);
          doc.text(`${index + 1}. ${service.service_name}`, margin + 5, currentY + 8);
          
          let serviceY = currentY + 15;
          
          // Descrição do serviço
          if (service.service_description) {
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            const description = doc.splitTextToSize(service.service_description, pageWidth - (margin * 2) - 10);
            doc.text(description, margin + 5, serviceY);
            serviceY += description.length * 4;
          }
          
          // Valor do serviço
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
      
      // Box destacado para valor total
      doc.setFillColor(0, 59, 43);
      doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 20, 5, 5, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(`VALOR TOTAL: ${this.formatCurrency(this.proposal.total_value)}`, margin + 10, currentY + 13);

      // === ASSINATURA ===
      if (this.proposal.status === 'signed') {
        currentY += 20;

        // Verificar se precisa de nova página para a assinatura
        if (currentY > pageHeight - 120) {
          doc.addPage();
          currentY = margin + 20;
        }

        this.addSectionHeader(doc, 'ASSINATURA DIGITAL', currentY, margin, pageWidth);
        currentY += 15;

        // Box para a área da assinatura
        doc.setFillColor(248, 249, 250);
        doc.setDrawColor(220, 220, 220);
        doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 85, 3, 3, 'FD');

        if (this.proposal.signature_data) {
          try {
            // Imagem da assinatura centralizada
            const imgWidth = 80;
            const imgHeight = 40;
            const imgX = (pageWidth - imgWidth) / 2;
            doc.addImage(this.proposal.signature_data, 'PNG', imgX, currentY + 10, imgWidth, imgHeight);
            
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

        // Informações do signatário (apenas se existirem)
        if (this.proposal.signer_name || this.proposal.signed_at) {
          doc.setTextColor(0, 59, 43);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          
          // Primeira linha: Nome e Data
          let firstLineInfo = [];
          if (this.proposal.signer_name) firstLineInfo.push(`Assinado por: ${this.proposal.signer_name}`);
          if (this.proposal.signed_at) firstLineInfo.push(`Data: ${this.formatDate(this.proposal.signed_at)}`);
          
          if (firstLineInfo.length > 0) {
            const firstLineText = firstLineInfo.join(' | ');
            const firstLineWidth = doc.getTextWidth(firstLineText);
            const firstLineX = (pageWidth - firstLineWidth) / 2;
            doc.text(firstLineText, firstLineX, currentY + 15);
          }
          
          // Segunda linha: E-mail e Documento (se existirem)
          let secondLineInfo = [];
          if (this.proposal.signer_email) secondLineInfo.push(`E-mail: ${this.proposal.signer_email}`);
          if (this.proposal.signer_document) secondLineInfo.push(`Documento: ${this.proposal.signer_document}`);
          
          if (secondLineInfo.length > 0) {
            const secondLineText = secondLineInfo.join(' | ');
            const secondLineWidth = doc.getTextWidth(secondLineText);
            const secondLineX = (pageWidth - secondLineWidth) / 2;
            doc.text(secondLineText, secondLineX, currentY + 25);
          }
        }
        
        currentY += 30;
      }

      // === RODAPÉ ===
      currentY = pageHeight - 20;
      doc.setTextColor(128, 128, 128);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('NAUE Consultoria - Documento gerado automaticamente', margin, currentY);
      doc.text(`Página 1 de ${doc.getNumberOfPages()}`, pageWidth - margin - 20, currentY);
      
      // Salvar o PDF
      const fileName = `proposta-${this.proposal.proposal_number.replace(/\s+/g, '-').toLowerCase()}.pdf`;
      doc.save(fileName);
      
      this.modalService.showSuccess('PDF gerado com sucesso!');

    } catch (error: any) {
      console.error('❌ Error generating PDF:', error);
      this.modalService.showError('Erro ao gerar o PDF da proposta.');
    }
  }

  private addSectionHeader(doc: any, title: string, y: number, margin: number, pageWidth: number): void {
    // Fundo cinza claro para seção
    doc.setFillColor(240, 242, 245);
    doc.rect(margin, y - 3, pageWidth - (margin * 2), 12, 'F');
    
    // Título da seção
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 59, 43);
    doc.text(title, margin + 5, y + 5);
    
    doc.setTextColor(0, 0, 0); // Voltar para preto
  }

  private addInfoRow(doc: any, label: string, value: string, y: number, margin: number): void {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin + 5, y);
    
    doc.setFont('helvetica', 'normal');
    doc.text(value, margin + 35, y);
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

  hasDiscount(): boolean {
    if (!this.proposal) return false;
    
    return !!(
      this.proposal.payment_type === 'vista' && 
      this.proposal.discount_applied && 
      this.proposal.discount_applied > 0
    );
  }

}
