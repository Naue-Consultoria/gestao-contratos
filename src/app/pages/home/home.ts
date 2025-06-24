import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables, ChartConfiguration, ChartType } from 'chart.js';

Chart.register(...registerables);

// Extended interfaces to fix TypeScript issues
interface ExtendedGridLineOptions {
  display?: boolean;
  borderDash?: number[];
}

interface ExtendedScaleOptions {
  beginAtZero?: boolean;
  grid?: ExtendedGridLineOptions;
}

interface StatCard {
  label: string;
  value: number;
  change: string;
  changeType: 'positive' | 'negative';
  icon: string;
  progress: number;
}

interface Notification {
  id: number;
  time: string;
  content: string;
  isUnread: boolean;
}

interface Contract {
  id: number;
  company: string;
  companyInitials: string;
  companyType: string;
  contractType: string;
  services: number;
  activeServices: number;
  progress: number;
  status: 'active' | 'pending' | 'completed';
  gradient: string;
}

interface Activity {
  time: string;
  title: string;
  description: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export class HomeComponent implements OnInit, OnDestroy {
  // User data
  userName = 'João Silva';
  userRole = 'Administrador';
  userInitials = 'JS';

  // UI state
  isDarkMode = false;
  isSidebarCollapsed = false;
  isMobileSidebarOpen = false;
  isSearchActive = false;
  isNotificationOpen = false;
  currentPage = 'dashboard';
  currentContractTab = 'all';
  globalSearchTerm = '';

  // Modal states
  isContractModalOpen = false;
  isCompanyModalOpen = false;
  isUserModalOpen = false;
  notificationMessage = '';
  isNotificationSuccess = true;
  showNotification = false;

  // Navigation items
  navSections = [
    {
      title: 'Principal',
      items: [
        { id: 'dashboard', icon: 'fas fa-chart-line', text: 'Dashboard', active: true },
        { id: 'contracts', icon: 'fas fa-file-contract', text: 'Contratos', active: false },
        { id: 'companies', icon: 'fas fa-building', text: 'Empresas', active: false }
      ]
    },
    {
      title: 'Análises',
      items: [
        { id: 'reports', icon: 'fas fa-chart-bar', text: 'Relatórios', active: false },
        { id: 'analytics', icon: 'fas fa-chart-pie', text: 'Analytics', active: false }
      ]
    },
    {
      title: 'Configurações',
      items: [
        { id: 'users', icon: 'fas fa-users', text: 'Usuários', active: false },
        { id: 'settings', icon: 'fas fa-cog', text: 'Configurações', active: false }
      ]
    },
    {
      title: 'Ajuda',
      items: [
        { id: 'help', icon: 'fas fa-question-circle', text: 'Suporte', active: false },
        { id: 'feedback', icon: 'fas fa-comment-dots', text: 'Feedback', active: false }
      ]
    }
  ];

  // Dashboard data
  statCards: StatCard[] = [
    {
      label: 'Total de Contratos',
      value: 24,
      change: '+12% este mês',
      changeType: 'positive',
      icon: 'fas fa-file-contract',
      progress: 75
    },
    {
      label: 'Contratos Ativos',
      value: 18,
      change: '75% do total',
      changeType: 'positive',
      icon: 'fas fa-clipboard-check',
      progress: 75
    },
    {
      label: 'Serviços em Andamento',
      value: 42,
      change: 'Em 18 contratos',
      changeType: 'positive',
      icon: 'fas fa-spinner',
      progress: 60
    },
    {
      label: 'Próximas Atividades',
      value: 8,
      change: '3 urgentes',
      changeType: 'negative',
      icon: 'fas fa-clock',
      progress: 40
    }
  ];

  // Notifications
  notifications: Notification[] = [
    { id: 1, time: 'Há 2 horas', content: 'Novo contrato assinado com a Empresa ABC', isUnread: true },
    { id: 2, time: 'Hoje cedo', content: 'Reunião agendada para amanhã às 10:00', isUnread: true },
    { id: 3, time: 'Ontem', content: 'Relatório mensal disponível para download', isUnread: false }
  ];

  unreadNotificationsCount = 0;

  // Contracts data
  contracts: Contract[] = [
    {
      id: 1,
      company: 'Empresa ABC',
      companyInitials: 'EA',
      companyType: 'Tecnologia',
      contractType: 'Contrato Grande',
      services: 5,
      activeServices: 3,
      progress: 60,
      status: 'active',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    },
    {
      id: 2,
      company: 'Tech Solutions',
      companyInitials: 'TS',
      companyType: 'Software',
      contractType: 'Contrato Pontual',
      services: 2,
      activeServices: 1,
      progress: 80,
      status: 'active',
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
    },
    {
      id: 3,
      company: 'Startup XYZ',
      companyInitials: 'SX',
      companyType: 'Fintech',
      contractType: 'Mentoria Individual',
      services: 1,
      activeServices: 0,
      progress: 25,
      status: 'pending',
      gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
    }
  ];

  // Recent activities
  recentActivities: Activity[] = [
    { time: 'Há 2 horas', title: 'Diagnóstico Organizacional - Empresa ABC', description: 'Reunião inicial realizada com sucesso' },
    { time: 'Há 5 horas', title: 'OKR - Tech Solutions', description: 'Workshop de definição de objetivos concluído' },
    { time: 'Ontem', title: 'Mentoria Individual - Startup XYZ', description: 'Sessão agendada para próxima semana' }
  ];

  // Services list
  servicesList = [
    { id: 'diag-org', name: 'Diagnóstico Organizacional' },
    { id: 'sens-time', name: 'Sensibilização do Time' },
    { id: 'cod-cultural', name: 'Código Cultural' },
    { id: 'okr', name: 'OKR' },
    { id: 'rh', name: 'RH' },
    { id: 'primeira-lider', name: 'Primeira Liderança' },
    { id: 'ment-lideres', name: 'Mentoria para Líderes' },
    { id: 'mps', name: 'MPS' },
    { id: 'pilulas', name: 'Pílulas de Desenvolvimento' },
    { id: 'overview', name: 'Overview' },
    { id: 'ment-socios', name: 'Mentoria Individual para Sócios' },
    { id: 'map-processos', name: 'Mapeamento de Processos' },
    { id: 'diag-financeiro', name: 'Diagnóstico Financeiro' },
    { id: 'reest-societaria', name: 'Reestruturação Societária' }
  ];

  selectedServices: Set<string> = new Set();

  // Chart instances
  private contractsChart: Chart | null = null;
  private performanceChart: Chart | null = null;
  private servicesChart: Chart | null = null;

  // Chart data
  currentChartPeriod = 'month';
  currentPerformanceYear = 2024;

  ngOnInit() {
    this.loadThemePreference();
    this.updateUnreadNotificationsCount();
    
    // Gráficos comentados devido a problemas de visualização
    // Initialize charts after view is ready
    // setTimeout(() => {
    //   this.initializeCharts();
    // }, 100);

    // Setup keyboard shortcuts
    this.setupKeyboardShortcuts();
  }

  ngOnDestroy() {
    // Cleanup charts
    if (this.contractsChart) this.contractsChart.destroy();
    if (this.performanceChart) this.performanceChart.destroy();
    if (this.servicesChart) this.servicesChart.destroy();
  }

  // Theme management
  loadThemePreference() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      this.isDarkMode = true;
      document.body.classList.add('dark-mode');
    }
  }

  toggleTheme() {
    this.isDarkMode = !this.isDarkMode;
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light');
  }

  // Navigation
  navigateTo(pageId: string) {
    this.currentPage = pageId;
    
    // Update active state in navigation
    this.navSections.forEach(section => {
      section.items.forEach(item => {
        item.active = item.id === pageId;
      });
    });

    // Gráficos comentados devido a problemas de visualização
    // Reinitialize charts when navigating to specific pages
    // if (pageId === 'dashboard' || pageId === 'reports' || pageId === 'analytics') {
    //   setTimeout(() => {
    //     this.initializeCharts();
    //   }, 100);
    // }

    // Close mobile sidebar
    this.isMobileSidebarOpen = false;
  }

  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  toggleMobileSidebar() {
    this.isMobileSidebarOpen = !this.isMobileSidebarOpen;
  }

  // Search functionality
  toggleSearch() {
    this.isSearchActive = !this.isSearchActive;
  }

  performSearch() {
    console.log('Searching for:', this.globalSearchTerm);
    // Implement search logic here
  }

  // Notifications
  toggleNotifications() {
    this.isNotificationOpen = !this.isNotificationOpen;
  }

  updateUnreadNotificationsCount() {
    this.unreadNotificationsCount = this.notifications.filter(n => n.isUnread).length;
  }

  clearNotifications() {
    this.notifications.forEach(n => n.isUnread = false);
    this.updateUnreadNotificationsCount();
    this.showNotificationMessage('Notificações limpas com sucesso!', true);
  }

  // Contract tabs
  showContractTab(tab: string) {
    this.currentContractTab = tab;
    // Filter contracts based on tab
  }

  // Modal management
  openContractModal() {
    this.isContractModalOpen = true;
  }

  closeContractModal() {
    this.isContractModalOpen = false;
    this.selectedServices.clear();
  }

  openCompanyModal() {
    this.isCompanyModalOpen = true;
  }

  closeCompanyModal() {
    this.isCompanyModalOpen = false;
  }

  openUserModal() {
    this.isUserModalOpen = true;
  }

  closeUserModal() {
    this.isUserModalOpen = false;
  }

  // Service selection
  toggleService(serviceId: string) {
    if (this.selectedServices.has(serviceId)) {
      this.selectedServices.delete(serviceId);
    } else {
      this.selectedServices.add(serviceId);
    }
  }

  isServiceSelected(serviceId: string): boolean {
    return this.selectedServices.has(serviceId);
  }

  getServiceName(serviceId: string): string {
    const service = this.servicesList.find(s => s.id === serviceId);
    return service ? service.name : '';
  }

  // Save operations
  saveContract() {
    console.log('Saving contract...');
    this.closeContractModal();
    this.showNotificationMessage('Contrato salvo com sucesso!', true);
  }

  saveCompany() {
    console.log('Saving company...');
    this.closeCompanyModal();
    this.showNotificationMessage('Empresa salva com sucesso!', true);
  }

  saveUser() {
    console.log('Saving user...');
    this.closeUserModal();
    this.showNotificationMessage('Usuário salvo com sucesso!', true);
  }

  // View/Edit operations
  viewContract(id: number) {
    console.log('Viewing contract:', id);
    this.openContractModal();
  }

  editCompany(id: number) {
    console.log('Editing company:', id);
    this.openCompanyModal();
  }

  editUser(id: number) {
    console.log('Editing user:', id);
    this.openUserModal();
  }

  // Export functions
  exportToPDF() {
    console.log('Exporting to PDF...');
    this.showNotificationMessage('Exportando relatório em PDF...', true);
  }

  exportToExcel() {
    console.log('Exporting to Excel...');
    this.showNotificationMessage('Exportando relatório em Excel...', true);
  }

  // Generate reports
  generateReport(type: string) {
    console.log('Generating report:', type);
    this.showNotificationMessage(`Gerando relatório ${type}...`, true);
  }

  // Notification system
  showNotificationMessage(message: string, isSuccess: boolean) {
    this.notificationMessage = message;
    this.isNotificationSuccess = isSuccess;
    this.showNotification = true;

    setTimeout(() => {
      this.showNotification = false;
    }, 3000);
  }

  // Chart initialization
  private initializeCharts() {
    if (this.currentPage === 'dashboard') {
      this.initContractsChart();
    } else if (this.currentPage === 'reports') {
      this.initPerformanceChart();
    } else if (this.currentPage === 'analytics') {
      this.initServicesChart();
    }
  }

  private initContractsChart() {
    const canvas = document.getElementById('contractsChart') as HTMLCanvasElement;
    if (!canvas) return;

    if (this.contractsChart) {
      this.contractsChart.destroy();
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    this.contractsChart = new Chart(ctx, {
      type: 'line',
      data: this.getChartData(this.currentChartPeriod),
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'bottom'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              borderDash: [5, 5]
            } as any
          },
          x: {
            grid: {
              display: false
            }
          }
        }
      }
    });
  }

  private initPerformanceChart() {
    const canvas = document.getElementById('performanceChart') as HTMLCanvasElement;
    if (!canvas) return;

    if (this.performanceChart) {
      this.performanceChart.destroy();
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    this.performanceChart = new Chart(ctx, {
      type: 'bar',
      data: this.getPerformanceData(this.currentPerformanceYear),
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'bottom'
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }

  private initServicesChart() {
    const canvas = document.getElementById('servicesChart') as HTMLCanvasElement;
    if (!canvas) return;

    if (this.servicesChart) {
      this.servicesChart.destroy();
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    this.servicesChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Diagnóstico Organizacional', 'OKR', 'Mentoria', 'RH', 'Outros'],
        datasets: [{
          data: [25, 20, 18, 15, 22],
          backgroundColor: [
            '#1DD882',
            '#6366f1',
            '#ec4899',
            '#fb923c',
            '#94a3b8'
          ]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right'
          }
        }
      }
    });
  }

  updateChartPeriod(period: string) {
    this.currentChartPeriod = period;
    if (this.contractsChart) {
      this.contractsChart.data = this.getChartData(period);
      this.contractsChart.update();
    }
  }

  updatePerformanceChart(year: number) {
    this.currentPerformanceYear = year;
    if (this.performanceChart) {
      this.performanceChart.data = this.getPerformanceData(year);
      this.performanceChart.update();
    }
  }

  private getChartData(period: string) {
    if (period === 'month') {
      return {
        labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
        datasets: [{
          label: 'Novos Contratos',
          data: [12, 19, 15, 25, 22, 30, 28, 32, 35, 40, 38, 45],
          borderColor: '#1DD882',
          backgroundColor: 'rgba(29, 216, 130, 0.1)',
          tension: 0.4,
          fill: true
        }, {
          label: 'Contratos Renovados',
          data: [8, 12, 10, 15, 18, 20, 22, 25, 28, 30, 32, 35],
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          tension: 0.4,
          fill: true
        }]
      };
    } else if (period === 'quarter') {
      return {
        labels: ['Q1', 'Q2', 'Q3', 'Q4'],
        datasets: [{
          label: 'Novos Contratos',
          data: [46, 77, 85, 113],
          borderColor: '#1DD882',
          backgroundColor: 'rgba(29, 216, 130, 0.1)',
          tension: 0.4,
          fill: true
        }, {
          label: 'Contratos Renovados',
          data: [30, 48, 75, 95],
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          tension: 0.4,
          fill: true
        }]
      };
    } else {
      return {
        labels: ['2020', '2021', '2022', '2023', '2024'],
        datasets: [{
          label: 'Novos Contratos',
          data: [120, 185, 210, 290, 321],
          borderColor: '#1DD882',
          backgroundColor: 'rgba(29, 216, 130, 0.1)',
          tension: 0.4,
          fill: true
        }, {
          label: 'Contratos Renovados',
          data: [95, 140, 180, 240, 280],
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          tension: 0.4,
          fill: true
        }]
      };
    }
  }

  private getPerformanceData(year: number) {
    const dataMap: { [key: number]: any } = {
      2024: {
        labels: ['Q1', 'Q2', 'Q3', 'Q4'],
        datasets: [{
          label: 'Receita (R$ mil)',
          data: [450, 520, 610, 750],
          backgroundColor: '#1DD882'
        }, {
          label: 'Meta (R$ mil)',
          data: [400, 500, 600, 700],
          backgroundColor: '#e5e7eb'
        }]
      },
      2023: {
        labels: ['Q1', 'Q2', 'Q3', 'Q4'],
        datasets: [{
          label: 'Receita (R$ mil)',
          data: [380, 450, 520, 620],
          backgroundColor: '#1DD882'
        }, {
          label: 'Meta (R$ mil)',
          data: [350, 420, 500, 600],
          backgroundColor: '#e5e7eb'
        }]
      },
      2022: {
        labels: ['Q1', 'Q2', 'Q3', 'Q4'],
        datasets: [{
          label: 'Receita (R$ mil)',
          data: [300, 360, 410, 480],
          backgroundColor: '#1DD882'
        }, {
          label: 'Meta (R$ mil)',
          data: [280, 340, 400, 460],
          backgroundColor: '#e5e7eb'
        }]
      }
    };

    return dataMap[year] || dataMap[2024];
  }

  // Keyboard shortcuts
  private setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + K for search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('.search-input') as HTMLInputElement;
        if (searchInput) searchInput.focus();
      }

      // Escape to close modals
      if (e.key === 'Escape') {
        this.isContractModalOpen = false;
        this.isCompanyModalOpen = false;
        this.isUserModalOpen = false;
        this.isNotificationOpen = false;
      }
    });
  }

  // Logout
  logout() {
    this.showNotificationMessage('Saindo do sistema...', false);
    setTimeout(() => {
      // Navigate to login page
      window.location.href = '/login';
    }, 1500);
  }

  // Click outside handlers
  onModalBackdropClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal')) {
      this.isContractModalOpen = false;
      this.isCompanyModalOpen = false;
      this.isUserModalOpen = false;
    }
  }
}