import { Component, OnInit, AfterViewInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ContractService, ApiContract } from '../../services/contract';
import { ServiceService, ServiceStats } from '../../services/service';
import { ProposalService } from '../../services/proposal';

Chart.register(...registerables);

interface ServiceData {
  name: string;
  value: number;
  color: string;
  icon: string;
  contracts: number;
  activeContracts: number;
  completedContracts: number;
}

interface MetricData {
  label: string;
  value: string | number;
  icon: string;
  color: string;
  trend?: number;
  suffix?: string;
  isCurrency?: boolean;
}

@Component({
  selector: 'app-analytics-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './analytics-page.html',
  styleUrls: ['./analytics-page.css']
})
export class AnalyticsPageComponent implements OnInit, AfterViewInit, OnDestroy {
  private contractService = inject(ContractService);
  private serviceService = inject(ServiceService);
  private proposalService = inject(ProposalService);

  selectedPeriod: 'month' | 'quarter' | 'year' = 'month';
  
  // --- Analytics Data ---
  isLoading = true;
  successRate = 0;
  topService = 'N/A';
  topServicePercentage = 0;

  topServiceData: ServiceData | null = null;
  
  services: ServiceData[] = [];
  metrics: MetricData[] = [];

  // Dados de evolução mensal
   monthlyEvolution: { labels: string[], datasets: any[] } = { labels: [], datasets: [] };

  // Charts
  servicesChart: Chart | null = null;
  evolutionChart: Chart | null = null;
  satisfactionChart: Chart | null = null;

  constructor() {}

  ngOnInit() {
    this.loadAnalyticsData();
  }

  ngAfterViewInit() {}

  ngOnDestroy() {
    if (this.servicesChart) this.servicesChart.destroy();
    if (this.evolutionChart) this.evolutionChart.destroy();
    if (this.satisfactionChart) this.satisfactionChart.destroy();
  }

  onPeriodChange() {
    this.loadAnalyticsData();
  }

  private async loadAnalyticsData() {
    this.isLoading = true;
    try {
      const [contractStats, serviceStats, proposalStats, allContractsResponse] = await Promise.all([
        firstValueFrom(this.contractService.getStats({ period: this.selectedPeriod })),
        firstValueFrom(this.serviceService.getStats({ period: this.selectedPeriod })),
        firstValueFrom(this.proposalService.getProposalStats()),
        firstValueFrom(this.contractService.getContracts({ period: this.selectedPeriod }))
      ]);

      const allContracts = allContractsResponse?.contracts || [];

      if (proposalStats?.stats) {
        const stats = proposalStats.stats;
        const totalConsidered = stats.byStatus.sent + stats.byStatus.accepted + stats.byStatus.rejected;
        
        if (totalConsidered > 0) {
          this.successRate = Math.round((stats.byStatus.accepted / totalConsidered) * 100);
        } else {
          this.successRate = 0;
        }
      }

      if (contractStats?.stats) {
        const stats = contractStats.stats;
        this.metrics = [
          { label: 'Contratos Ativos', value: stats.active, icon: 'fas fa-file-contract', color: '#0A8060', trend: 12 },
          { label: 'Valor Total Ativo', value: stats.totalValueActive, icon: 'fas fa-dollar-sign', color: '#0A8060', trend: 5, isCurrency: true },
          { label: 'Duração Média', value: stats.averageDuration, icon: 'fas fa-clock', color: '#0A8060', trend: -8, suffix: ' dias' },
          { label: 'Total de Contratos', value: stats.total, icon: 'fas fa-list-alt', color: '#0A8060', trend: 15 }
        ];
      }

      if (serviceStats?.stats) {
        this.services = this.mapServiceStatsToChartData(serviceStats.stats, allContracts);

        if (this.services.length > 0) {
          this.topServiceData = this.services.reduce((prev, current) => (prev.contracts > current.contracts) ? prev : current);
          this.topService = this.topServiceData.name;
          
          const totalServiceContracts = this.services.reduce((sum, s) => sum + s.contracts, 0);
          this.topServicePercentage = totalServiceContracts > 0 
            ? Math.round((this.topServiceData.contracts / totalServiceContracts) * 100) 
            : 0;
        }
      }

      if (allContractsResponse?.contracts) {
        this.monthlyEvolution = this.processEvolutionData(allContractsResponse.contracts);
      }

    } catch (error) {
      console.error('❌ Error loading analytics data:', error);
    } finally {
      this.isLoading = false;
      this.initCharts();
    }
  }

  private processEvolutionData(contracts: ApiContract[]): { labels: string[], datasets: any[] } {
    const labels: string[] = [];
    const newContractsData: number[] = [];
    const completedContractsData: number[] = [];
    
    // Get the last 6 months including the current one
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      labels.push(d.toLocaleString('default', { month: 'short' }));
      newContractsData.push(0);
      completedContractsData.push(0);
    }

    // Populate the data arrays
    contracts.forEach(contract => {
      const contractDate = new Date(contract.created_at);
      const monthIndex = (contractDate.getMonth() - (new Date().getMonth() - 5) + 12) % 12;
      
      if (monthIndex >= 0 && monthIndex < 6) {
        newContractsData[monthIndex]++;
        if (contract.status === 'completed') {
          completedContractsData[monthIndex]++;
        }
      }
    });

    return {
      labels,
      datasets: [
        {
          label: 'Novos Contratos',
          data: newContractsData,
          borderColor: '#0A8060',
          backgroundColor: 'rgba(14, 155, 113, 0.1)',
          fill: true,
          tension: 0.4
        },
        {
          label: 'Contratos Concluídos',
          data: completedContractsData,
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          fill: true,
          tension: 0.4
        }
      ]
    };
  }

  private mapServiceStatsToChartData(stats: ServiceStats, allContracts: ApiContract[]): ServiceData[] {
    const categoryStats = stats.categoryStats || {};
    const totalContracts = stats.total;
    const colors = ['#0A8060', '#6366f1', '#ec4899', '#fb923c', '#94a3b8'];
    const icons: { [key: string]: string } = {
        'Diagnóstico': 'fas fa-stethoscope',
        'OKR': 'fas fa-bullseye',
        'Mentoria': 'fas fa-user-tie',
        'RH': 'fas fa-users',
        'Consultoria': 'fas fa-comments',
        'Default': 'fas fa-concierge-bell'
    };

    return Object.entries(categoryStats)
      .map(([name, totalContracts], index) => {
        const active = allContracts.filter(c => c.status === 'active' && c.contract_services.some(s => s.service.category === name)).length;
        const completed = allContracts.filter(c => c.status === 'completed' && c.contract_services.some(s => s.service.category === name)).length;

        return {
          name: name,
          contracts: totalContracts,
          value: stats.total > 0 ? (totalContracts / stats.total) * 100 : 0,
          color: colors[index % colors.length],
          icon: icons[name] || icons['Default'],
          activeContracts: active,
          completedContracts: completed
        };
      })
      .sort((a, b) => b.contracts - a.contracts);
  }

  private initCharts() {
    setTimeout(() => {
      if (this.servicesChart) this.servicesChart.destroy();
      if (this.evolutionChart) this.evolutionChart.destroy();
      if (this.satisfactionChart) this.satisfactionChart.destroy();

      this.initServicesChart();
      this.initEvolutionChart();
      this.initSatisfactionChart();
    }, 100);
  }

  formatMetricValue(metric: MetricData): string {
    if (metric.isCurrency && typeof metric.value === 'number') {
      return this.contractService.formatValue(metric.value);
    }
    if (typeof metric.value === 'number') {
      return metric.value + (metric.suffix || '');
    }
    return metric.value;
  }

  private initServicesChart() {
    const canvas = document.getElementById('servicesChart') as HTMLCanvasElement;
    if (!canvas || this.services.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isDarkMode = document.body.classList.contains('dark-mode');

    this.servicesChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: this.services.map(s => s.name),
        datasets: [{
          data: this.services.map(s => s.contracts),
          backgroundColor: this.services.map(s => s.color),
          borderWidth: 0,
          spacing: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: isDarkMode ? '#374151' : '#fff',
            titleColor: isDarkMode ? '#fff' : '#000',
            bodyColor: isDarkMode ? '#fff' : '#000',
            borderColor: isDarkMode ? '#4b5563' : '#e5e7eb',
            borderWidth: 1,
            padding: 12,
            displayColors: true,
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const value = context.parsed || 0;
                return `${label}: ${value} contratos`;
              }
            }
          }
        }
      }
    });
  }

  private initEvolutionChart() {
    const canvas = document.getElementById('evolutionChart') as HTMLCanvasElement;
    if (!canvas || !this.monthlyEvolution.datasets.length) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const isDarkMode = document.body.classList.contains('dark-mode');
    const textColor = isDarkMode ? '#e5e7eb' : '#374151';
    const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

    this.evolutionChart = new Chart(ctx, {
      type: 'line',
      data: this.monthlyEvolution, // Use the dynamic data
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: textColor, padding: 15, usePointStyle: true, font: { size: 12 } }
          },
          tooltip: {
            backgroundColor: isDarkMode ? '#374151' : '#fff',
            titleColor: textColor,
            bodyColor: textColor,
            borderColor: isDarkMode ? '#4b5563' : '#e5e7eb',
            borderWidth: 1,
            padding: 12
          }
        },
        scales: {
          x: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 12 } } },
          y: { beginAtZero: true, grid: { color: gridColor }, ticks: { color: textColor, font: { size: 12 } } }
        },
        elements: {
          line: { borderWidth: 3 },
          point: { radius: 4, hoverRadius: 6, backgroundColor: '#fff', borderWidth: 2 }
        }
      }
    });
  }

  private initSatisfactionChart() {
    const canvas = document.getElementById('satisfactionChart') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isDarkMode = document.body.classList.contains('dark-mode');

    // Criar um gráfico de gauge usando doughnut
    this.satisfactionChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        datasets: [{
          data: [this.successRate, 100 - this.successRate],
          backgroundColor: ['#003b2b', isDarkMode ? '#374151' : '#e5e7eb'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        circumference: 180,
        rotation: 270,
        cutout: '80%',
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            enabled: false
          }
        }
      }
    });
  }

  getTrendIcon(trend?: number): string {
    if (!trend) return '';
    return trend > 0 ? 'fas fa-arrow-up' : 'fas fa-arrow-down';
  }

  getTrendClass(trend?: number): string {
    if (!trend) return '';
    return trend > 0 ? 'positive' : 'negative';
  }

  public abs(value: number): number {
    return Math.abs(value);
  }
}