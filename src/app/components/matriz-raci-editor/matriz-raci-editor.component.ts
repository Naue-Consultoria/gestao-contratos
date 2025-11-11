import { Component, Input, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MentoriaService } from '../../services/mentoria.service';
import { ToastrService } from 'ngx-toastr';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx-js-style';

interface RaciEntry {
  enabled: boolean;
  name: string;
}

interface Activity {
  id: number;
  name: string;
  raci: {
    R: RaciEntry;
    A: RaciEntry;
    C: RaciEntry;
    I: RaciEntry;
  };
}

interface MatrizRaciData {
  activities: Activity[];
}

@Component({
  selector: 'app-matriz-raci-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './matriz-raci-editor.component.html',
  styleUrls: ['./matriz-raci-editor.component.css']
})
export class MatrizRaciEditorComponent implements OnInit {
  @Input() token: string = '';
  @Input() modoVisualizacao: boolean = false;
  @ViewChild('matrixGridElement', { read: ElementRef }) matrixGridElement!: ElementRef;

  activities: Activity[] = [];
  activityIdCounter: number = 0;
  isLoading: boolean = false;
  isSaving: boolean = false;
  showMatrixView: boolean = false;
  showExportMenu: boolean = false;

  raciTypes = ['R', 'A', 'C', 'I'] as const;

  constructor(
    private mentoriaService: MentoriaService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    if (this.token) {
      this.carregarDados();
    }
  }

  carregarDados(): void {
    this.isLoading = true;
    this.mentoriaService.obterMatrizRACIPublico(this.token).subscribe({
      next: (response) => {
        if (response.success && response.data?.activities) {
          this.activities = response.data.activities;
          // Atualizar o contador para o maior ID existente
          if (this.activities.length > 0) {
            this.activityIdCounter = Math.max(...this.activities.map(a => a.id));
          }
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erro ao carregar Matriz RACI:', error);
        this.toastr.error('Erro ao carregar dados da Matriz RACI');
        this.isLoading = false;
      }
    });
  }

  addActivity(): void {
    const id = ++this.activityIdCounter;
    const activity: Activity = {
      id: id,
      name: '',
      raci: {
        R: { enabled: false, name: '' },
        A: { enabled: false, name: '' },
        C: { enabled: false, name: '' },
        I: { enabled: false, name: '' }
      }
    };
    this.activities.push(activity);
    this.salvarAutomaticamente();
  }

  removeActivity(id: number): void {
    if (confirm('Tem certeza que deseja remover esta atividade?')) {
      this.activities = this.activities.filter(a => a.id !== id);
      this.salvarAutomaticamente();
    }
  }

  updateActivityName(id: number, name: string): void {
    const activity = this.activities.find(a => a.id === id);
    if (activity) {
      activity.name = name;
    }
  }

  toggleRaci(id: number, type: 'R' | 'A' | 'C' | 'I'): void {
    const activity = this.activities.find(a => a.id === id);
    if (activity) {
      activity.raci[type].enabled = !activity.raci[type].enabled;
      if (!activity.raci[type].enabled) {
        activity.raci[type].name = '';
      }
    }
  }

  updateRaciName(id: number, type: 'R' | 'A' | 'C' | 'I', name: string): void {
    const activity = this.activities.find(a => a.id === id);
    if (activity) {
      activity.raci[type].name = name;
    }
  }

  clearAll(): void {
    if (confirm('Tem certeza que deseja limpar toda a matriz?')) {
      this.activities = [];
      this.activityIdCounter = 0;
      this.salvarAutomaticamente();
    }
  }

  getRaciPlaceholder(type: string): string {
    const placeholders: { [key: string]: string } = {
      'R': 'Nome do responsável pela execução',
      'A': 'Nome do prestador de contas',
      'C': 'Nome do consultado',
      'I': 'Nome do informado'
    };
    return placeholders[type] || '';
  }

  getRaciLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'R': 'Responsável pela execução',
      'A': 'Prestador de Contas',
      'C': 'Consultado',
      'I': 'Informado'
    };
    return labels[type] || '';
  }

  toggleMatrixView(): void {
    if (!this.showMatrixView && this.activities.length === 0) {
      this.toastr.warning('Adicione pelo menos uma atividade antes de visualizar a matriz.');
      return;
    }
    this.showMatrixView = !this.showMatrixView;
  }

  toggleExportMenu(): void {
    this.showExportMenu = !this.showExportMenu;
  }

  exportToExcel(): void {
    try {
      // Criar dados para o Excel
      const data: any[][] = [];

      // Adicionar título
      data.push(['MATRIZ RACI - ANÁLISE DE RESPONSABILIDADES']);
      data.push([]); // Linha vazia
      data.push(['R = Responsável pela execução | A = Prestador de Contas | C = Consultado | I = Informado']);
      data.push([]); // Linha vazia

      // Adicionar cabeçalho da tabela
      data.push(['Atividade', 'R - Responsável', 'A - Prestador de Contas', 'C - Consultado', 'I - Informado']);

      // Adicionar atividades
      this.activities.forEach(activity => {
        if (activity.name) {
          data.push([
            activity.name,
            activity.raci.R.enabled ? activity.raci.R.name : '-',
            activity.raci.A.enabled ? activity.raci.A.name : '-',
            activity.raci.C.enabled ? activity.raci.C.name : '-',
            activity.raci.I.enabled ? activity.raci.I.name : '-'
          ]);
        }
      });

      // Criar workbook e worksheet
      const ws = XLSX.utils.aoa_to_sheet(data);

      // Configurar largura das colunas
      ws['!cols'] = [
        { wch: 45 },  // Atividade (mais largo)
        { wch: 28 },  // R
        { wch: 28 },  // A
        { wch: 28 },  // C
        { wch: 28 }   // I
      ];

      // Configurar altura das linhas
      ws['!rows'] = [
        { hpt: 35 },  // Linha 1: Título
        { hpt: 10 },  // Linha 2: Espaço
        { hpt: 18 },  // Linha 3: Legenda
        { hpt: 10 },  // Linha 4: Espaço
        { hpt: 30 }   // Linha 5: Header da tabela
      ];
      // Adicionar altura para cada linha de dados
      this.activities.forEach((_, index) => {
        if (!ws['!rows']) ws['!rows'] = [];
        ws['!rows'][index + 5] = { hpt: 26 }; // 26 pontos de altura
      });

      // Mesclar células do título (A1:E1)
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },  // Título (linha 1, colunas A-E)
        { s: { r: 2, c: 0 }, e: { r: 2, c: 4 } }   // Legenda (linha 3, colunas A-E)
      ];

      // Estilo do título
      if (ws['A1']) {
        ws['A1'].s = {
          font: { bold: true, sz: 16, color: { rgb: '022C22' } },
          alignment: { horizontal: 'center', vertical: 'center' }
        };
      }

      // Estilo da legenda
      if (ws['A3']) {
        ws['A3'].s = {
          font: { italic: true, sz: 10, color: { rgb: '666666' } },
          alignment: { horizontal: 'center', vertical: 'center' }
        };
      }

      // Definir estilos de bordas
      const borderStyle = {
        top: { style: 'thin', color: { rgb: '000000' } },
        bottom: { style: 'thin', color: { rgb: '000000' } },
        left: { style: 'thin', color: { rgb: '000000' } },
        right: { style: 'thin', color: { rgb: '000000' } }
      };

      // Aplicar estilos ao cabeçalho da tabela (linha 5: A5 até E5)
      const headerStyle = {
        font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 12 },
        fill: { fgColor: { rgb: '022C22' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: borderStyle
      };

      // Aplicar estilo nas células do header (A5 até E5)
      const headerCells = ['A5', 'B5', 'C5', 'D5', 'E5'];
      headerCells.forEach(cell => {
        if (ws[cell]) {
          ws[cell].s = headerStyle;
        }
      });

      // Aplicar estilo verde claro nas células RACI preenchidas
      const raciFilledStyle = {
        fill: { fgColor: { rgb: 'E8F5E9' } },
        font: { bold: true, color: { rgb: '022C22' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: borderStyle
      };

      // Estilo para células vazias
      const emptyCellStyle = {
        alignment: { horizontal: 'center', vertical: 'center' },
        border: borderStyle
      };

      // Iterar pelas linhas de dados (começando da linha 6)
      this.activities.forEach((activity, rowIndex) => {
        if (activity.name) {
          const excelRow = rowIndex + 6; // +6 porque temos título, espaços, legenda e header

          // Aplicar estilo na coluna de atividade (negrito)
          const activityCell = `A${excelRow}`;
          if (ws[activityCell]) {
            ws[activityCell].s = {
              font: { bold: true },
              alignment: { vertical: 'center' },
              border: borderStyle
            };
          }

          // Aplicar estilos nas células RACI (preenchidas ou vazias)
          const raciColumns = ['B', 'C', 'D', 'E'];
          const raciTypes: Array<'R' | 'A' | 'C' | 'I'> = ['R', 'A', 'C', 'I'];

          raciColumns.forEach((col, index) => {
            const cell = `${col}${excelRow}`;
            const raciType = raciTypes[index];

            if (ws[cell]) {
              // Se a célula RACI está preenchida, usar estilo verde
              if (activity.raci[raciType].enabled && activity.raci[raciType].name) {
                ws[cell].s = raciFilledStyle;
              } else {
                // Se está vazia, usar estilo padrão
                ws[cell].s = emptyCellStyle;
              }
            }
          });
        }
      });

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Matriz RACI');

      // Gerar e fazer download do arquivo
      XLSX.writeFile(wb, 'matriz_raci.xlsx');

      this.showExportMenu = false;
      this.toastr.success('Matriz RACI exportada para Excel (.xlsx)');
    } catch (error) {
      console.error('Erro ao exportar para Excel:', error);
      this.toastr.error('Erro ao exportar para Excel');
      this.showExportMenu = false;
    }
  }

  async exportToPDF(): Promise<void> {
    this.showExportMenu = false;

    // Se não estiver na visualização da matriz, mudar para ela temporariamente
    const wasShowingMatrix = this.showMatrixView;
    if (!wasShowingMatrix) {
      this.showMatrixView = true;
      // Aguardar renderização
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Chamar o mesmo método usado no botão de imprimir
    await this.printMatrixToPDF();

    // Restaurar estado original se necessário
    if (!wasShowingMatrix) {
      setTimeout(() => {
        this.showMatrixView = false;
      }, 100);
    }
  }

  salvar(): void {
    this.isSaving = true;
    const dados: MatrizRaciData = {
      activities: this.activities
    };

    this.mentoriaService.salvarMatrizRACI(this.token, dados).subscribe({
      next: (response) => {
        if (response.success) {
          this.toastr.success('Matriz RACI salva com sucesso!');
        }
        this.isSaving = false;
      },
      error: (error) => {
        console.error('Erro ao salvar Matriz RACI:', error);
        this.toastr.error('Erro ao salvar Matriz RACI');
        this.isSaving = false;
      }
    });
  }

  salvarAutomaticamente(): void {
    // Salvar automaticamente após cada alteração (debounce seria ideal, mas simplificando aqui)
    if (this.token) {
      setTimeout(() => this.salvar(), 500);
    }
  }

  async print(): Promise<void> {
    // Se estiver na visualização da matriz, exportar como PDF ao invés de usar window.print()
    if (this.showMatrixView) {
      await this.printMatrixToPDF();
    } else {
      window.print();
    }
  }

  async printMatrixToPDF(): Promise<void> {
    try {
      const element = document.querySelector('.matrix-grid') as HTMLElement;
      if (!element) {
        this.toastr.error('Erro ao gerar PDF');
        return;
      }

      this.toastr.info('Gerando PDF da matriz...', '', { timeOut: 2000 });

      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false
      });

      const imgWidth = 297; // A4 landscape width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      // Adicionar título
      pdf.setFontSize(20);
      pdf.setTextColor(2, 44, 34);
      pdf.text('Matriz RACI - Análise de Responsabilidades', 148.5, 15, { align: 'center' });

      // Adicionar legenda
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      const legendaY = 25;
      pdf.text('R = Responsável pela execução  |  A = Prestador de Contas  |  C = Consultado  |  I = Informado', 148.5, legendaY, { align: 'center' });

      // Adicionar imagem da matriz
      const yPosition = 35;
      const availableHeight = 210 - yPosition - 10; // altura disponível
      const finalHeight = Math.min(imgHeight, availableHeight);
      const finalWidth = (canvas.width * finalHeight) / canvas.height;

      const imgData = canvas.toDataURL('image/png');
      const xPosition = (297 - finalWidth) / 2; // centralizar
      pdf.addImage(imgData, 'PNG', xPosition, yPosition, finalWidth, finalHeight);

      // Adicionar rodapé
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 148.5, 200, { align: 'center' });

      pdf.save('matriz_raci.pdf');
      this.toastr.success('PDF da Matriz RACI gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      this.toastr.error('Erro ao gerar PDF da matriz');
    }
  }

  get hasActivitiesWithName(): boolean {
    return this.activities.filter(a => a.name).length > 0;
  }
}
