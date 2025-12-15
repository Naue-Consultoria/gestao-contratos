import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class VagaExportService {
  private jsPDF: any = null;

  // Labels para exibição
  private tipoCargoLabels: Record<string, string> = {
    'administrativo': 'Administrativo',
    'comercial': 'Comercial',
    'estagio': 'Estágio',
    'gestao': 'Gestão',
    'operacional': 'Operacional',
    'jovem_aprendiz': 'Jovem Aprendiz'
  };

  private tipoAberturaLabels: Record<string, string> = {
    'nova': 'Nova Vaga',
    'reposicao': 'Reposição'
  };

  private statusLabels: Record<string, string> = {
    'aberta': 'Aberta',
    'divulgacao_prospec': 'Divulgação/Prospecção',
    'entrevista_nc': 'Entrevista NC',
    'entrevista_empresa': 'Entrevista Empresa',
    'testes': 'Testes',
    'fechada': 'Fechada',
    'fechada_rep': 'Fechada/Reposição',
    'cancelada_cliente': 'Cancelada pelo Cliente',
    'standby': 'Standby',
    'nao_cobrada': 'Não Cobrada',
    'encerramento_cont': 'Encerramento de Contrato'
  };

  private fonteRecrutamentoLabels: Record<string, string> = {
    'catho': 'Catho',
    'email': 'E-mail',
    'indicacao': 'Indicação',
    'linkedin': 'LinkedIn',
    'whatsapp': 'WhatsApp',
    'trafego': 'Tráfego',
    'outros': 'Outros'
  };

  private statusCandidatoLabels: Record<string, string> = {
    'pendente': 'Pendente',
    'aprovado': 'Aprovado',
    'reprovado': 'Reprovado'
  };

  private statusEntrevistaLabels: Record<string, string> = {
    'agendada': 'Agendada',
    'realizada': 'Realizada',
    'cancelada': 'Cancelada',
    'nao_compareceu': 'Não Compareceu',
    'remarcada': 'Remarcada'
  };

  constructor() {}

  private async loadJsPDF(): Promise<void> {
    if (!this.jsPDF) {
      const jsPDFModule = await import('jspdf');
      this.jsPDF = jsPDFModule.default;
    }
  }

  private formatCurrency(value: number | undefined | null): string {
    if (value === undefined || value === null) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }

  private formatDate(dateString: string | Date | undefined | null): string {
    if (!dateString) return '-';
    const date = typeof dateString === 'string' ? dateString : dateString.toISOString();
    const dateOnly = date.split('T')[0];
    const [year, month, day] = dateOnly.split('-');
    return `${day}/${month}/${year}`;
  }

  private sanitizeFileName(name: string): string {
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '_')
      .toLowerCase();
  }

  private async loadLogoAsBase64(): Promise<string | null> {
    try {
      const response = await fetch('logoNaueNeg.png');
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }

  async exportToPdf(vaga: any, candidatos: any[] = []): Promise<void> {
    await this.loadJsPDF();

    const doc = new this.jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);
    let y = 0;

    // Cores do tema NAUE
    const primaryColor: [number, number, number] = [0, 59, 43]; // #003b2b
    const textColor: [number, number, number] = [51, 51, 51]; // #333333
    const lightGray: [number, number, number] = [248, 249, 250]; // #f8f9fa
    const mediumGray: [number, number, number] = [233, 236, 239]; // #e9ecef
    const successColor: [number, number, number] = [25, 135, 84]; // #198754
    const accentColor: [number, number, number] = [0, 90, 65]; // verde mais claro

    // Função para adicionar nova página se necessário
    const checkNewPage = (neededHeight: number): boolean => {
      if (y + neededHeight > pageHeight - 25) {
        doc.addPage();
        y = margin;
        return true;
      }
      return false;
    };

    // ==================== HEADER COM FUNDO VERDE ====================
    const headerHeight = 35;
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, pageWidth, headerHeight, 'F');

    // Tentar carregar o logo
    const logoBase64 = await this.loadLogoAsBase64();
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, 'PNG', margin, 5, 25, 25);
      } catch {
        // Se falhar, usa texto
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('NAUE', margin + 5, 20);
      }
    } else {
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('NAUE', margin + 5, 20);
    }

    // Título e código no header
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório de Vaga', margin + 45, 15);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`${vaga.codigo || 'N/A'} | ${vaga.cargo || 'Cargo não informado'}`, margin + 45, 23);

    // Data de geração no canto direito
    doc.setFontSize(9);
    doc.text(new Date().toLocaleDateString('pt-BR'), pageWidth - margin, 15, { align: 'right' });

    y = headerHeight + 10;

    // ==================== SEÇÃO: INFORMAÇÕES PRINCIPAIS ====================
    // Card do cliente e cargo
    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.roundedRect(margin, y, contentWidth, 28, 3, 3, 'F');

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(vaga.cargo || 'Cargo não informado', margin + 5, y + 10);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text(vaga.clienteNome || 'Cliente não informado', margin + 5, y + 18);

    // Badge de status
    const statusText = this.statusLabels[vaga.status] || vaga.status || 'N/A';
    const statusWidth = doc.getTextWidth(statusText) + 10;
    const isVagaFechada = vaga.status === 'fechada' || vaga.status === 'fechada_rep';

    if (isVagaFechada) {
      doc.setFillColor(successColor[0], successColor[1], successColor[2]);
    } else if (vaga.status === 'aberta') {
      doc.setFillColor(13, 110, 253); // azul
    } else if (vaga.status === 'cancelada_cliente') {
      doc.setFillColor(220, 53, 69); // vermelho
    } else {
      doc.setFillColor(108, 117, 125); // cinza
    }

    doc.roundedRect(pageWidth - margin - statusWidth - 3, y + 4, statusWidth, 8, 2, 2, 'F');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text(statusText, pageWidth - margin - statusWidth / 2 - 3, y + 9.5, { align: 'center' });

    y += 35;

    // ==================== GRID DE INFORMAÇÕES ====================
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('Detalhes da Vaga', margin, y);
    y += 7;

    // Linha decorativa
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setLineWidth(0.8);
    doc.line(margin, y, margin + 35, y);
    y += 6;

    // Grid 3x3 de informações
    const colWidth = contentWidth / 3;
    const rowHeight = 18;

    const infoGrid = [
      [
        { label: 'Consultora', value: vaga.usuarioNome || 'N/A' },
        { label: 'Tipo de Cargo', value: this.tipoCargoLabels[vaga.tipoCargo] || vaga.tipoCargo || 'N/A' },
        { label: 'Tipo de Abertura', value: this.tipoAberturaLabels[vaga.tipoAbertura] || vaga.tipoAbertura || 'N/A' }
      ],
      [
        { label: 'Salário', value: this.formatCurrency(vaga.salario) },
        { label: 'Data de Abertura', value: this.formatDate(vaga.dataAbertura) },
        { label: 'Data de Fechamento', value: this.formatDate(vaga.dataFechamentoCancelamento) }
      ],
      [
        { label: 'Fonte de Recrutamento', value: this.fonteRecrutamentoLabels[vaga.fonteRecrutamento] || vaga.fonteRecrutamento || 'N/A' },
        { label: '% Faturamento', value: `${vaga.porcentagemFaturamento || 100}%` },
        { label: 'Valor Faturamento', value: this.formatCurrency(vaga.valorFaturamento), highlight: true }
      ]
    ];

    infoGrid.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        const cellX = margin + (colIndex * colWidth);
        const cellY = y + (rowIndex * rowHeight);

        // Label
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(120, 120, 120);
        doc.text(cell.label, cellX, cellY);

        // Valor
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        if (cell.highlight) {
          doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        } else {
          doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        }
        doc.text(cell.value, cellX, cellY + 5);
      });
    });

    y += (infoGrid.length * rowHeight) + 5;

    // Informações adicionais (pretensão salarial, sigilosa)
    if (vaga.pretensaoSalarial || vaga.sigilosa) {
      const extraInfo: string[] = [];
      if (vaga.pretensaoSalarial) {
        extraInfo.push(`Pretensão Salarial: ${this.formatCurrency(vaga.pretensaoSalarial)}`);
      }
      if (vaga.sigilosa) {
        extraInfo.push('🔒 Vaga Sigilosa');
      }

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(extraInfo.join('  |  '), margin, y);
      y += 8;
    }

    // ==================== CANDIDATO APROVADO (se houver) ====================
    if (vaga.candidatoAprovado) {
      y += 3;
      doc.setFillColor(212, 237, 218); // verde claro
      doc.setDrawColor(successColor[0], successColor[1], successColor[2]);
      doc.setLineWidth(0.5);
      doc.roundedRect(margin, y, contentWidth, 14, 3, 3, 'FD');

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(successColor[0], successColor[1], successColor[2]);
      doc.text(`✓ Candidato Aprovado: ${vaga.candidatoAprovado}`, margin + 5, y + 9);

      if (vaga.emailCandidato) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(vaga.emailCandidato, pageWidth - margin - 5, y + 9, { align: 'right' });
      }

      y += 20;
    }

    y += 5;

    // ==================== SEÇÃO: CANDIDATOS ====================
    checkNewPage(40);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('Candidatos', margin, y);

    // Badge com total
    const totalText = `${candidatos.length}`;
    doc.setFillColor(mediumGray[0], mediumGray[1], mediumGray[2]);
    doc.roundedRect(margin + 28, y - 4, 12, 6, 2, 2, 'F');
    doc.setFontSize(8);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text(totalText, margin + 34, y - 0.5, { align: 'center' });

    y += 4;

    // Linha decorativa
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setLineWidth(0.8);
    doc.line(margin, y, margin + 25, y);
    y += 6;

    if (candidatos.length > 0) {
      // Cabeçalho da tabela
      const tableHeaderHeight = 10;
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.roundedRect(margin, y, contentWidth, tableHeaderHeight, 2, 2, 'F');

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);

      const cols = [
        { x: margin + 4, width: 55, label: 'Nome' },
        { x: margin + 59, width: 50, label: 'Email' },
        { x: margin + 109, width: 30, label: 'Telefone' },
        { x: margin + 139, width: 22, label: 'Status' },
        { x: margin + 161, width: 22, label: 'Inscrição' }
      ];

      cols.forEach(col => {
        doc.text(col.label, col.x, y + 6.5);
      });

      y += tableHeaderHeight + 1;

      // Linhas da tabela
      candidatos.forEach((vagaCandidato, index) => {
        const rowHeight = 10;

        // Verificar se precisa de nova página
        if (checkNewPage(rowHeight + 10)) {
          // Redesenhar cabeçalho na nova página
          doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
          doc.roundedRect(margin, y, contentWidth, tableHeaderHeight, 2, 2, 'F');
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(255, 255, 255);
          cols.forEach(col => {
            doc.text(col.label, col.x, y + 6.5);
          });
          y += tableHeaderHeight + 1;
        }

        // Fundo alternado
        if (index % 2 === 0) {
          doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
          doc.rect(margin, y, contentWidth, rowHeight, 'F');
        }

        const candidato = vagaCandidato.candidato || vagaCandidato;

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);

        // Nome (destacado se aprovado)
        if (candidato.status === 'aprovado') {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(successColor[0], successColor[1], successColor[2]);
        }
        doc.text((candidato.nome || 'N/A').substring(0, 30), cols[0].x, y + 6.5);

        // Reset estilo
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);

        doc.text((candidato.email || '-').substring(0, 28), cols[1].x, y + 6.5);
        doc.text((candidato.telefone || '-').substring(0, 15), cols[2].x, y + 6.5);

        // Status com cor
        const statusCand = this.statusCandidatoLabels[candidato.status] || candidato.status || 'Pendente';
        if (candidato.status === 'aprovado') {
          doc.setTextColor(successColor[0], successColor[1], successColor[2]);
        } else if (candidato.status === 'reprovado') {
          doc.setTextColor(220, 53, 69);
        }
        doc.text(statusCand, cols[3].x, y + 6.5);

        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        doc.text(this.formatDate(vagaCandidato.data_inscricao), cols[4].x, y + 6.5);

        y += rowHeight;

        // Mostrar entrevista se houver
        if (vagaCandidato.entrevistas && vagaCandidato.entrevistas.length > 0) {
          const ultimaEntrevista = vagaCandidato.entrevistas[vagaCandidato.entrevistas.length - 1];

          doc.setFillColor(255, 248, 230);
          doc.rect(margin + 8, y, contentWidth - 16, 8, 'F');

          doc.setFontSize(7);
          doc.setTextColor(130, 100, 50);
          const entrevistaInfo = `↳ Entrevista: ${this.formatDate(ultimaEntrevista.data_entrevista)} às ${(ultimaEntrevista.hora_entrevista || '').substring(0, 5)} — ${this.statusEntrevistaLabels[ultimaEntrevista.status] || ultimaEntrevista.status}`;
          doc.text(entrevistaInfo, margin + 12, y + 5.5);

          y += 9;
        }
      });
    } else {
      doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
      doc.roundedRect(margin, y, contentWidth, 15, 3, 3, 'F');

      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(120, 120, 120);
      doc.text('Nenhum candidato cadastrado para esta vaga.', margin + 5, y + 9.5);
      y += 20;
    }

    y += 8;

    // ==================== SEÇÃO: OBSERVAÇÕES ====================
    if (vaga.observacoes) {
      checkNewPage(35);

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('Observações', margin, y);
      y += 4;

      // Linha decorativa
      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(0.8);
      doc.line(margin, y, margin + 28, y);
      y += 6;

      // Caixa de observações
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);

      const observacoesLines = doc.splitTextToSize(vaga.observacoes, contentWidth - 14);
      const obsBoxHeight = Math.max((observacoesLines.length * 5) + 12, 20);

      checkNewPage(obsBoxHeight);

      doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
      doc.roundedRect(margin, y, contentWidth, obsBoxHeight, 3, 3, 'F');
      doc.text(observacoesLines, margin + 7, y + 8);
      y += obsBoxHeight + 5;
    }

    // ==================== RODAPÉ EM TODAS AS PÁGINAS ====================
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);

      // Linha separadora do rodapé
      doc.setDrawColor(mediumGray[0], mediumGray[1], mediumGray[2]);
      doc.setLineWidth(0.3);
      doc.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18);

      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Página ${i} de ${totalPages}`, pageWidth / 2, pageHeight - 12, { align: 'center' });

      doc.setFontSize(7);
      doc.text('NAUE Consultoria — Sistema de Gestão de Contratos', pageWidth / 2, pageHeight - 8, { align: 'center' });
    }

    // Gerar nome do arquivo
    const clienteName = this.sanitizeFileName(vaga.clienteNome || 'cliente');
    const cargo = this.sanitizeFileName(vaga.cargo || 'vaga');
    const fileName = `vaga_${vaga.codigo || 'sem_codigo'}_${clienteName}_${cargo}.pdf`;

    // Download do PDF
    doc.save(fileName);
  }
}
