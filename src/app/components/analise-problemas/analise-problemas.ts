import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MentoriaService } from '../../services/mentoria.service';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import jsPDF from 'jspdf';

interface Postit {
  id: string;
  text: string;
  stage: number;
}

interface AnaliseData {
  problem: string;
  stages: {
    [key: string]: Postit[];
  };
  postitCounter: number;
}

@Component({
  selector: 'app-analise-problemas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './analise-problemas.html',
  styleUrls: ['./analise-problemas.css']
})
export class AnaliseProblemasComponent implements OnInit, OnDestroy {
  @Input() token: string = '';
  @Input() readOnly: boolean = false;

  // Estado
  data: AnaliseData = {
    problem: '',
    stages: {
      '0': [], // Brainstorm
      '1': [], // Sintomas
      '2': [], // Desculpas
      '3': [], // Culpados
      '4': [], // Motivos
      '5': []  // Causa Raiz
    },
    postitCounter: 0
  };

  // Drag and Drop
  draggedElement: Postit | null = null;
  draggedFromStage: number = -1;
  dragOverStage: number = -1;

  // Modal
  showSummaryModal: boolean = false;

  // Auto-save
  private saveSubject = new Subject<void>();
  private destroy$ = new Subject<void>();
  isLoading = false;
  lastSaved: Date | null = null;
  isSaving = false;

  // Configuração dos estágios
  stageConfig = [
    { id: 0, title: 'Brainstorm', icon: 'fa-solid fa-lightbulb', emptyMessage: 'Adicione suas ideias aqui e arraste para classificar', class: 'brainstorm', canAdd: true },
    { id: 1, title: '1. Sintomas', icon: 'fa-solid fa-triangle-exclamation', emptyMessage: 'Arraste os sintomas para cá', class: '', canAdd: false },
    { id: 2, title: '2. Desculpas', icon: 'fa-solid fa-comment-dots', emptyMessage: 'Arraste as desculpas para cá', class: '', canAdd: false },
    { id: 3, title: '3. Culpados', icon: 'fa-solid fa-user', emptyMessage: 'Arraste os culpados para cá', class: '', canAdd: false },
    { id: 4, title: '4. Motivos', icon: 'fa-solid fa-bullseye', emptyMessage: 'Arraste os motivos para cá', class: '', canAdd: false },
    { id: 5, title: '5. Causa Raiz', icon: 'fa-solid fa-seedling', emptyMessage: 'Defina a causa raiz (máx: 1)', class: '', canAdd: false, maxItems: 1 }
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
    this.mentoriaService.obterAnaliseProblemasPublico(this.token).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.data.problem = response.data.problem || '';
          this.data.stages = response.data.stages || this.data.stages;
          this.data.postitCounter = response.data.postit_counter || 0;
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erro ao carregar análise de problemas:', error);
        this.isLoading = false;
      }
    });
  }

  saveData(): void {
    if (!this.token || this.readOnly) return;

    this.mentoriaService.salvarAnaliseProblemas(this.token, {
      problem: this.data.problem,
      stages: this.data.stages,
      postitCounter: this.data.postitCounter
    }).subscribe({
      next: (response) => {
        if (response.success) {
          this.lastSaved = new Date();
          console.log('✅ Análise de problemas salva');
        }
      },
      error: (error) => {
        console.error('❌ Erro ao salvar análise de problemas:', error);
      }
    });
  }

  triggerSave(): void {
    if (!this.readOnly) {
      this.saveSubject.next();
    }
  }

  // ===== POST-IT MANAGEMENT =====

  addPostit(): void {
    if (this.readOnly) return;

    this.data.postitCounter++;
    const newPostit: Postit = {
      id: `postit-${this.data.postitCounter}`,
      text: '',
      stage: 0
    };

    this.data.stages['0'].push(newPostit);
    this.triggerSave();
  }

  deletePostit(postitId: string): void {
    if (this.readOnly) return;

    for (let stage in this.data.stages) {
      this.data.stages[stage] = this.data.stages[stage].filter(p => p.id !== postitId);
    }
    this.triggerSave();
  }

  updatePostitText(postit: Postit, newText: string): void {
    if (this.readOnly) return;

    postit.text = newText;
    this.triggerSave();
  }

  onProblemChange(): void {
    this.triggerSave();
  }

  // ===== DRAG AND DROP =====

  onDragStart(event: DragEvent, postit: Postit, fromStage: number): void {
    if (this.readOnly) return;

    this.draggedElement = postit;
    this.draggedFromStage = fromStage;

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/html', (event.target as HTMLElement).innerHTML);
    }
  }

  onDragEnd(event: DragEvent): void {
    this.draggedElement = null;
    this.draggedFromStage = -1;
    this.dragOverStage = -1;
  }

  onDragOver(event: DragEvent, stage: number): void {
    if (this.readOnly || !this.draggedElement) return;

    event.preventDefault();
    this.dragOverStage = stage;

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  onDragLeave(event: DragEvent): void {
    this.dragOverStage = -1;
  }

  onDrop(event: DragEvent, targetStage: number): void {
    if (this.readOnly || !this.draggedElement) return;

    event.preventDefault();
    this.dragOverStage = -1;

    // Verificar limite da etapa 5 (Causa Raiz)
    const stageConf = this.stageConfig.find(s => s.id === targetStage);
    if (stageConf?.maxItems && this.data.stages[targetStage].length >= stageConf.maxItems && this.draggedFromStage !== targetStage) {
      alert(`${stageConf.title} permite apenas ${stageConf.maxItems} item!`);
      return;
    }

    // Remover do estágio origem
    this.data.stages[this.draggedFromStage] = this.data.stages[this.draggedFromStage].filter(
      p => p.id !== this.draggedElement!.id
    );

    // Adicionar ao estágio destino
    this.draggedElement.stage = targetStage;
    this.data.stages[targetStage].push(this.draggedElement);

    this.draggedElement = null;
    this.draggedFromStage = -1;

    this.triggerSave();
  }

  // ===== MODAL =====

  openSummaryModal(): void {
    this.showSummaryModal = true;
  }

  closeSummaryModal(): void {
    this.showSummaryModal = false;
  }

  // ===== SAVE MANUALLY =====

  saveManually(): void {
    if (this.readOnly || this.isSaving) return;

    this.isSaving = true;

    this.mentoriaService.salvarAnaliseProblemas(this.token, {
      problem: this.data.problem,
      stages: this.data.stages,
      postitCounter: this.data.postitCounter
    }).subscribe({
      next: (response) => {
        if (response.success) {
          this.lastSaved = new Date();
          this.isSaving = false;
          console.log('✅ Análise de problemas salva manualmente');
        }
      },
      error: (error) => {
        console.error('❌ Erro ao salvar análise de problemas:', error);
        this.isSaving = false;
        alert('Erro ao salvar. Por favor, tente novamente.');
      }
    });
  }

  // ===== EXPORT PDF =====

  exportPDF(): void {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);
    let yPosition = margin;

    // Helper para adicionar nova página se necessário
    const checkPageBreak = (neededHeight: number) => {
      if (yPosition + neededHeight > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
        return true;
      }
      return false;
    };

    // Helper para texto com quebra de linha
    const addWrappedText = (text: string, x: number, y: number, maxWidth: number, lineHeight: number): number => {
      const lines = doc.splitTextToSize(text, maxWidth);
      lines.forEach((line: string) => {
        checkPageBreak(lineHeight);
        doc.text(line, x, y);
        y += lineHeight;
      });
      return y;
    };

    // Título principal
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(2, 44, 34);
    doc.text('Análise de Problemas', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    // Problema Principal
    checkPageBreak(25);
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(margin, yPosition, contentWidth, 20, 3, 3, 'F');
    doc.setDrawColor(2, 44, 34);
    doc.setLineWidth(1);
    doc.line(margin, yPosition, margin, yPosition + 20);

    yPosition += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(2, 44, 34);
    doc.text('PROBLEMA PRINCIPAL:', margin + 5, yPosition);

    yPosition += 5;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(22, 101, 52);
    yPosition = addWrappedText(this.data.problem || 'Não definido', margin + 5, yPosition, contentWidth - 10, 5);
    yPosition += 10;

    // Estágios
    const titles = ['BRAINSTORM', '1. SINTOMAS', '2. DESCULPAS', '3. CULPADOS', '4. MOTIVOS', '5. CAUSA RAIZ'];

    for (let stage = 0; stage <= 5; stage++) {
      const postits = this.data.stages[stage] || [];

      checkPageBreak(15);

      // Header do estágio
      doc.setFillColor(2, 44, 34);
      doc.roundedRect(margin, yPosition, contentWidth, 10, 2, 2, 'F');

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(titles[stage], margin + 5, yPosition + 7);
      yPosition += 12;

      // Post-its
      if (postits.length === 0) {
        checkPageBreak(10);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(156, 163, 175);
        doc.text('Nenhum item nesta etapa', margin + 5, yPosition + 5);
        yPosition += 10;
      } else {
        postits.forEach((postit, index) => {
          const text = postit.text || '(vazio)';
          const textHeight = doc.splitTextToSize(text, contentWidth - 12).length * 5 + 6;

          checkPageBreak(textHeight + 5);

          // Fundo do post-it
          doc.setFillColor(254, 243, 199);
          doc.setDrawColor(253, 230, 138);
          doc.setLineWidth(0.5);
          doc.roundedRect(margin, yPosition, contentWidth, textHeight, 2, 2, 'FD');

          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(66, 32, 6);
          yPosition = addWrappedText(text, margin + 3, yPosition + 4, contentWidth - 6, 5);
          yPosition += 3;
        });
      }

      yPosition += 5;
    }

    // Footer
    checkPageBreak(10);
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.5);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 5;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    const footerText = `Gerado em ${new Date().toLocaleString('pt-BR')} | Sistema de Gestão NAUE`;
    doc.text(footerText, pageWidth / 2, yPosition, { align: 'center' });

    // Salvar o PDF
    const fileName = `analise_problemas_${Date.now()}.pdf`;
    doc.save(fileName);
  }

  // ===== HELPERS =====

  getStagePostits(stageId: number): Postit[] {
    return this.data.stages[stageId] || [];
  }

  getStageCount(stageId: number): number {
    return this.getStagePostits(stageId).length;
  }

  trackByPostitId(index: number, postit: Postit): string {
    return postit.id;
  }
}
