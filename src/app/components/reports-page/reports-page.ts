import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';
import { CompanyService, ApiCompany } from '../../services/company';
import { FormsModule } from '@angular/forms';

Chart.register(...registerables);

@Component({
  selector: 'app-reports-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reports-page.html',
  styleUrls: ['./reports-page.css']
})
export class ReportsPage implements OnInit, AfterViewInit, OnDestroy {
  // Estado das empresas
  companies: ApiCompany[] = [];
  selectedCompanyId: number | null = null;
  isLoadingCompanies = false;

  // Estado do gráfico
  currentPerformanceYear = 2024;
  performanceChart: Chart | null = null;

  // Dados de performance (simulados por enquanto)
  performanceData = {
    2024: {
      labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
      data: [45, 52, 48, 65, 70, 68, 75, 80, 78, 82, 85, 88]
    },
    2023: {
      labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
      data: [30, 35, 38, 42, 45, 48, 52, 55, 58, 60, 63, 65]
    },
    2022: {
      labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
      data: [20, 22, 25, 28, 30, 32, 35, 38, 40, 42, 44, 45]
    }
  };

  constructor(private companyService: CompanyService) {}

  ngOnInit() {
    this.loadCompanies();
  }

  ngAfterViewInit() {
    // Pequeno delay para garantir que o canvas está renderizado
    setTimeout(() => {
      this.initPerformanceChart();
    }, 100);
  }

  ngOnDestroy() {
    if (this.performanceChart) {
      this.performanceChart.destroy();
    }
  }

  /**
   * Carregar lista de empresas
   */
  async loadCompanies() {
    this.isLoadingCompanies = true;
    try {
      const response = await this.companyService.getCompanies({ is_active: true }).toPromise();
      this.companies = response?.companies || [];
      
      // Se não há empresa selecionada e temos empresas, selecionar a primeira
      if (!this.selectedCompanyId && this.companies.length > 0) {
        this.selectedCompanyId = this.companies[0].id;
      }
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
      this.companies = [];
    } finally {
      this.isLoadingCompanies = false;
    }
  }

  /**
   * Gerar relatório
   */
  onGenerateReport(type: string) {
    if (!this.selectedCompanyId && (type === 'company' || type === 'financial')) {
      alert('Por favor, selecione uma empresa primeiro.');
      return;
    }

    const selectedCompany = this.companies.find(c => c.id === this.selectedCompanyId);
    const companyName = selectedCompany ? selectedCompany.name : 'Todas';

    console.log(`Gerando relatório ${type} para empresa: ${companyName}`);
    
    // TODO: Implementar geração real de relatórios
    switch(type) {
      case 'monthly':
        this.generateMonthlyReport();
        break;
      case 'company':
        this.generateCompanyReport(this.selectedCompanyId!);
        break;
      case 'services':
        this.generateServicesReport();
        break;
      case 'financial':
        this.generateFinancialReport(this.selectedCompanyId!);
        break;
    }
  }

  /**
   * Atualizar gráfico ao mudar o ano
   */
  onUpdateChart(year: number) {
    this.currentPerformanceYear = year;
    this.updatePerformanceChart();
  }

  /**
   * Inicializar gráfico de performance
   */
  private initPerformanceChart() {
    const canvas = document.getElementById('performanceChart') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Destruir gráfico existente se houver
    if (this.performanceChart) {
      this.performanceChart.destroy();
    }

    const isDarkMode = document.body.classList.contains('dark-mode');
    const textColor = isDarkMode ? '#e5e7eb' : '#374151';
    const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

    const currentData = this.performanceData[this.currentPerformanceYear as keyof typeof this.performanceData];

    this.performanceChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: currentData.labels,
        datasets: [{
          label: 'Performance',
          data: currentData.data,
          borderColor: '#1dd882',
          backgroundColor: 'rgba(29, 216, 130, 0.1)',
          borderWidth: 3,
          tension: 0.4,
          pointRadius: 6,
          pointHoverRadius: 8,
          pointBackgroundColor: '#fff',
          pointBorderColor: '#1dd882',
          pointBorderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: isDarkMode ? '#374151' : '#fff',
            titleColor: textColor,
            bodyColor: textColor,
            borderColor: isDarkMode ? '#4b5563' : '#e5e7eb',
            borderWidth: 1,
            padding: 12,
            displayColors: false,
            callbacks: {
              label: (context) => {
                return `Performance: ${context.parsed.y}%`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              color: gridColor,
              display: true
            },
            ticks: {
              color: textColor,
              font: {
                size: 12
              }
            }
          },
          y: {
            beginAtZero: true,
            max: 100,
            grid: {
              color: gridColor,
              display: true
            },
            ticks: {
              color: textColor,
              font: {
                size: 12
              },
              callback: function(value) {
                return value + '%';
              }
            }
          }
        }
      }
    });
  }

  /**
   * Atualizar dados do gráfico
   */
  private updatePerformanceChart() {
    if (!this.performanceChart) return;

    const currentData = this.performanceData[this.currentPerformanceYear as keyof typeof this.performanceData];
    
    this.performanceChart.data.labels = currentData.labels;
    this.performanceChart.data.datasets[0].data = currentData.data;
    this.performanceChart.update();
  }

  /**
   * Métodos de geração de relatórios (placeholder)
   */
  private generateMonthlyReport() {
    console.log('Gerando relatório mensal...');
    // TODO: Implementar geração real
  }

  private generateCompanyReport(companyId: number) {
    console.log(`Gerando relatório da empresa ${companyId}...`);
    // TODO: Implementar geração real
  }

  private generateServicesReport() {
    console.log('Gerando relatório de serviços...');
    // TODO: Implementar geração real
  }

  private generateFinancialReport(companyId: number) {
    console.log(`Gerando relatório financeiro da empresa ${companyId}...`);
    // TODO: Implementar geração real
  }

  /**
   * Verificar se o relatório precisa de seleção de empresa
   */
  needsCompanySelection(reportType: string): boolean {
    return reportType === 'company' || reportType === 'financial';
  }
}