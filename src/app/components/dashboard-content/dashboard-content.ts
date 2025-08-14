import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';
import { Router } from '@angular/router';
import { ContractService } from '../../services/contract';
import { ServiceService } from '../../services/service';
import { ClientService } from '../../services/client';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';
import { forkJoin } from 'rxjs';

Chart.register(...registerables);

interface StatCard {
  id: string;
  label: string;
  value: number | string;
  change: string;
  changeType: 'positive' | 'negative';
  icon: string;
  progress: number;
  color: string;
  bgColor: string;
}

interface Activity {
  id?: number;
  time: string;
  title: string;
  description: string;
  type: 'service' | 'diagnostic' | 'okr' | 'mentoring' | 'hr' | 'other';
  status: 'not_started' | 'scheduled' | 'in_progress' | 'completed';
  category?: string;
  value?: number;
  duration?: string;
  contractId?: number;
  serviceId?: number;
}

interface QuickAction {
  id: string;
  icon: string;
  label: string;
  color: string;
  action: string;
}

@Component({
  selector: 'app-dashboard-content',
  standalone: true,
  imports: [CommonModule, BreadcrumbComponent],
  templateUrl: './dashboard-content.html',
  styleUrls: ['./dashboard-content.css']
})
export class DashboardContentComponent implements OnInit, AfterViewInit, OnDestroy {
  statCards: StatCard[] = [];
  recentActivities: Activity[] = [
    { time: 'Há 2 horas', title: 'Diagnóstico Organizacional - Empresa ABC', description: 'Reunião inicial realizada com sucesso', type: 'diagnostic', status: 'completed' },
    { time: 'Há 5 horas', title: 'OKR - Tech Solutions', description: 'Workshop de definição de objetivos concluído', type: 'okr', status: 'completed' },
    { time: 'Ontem', title: 'Mentoria Individual - Startup XYZ', description: 'Sessão agendada para próxima semana', type: 'mentoring', status: 'scheduled' },
    { time: 'Há 2 dias', title: 'Consultoria RH - Inovação Corp', description: 'Análise de clima organizacional em andamento', type: 'hr', status: 'in_progress' }
  ];
  quickActions: QuickAction[] = [
    { id: 'routines', icon: 'fas fa-tasks', label: 'Rotinas', color: '#003b2b', action: 'routines' },
    { id: 'new-service', icon: 'fas fa-briefcase', label: 'Novo Serviço', color: '#003b2b', action: 'newService' },
    { id: 'new-client', icon: 'fas fa-users', label: 'Novo Cliente', color: '#003b2b', action: 'newClient' },
    { id: 'new-proposal', icon: 'fas fa-file-alt', label: 'Nova Proposta', color: '#003b2b', action: 'newProposal' },
    { id: 'new-contract', icon: 'fas fa-file-contract', label: 'Novo Contrato', color: '#003b2b', action: 'newContract' },
    { id: 'generate-report', icon: 'fas fa-chart-bar', label: 'Gerar Relatório', color: '#003b2b', action: 'generateReport' }
  ];
  monthlyContractsData = {
    labels: [] as string[],
    datasets: [{
      label: 'Contratos Criados',
      data: [] as number[],
      borderColor: '#003b2b',
      backgroundColor: 'rgba(0, 59, 43, 0.1)',
      fill: true,
      tension: 0.4,
      borderWidth: 3,
      pointBackgroundColor: '#ffffff',
      pointBorderColor: '#003b2b',
      pointBorderWidth: 2,
      pointRadius: 5,
      pointHoverRadius: 7,
      pointHoverBorderWidth: 3
    }, {
      label: 'Contratos Ativos',
      data: [] as number[],
      borderColor: '#0a8560',
      backgroundColor: 'rgba(10, 133, 96, 0.1)',
      fill: false,
      tension: 0.4,
      borderWidth: 2,
      pointBackgroundColor: '#ffffff',
      pointBorderColor: '#0a8560',
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6,
      pointHoverBorderWidth: 2,
      borderDash: [5, 5]
    }]
  };
  contractsChart: Chart | null = null;
  activityFilter: 'all' | 'completed' | 'in_progress' | 'scheduled' | 'not_started' = 'all';

  private themeObserver!: MutationObserver;

  constructor(
    private router: Router,
    private contractService: ContractService,
    private serviceService: ServiceService,
    private clientService: ClientService
  ) {}

  ngOnInit() {
    // Inicializar com dados zerados
    this.updateStatCards({ total: 0, active: 0 }, { total: 0 }, 0);
    // Carregar dados reais
    this.loadDashboardData();
    this.loadChartData();
    this.loadRecentActivities();
  }

  ngAfterViewInit() {
    // Aguardar um pouco para garantir que o DOM esteja pronto
    setTimeout(() => {
      this.initCharts();
    }, 100);

    this.themeObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          setTimeout(() => {
            this.initCharts();
          }, 100);
        }
      });
    });

    this.themeObserver.observe(document.body, { attributes: true });
  }

  ngOnDestroy() {
    if (this.themeObserver) {
      this.themeObserver.disconnect();
    }
    if (this.contractsChart) {
      this.contractsChart.destroy();
    }
  }

  private loadDashboardData() {
    console.log('Iniciando carregamento dos dados do dashboard...');
    
    // Buscar dados de contratos, serviços e clientes em paralelo
    forkJoin({
      contractStats: this.contractService.getStats(),
      serviceStats: this.serviceService.getStats(),
      clientsData: this.clientService.getClients()
    }).subscribe({
      next: (response) => {
        console.log('Dados recebidos:', response);
        const totalClients = response.clientsData.total || 0;
        this.updateStatCards(response.contractStats.stats, response.serviceStats.stats, totalClients);
      },
      error: (error) => {
        console.error('Erro ao carregar dados do dashboard:', error);
        // Usar dados com valores zerados em caso de erro
        this.updateStatCards({ total: 0, active: 0 }, { total: 0 }, 0);
      }
    });
  }

  private loadChartData() {
    // Buscar contratos para gerar dados do gráfico
    this.contractService.getContracts().subscribe({
      next: (response) => {
        this.generateChartData(response.contracts);
        if (this.contractsChart) {
          this.contractsChart.destroy();
        }
        this.initContractsChart();
      },
      error: (error) => {
        console.error('Erro ao carregar dados do gráfico:', error);
        // Usar dados mock em caso de erro
        this.generateMockChartData();
        if (this.contractsChart) {
          this.contractsChart.destroy();
        }
        this.initContractsChart();
      }
    });
  }

  private loadRecentActivities() {
    console.log('Carregando atividades recentes dos serviços...');
    
    this.contractService.getRecentServiceActivities(10).subscribe({
      next: (response) => {
        console.log('Atividades recebidas:', response);
        if (response.success && response.activities) {
          this.recentActivities = response.activities.map((activity: any) => ({
            id: activity.id,
            time: activity.time,
            title: activity.title,
            description: activity.description,
            type: 'service',
            status: activity.status,
            category: activity.category,
            value: activity.value,
            duration: activity.duration,
            contractId: activity.contractId,
            serviceId: activity.serviceId
          }));
        }
      },
      error: (error) => {
        console.error('Erro ao carregar atividades recentes:', error);
        // Manter atividades mock em caso de erro para demonstração
      }
    });
  }

  private generateChartData(contracts: any[]) {
    // Obter últimos 6 meses
    const months = [];
    const createdData = [];
    const activeData = [];
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = date.toISOString().substring(0, 7); // YYYY-MM
      const monthLabel = date.toLocaleDateString('pt-BR', { month: 'short' });
      
      months.push(monthLabel);
      
      // Contar contratos criados no mês
      const createdInMonth = contracts.filter(contract => {
        const contractDate = new Date(contract.created_at).toISOString().substring(0, 7);
        return contractDate === monthKey;
      }).length;
      
      // Contar contratos ativos no mês (criados até o mês e ainda ativos)
      const activeInMonth = contracts.filter(contract => {
        const contractDate = new Date(contract.created_at).toISOString().substring(0, 7);
        const isCreatedBeforeOrInMonth = contractDate <= monthKey;
        const isActiveInMonth = contract.status === 'active' || 
          (contract.end_date && new Date(contract.end_date).toISOString().substring(0, 7) >= monthKey);
        return isCreatedBeforeOrInMonth && isActiveInMonth;
      }).length;
      
      createdData.push(createdInMonth);
      activeData.push(activeInMonth);
    }
    
    this.monthlyContractsData.labels = months;
    this.monthlyContractsData.datasets[0].data = createdData;
    this.monthlyContractsData.datasets[1].data = activeData;
  }

  private generateMockChartData() {
    const months = ['Ago', 'Set', 'Out', 'Nov', 'Dez', 'Jan'];
    const createdData = [8, 12, 15, 18, 14, 20];
    const activeData = [6, 10, 13, 16, 12, 18];
    
    this.monthlyContractsData.labels = months;
    this.monthlyContractsData.datasets[0].data = createdData;
    this.monthlyContractsData.datasets[1].data = activeData;
  }


  private updateStatCards(contractStats: any, serviceStats: any, totalClients: number) {
    // Usar contagem real de serviços vinculados a contratos ativos
    const servicesInProgress = serviceStats.activeServicesFromActiveContracts || 0;

    // Obter informações de novos contratos
    const newContractsInfo = this.getNewContractsInfo(contractStats);

    this.statCards = [
      { 
        id: 'total-contracts',
        label: 'Total de Contratos', 
        value: contractStats.total || 0, 
        change: newContractsInfo.text,
        changeType: newContractsInfo.type, 
        icon: 'fas fa-file-contract', 
        progress: contractStats.total === 0 ? 0 : Math.min((contractStats.total / 30) * 100, 100),
        color: '#003b2b', 
        bgColor: 'rgba(14, 155, 113, 0.15)' 
      },
      { 
        id: 'active-contracts',
        label: 'Contratos Ativos', 
        value: contractStats.active || 0, 
        change: contractStats.active === 0 ? '0% do total' : `${Math.round((contractStats.active / contractStats.total) * 100)}% do total`, 
        changeType: 'positive', 
        icon: 'fas fa-check-circle', 
        progress: contractStats.active === 0 ? 0 : Math.min((contractStats.active / contractStats.total) * 100, 100), 
        color: '#003b2b', 
        bgColor: 'rgba(14, 155, 113, 0.15)' 
      },
      { 
        id: 'services-progress',
        label: 'Serviços em Andamento', 
        value: servicesInProgress, 
        change: servicesInProgress === 0 ? 'Nenhum serviço vinculado' : `Vinculados a contratos ativos`, 
        changeType: 'positive', 
        icon: 'fas fa-list-check', 
        progress: servicesInProgress === 0 ? 0 : Math.min((servicesInProgress / 50) * 100, 100),
        color: '#003b2b', 
        bgColor: 'rgba(14, 155, 113, 0.15)' 
      },
      { 
        id: 'total-clients',
        label: 'Total de Clientes', 
        value: totalClients, 
        change: totalClients === 0 ? 'Nenhum cliente cadastrado' : `${contractStats.active > 0 ? Math.round((contractStats.active / totalClients) * 100) : 0}% com contratos ativos`, 
        changeType: 'positive', 
        icon: 'fas fa-users', 
        progress: totalClients === 0 ? 0 : Math.min((totalClients / 100) * 100, 100),
        color: '#003b2b', 
        bgColor: 'rgba(14, 155, 113, 0.15)' 
      }
    ];
  }

  private calculateGrowthPercentage(current: number, previous: number): string {
    if (previous === 0) return '+100% este mês';
    const growth = ((current - previous) / previous) * 100;
    const sign = growth >= 0 ? '+' : '';
    return `${sign}${Math.round(growth)}% este mês`;
  }

  private getNewContractsInfo(contractStats: any): { text: string, type: 'positive' | 'negative' } {
    if (contractStats.total === 0) {
      return { text: 'Nenhum contrato cadastrado', type: 'positive' };
    }

    // Calcular quantos contratos foram criados este mês
    const contractsThisMonth = contractStats.contractsThisMonth || 0;
    
    if (contractsThisMonth === 0) {
      return { text: 'Nenhum novo este mês', type: 'negative' };
    } else if (contractsThisMonth === 1) {
      return { text: '1 novo contrato este mês', type: 'positive' };
    } else {
      return { text: `${contractsThisMonth} novos este mês`, type: 'positive' };
    }
  }


  private initCharts() {
    if (this.contractsChart) {
      this.contractsChart.destroy();
    }
    this.initContractsChart();
  }

  private initContractsChart() {
    const canvas = document.getElementById('contractsChart') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isDarkMode = document.body.classList.contains('dark-mode');
    const textColor = isDarkMode ? '#e5e7eb' : '#374151';
    const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 59, 43, 0.08)';

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
            display: true,
            position: 'top',
            align: 'end',
            labels: {
              color: textColor,
              font: { size: 12, weight: 'bold' as const },
              padding: 15,
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            backgroundColor: isDarkMode ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            titleColor: textColor,
            bodyColor: textColor,
            borderColor: isDarkMode ? '#4b5563' : 'rgba(0, 59, 43, 0.2)',
            borderWidth: 1,
            padding: 12,
            cornerRadius: 8,
            displayColors: true,
            titleFont: { size: 13, weight: 'bold' as const },
            bodyFont: { size: 12 },
            callbacks: {
              title: (context) => {
                return `${context[0].label} 2025`;
              },
              label: (context) => {
                return `${context.dataset.label}: ${context.parsed.y} contratos`;
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
              font: { size: 11, weight: 'bold' as const },
              padding: 8
            },
            border: {
              color: gridColor
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
              font: { size: 11 }, 
              stepSize: 2,
              padding: 10,
              callback: function(value) {
                return Number.isInteger(value as number) ? value : '';
              }
            },
            border: {
              display: false
            }
          }
        },
        elements: {
          line: { 
            tension: 0.4
          },
          point: { 
            hoverBorderWidth: 3
          }
        },
        animation: {
          duration: 1500,
          easing: 'easeInOutQuart'
        }
      }
    });
  }

  filterActivities(filter: 'all' | 'completed' | 'in_progress' | 'scheduled' | 'not_started') {
    this.activityFilter = filter;
  }

  get filteredActivities(): Activity[] {
    if (this.activityFilter === 'all') return this.recentActivities;
    return this.recentActivities.filter(activity => activity.status === this.activityFilter);
  }

  getDisplayedActivities(): Activity[] {
    // Mostrar apenas as 2 primeiras atividades filtradas
    return this.filteredActivities.slice(0, 2);
  }

  getTotalActivitiesCount(): number {
    return this.filteredActivities.length;
  }

  navigateToActivities(): void {
    this.router.navigate(['/home/routines']);
  }

  navigateToContract(contractId?: number): void {
    if (contractId) {
      this.router.navigate(['/home/contracts/view', contractId]);
    }
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }

  executeQuickAction(action: string) {
    const routes: { [key: string]: string } = {
      'newProposal': '/home/proposals/new',
      'newContract': '/home/contracts/new',
      'newClient': '/home/clients/new',
      'newService': '/home/services/new',
      'generateReport': '/home/reports',
      'routines': '/home/routines'
    };
    
    if (routes[action]) this.router.navigate([routes[action]]);
  }

  getActivityIcon(type: string): string {
    const icons: { [key: string]: string } = { 
      'service': 'fa fa-tasks',
      'diagnostic': 'fa fa-stethoscope', 
      'okr': 'fa fa-bullseye', 
      'mentoring': 'fa fa-user-tie', 
      'hr': 'fa fa-users', 
      'other': 'fa fa-ellipsis-h' 
    };
    return icons[type] || 'fa fa-circle';
  }

  getActivityColor(type: string): string {
    const colors: { [key: string]: string } = { 
      'service': '#003b2b',
      'diagnostic': '#0a8560', 
      'okr': '#003b2b', 
      'mentoring': '#065f46', 
      'hr': '#0f766e', 
      'other': '#17915a' 
    };
    return colors[type] || '#0a8560';
  }
  
  getStatusText(status: string): string {
    const texts: { [key: string]: string } = { 
      'completed': 'Concluído', 
      'in_progress': 'Em andamento', 
      'scheduled': 'Agendado',
      'not_started': 'Não iniciado'
    };
    return texts[status] || status;
  }

  getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      'completed': '#10b981',
      'in_progress': '#f59e0b',
      'scheduled': '#3b82f6',
      'not_started': '#6b7280'
    };
    return colors[status] || '#6b7280';
  }


  getChartInsights() {
    const data = this.monthlyContractsData.datasets[0].data as number[];
    if (data.length === 0) return { growth: '0%', average: 0, projection: 0 };
    
    const current = data[data.length - 1] || 0;
    const previous = data[data.length - 2] || 0;
    const growth = previous === 0 ? (current > 0 ? 100 : 0) : Math.round(((current - previous) / previous) * 100);
    const average = Math.round(data.reduce((a, b) => a + b, 0) / data.length);
    const projection = Math.round(current * 1.15); // Projeção de 15% de crescimento
    
    return {
      growth: `${growth >= 0 ? '+' : ''}${growth}%`,
      average,
      projection
    };
  }

  // TrackBy functions para performance
  trackByCardId(index: number, card: StatCard): string {
    return card.id;
  }

  trackByActionId(index: number, action: QuickAction): string {
    return action.id;
  }

  // Métodos para responsividade do gráfico
  expandChart() {
    // Implementar modal de gráfico expandido
    console.log('Expandindo gráfico...');
  }

  downloadChart() {
    if (this.contractsChart) {
      const url = this.contractsChart.toBase64Image();
      const link = document.createElement('a');
      link.download = 'evolucao-contratos.png';
      link.href = url;
      link.click();
    }
  }
}