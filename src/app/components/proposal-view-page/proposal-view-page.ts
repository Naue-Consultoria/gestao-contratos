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
      // Usar os dados completos da proposta que já temos carregados
      const fullProposal = this.proposal;

      // Gerar PDF usando jsPDF (mesmo formato da tabela)
      const doc = new jsPDF();

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      let currentY = 20;

      // Adicionar logo da NAUE
      const logoUrl = 'logoNaue.png';
      try {
        const logoImg = new Image();
        logoImg.src = logoUrl;
        await new Promise((resolve) => {
          logoImg.onload = resolve;
          logoImg.onerror = resolve;
        });

        if (logoImg.complete && logoImg.naturalWidth > 0) {
          const canvas = document.createElement('canvas');
          canvas.width = logoImg.naturalWidth;
          canvas.height = logoImg.naturalHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(logoImg, 0, 0);
            const logoDataUrl = canvas.toDataURL('image/png');
            const logoWidth = 40;
            const logoHeight = logoWidth * (logoImg.naturalHeight / logoImg.naturalWidth);
            doc.addImage(logoDataUrl, 'PNG', margin, currentY, logoWidth, logoHeight);
          }
        }
      } catch (error) {
        console.warn('Logo não carregado:', error);
      }

      // Título ao lado do logo
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('PROPOSTA COMERCIAL', margin + 45, currentY + 8);

      // Subtítulo com número da proposta
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Proposta Nº ${fullProposal.proposal_number}`, margin + 45, currentY + 20);

      // Data de geração
      doc.setFontSize(9);
      const dataGeracao = new Date().toLocaleDateString('pt-BR');
      doc.text(`Gerado em: ${dataGeracao}`, pageWidth - margin, currentY + 8, { align: 'right' });

      // Linha divisória
      currentY += 35;
      doc.setDrawColor(0, 59, 43);
      doc.setLineWidth(0.5);
      doc.line(margin, currentY, pageWidth - margin, currentY);

      currentY += 10;
      doc.setTextColor(0, 0, 0);

      // === DADOS DO CLIENTE ===
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Dados do Cliente', margin, currentY);
      currentY += 10;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');

      const clientName = this.getClientName();
      if (clientName) {
        doc.text(`Nome: ${clientName}`, margin, currentY);
        currentY += 6;
      }

      const clientEmail = this.getClientEmail();
      if (clientEmail) {
        doc.text(`Email: ${clientEmail}`, margin, currentY);
        currentY += 6;
      }

      const clientPhone = this.getClientPhone();
      if (clientPhone) {
        doc.text(`Telefone: ${clientPhone}`, margin, currentY);
        currentY += 6;
      }

      // Tipo da proposta
      if (fullProposal.type) {
        doc.text(`Tipo de Proposta: ${fullProposal.type}`, margin, currentY);
        currentY += 6;
      }

      // Status da proposta
      const statusMap: { [key: string]: string } = {
        'draft': 'Rascunho',
        'sent': 'Enviada',
        'signed': 'Fechada',
        'rejected': 'Rejeitada',
        'expired': 'Expirada',
        'converted': 'Assinada',
        'contraproposta': 'Assinada Parcialmente'
      };
      doc.text(`Status: ${statusMap[fullProposal.status] || fullProposal.status}`, margin, currentY);

      currentY += 15;

      // === SERVIÇOS ===
      if (fullProposal.services && fullProposal.services.length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Serviços Propostos', margin, currentY);
        currentY += 10;

        // Criar tabela de serviços
        const tableTop = currentY;
        const headerHeight = 18;

        // Cabeçalho da tabela
        doc.setFillColor(0, 59, 43);
        doc.rect(margin, tableTop, pageWidth - (margin * 2), headerHeight, 'F');

        const colNum = margin + 5;
        const colService = margin + 20;
        const colValue = pageWidth - margin - 5;

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');

        doc.text('#', colNum, tableTop + 12);
        doc.text('Serviço', colService, tableTop + 12);
        doc.text('Valor', colValue, tableTop + 12, { align: 'right' });

        currentY = tableTop + headerHeight + 5;

        doc.setTextColor(51, 51, 51);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);

        fullProposal.services.forEach((service: any, index: number) => {
          const maxServiceWidth = colValue - colService - 50;

          // Descritivo do serviço (sem tags HTML)
          const rawDescription = service.service_description || service.description ||
            (service.service && service.service.description) || '';
          const description = this.stripHtmlTags(rawDescription).trim();
          doc.setFontSize(8);
          const descLines: string[] = description ? doc.splitTextToSize(description, maxServiceWidth) : [];
          doc.setFontSize(9);

          const descLineHeight = 4;
          const rowHeight = descLines.length > 0 ? 12 + descLines.length * descLineHeight : 16;
          const pageHeight = doc.internal.pageSize.getHeight();

          if (currentY + rowHeight > pageHeight - 30 && currentY > 45) {
            doc.addPage();
            currentY = 20;

            doc.setFillColor(0, 59, 43);
            doc.rect(margin, currentY, pageWidth - (margin * 2), headerHeight, 'F');

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');

            doc.text('#', colNum, currentY + 12);
            doc.text('Serviço', colService, currentY + 12);
            doc.text('Valor', colValue, currentY + 12, { align: 'right' });

            currentY += headerHeight + 5;
            doc.setTextColor(51, 51, 51);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
          }

          if (index % 2 === 0 && currentY - 4 + rowHeight <= pageHeight - 30) {
            doc.setFillColor(245, 245, 245);
            doc.rect(margin, currentY - 4, pageWidth - (margin * 2), rowHeight, 'F');
          }

          // Se o serviço não foi selecionado, mostrar em cinza e riscado
          const isNotSelected = service.selected_by_client === false;
          if (isNotSelected) {
            doc.setTextColor(150, 150, 150);
            doc.setFont('helvetica', 'italic');
          } else {
            doc.setTextColor(51, 51, 51);
            doc.setFont('helvetica', 'normal');
          }
          doc.setFontSize(9);

          doc.text(String(index + 1), colNum, currentY);

          let serviceName = service.service_name || service.name || `Serviço ${index + 1}`;
          if (isNotSelected) {
            serviceName = '✗ ' + serviceName + ' (Não Selecionado)';
          }

          const serviceText = doc.splitTextToSize(serviceName, maxServiceWidth);
          doc.text(serviceText[0] || serviceName, colService, currentY);

          const value = service.total_value || service.value || service.unit_value || 0;
          doc.text(this.formatCurrency(value), colValue, currentY, { align: 'right' });

          // Linha riscada para serviços não selecionados
          if (isNotSelected) {
            const textWidth = doc.getTextWidth(serviceText[0] || serviceName);
            doc.setDrawColor(150, 150, 150);
            doc.setLineWidth(0.3);
            doc.line(colService, currentY - 2, colService + textWidth, currentY - 2);
          }

          // Descritivo abaixo do nome do serviço
          if (descLines.length > 0) {
            doc.setFontSize(8);
            doc.setTextColor(isNotSelected ? 170 : 105, isNotSelected ? 170 : 105, isNotSelected ? 170 : 105);

            let descY = currentY + 6;
            descLines.forEach((line: string) => {
              if (descY > pageHeight - 30) {
                doc.addPage();
                descY = 20;
              }
              doc.text(line, colService, descY);
              descY += descLineHeight;
            });

            currentY = descY + 4;
            doc.setFontSize(9);
            doc.setTextColor(51, 51, 51);
            doc.setFont('helvetica', 'normal');
          } else {
            currentY += rowHeight;
          }
        });

        // Linha de total
        currentY += 3;
        doc.setDrawColor(204, 204, 204);
        doc.setLineWidth(0.5);
        doc.line(margin, currentY, pageWidth - margin, currentY);
        currentY += 7;

        // Verificar se há seleção parcial
        const unselectedCount = fullProposal.services.filter((s: any) => s.selected_by_client === false).length;
        const totalServices = fullProposal.services.length;
        const hasPartialSelection = unselectedCount > 0 && unselectedCount < totalServices;

        if (hasPartialSelection) {
          // Mostrar valor original riscado
          doc.setTextColor(150, 150, 150);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.text('Valor Original da Proposta:', pageWidth - margin - 100, currentY);
          const originalValueText = this.formatCurrency(fullProposal.total_value || 0);
          doc.text(originalValueText, pageWidth - margin - 3, currentY, { align: 'right' });

          // Linha riscada no valor original
          const originalValueWidth = doc.getTextWidth(originalValueText);
          doc.setDrawColor(150, 150, 150);
          doc.setLineWidth(0.5);
          doc.line(pageWidth - margin - originalValueWidth - 3, currentY - 2, pageWidth - margin - 3, currentY - 2);

          currentY += 10;

          // Box do valor dos serviços selecionados
          const totalBoxWidth = 100;
          const totalBoxX = pageWidth - margin - totalBoxWidth;

          doc.setFillColor(0, 59, 43);
          doc.rect(totalBoxX, currentY - 3, totalBoxWidth, 16, 'F');

          doc.setTextColor(255, 255, 255);
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');

          doc.text('VALOR SELECIONADO:', totalBoxX + 3, currentY + 5);

          // Calcular valor dos serviços selecionados
          const selectedServices = fullProposal.services.filter((s: any) => s.selected_by_client !== false);
          const selectedTotal = selectedServices.reduce((sum: number, s: any) => sum + (s.total_value || 0), 0);
          const selectedValue = this.formatCurrency(selectedTotal);
          doc.text(selectedValue, pageWidth - margin - 3, currentY + 5, { align: 'right' });

          currentY += 25;
        } else {
          // Box do valor total normal
          const totalBoxWidth = 100;
          const totalBoxX = pageWidth - margin - totalBoxWidth;

          doc.setFillColor(0, 59, 43);
          doc.rect(totalBoxX, currentY - 3, totalBoxWidth, 16, 'F');

          doc.setTextColor(255, 255, 255);
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');

          doc.text('VALOR TOTAL:', totalBoxX + 3, currentY + 5);

          const totalValue = this.formatCurrency(fullProposal.total_value || 0);
          doc.text(totalValue, pageWidth - margin - 3, currentY + 5, { align: 'right' });

          currentY += 25;
        }
      }

      // === CONDIÇÕES DE PAGAMENTO ===
      doc.setTextColor(0, 0, 0);
      if (fullProposal.payment_method || (fullProposal.installments && fullProposal.installments > 1) || fullProposal.payment_type) {
        if (currentY > doc.internal.pageSize.getHeight() - 80) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Condições de Pagamento', margin, currentY);
        currentY += 10;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');

        if (fullProposal.payment_type) {
          const paymentTypeText = fullProposal.payment_type === 'vista' ? 'À Vista' : 'À Prazo';
          doc.text(`Tipo de Pagamento: ${paymentTypeText}`, margin, currentY);
          currentY += 6;
        }

        if (fullProposal.payment_method) {
          doc.text(`Forma de Pagamento: ${fullProposal.payment_method}`, margin, currentY);
          currentY += 6;
        }

        if (fullProposal.installments && fullProposal.installments > 1) {
          doc.text(`Número de Parcelas: ${fullProposal.installments}x`, margin, currentY);
          currentY += 6;

          if (fullProposal.final_value) {
            const valorParcela = fullProposal.final_value / fullProposal.installments;
            doc.text(`Valor por Parcela: ${this.formatCurrency(valorParcela)}`, margin, currentY);
            currentY += 6;
          }
        }

        if (fullProposal.discount_applied && fullProposal.discount_applied > 0) {
          doc.text(`Desconto Aplicado: ${this.formatCurrency(fullProposal.discount_applied)}`, margin, currentY);
          currentY += 6;
        }

        currentY += 10;
      }

      // === ASSINATURA DIGITAL ===
      // Mostrar assinatura se houver dados do signatário ou imagem da assinatura
      if (fullProposal.signer_name || fullProposal.signer_email || fullProposal.signature_data) {

        if (currentY > doc.internal.pageSize.getHeight() - 120) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 59, 43);
        doc.text('Assinatura Digital', margin, currentY);
        currentY += 10;
        doc.setTextColor(0, 0, 0);

        // Dados do Signatário
        if (fullProposal.signer_name || fullProposal.signer_email) {
          doc.setFillColor(248, 249, 250);
          doc.setDrawColor(220, 220, 220);

          let signerBoxHeight = 15;
          if (fullProposal.signer_name) signerBoxHeight += 6;
          if (fullProposal.signer_email) signerBoxHeight += 6;
          if (fullProposal.signer_phone) signerBoxHeight += 6;
          if (fullProposal.signer_document) signerBoxHeight += 6;
          if (fullProposal.signer_observations) {
            const obsLines = doc.splitTextToSize(fullProposal.signer_observations, pageWidth - margin * 2 - 10);
            signerBoxHeight += (obsLines.length * 5) + 8;
          }

          doc.roundedRect(margin, currentY, pageWidth - (margin * 2), signerBoxHeight, 3, 3, 'FD');
          currentY += 8;

          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(0, 59, 43);
          doc.text('Dados do Signatário', margin + 5, currentY);
          currentY += 8;

          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(0, 0, 0);

          if (fullProposal.signer_name) {
            doc.text(`Nome: ${fullProposal.signer_name}`, margin + 5, currentY);
            currentY += 6;
          }

          if (fullProposal.signer_email) {
            doc.text(`E-mail: ${fullProposal.signer_email}`, margin + 5, currentY);
            currentY += 6;
          }

          if (fullProposal.signer_phone) {
            doc.text(`Telefone: ${fullProposal.signer_phone}`, margin + 5, currentY);
            currentY += 6;
          }

          if (fullProposal.signer_document) {
            doc.text(`Documento: ${fullProposal.signer_document}`, margin + 5, currentY);
            currentY += 6;
          }

          if (fullProposal.signer_observations) {
            doc.setFont('helvetica', 'bold');
            doc.text('Observações:', margin + 5, currentY);
            currentY += 5;
            doc.setFont('helvetica', 'normal');
            const obsLines = doc.splitTextToSize(fullProposal.signer_observations, pageWidth - margin * 2 - 10);
            doc.text(obsLines, margin + 5, currentY);
            currentY += (obsLines.length * 5);
          }

          currentY += 10;
        }

        // Imagem da Assinatura
        if (fullProposal.signature_data) {
          doc.setFillColor(248, 249, 250);
          doc.setDrawColor(220, 220, 220);
          doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 50, 3, 3, 'FD');

          try {
            const imgWidth = 70;
            const imgHeight = 35;
            const imgX = (pageWidth - imgWidth) / 2;
            doc.addImage(fullProposal.signature_data, 'PNG', imgX, currentY + 7.5, imgWidth, imgHeight);
            currentY += 50;
          } catch (error) {
            console.warn('Erro ao adicionar assinatura ao PDF:', error);
            doc.setTextColor(0, 59, 43);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text('✓ Assinatura Digital Válida', margin + 5, currentY + 25);
            currentY += 50;
          }

          currentY += 5;
        }

        // Data de Assinatura
        if (fullProposal.signed_at) {
          doc.setTextColor(0, 59, 43);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'italic');
          const signedDate = new Date(fullProposal.signed_at).toLocaleDateString('pt-BR');
          const dateText = `Assinado em ${signedDate}`;
          const dateWidth = doc.getTextWidth(dateText);
          const dateX = (pageWidth - dateWidth) / 2;
          doc.text(dateText, dateX, currentY);
          currentY += 10;
        }
      }

      // Salvar o PDF
      const fileName = `proposta-${fullProposal.proposal_number.replace(/\s+/g, '-').toLowerCase()}.pdf`;
      doc.save(fileName);

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
