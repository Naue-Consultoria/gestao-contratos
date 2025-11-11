import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MentoriaService } from '../../services/mentoria.service';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import jsPDF from 'jspdf';

interface Erro {
  description: string;
  position: 'negacao' | 'justificacao' | 'culpamos' | 'corrigimos' | '';
  status: 'concluido' | 'andamento' | 'sem-iniciativa' | '';
}

interface ErrosData {
  errosPessoais: Erro[];
  errosEquipe: Erro[];
}

@Component({
  selector: 'app-gestao-erros',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gestao-erros.html',
  styleUrls: ['./gestao-erros.css']
})
export class GestaoErrosComponent implements OnInit, OnDestroy {
  @Input() token: string = '';
  @Input() readOnly: boolean = false;

  // Abas
  activeTab: 'personal' | 'team' | 'summary' = 'personal';

  // Dados
  data: ErrosData = {
    errosPessoais: [
      { description: '', position: '', status: '' },
      { description: '', position: '', status: '' },
      { description: '', position: '', status: '' },
      { description: '', position: '', status: '' }
    ],
    errosEquipe: [
      { description: '', position: '', status: '' },
      { description: '', position: '', status: '' },
      { description: '', position: '', status: '' },
      { description: '', position: '', status: '' }
    ]
  };

  // Auto-save
  private saveSubject = new Subject<void>();
  private destroy$ = new Subject<void>();
  isLoading = false;
  isSaving = false;

  // Opções de seleção
  positionOptions = [
    { value: 'negacao', label: 'Negação' },
    { value: 'justificacao', label: 'Justificação' },
    { value: 'culpamos', label: 'Culpamos' },
    { value: 'corrigimos', label: 'Corrigimos' }
  ];

  statusOptions = [
    { value: 'concluido', label: 'Concluído' },
    { value: 'andamento', label: 'Em Andamento' },
    { value: 'sem-iniciativa', label: 'Sem Iniciativa' }
  ];

  constructor(private mentoriaService: MentoriaService) {}

  ngOnInit(): void {
    this.loadData();

    // Configurar auto-save com debounce de 2 segundos
    if (!this.readOnly) {
      this.saveSubject
        .pipe(
          debounceTime(2000),
          takeUntil(this.destroy$)
        )
        .subscribe(() => {
          this.saveData();
        });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData(): void {
    if (!this.token) return;

    this.isLoading = true;
    this.mentoriaService.obterErrosPublico(this.token).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.data.errosPessoais = response.data.erros_pessoais || this.data.errosPessoais;
          this.data.errosEquipe = response.data.erros_equipe || this.data.errosEquipe;
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erro ao carregar gestão de erros:', error);
        this.isLoading = false;
      }
    });
  }

  saveData(): void {
    if (!this.token || this.readOnly) return;

    this.mentoriaService.salvarErros(this.token, {
      errosPessoais: this.data.errosPessoais,
      errosEquipe: this.data.errosEquipe
    }).subscribe({
      next: (response) => {
        if (response.success) {
          console.log('✅ Gestão de erros salva');
        }
      },
      error: (error) => {
        console.error('❌ Erro ao salvar gestão de erros:', error);
      }
    });
  }

  triggerSave(): void {
    if (!this.readOnly) {
      this.saveSubject.next();
    }
  }

  saveManually(): void {
    if (this.readOnly || this.isSaving) return;

    this.isSaving = true;

    this.mentoriaService.salvarErros(this.token, {
      errosPessoais: this.data.errosPessoais,
      errosEquipe: this.data.errosEquipe
    }).subscribe({
      next: (response) => {
        if (response.success) {
          this.isSaving = false;
          console.log('✅ Gestão de erros salva manualmente');
        }
      },
      error: (error) => {
        console.error('❌ Erro ao salvar gestão de erros:', error);
        this.isSaving = false;
        alert('Erro ao salvar. Por favor, tente novamente.');
      }
    });
  }

  // ===== TAB NAVIGATION =====

  switchTab(tab: 'personal' | 'team' | 'summary'): void {
    if (tab === 'team' && !this.validatePersonalErrors()) {
      alert('Por favor, preencha todos os campos dos seus erros antes de continuar.');
      return;
    }

    if (tab === 'summary' && !this.validateTeamErrors()) {
      alert('Por favor, preencha todos os campos dos erros da equipe antes de continuar.');
      return;
    }

    this.activeTab = tab;
  }

  validatePersonalErrors(): boolean {
    return this.data.errosPessoais.every(erro =>
      erro.description.trim() !== '' &&
      erro.position !== '' &&
      erro.status !== ''
    );
  }

  validateTeamErrors(): boolean {
    return this.data.errosEquipe.every(erro =>
      erro.description.trim() !== '' &&
      erro.position !== '' &&
      erro.status !== ''
    );
  }

  // ===== STATISTICS =====

  getPositionStats(): { [key: string]: number } {
    const allErrors = [...this.data.errosPessoais, ...this.data.errosEquipe];
    const stats: { [key: string]: number } = {};

    allErrors.forEach(erro => {
      if (erro.position) {
        stats[erro.position] = (stats[erro.position] || 0) + 1;
      }
    });

    return stats;
  }

  getStatusStats(): { [key: string]: number } {
    const allErrors = [...this.data.errosPessoais, ...this.data.errosEquipe];
    const stats: { [key: string]: number } = {};

    allErrors.forEach(erro => {
      if (erro.status) {
        stats[erro.status] = (stats[erro.status] || 0) + 1;
      }
    });

    return stats;
  }

  getPositionLabel(position: string): string {
    const labels: { [key: string]: string } = {
      'negacao': 'Negação',
      'justificacao': 'Justificação',
      'culpamos': 'Culpamos',
      'corrigimos': 'Corrigimos'
    };
    return labels[position] || position;
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'concluido': 'Concluído',
      'andamento': 'Em Andamento',
      'sem-iniciativa': 'Sem Iniciativa'
    };
    return labels[status] || status;
  }

  getStatusClass(status: string): string {
    const classes: { [key: string]: string } = {
      'concluido': 'status-concluido',
      'andamento': 'status-andamento',
      'sem-iniciativa': 'status-sem-iniciativa'
    };
    return classes[status] || '';
  }

  getPercentage(value: number, total: number): number {
    return total > 0 ? Math.round((value / total) * 100) : 0;
  }

  // ===== EXPORT PDF =====

  exportPDF(): void {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 18;
    const contentWidth = pageWidth - (margin * 2);
    let yPosition = margin;

    const checkPageBreak = (neededHeight: number) => {
      if (yPosition + neededHeight > pageHeight - margin - 15) {
        doc.addPage();
        yPosition = margin;
        addPageHeader();
        return true;
      }
      return false;
    };

    const addWrappedText = (text: string, x: number, y: number, maxWidth: number, lineHeight: number): number => {
      const lines = doc.splitTextToSize(text, maxWidth);
      lines.forEach((line: string) => {
        checkPageBreak(lineHeight);
        doc.text(line, x, y);
        y += lineHeight;
      });
      return y;
    };

    const addPageHeader = () => {
      // Header cinza claro
      doc.setFillColor(248, 249, 250);
      doc.rect(0, 0, pageWidth, 12, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(107, 114, 128);
      doc.text('Erros | NAUE Consultoria', pageWidth / 2, 8, { align: 'center' });
    };

    // Header principal (primeira página)
    doc.setFillColor(2, 44, 34);
    doc.rect(0, 0, pageWidth, 45, 'F');

    // Título
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('ERROS', pageWidth / 2, 20, { align: 'center' });

    // Subtítulo
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(255, 255, 255);
    doc.text('Analise e aprenda com os erros para evoluir continuamente', pageWidth / 2, 30, { align: 'center' });

    // Data de geração
    doc.setFontSize(9);
    doc.setTextColor(200, 200, 200);
    doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} as ${new Date().toLocaleTimeString('pt-BR')}`, pageWidth / 2, 38, { align: 'center' });

    yPosition = 55;

    // Função helper para renderizar seção de erros
    const renderErrorSection = (title: string, errors: Erro[], sectionNumber: number) => {
      checkPageBreak(25);

      // Header da seção com ícone
      doc.setFillColor(2, 44, 34);
      doc.roundedRect(margin, yPosition, contentWidth, 12, 3, 3, 'F');

      // Número da seção
      doc.setFillColor(255, 255, 255);
      doc.circle(margin + 8, yPosition + 6, 4, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(2, 44, 34);
      doc.text(`${sectionNumber}`, margin + 8, yPosition + 7.5, { align: 'center' });

      // Título da seção
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(title, margin + 16, yPosition + 8);
      yPosition += 18;

      // Grid de erros (2 colunas)
      const columnWidth = (contentWidth - 3) / 2;
      let currentColumn = 0;
      let columnY = yPosition;

      errors.forEach((erro, index) => {
        if (!erro.description) return;

        const xPosition = margin + (currentColumn * (columnWidth + 3));
        const cardHeight = 35;

        checkPageBreak(cardHeight + 5);

        // Background do card
        doc.setFillColor(250, 250, 250);
        doc.roundedRect(xPosition, columnY, columnWidth, cardHeight, 3, 3, 'F');

        // Borda do card
        doc.setDrawColor(229, 231, 235);
        doc.setLineWidth(0.5);
        doc.roundedRect(xPosition, columnY, columnWidth, cardHeight, 3, 3, 'D');

        // Número do erro (sem oval)
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(2, 44, 34);
        doc.text(`Erro #${index + 1}`, xPosition + 6, columnY + 7);

        // Descrição
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(20, 20, 20);
        const descLines = doc.splitTextToSize(erro.description, columnWidth - 10);
        const maxLines = 3;
        const displayLines = descLines.slice(0, maxLines);
        displayLines.forEach((line: string, idx: number) => {
          doc.text(line, xPosition + 6, columnY + 15 + (idx * 4));
        });

        // Posicionamento (badge)
        const posY = columnY + cardHeight - 10;
        doc.setFillColor(240, 253, 244);
        doc.roundedRect(xPosition + 6, posY, columnWidth - 12, 6, 2, 2, 'F');
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(2, 44, 34);
        doc.text(`${this.getPositionLabel(erro.position)}`, xPosition + 8, posY + 4);

        // Status (badge)
        const statusColor = this.getStatusPdfColor(erro.status);
        const statusText = this.getStatusLabel(erro.status).toUpperCase();
        const badgeWidth = statusText.length * 2.5 + 8;

        doc.setFillColor(statusColor.bg[0], statusColor.bg[1], statusColor.bg[2]);
        doc.roundedRect(xPosition + columnWidth - badgeWidth - 1, posY, badgeWidth, 6, 2, 2, 'F');
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(statusColor.text[0], statusColor.text[1], statusColor.text[2]);
        doc.text(statusText, xPosition + columnWidth - (badgeWidth / 2) - 1, posY + 4, { align: 'center' });

        // Alternar coluna
        currentColumn++;
        if (currentColumn >= 2) {
          currentColumn = 0;
          columnY += cardHeight + 4;
        }
      });

      // Se terminou em coluna ímpar, ajustar yPosition
      if (currentColumn !== 0) {
        yPosition = columnY + 35 + 4;
      } else {
        yPosition = columnY;
      }

      yPosition += 10;
    };

    // Renderizar seções
    renderErrorSection('MEUS ERROS', this.data.errosPessoais, 1);
    renderErrorSection('ERROS DA EQUIPE', this.data.errosEquipe, 2);

    // Estatísticas
    checkPageBreak(80);

    // Header Estatísticas
    doc.setFillColor(2, 44, 34);
    doc.roundedRect(margin, yPosition, contentWidth, 12, 3, 3, 'F');
    doc.setFillColor(255, 255, 255);
    doc.circle(margin + 8, yPosition + 6, 4, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(2, 44, 34);
    doc.text('3', margin + 8, yPosition + 7.5, { align: 'center' });
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('ESTATISTICAS', margin + 16, yPosition + 8);
    yPosition += 20;

    // Estatísticas em 2 colunas
    const statColumnWidth = (contentWidth - 5) / 2;

    // Coluna 1: Posicionamento
    let statY = yPosition;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(2, 44, 34);
    doc.text('Posicionamento', margin, statY);
    statY += 8;

    const posStats = this.getPositionStats();
    Object.entries(posStats).forEach(([pos, count]) => {
      const percentage = this.getPercentage(count, 8);

      // Label
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      doc.text(this.getPositionLabel(pos), margin, statY);

      // Valor e percentual
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(2, 44, 34);
      doc.text(`${count} (${percentage}%)`, margin + statColumnWidth - 25, statY, { align: 'right' });

      statY += 5;

      // Barra de progresso
      const barWidth = statColumnWidth - 28;
      const barHeight = 4;

      // Background da barra
      doc.setFillColor(229, 231, 235);
      doc.roundedRect(margin, statY, barWidth, barHeight, 2, 2, 'F');

      // Fill da barra
      const fillWidth = (barWidth * percentage) / 100;
      doc.setFillColor(2, 44, 34);
      doc.roundedRect(margin, statY, fillWidth, barHeight, 2, 2, 'F');

      statY += 8;
    });

    // Coluna 2: Status
    statY = yPosition;
    const col2X = margin + statColumnWidth + 5;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(2, 44, 34);
    doc.text('Status', col2X, statY);
    statY += 8;

    const statusStats = this.getStatusStats();
    Object.entries(statusStats).forEach(([status, count]) => {
      const percentage = this.getPercentage(count, 8);

      // Label
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      doc.text(this.getStatusLabel(status), col2X, statY);

      // Valor e percentual
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(2, 44, 34);
      doc.text(`${count} (${percentage}%)`, col2X + statColumnWidth - 25, statY, { align: 'right' });

      statY += 5;

      // Barra de progresso
      const barWidth = statColumnWidth - 28;
      const barHeight = 4;

      // Background da barra
      doc.setFillColor(229, 231, 235);
      doc.roundedRect(col2X, statY, barWidth, barHeight, 2, 2, 'F');

      // Fill da barra (cores por status)
      const fillWidth = (barWidth * percentage) / 100;
      const statusColor = this.getStatusPdfColor(status);
      doc.setFillColor(statusColor.bar[0], statusColor.bar[1], statusColor.bar[2]);
      doc.roundedRect(col2X, statY, fillWidth, barHeight, 2, 2, 'F');

      statY += 8;
    });

    // Footer fixo
    yPosition = pageHeight - 12;
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.5);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    doc.text('Sistema de Gestao NAUE - Mentoria e Desenvolvimento', pageWidth / 2, yPosition + 5, { align: 'center' });

    // Salvar o PDF
    const fileName = `gestao_erros_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`;
    doc.save(fileName);
  }

  getStatusPdfColor(status: string): { bg: number[], text: number[], bar: number[] } {
    const colors: { [key: string]: { bg: number[], text: number[], bar: number[] } } = {
      'concluido': { bg: [209, 250, 229], text: [6, 95, 70], bar: [34, 197, 94] },
      'andamento': { bg: [254, 243, 199], text: [146, 64, 14], bar: [251, 191, 36] },
      'sem-iniciativa': { bg: [254, 226, 226], text: [153, 27, 27], bar: [239, 68, 68] }
    };
    return colors[status] || { bg: [229, 231, 235], text: [107, 114, 128], bar: [156, 163, 175] };
  }

  // ===== HELPERS =====

  getStagePostits(stageId: number): any[] {
    return [];
  }

  getStageCount(stageId: number): number {
    return 0;
  }

  trackByPostitId(index: number, item: any): string {
    return item.id;
  }
}
