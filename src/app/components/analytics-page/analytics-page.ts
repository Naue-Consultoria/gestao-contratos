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
  chartView: 'combined' | 'separate' = 'combined';
  revenuePeriod = '6';
  lastUpdated: Date = new Date();

  // Dados de analytics
  analyticsData: AnalyticsData | null = null;
  insights: string[] = [];
  detailedMetrics: DetailedMetric[] = [];
  topServices: ServiceAnalytics[] = [];

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
      
      // Carregar insights
      this.insights = await firstValueFrom(this.analyticsService.getInsights());

      // Processar dados
      this.processAnalyticsData();
      this.lastUpdated = new Date();

      // Inicializar charts
      setTimeout(() => this.initializeCharts(), 100);

    } catch (error) {
      console.error('Erro ao carregar analytics:', error);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Processar dados de analytics
   */
  private processAnalyticsData() {
    if (!this.analyticsData) return;

    // Processar métricas detalhadas
    this.detailedMetrics = [
      {
        label: 'Valor Médio do Contrato',
        value: this.analyticsData.general.averageContractValue,
        icon: 'fas fa-calculator',
        color: '#0A8060',
        isCurrency: true,
        trend: 8.5
      },
      {
        label: 'Duração Média (dias)',
        value: this.analyticsData.general.averageContractDuration,
        icon: 'fas fa-hourglass-half',
        color: '#6366f1',
        trend: -5.2
      },
      {
        label: 'Novos Clientes',
        value: this.analyticsData.clients.newClients,
        icon: 'fas fa-user-plus',
        color: '#f59e0b',
        trend: 15.3
      },
      {
        label: 'Taxa de Retenção',
        value: 87,
        icon: 'fas fa-handshake',
        color: '#10b981',
        suffix: '%',
        trend: 3.1
      },
      {
        label: 'Ticket Médio',
        value: this.calculateAverageTicket(),
        icon: 'fas fa-receipt',
        color: '#8b5cf6',
        isCurrency: true,
        trend: 12.8
      },
      {
        label: 'Contratos Vencendo',
        value: this.calculateExpiringContracts(),
        icon: 'fas fa-exclamation-triangle',
        color: '#f97316',
        trend: -8.4
      }
    ];

    // Top 5 serviços
    this.topServices = this.analyticsData.services
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, 5);
  }

  /**
   * Calcular ticket médio
   */
  private calculateAverageTicket(): number {
    if (!this.analyticsData?.general) return 0;
    const { totalRevenue, totalContracts } = this.analyticsData.general;
    return totalContracts > 0 ? totalRevenue / totalContracts : 0;
  }

  /**
   * Calcular contratos vencendo
   */
  private calculateExpiringContracts(): number {
    // Simulação - em produção viria da API
    return Math.floor(Math.random() * 15) + 5;
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
   * Definir visualização do gráfico
   */
  setChartView(view: 'combined' | 'separate') {
    this.chartView = view;
    this.updateEvolutionChart();
  }

  /**
   * Inicializar todos os charts
   */
  private initializeCharts() {
    this.initConversionGauge();
    this.initContractsDonut();
    this.initGrowthSparkline();
    this.initEvolutionChart();
    this.initServicesChart();
    this.initClientTypeChart();
    this.initRevenueChart();
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

  /**
   * Sparkline de crescimento
   */
  private initGrowthSparkline() {
    const canvas = document.getElementById('growthSparkline') as HTMLCanvasElement;
    if (!canvas || !this.analyticsData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Gerar dados simulados de crescimento
    const growthData = Array.from({ length: 12 }, () => Math.random() * 30 - 10);

    this.charts['growthSparkline'] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: Array.from({ length: 12 }, (_, i) => `M${i + 1}`),
        datasets: [{
          data: growthData,
          borderColor: '#0A8060',
          backgroundColor: 'rgba(10, 128, 96, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false }
        },
        scales: {
          x: { display: false },
          y: { display: false }
        }
      }
    });
  }

  /**
   * Gráfico de evolução
   */
  private initEvolutionChart() {
    const canvas = document.getElementById('evolutionChart') as HTMLCanvasElement;
    if (!canvas || !this.analyticsData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const monthlyData = this.analyticsData.contracts.byMonth;
    const labels = monthlyData.map(d => d.month);
    const newContracts = monthlyData.map(d => d.new);
    const completedContracts = monthlyData.map(d => d.completed);
    const revenue = monthlyData.map(d => d.revenue);

    this.charts['evolutionChart'] = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Novos Contratos',
            data: newContracts,
            borderColor: '#0A8060',
            backgroundColor: 'rgba(10, 128, 96, 0.1)',
            fill: true,
            tension: 0.4,
            yAxisID: 'y'
          },
          {
            label: 'Receita (R$ mil)',
            data: revenue.map(r => r / 1000),
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            fill: true,
            tension: 0.4,
            yAxisID: 'y1'
          },
          {
            label: 'Concluídos',
            data: completedContracts,
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            fill: false,
            tension: 0.4,
            yAxisID: 'y'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
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
            borderWidth: 1
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(0, 0, 0, 0.05)' },
            ticks: { color: '#6b7280' }
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            grid: { color: 'rgba(0, 0, 0, 0.05)' },
            ticks: { color: '#6b7280' }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            grid: { drawOnChartArea: false },
            ticks: { color: '#6b7280' }
          }
        }
      }
    });
  }

  /**
   * Gráfico de serviços
   */
  private initServicesChart() {
    const canvas = document.getElementById('servicesChart') as HTMLCanvasElement;
    if (!canvas || !this.topServices.length) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const colors = ['#0A8060', '#6366f1', '#f59e0b', '#10b981', '#8b5cf6'];

    this.charts['servicesChart'] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: this.topServices.map(s => s.name),
        datasets: [{
          data: this.topServices.map(s => s.totalContracts),
          backgroundColor: colors.slice(0, this.topServices.length),
          borderWidth: 0,
          spacing: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
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
                const label = context.label || '';
                const value = context.parsed || 0;
                const percentage = this.topServices[context.dataIndex].popularity;
                return `${label}: ${value} contratos (${percentage.toFixed(1)}%)`;
              }
            }
          }
        }
      }
    });
  }

  /**
   * Gráfico de tipo de cliente
   */
  private initClientTypeChart() {
    const canvas = document.getElementById('clientTypeChart') as HTMLCanvasElement;
    if (!canvas || !this.analyticsData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { pf, pj } = this.analyticsData.clients.byType;

    this.charts['clientTypeChart'] = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['Pessoa Física', 'Pessoa Jurídica'],
        datasets: [{
          data: [pf, pj],
          backgroundColor: ['#0A8060', '#6366f1'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.parsed || 0;
                const total = pf + pj;
                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
                return `${context.label}: ${value} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  }

  /**
   * Gráfico de receita
   */
  private initRevenueChart() {
    const canvas = document.getElementById('revenueChart') as HTMLCanvasElement;
    if (!canvas || !this.analyticsData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const revenueData = this.analyticsData.revenue.monthly;
    const labels = revenueData.map(r => r.month);
    const revenue = revenueData.map(r => r.revenue);
    const projected = revenueData.map(r => r.projected);

    this.charts['revenueChart'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Receita Real',
            data: revenue,
            backgroundColor: '#0A8060',
            borderRadius: 6
          },
          {
            label: 'Projeção',
            data: projected,
            backgroundColor: 'rgba(10, 128, 96, 0.3)',
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { padding: 20 }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.parsed.y;
                return `${context.dataset.label}: ${this.formatCurrency(value)}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#6b7280' }
          },
          y: {
            grid: { color: 'rgba(0, 0, 0, 0.05)' },
            ticks: { 
              color: '#6b7280',
              callback: (value) => this.formatCurrency(Number(value))
            }
          }
        }
      }
    });
  }

  /**
   * Atualizar gráfico de evolução
   */
  private updateEvolutionChart() {
    if (this.charts['evolutionChart']) {
      // Recriar o gráfico com a nova configuração
      this.charts['evolutionChart'].destroy();
      this.initEvolutionChart();
    }
  }

  /**
   * Atualizar gráfico de receita
   */
  updateRevenueChart() {
    if (this.charts['revenueChart']) {
      this.charts['revenueChart'].destroy();
      this.initRevenueChart();
    }
  }

  // Métodos de formatação e utilitários

  formatCurrency(value: number): string {
    return this.contractService.formatValue(value);
  }

  formatGrowthRate(rate: number): string {
    const sign = rate >= 0 ? '+' : '';
    return `${sign}${rate.toFixed(1)}`;
  }

  formatMetricValue(metric: DetailedMetric): string {
    if (metric.isCurrency && typeof metric.value === 'number') {
      return this.formatCurrency(metric.value);
    }
    if (typeof metric.value === 'number') {
      return metric.value.toLocaleString('pt-BR') + (metric.suffix || '');
    }
    return String(metric.value);
  }

  getTrendClass(trend?: number): string {
    if (trend === undefined) return '';
    return trend >= 0 ? 'positive' : 'negative';
  }

  getTrendIcon(trend?: number): string {
    if (trend === undefined) return '';
    return trend >= 0 ? 'fas fa-arrow-up' : 'fas fa-arrow-down';
  }

  getRevenueProgress(): number {
    if (!this.analyticsData?.revenue) return 0;
    const { totalCollected, totalPending } = this.analyticsData.revenue;
    const total = totalCollected + totalPending;
    return total > 0 ? Math.round((totalCollected / total) * 100) : 0;
  }

  getClientTypePercentage(type: 'pf' | 'pj'): number {
    if (!this.analyticsData?.clients) return 0;
    const { pf, pj } = this.analyticsData.clients.byType;
    const total = pf + pj;
    if (total === 0) return 0;
    return Math.round(((type === 'pf' ? pf : pj) / total) * 100);
  }

  getMonthlyAverage(): number {
    if (!this.analyticsData?.revenue.monthly) return 0;
    const revenues = this.analyticsData.revenue.monthly.map(r => r.revenue);
    return revenues.reduce((sum, r) => sum + r, 0) / revenues.length;
  }

  getHighestMonth(): number {
    if (!this.analyticsData?.revenue.monthly) return 0;
    const revenues = this.analyticsData.revenue.monthly.map(r => r.revenue);
    return Math.max(...revenues);
  }

  abs(value: number): number {
    return Math.abs(value);
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
    this.router.navigate(['/home/reports']);
  }

  shareAnalytics() {
    if (navigator.share) {
      navigator.share({
        title: 'Analytics Dashboard - NAUE Consultoria',
        text: 'Confira nossos indicadores de performance',
        url: window.location.href
      });
    } else {
      // Fallback para copiar URL
      navigator.clipboard.writeText(window.location.href);
    }
  }

  scheduleReport() {
    // Implementar modal de agendamento
    console.log('Agendar relatório - implementar modal');
  }
}