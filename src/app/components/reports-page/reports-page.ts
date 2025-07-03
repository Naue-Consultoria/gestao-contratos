// reports-page.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CompanyService, ApiCompany } from '../../services/company';
import { Subject, takeUntil } from 'rxjs';

interface ReportHistory {
  id: number;
  date: Date;
  type: string;
  company: string | null;
  format: 'pdf' | 'excel';
  status: 'completed' | 'processing' | 'error';
  downloadUrl?: string;
}

@Component({
  selector: 'app-reports-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reports-page.html',
  styleUrls: ['./reports-page.css']
})
export class ReportsPage implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Estado das empresas
  companies: ApiCompany[] = [];
  selectedCompanyId: number | null = null;
  isLoadingCompanies = false;
  
  // Filtros
  startDate: string = this.getDefaultStartDate();
  endDate: string = this.getDefaultEndDate();
  selectedReportType: string = 'all';
  hasActiveFilters = false;
  
  // Stats
  totalReportsGenerated = 127;
  lastReportDate = '02/01/2025';
  averageGenerationTime = 45;
  
  // Estado da geração
  generatingReport: string | null = null;
  loadingMessage = 'Preparando relatório...';
  loadingProgress = 0;
  
  // Histórico
  reportHistory: ReportHistory[] = [
    {
      id: 1,
      date: new Date('2025-01-02T14:30:00'),
      type: 'monthly',
      company: 'Tech Solutions',
      format: 'pdf',
      status: 'completed'
    },
    {
      id: 2,
      date: new Date('2025-01-02T10:15:00'),
      type: 'financial',
      company: 'Startup XYZ',
      format: 'excel',
      status: 'completed'
    },
    {
      id: 3,
      date: new Date('2025-01-01T16:45:00'),
      type: 'services',
      company: null,
      format: 'pdf',
      status: 'completed'
    },
    {
      id: 4,
      date: new Date('2025-01-01T09:20:00'),
      type: 'company',
      company: 'Empresa ABC',
      format: 'excel',
      status: 'error'
    }
  ];

  constructor(private companyService: CompanyService) {}

  ngOnInit() {
    this.loadCompanies();
    this.checkActiveFilters();
  }

  /**
   * Carregar lista de empresas
   */
  private loadCompanies() {
    this.isLoadingCompanies = true;
    
    this.companyService.getCompanies({ is_active: true })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.companies = response.companies || [];
          this.isLoadingCompanies = false;
        },
        error: (error) => {
          console.error('Erro ao carregar empresas:', error);
          this.companies = [];
          this.isLoadingCompanies = false;
        }
      });
  }

  /**
   * Gerar relatório com animação de loading
   */
  async generateReport(type: string, format: 'pdf' | 'excel') {
    // Validar se precisa de empresa selecionada
    if ((type === 'company' || type === 'financial') && !this.selectedCompanyId) {
      alert('Por favor, selecione uma empresa para este tipo de relatório.');
      return;
    }
    
    // Iniciar loading
    this.generatingReport = type;
    this.loadingProgress = 0;
    this.updateLoadingMessage(type, format);
    
    // Simular progresso de geração
    const progressInterval = setInterval(() => {
      if (this.loadingProgress < 90) {
        this.loadingProgress += Math.random() * 15;
      }
    }, 300);
    
    try {
      // Aqui viria a chamada real para o backend
      await this.simulateReportGeneration(type, format);
      
      // Completar progresso
      this.loadingProgress = 100;
      
      setTimeout(() => {
        clearInterval(progressInterval);
        this.generatingReport = null;
        
        // Adicionar ao histórico
        this.addToHistory(type, format);
        
      }, 500);
      
    } catch (error) {
      clearInterval(progressInterval);
      this.generatingReport = null;
      console.error('Erro ao gerar relatório:', error);
      alert('Erro ao gerar relatório. Por favor, tente novamente.');
    }
  }

  /**
   * Simular geração de relatório (substituir por chamada real)
   */
  private simulateReportGeneration(type: string, format: string): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, 2000 + Math.random() * 2000);
    });
  }

  /**
   * Atualizar mensagem de loading baseado no tipo
   */
  private updateLoadingMessage(type: string, format: string) {
    const messages = {
      monthly: 'Coletando dados do mês...',
      company: 'Analisando dados da empresa...',
      services: 'Processando informações de serviços...',
      financial: 'Calculando métricas financeiras...'
    };
    
    this.loadingMessage = messages[type as keyof typeof messages] || 'Preparando relatório...';
    
    setTimeout(() => {
      this.loadingMessage = format === 'pdf' 
        ? 'Gerando PDF otimizado...' 
        : 'Criando planilha Excel...';
    }, 1000);
  }

  /**
   * Adicionar relatório ao histórico
   */
  private addToHistory(type: string, format: 'pdf' | 'excel') {
    const company = this.selectedCompanyId 
      ? this.companies.find(c => c.id === this.selectedCompanyId)?.name || null
      : null;
    
    const newReport: ReportHistory = {
      id: Date.now(),
      date: new Date(),
      type,
      company,
      format,
      status: 'completed'
    };
    
    this.reportHistory.unshift(newReport);
    this.totalReportsGenerated++;
    this.lastReportDate = new Date().toLocaleDateString('pt-BR');
  }

  /**
   * Download de relatório do histórico
   */
  downloadReport(report: ReportHistory) {
    if (report.status !== 'completed') return;
    
    // Aqui viria a lógica real de download
    console.log('Baixando relatório:', report);
    alert(`Baixando ${this.getReportTypeName(report.type)} em ${report.format.toUpperCase()}`);
  }

  /**
   * Regenerar relatório
   */
  regenerateReport(report: ReportHistory) {
    const type = report.type;
    const format = report.format;
    
    // Se o relatório original tinha empresa, selecionar a mesma
    if (report.company) {
      const company = this.companies.find(c => c.name === report.company);
      if (company) {
        this.selectedCompanyId = company.id;
      }
    }
    
    this.generateReport(type, format);
  }

  /**
   * Eventos de mudança
   */
  onCompanyChange() {
    this.checkActiveFilters();
  }

  /**
   * Verificar se há filtros ativos
   */
  private checkActiveFilters() {
    this.hasActiveFilters = 
      this.selectedCompanyId !== null ||
      this.selectedReportType !== 'all' ||
      this.startDate !== this.getDefaultStartDate() ||
      this.endDate !== this.getDefaultEndDate();
  }

  /**
   * Resetar filtros
   */
  resetFilters() {
    this.selectedCompanyId = null;
    this.selectedReportType = 'all';
    this.startDate = this.getDefaultStartDate();
    this.endDate = this.getDefaultEndDate();
    this.checkActiveFilters();
  }

  /**
   * Helpers para nomes legíveis
   */
  getReportTypeName(type: string): string {
    const names: { [key: string]: string } = {
      monthly: 'Relatório Mensal',
      company: 'Relatório por Empresa',
      services: 'Relatório de Serviços',
      financial: 'Relatório Financeiro'
    };
    return names[type] || type;
  }

  getStatusName(status: string): string {
    const names: { [key: string]: string } = {
      completed: 'Concluído',
      processing: 'Processando',
      error: 'Erro'
    };
    return names[status] || status;
  }

  /**
   * Obter datas padrão
   */
  private getDefaultStartDate(): string {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  }

  private getDefaultEndDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Exportar relatório real (integração com backend)
   */
  private async exportReport(type: string, format: 'pdf' | 'excel'): Promise<void> {
    // TODO: Implementar chamada real ao backend
    // Exemplo de estrutura:
    /*
    const params = {
      type,
      format,
      companyId: this.selectedCompanyId,
      startDate: this.startDate,
      endDate: this.endDate,
      reportType: this.selectedReportType
    };
    
    try {
      const response = await this.reportService.generateReport(params).toPromise();
      
      // Download do arquivo
      const blob = new Blob([response.data], { 
        type: format === 'pdf' ? 'application/pdf' : 'application/vnd.ms-excel' 
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `relatorio_${type}_${new Date().getTime()}.${format}`;
      link.click();
      
      window.URL.revokeObjectURL(url);
    } catch (error) {
      throw error;
    }
    */
  }

  /**
   * Lifecycle - limpar recursos ao destruir componente
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Fechar modal ao clicar no backdrop
   */
  onModalBackdropClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.classList.contains('modal')) {
      // Não fechar se estiver gerando relatório
      if (this.generatingReport) return;
    }
  }
}