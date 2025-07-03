import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';
import { Router } from '@angular/router';

Chart.register(...registerables);

interface StatCard {
  label: string;
  value: number;
  change: string;
  changeType: 'positive' | 'negative';
  icon: string;
  progress: number;
  color: string;
  bgColor: string;
}

interface Activity {
  time: string;
  title: string;
  description: string;
  type: 'diagnostic' | 'okr' | 'mentoring' | 'hr' | 'other';
  status: 'completed' | 'in-progress' | 'scheduled';
}

interface QuickAction {
  icon: string;
  label: string;
  color: string;
  action: string;
}

@Component({
  selector: 'app-dashboard-content',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-content.html',
  styleUrls: ['./dashboard-content.css']
})
export class DashboardContentComponent implements OnInit, AfterViewInit, OnDestroy {
  // Stat Cards
  statCards: StatCard[] = [
    {
      label: 'Total de Contratos',
      value: 24,
      change: '+12% este mês',
      changeType: 'positive',
      icon: 'fas fa-file-contract',
      progress: 75,
      color: '#0A8060',
      bgColor: 'rgba(14, 155, 113, 0.15)'
    },
    {
      label: 'Contratos Ativos',
      value: 18,
      change: '75% do total',
      changeType: 'positive',
      icon: 'fas fa-check-circle',
      progress: 75,
      color: '#0A8060',
      bgColor: 'rgba(14, 155, 113, 0.15)'
    },
    {
      label: 'Serviços em Andamento',
      value: 42,
      change: 'Em 18 contratos',
      changeType: 'positive',
      icon: 'fas fa-list-check',
      progress: 65,
      color: '#0A8060',
      bgColor: 'rgba(14, 155, 113, 0.15)'
    },
    {
      label: 'Próximas Atividades',
      value: 8,
      change: '3 urgentes',
      changeType: 'negative',
      icon: 'fas fa-clock',
      progress: 40,
      color: '#0A8060',
      bgColor: 'rgba(14, 155, 113, 0.15)'
    }
  ];

  // Atividades recentes
  recentActivities: Activity[] = [
    { 
      time: 'Há 2 horas', 
      title: 'Diagnóstico Organizacional - Empresa ABC', 
      description: 'Reunião inicial realizada com sucesso',
      type: 'diagnostic',
      status: 'completed'
    },
    { 
      time: 'Há 5 horas', 
      title: 'OKR - Tech Solutions', 
      description: 'Workshop de definição de objetivos concluído',
      type: 'okr',
      status: 'completed'
    },
    { 
      time: 'Ontem', 
      title: 'Mentoria Individual - Startup XYZ', 
      description: 'Sessão agendada para próxima semana',
      type: 'mentoring',
      status: 'scheduled'
    },
    {
      time: 'Há 2 dias',
      title: 'Consultoria RH - Inovação Corp',
      description: 'Análise de clima organizacional em andamento',
      type: 'hr',
      status: 'in-progress'
    },
    {
      time: 'Há 3 dias',
      title: 'Workshop de Liderança - GlobalTech',
      description: 'Treinamento para gestores finalizado',
      type: 'mentoring',
      status: 'completed'
    },
    {
      time: 'Há 4 dias',
      title: 'Análise de Processos - FinanceHub',
      description: 'Mapeamento de processos em fase final',
      type: 'diagnostic',
      status: 'in-progress'
    }
  ];

  // Ações rápidas
  quickActions: QuickAction[] = [
    { icon: 'fas fa-building', label: 'Nova Empresa', color: '#0A8060', action: 'newCompany' },
    { icon: 'fas fa-briefcase', label: 'Novo Serviço', color: '#0A8060', action: 'newService' },
    { icon: 'fas fa-plus', label: 'Novo Contrato', color: '#0A8060', action: 'newContract' },
    { icon: 'fas fa-chart-bar', label: 'Gerar Relatório', color: '#0A8060', action: 'generateReport' }
  ];

  // Dados para gráficos
  monthlyContractsData = {
    labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
    datasets: [{
      label: 'Contratos',
      data: [12, 15, 18, 22, 20, 24],
      borderColor: '#0A8060',
      backgroundColor: 'rgba(14, 155, 113, 0.1)',
      fill: true
    }]
  };

  // Charts
  contractsChart: Chart | null = null;

  // Filtros
  activityFilter: 'all' | 'completed' | 'in-progress' | 'scheduled' = 'all';

  constructor(private router: Router) {}

  ngOnInit() {
    this.loadDashboardData();
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.initCharts();
    }, 100);
  }

  ngOnDestroy() {
    if (this.contractsChart) {
      this.contractsChart.destroy();
    }
  }

  private loadDashboardData() {
    console.log('Carregando dados do dashboard...');
  }

  private initCharts() {
    this.initContractsChart();
  }

  private initContractsChart() {
    const canvas = document.getElementById('contractsChart') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isDarkMode = document.body.classList.contains('dark-mode');
    const textColor = isDarkMode ? '#e5e7eb' : '#374151';
    const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';

    this.contractsChart = new Chart(ctx, {
      type: 'line',
      data: this.monthlyContractsData,
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
            backgroundColor: isDarkMode ? '#374151' : '#fff',
            titleColor: textColor,
            bodyColor: textColor,
            borderColor: isDarkMode ? '#4b5563' : '#e5e7eb',
            borderWidth: 1,
            padding: 12,
            displayColors: false,
            callbacks: {
              label: (context) => {
                return `Contratos: ${context.parsed.y}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              color: gridColor,
              display: false
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
              },
              stepSize: 5
            }
          }
        },
        elements: {
          line: {
            tension: 0.4,
            borderWidth: 3
          },
          point: {
            radius: 5,
            hoverRadius: 7,
            backgroundColor: '#fff',
            borderWidth: 3,
            borderColor: '#0A8060'
          }
        }
      }
    });
  }

  filterActivities(filter: 'all' | 'completed' | 'in-progress' | 'scheduled') {
    this.activityFilter = filter;
  }

  get filteredActivities(): Activity[] {
    if (this.activityFilter === 'all') {
      return this.recentActivities;
    }
    return this.recentActivities.filter(activity => activity.status === this.activityFilter);
  }

  executeQuickAction(action: string) {
    console.log('Executando ação:', action);
    switch(action) {
      case 'newContract':
        
        break;
      case 'newCompany':
        // Navegar para nova empresa
        this.router.navigate(['/home/companies/new']);
        break;
      case 'newService':
        // Navegar para novo serviço
        this.router.navigate(['/home/services/new']);
        break;
      case 'generateReport':
        // Navegar para relatórios
        this.router.navigate(['/home/reports']);
        break;
    }
  }

  getActivityIcon(type: string): string {
    const icons: { [key: string]: string } = {
      'diagnostic': 'fas fa-stethoscope',
      'okr': 'fas fa-bullseye',
      'mentoring': 'fas fa-user-tie',
      'hr': 'fas fa-users',
      'other': 'fas fa-ellipsis-h'
    };
    return icons[type] || 'fas fa-circle';
  }

  getActivityColor(type: string): string {
    const colors: { [key: string]: string } = {
      'diagnostic': '#17915a',
      'okr': '#17915a',
      'mentoring': '#17915a',
      'hr': '#17915a',
      'other': '#17915a'
    };
    return colors[type] || '#17915a';
  }

  getStatusClass(status: string): string {
    const classes: { [key: string]: string } = {
      'completed': 'status-completed',
      'in-progress': 'status-progress',
      'scheduled': 'status-scheduled'
    };
    return classes[status] || '';
  }

  getStatusText(status: string): string {
    const texts: { [key: string]: string } = {
      'completed': 'Concluído',
      'in-progress': 'Em andamento',
      'scheduled': 'Agendado'
    };
    return texts[status] || status;
  }
}