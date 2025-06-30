import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';

// Import only the components used in this template
import { HeaderComponent } from '../../components/header/header';
import { SidebarComponent } from '../../components/sidebar/sidebar';
import { ContractModalComponent } from '../../components/contract-modal/contract-modal';
import { CompanyModalComponent } from '../../components/company-modal/company-modal';
import { UserModalComponent } from '../../components/user-modal/user-modal';

interface Notification {
  id: number;
  time: string;
  content: string;
  isUnread: boolean;
}

interface NavItem {
  id: string;
  icon: string;
  text: string;
  active: boolean;
  route?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    RouterModule,
    HeaderComponent,
    SidebarComponent,
    ContractModalComponent,
    CompanyModalComponent,
    UserModalComponent
  ],
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
  globalSearchTerm = '';

  // Modal states
  isContractModalOpen = false;
  isCompanyModalOpen = false;
  isUserModalOpen = false;
  notificationMessage = '';
  isNotificationSuccess = true;
  showNotification = false;

  // Navigation items with routes
  navSections: NavSection[] = [
    {
      title: 'Principal',
      items: [
        { id: 'dashboard', icon: 'fas fa-chart-line', text: 'Dashboard', active: false, route: '/app/dashboard' },
        { id: 'contracts', icon: 'fas fa-file-contract', text: 'Contratos', active: false, route: '/app/contracts' },
        { id: 'companies', icon: 'fas fa-building', text: 'Empresas', active: false, route: '/app/companies' }
      ]
    },
    {
      title: 'Análises',
      items: [
        { id: 'reports', icon: 'fas fa-chart-bar', text: 'Relatórios', active: false, route: '/app/reports' },
        { id: 'analytics', icon: 'fas fa-chart-pie', text: 'Analytics', active: false, route: '/app/analytics' }
      ]
    },
    {
      title: 'Configurações',
      items: [
        { id: 'users', icon: 'fas fa-users', text: 'Usuários', active: false, route: '/app/users' },
        { id: 'settings', icon: 'fas fa-cog', text: 'Configurações', active: false, route: '/app/settings' }
      ]
    },
    {
      title: 'Ajuda',
      items: [
        { id: 'help', icon: 'fas fa-question-circle', text: 'Suporte', active: false, route: '/app/help' }
      ]
    }
  ];

  // Notifications
  notifications: Notification[] = [
    { id: 1, time: 'Há 2 horas', content: 'Novo contrato assinado com a Empresa ABC', isUnread: true },
    { id: 2, time: 'Hoje cedo', content: 'Reunião agendada para amanhã às 10:00', isUnread: true },
    { id: 3, time: 'Ontem', content: 'Relatório mensal disponível para download', isUnread: false }
  ];

  unreadNotificationsCount = 0;

  // Services list (for contract modal)
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

  constructor(private router: Router) {}

  ngOnInit() {
    this.loadThemePreference();
    this.updateUnreadNotificationsCount();
    this.setupKeyboardShortcuts();
    this.updateActiveNavItem();
    
    // Listen to route changes to update active nav item
    this.router.events.subscribe(() => {
      this.updateActiveNavItem();
    });
  }

  ngOnDestroy() {
    // Cleanup if needed
  }

  // Update active navigation item based on current route
  updateActiveNavItem() {
    const currentRoute = this.router.url;
    this.navSections.forEach(section => {
      section.items.forEach(item => {
        item.active = currentRoute.includes(item.route || '');
      });
    });
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
    const route = `/app/${pageId}`;
    this.router.navigate([route]);
    
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
  performSearch() {
    console.log('Searching for:', this.globalSearchTerm);
    // Implement global search logic here
    // You might want to navigate to a search results page or filter current content
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

  // Export functions (these will be called from child components via service)
  exportToPDF() {
    console.log('Exporting to PDF...');
    this.showNotificationMessage('Exportando relatório em PDF...', true);
  }

  exportToExcel() {
    console.log('Exporting to Excel...');
    this.showNotificationMessage('Exportando relatório em Excel...', true);
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
      this.router.navigate(['/login']);
    }, 1500);
  }
}