import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';
import { FormsModule } from '@angular/forms';

Chart.register(...registerables);

interface ServiceData {
  name: string;
  value: number;
  color: string;
  icon: string;
  contracts: number;
}

interface MetricData {
  label: string;
  value: string | number;
  icon: string;
  color: string;
  trend?: number;
  suffix?: string;
}

@Component({
  selector: 'app-analytics-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './analytics-page.html',
  styleUrls: ['./analytics-page.css']
})
export class AnalyticsPageComponent implements OnInit, AfterViewInit, OnDestroy {
  // Período selecionado
  selectedPeriod: 'week' | 'month' | 'quarter' | 'year' = 'month';
  
  // Analytics data
  successRate = 92;
  topService = 'OKR';
  topServicePercentage = 25;
  
  // Service distribution data
  services: ServiceData[] = [
    { 
      name: 'Diagnóstico Organizacional', 
      value: 25, 
      color: '#003b2b',
      icon: 'fas fa-stethoscope',
      contracts: 6
    },
    { 
      name: 'OKR', 
      value: 20, 
      color: '#6366f1',
      icon: 'fas fa-bullseye',
      contracts: 5
    },
    { 
      name: 'Mentoria', 
      value: 18, 
      color: '#ec4899',
      icon: 'fas fa-user-tie',
      contracts: 4
    },
    { 
      name: 'RH', 
      value: 15, 
      color: '#fb923c',
      icon: 'fas fa-users',
      contracts: 3
    },
    { 
      name: 'Outros', 
      value: 22, 
      color: '#94a3b8',
      icon: 'fas fa-ellipsis-h',
      contracts: 6
    }
  ];

  // Métricas principais
  metrics: MetricData[] = [
    {
      label: 'Contratos Ativos',
      value: 18,
      icon: 'fas fa-file-contract',
      color: '#003b2b',
      trend: 12
    },
    {
      label: 'Renovação Média',
      value: 85,
      icon: 'fas fa-sync',
      color: '#003b2b',
      trend: 5,
      suffix: '%'
    },
    {
      label: 'Tempo Médio de Projeto',
      value: '3.5',
      icon: 'fas fa-clock',
      color: '#003b2b',
      trend: -8,
      suffix: ' meses'
    },
    {
      label: 'NPS Score',
      value: 78,
      icon: 'fas fa-smile',
      color: '#003b2b',
      trend: 15
    }
  ];

  // Dados de evolução mensal
  monthlyEvolution = {
    labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
    datasets: [
      {
        label: 'Novos Contratos',
        data: [3, 5, 4, 7, 6, 8],
        borderColor: '#003b2b',
        backgroundColor: 'rgba(14, 155, 113, 0.1)'
      },
      {
        label: 'Serviços Concluídos',
        data: [8, 12, 10, 15, 14, 18],
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.1)'
      }
    ]
  };

  // Charts
  servicesChart: Chart | null = null;
  evolutionChart: Chart | null = null;
  satisfactionChart: Chart | null = null;

  constructor() {}

  ngOnInit() {
    // Carregar dados baseado no período selecionado
    this.loadAnalyticsData();
  }

  ngAfterViewInit() {
    // Pequeno delay para garantir que os canvas estão renderizados
    setTimeout(() => {
      this.initCharts();
    }, 100);
  }

  ngOnDestroy() {
    // Destruir gráficos ao sair
    if (this.servicesChart) this.servicesChart.destroy();
    if (this.evolutionChart) this.evolutionChart.destroy();
    if (this.satisfactionChart) this.satisfactionChart.destroy();
  }

  /**
   * Mudar período de análise
   */
  onPeriodChange() {
    this.loadAnalyticsData();
    this.updateCharts();
  }

  /**
   * Carregar dados de analytics
   */
  private loadAnalyticsData() {
    // TODO: Implementar carregamento real de dados baseado no período
    console.log('Carregando dados para período:', this.selectedPeriod);
  }

  /**
   * Inicializar todos os gráficos
   */
  private initCharts() {
    this.initServicesChart();
    this.initEvolutionChart();
    this.initSatisfactionChart();
  }

  /**
   * Gráfico de distribuição de serviços (Doughnut)
   */
  private initServicesChart() {
    const canvas = document.getElementById('servicesChart') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isDarkMode = document.body.classList.contains('dark-mode');

    this.servicesChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: this.services.map(s => s.name),
        datasets: [{
          data: this.services.map(s => s.value),
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
                const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return `${label}: ${percentage}%`;
              }
            }
          }
        }
      }
    });
  }

  /**
   * Gráfico de evolução temporal (Line)
   */
  private initEvolutionChart() {
    const canvas = document.getElementById('evolutionChart') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isDarkMode = document.body.classList.contains('dark-mode');
    const textColor = isDarkMode ? '#e5e7eb' : '#374151';
    const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

    this.evolutionChart = new Chart(ctx, {
      type: 'line',
      data: this.monthlyEvolution,
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
            labels: {
              color: textColor,
              padding: 15,
              usePointStyle: true,
              font: {
                size: 12
              }
            }
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
          }
        },
        elements: {
          line: {
            tension: 0.4,
            borderWidth: 3
          },
          point: {
            radius: 4,
            hoverRadius: 6,
            backgroundColor: '#fff',
            borderWidth: 2
          }
        }
      }
    });
  }

  /**
   * Gráfico de satisfação (Gauge/Radial)
   */
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

  /**
   * Atualizar gráficos ao mudar período
   */
  private updateCharts() {
    // TODO: Implementar atualização dos gráficos com novos dados
    if (this.evolutionChart) {
      // Atualizar dados do gráfico de evolução
      this.evolutionChart.update();
    }
  }

  /**
   * Obter ícone para tendência
   */
  getTrendIcon(trend?: number): string {
    if (!trend) return '';
    return trend > 0 ? 'fas fa-arrow-up' : 'fas fa-arrow-down';
  }

  /**
   * Obter classe CSS para tendência
   */
  getTrendClass(trend?: number): string {
    if (!trend) return '';
    return trend > 0 ? 'positive' : 'negative';
  }

  /**
   * Formatar valor da métrica
   */
  formatMetricValue(metric: MetricData): string {
    if (typeof metric.value === 'number') {
      return metric.value + (metric.suffix || '');
    }
    return metric.value;
  }

  public abs(value: number): number {
    return Math.abs(value);
  }
}