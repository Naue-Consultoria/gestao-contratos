import { Component, OnInit, AfterViewInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables, ChartConfiguration } from 'chart.js';
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

Chart.register(...registerables);

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

  ngAfterViewInit() {
    // Inicializar charts após a view estar pronta
    setTimeout(() => {
      if (this.analyticsData) {
        this.initializeCharts();
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
  private initializeCharts() {
    this.initConversionGauge();
    this.initContractsDonut();
    this.initServicesByUserChart();
    this.initCompletedServicesChart();
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
              label: (context) => {
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
              label: (context) => {
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
              label: (context) => {
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