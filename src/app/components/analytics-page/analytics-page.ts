import { Component, OnInit, AfterViewInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { Chart, ChartConfiguration } from 'chart.js';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';
import { 
  AnalyticsService, 
  AnalyticsData, 
  AnalyticsPeriodFilter,
  ServiceAnalytics,
  MetricData
} from '../../services/analytics';
import { ContractService } from '../../services/contract';

// Lazy load Chart.js

interface DetailedMetric extends MetricData {
  trend: number;
  description?: string;
}

@Component({
  selector: 'app-analytics-page',
  standalone: true,
  imports: [CommonModule, FormsModule, BreadcrumbComponent],
  templateUrl: './analytics-page.html',
  styleUrls: ['./analytics-page.css']
})
export class AnalyticsPageComponent implements OnInit, AfterViewInit, OnDestroy {
  private analyticsService = inject(AnalyticsService);
  private contractService = inject(ContractService);
  private router = inject(Router);

  // Estado do componente
  isLoading = true;
  isRefreshing = false;
  selectedPeriod: 'week' | 'month' | 'quarter' | 'year' = 'month';
  revenuePeriod = '6';
  lastUpdated: Date = new Date();

  // Dados de analytics
  analyticsData: AnalyticsData | null = null;
  revenueProgress: number = 0;

  // Charts
  private charts: { [key: string]: Chart } = {};

  constructor() {}

  ngOnInit() {
    this.loadAnalyticsData();
  }

  async ngAfterViewInit() {
    // Inicializar charts após a view estar pronta
    setTimeout(async () => {
      if (this.analyticsData) {
        await this.initializeCharts();
      }
    }, 100);
  }

  ngOnDestroy() {
    // Destruir todos os charts
    Object.values(this.charts).forEach(chart => {
      if (chart) chart.destroy();
    });
  }

  /**
   * Carregar dados de analytics
   */
  async loadAnalyticsData() {
    try {
      this.isLoading = true;

      const filters: AnalyticsPeriodFilter = {
        period: this.selectedPeriod
      };

      // Carregar dados de analytics
      this.analyticsData = await firstValueFrom(this.analyticsService.getAnalytics(filters));
      this.lastUpdated = new Date();

      // Calcular progresso de receita uma vez
      this.calculateRevenueProgress();

      // Inicializar charts
      setTimeout(() => this.initializeCharts(), 100);

    } catch (error) {
      console.error('Erro ao carregar analytics:', error);
      // Mostrar mensagem de erro para o usuário
      this.analyticsData = null;
    } finally {
      this.isLoading = false;
    }
  }



  /**
   * Obter classe de tendência
   */
  getTrendClass(trend: number): string {
    return trend >= 0 ? 'positive' : 'negative';
  }


  /**
   * Definir período
   */
  setPeriod(period: 'week' | 'month' | 'quarter' | 'year') {
    if (this.selectedPeriod !== period) {
      this.selectedPeriod = period;
      this.loadAnalyticsData();
    }
  }

  /**
   * Atualizar dados
   */
  async refreshData() {
    this.isRefreshing = true;
    await this.loadAnalyticsData();
    this.isRefreshing = false;
  }

  /**
   * Inicializar charts
   */
  private async initializeCharts() {
    // Lazy load Chart.js
    const { Chart, registerables } = await import('chart.js');
    Chart.register(...registerables);
    
    // Assign Chart to class property for use in other methods
    (window as any).Chart = Chart;
    
    this.initConversionGauge();
    this.initContractsDonut();
    this.initServicesByUserChart();
    this.initCompletedServicesChart();
    this.initClientCompletionChart();
    this.initTopServicesChart();
  }

  /**
   * Gauge de conversão
   */
  private initConversionGauge() {
    const canvas = document.getElementById('conversionGauge') as HTMLCanvasElement;
    if (!canvas || !this.analyticsData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const conversionRate = this.analyticsData.general.conversionRate;

    const Chart = (window as any).Chart;
    this.charts['conversionGauge'] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        datasets: [{
          data: [conversionRate, 100 - conversionRate],
          backgroundColor: ['#0A8060', '#e5e7eb'],
          borderWidth: 0,
          circumference: 180,
          rotation: 270
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '75%',
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false }
        }
      }
    });
  }

  /**
   * Donut de contratos
   */
  private initContractsDonut() {
    const canvas = document.getElementById('contractsDonut') as HTMLCanvasElement;
    if (!canvas || !this.analyticsData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { activeContracts, completedContracts } = this.analyticsData.general;
    const suspendedContracts = Math.max(0, this.analyticsData.general.totalContracts - activeContracts - completedContracts);

    const Chart = (window as any).Chart;
    this.charts['contractsDonut'] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Ativos', 'Concluídos', 'Outros'],
        datasets: [{
          data: [activeContracts, completedContracts, suspendedContracts],
          backgroundColor: ['#0A8060', '#6366f1', '#e5e7eb'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context: any) => {
                const label = context.label || '';
                const value = context.parsed || 0;
                return `${label}: ${value}`;
              }
            }
          }
        }
      }
    });
  }




  // Métodos de formatação e utilitários

  formatCurrency(value: number): string {
    return this.contractService.formatValue(value);
  }


  private calculateRevenueProgress(): void {
    if (!this.analyticsData?.revenue) {
      this.revenueProgress = 0;
      return;
    }
    const { totalCollected, totalPending } = this.analyticsData.revenue;
    const total = totalCollected + totalPending;
    this.revenueProgress = total > 0 ? Math.round((totalCollected / total) * 100) : 0;
  }

  getRevenueProgress(): number {
    return this.revenueProgress;
  }

  getClientTypePercentage(type: 'pf' | 'pj'): number {
    if (!this.analyticsData?.clients) return 0;
    const { pf, pj } = this.analyticsData.clients.byType;
    const total = pf + pj;
    if (total === 0) return 0;
    return Math.round(((type === 'pf' ? pf : pj) / total) * 100);
  }

  // Métodos de ações

  exportChart(chartName: string) {
    const chart = this.charts[chartName];
    if (!chart) return;

    const url = chart.toBase64Image();
    const link = document.createElement('a');
    link.download = `${chartName}_chart.png`;
    link.href = url;
    link.click();
  }

  async exportAnalytics(format: 'excel' | 'json') {
    try {
      const blob = await firstValueFrom(this.analyticsService.exportAnalytics(format));
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `analytics_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'json'}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao exportar analytics:', error);
    }
  }

  generateReport() {
    // Navegar para página de relatórios
    this.router.navigate(['/home/relatorios']);
  }

  /**
   * Gráfico de distribuição de serviços por usuário
   */
  private initServicesByUserChart() {
    const canvas = document.getElementById('servicesByUserChart') as HTMLCanvasElement;
    if (!canvas || !this.analyticsData?.servicesByUser || this.analyticsData.servicesByUser.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const data = this.analyticsData.servicesByUser.slice(0, 8); // Top 8 usuários
    if (data.length === 0) return;
    const labels = data.map((user: any) => user.userName);
    const values = data.map((user: any) => user.totalServices);

    const Chart = (window as any).Chart;
    this.charts['servicesByUserChart'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Serviços',
          data: values,
          backgroundColor: [
            '#0A8060',
            '#6366f1',
            '#f59e0b',
            '#8b5cf6',
            '#10b981',
            '#f97316',
            '#ef4444',
            '#06b6d4'
          ],
          borderColor: '#ffffff',
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#fff',
            titleColor: '#374151',
            bodyColor: '#374151',
            borderColor: '#e5e7eb',
            borderWidth: 1,
            callbacks: {
              label: (context: any) => {
                const user = data[context.dataIndex];
                return `${user.totalServices} serviços`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { 
              color: '#6b7280',
              maxRotation: 45
            }
          },
          y: {
            grid: { color: 'rgba(0, 0, 0, 0.05)' },
            ticks: { 
              color: '#6b7280',
              stepSize: 1
            },
            beginAtZero: true
          }
        }
      }
    });
  }

  /**
   * Gráfico de serviços concluídos ao longo do tempo
   */
  private initCompletedServicesChart() {
    const canvas = document.getElementById('completedServicesChart') as HTMLCanvasElement;
    if (!canvas || !this.analyticsData?.completedServices) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const data = this.analyticsData.completedServices;
    const labels = data.map((item: any) => item.month);
    const values = data.map((item: any) => item.completed);

    const Chart = (window as any).Chart;
    this.charts['completedServicesChart'] = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Serviços Concluídos',
          data: values,
          borderColor: '#0A8060',
          backgroundColor: 'rgba(10, 128, 96, 0.1)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#0A8060',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#fff',
            titleColor: '#374151',
            bodyColor: '#374151',
            borderColor: '#e5e7eb',
            borderWidth: 1
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(0, 0, 0, 0.05)' },
            ticks: { color: '#6b7280' }
          },
          y: {
            grid: { color: 'rgba(0, 0, 0, 0.05)' },
            ticks: { 
              color: '#6b7280',
              stepSize: 1
            },
            beginAtZero: true
          }
        }
      }
    });
  }

  /**
   * Gráfico de taxa de conclusão por cliente
   */
  private initClientCompletionChart() {
    const canvas = document.getElementById('clientCompletionChart') as HTMLCanvasElement;
    if (!canvas) {
      this.showChartError('clientCompletionChart', 'Canvas não encontrado');
      return;
    }

    // Ajustar altura dinamicamente baseada no número de clientes
    const clientCount = this.analyticsData?.clientCompletionData?.length || 0;
    const minHeight = 400;
    const heightPerClient = 40; // 40px por cliente
    const dynamicHeight = Math.max(minHeight, clientCount * heightPerClient);
    
    canvas.style.height = `${dynamicHeight}px`;
    canvas.parentElement!.style.height = `${dynamicHeight}px`;

    // Destruir chart existente se houver
    if (this.charts['clientCompletionChart']) {
      this.charts['clientCompletionChart'].destroy();
      delete this.charts['clientCompletionChart'];
    }
    
    if (!this.analyticsData?.clientCompletionData) {
      this.showChartError('clientCompletionChart', 'Dados não disponíveis');
      return;
    }
    
    if (this.analyticsData.clientCompletionData.length === 0) {
      this.showChartError('clientCompletionChart', 'Nenhum dado de cliente encontrado');
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      this.showChartError('clientCompletionChart', 'Erro ao obter contexto do canvas');
      return;
    }

    try {
      const data = this.analyticsData.clientCompletionData; // TODOS os clientes
      
      const labels = data.map((client: any, index: number) => {
        let name = client.clientName || `Cliente #${client.clientId || index + 1}`;
        
        // Remover prefixos desnecessários
        if (name.startsWith('Cliente #') && client.clientId) {
          name = `Cliente #${client.clientId}`;
        }
        
        // Truncar nomes muito longos para melhor visualização
        const finalName = name.length > 30 ? name.substring(0, 30) + '...' : name;
        return finalName;
      });
      
      const completionValues = data.map((client: any) => {
        const percentage = client.completionPercentage || 0;
        // Garantir que seja um número válido e entre 0-100
        const validPercentage = Math.max(0, Math.min(100, percentage));
        // Para valores muito baixos (mas > 0), garantir altura mínima visível
        return validPercentage === 0 ? 0 : Math.max(validPercentage, 2);
      });

      // Todas as barras em cinza
      const colors = completionValues.map(() => '#6b7280'); // Cinza para todas as barras

      const Chart = (window as any).Chart;
      if (!Chart) {
        this.showChartError('clientCompletionChart', 'Chart.js não carregado');
        return;
      }

      this.charts['clientCompletionChart'] = new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Taxa de Conclusão (%)',
            data: completionValues,
            backgroundColor: colors,
            borderColor: '#ffffff',
            borderWidth: 1,
            borderRadius: 6,
            borderSkipped: false,
            barThickness: 'flex',
            maxBarThickness: 35,
            minBarLength: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'y', // Barras horizontais
          layout: {
            padding: {
              left: 10,
              right: 10,
              top: 10,
              bottom: 10
            }
          },
          plugins: {
            legend: { 
              display: false 
            },
            tooltip: {
              backgroundColor: '#fff',
              titleColor: '#374151',
              bodyColor: '#374151',
              borderColor: '#e5e7eb',
              borderWidth: 1,
              titleFont: {
                size: 14,
                weight: 'bold'
              },
              bodyFont: {
                size: 12
              },
              callbacks: {
                title: (context: any) => {
                  const client = data[context[0].dataIndex];
                  return client.clientName || 'Cliente';
                },
                label: (context: any) => {
                  const client = data[context.dataIndex];
                  return [
                    `📊 ${client.completionPercentage || 0}% concluído`,
                    `📋 ${client.activeContracts || 0} contratos ativos`
                  ];
                }
              }
            }
          },
          scales: {
            x: {
              grid: { 
                color: 'rgba(0, 0, 0, 0.05)',
                drawBorder: false
              },
              ticks: { 
                color: '#6b7280',
                font: {
                  size: 11
                },
                stepSize: 10,
                callback: function(value: any) {
                  return value + '%';
                }
              },
              beginAtZero: true,
              min: 0,
              max: 100,
              title: {
                display: true,
                text: 'Taxa de Conclusão (%)',
                color: '#6b7280',
                font: {
                  size: 12,
                  weight: 'bold'
                }
              }
            },
            y: {
              grid: { 
                display: false 
              },
              ticks: { 
                color: '#6b7280',
                font: {
                  size: 11
                },
                maxRotation: 0,
                callback: function(value: any, index: any) {
                  const label = labels[index];
                  // Limitar ainda mais o tamanho no eixo Y
                  return label && label.length > 25 ? label.substring(0, 25) + '...' : label;
                }
              }
            }
          },
          animation: {
            duration: 1000,
            easing: 'easeInOutQuart'
          }
        }
      });
      
    } catch (error: any) {
      this.showChartError('clientCompletionChart', `Erro ao criar gráfico: ${error?.message || 'Erro desconhecido'}`);
    }
  }

  /**
   * Mostrar mensagem de erro no lugar do gráfico
   */
  private showChartError(chartId: string, message: string) {
    const canvas = document.getElementById(chartId) as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Limpar o canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Configurar texto
    ctx.fillStyle = '#6b7280';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Desenhar mensagem de erro
    ctx.fillText(message, canvas.width / 2, canvas.height / 2 - 10);
    ctx.fillText('Verifique os dados ou recarregue a página', canvas.width / 2, canvas.height / 2 + 10);
  }

  /**
   * Gráfico de serviços mais contratados
   */
  private initTopServicesChart() {
    const canvas = document.getElementById('topServicesChart') as HTMLCanvasElement;
    if (!canvas || !this.analyticsData?.topServices || this.analyticsData.topServices.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const data = this.analyticsData.topServices.slice(0, 10); // Top 10
    if (data.length === 0) return;
    const labels = data.map((service: any) => service.name);
    const values = data.map((service: any) => service.contractCount);

    // Cores categorizadas
    const colors = [
      '#0A8060', '#6366f1', '#f59e0b', '#8b5cf6', '#10b981',
      '#f97316', '#ef4444', '#06b6d4', '#84cc16', '#f43f5e'
    ];

    const Chart = (window as any).Chart;
    this.charts['topServicesChart'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Contratos',
          data: values,
          backgroundColor: colors,
          borderColor: '#ffffff',
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y', // Barras horizontais
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#fff',
            titleColor: '#374151',
            bodyColor: '#374151',
            borderColor: '#e5e7eb',
            borderWidth: 1,
            callbacks: {
              label: (context: any) => {
                const service = data[context.dataIndex];
                return `${service.contractCount} contratos - ${this.formatCurrency(service.totalValue)}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(0, 0, 0, 0.05)' },
            ticks: { 
              color: '#6b7280',
              stepSize: 1
            },
            beginAtZero: true
          },
          y: {
            grid: { display: false },
            ticks: { 
              color: '#6b7280',
              callback: function(value: any) {
                const label = labels[value as number];
                return label && label.length > 25 ? label.substring(0, 25) + '...' : label;
              }
            }
          }
        }
      }
    });
  }

}