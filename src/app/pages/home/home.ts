import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';

// Components
import { HeaderComponent } from '../../components/header/header';
import { SidebarComponent } from '../../components/sidebar/sidebar';
import { ContractModalComponent } from '../../components/contract-modal/contract-modal';
import { UserModal } from '../../components/user-modal/user-modal';
import { NotificationDropdownComponent } from '../../components/notification-dropdown/notification-dropdown';

// Services
import { AuthService } from '../../services/auth';
import { ApiUser } from '../../services/user';
import { ApiCompany } from '../../services/company';
import { ModalService } from '../../services/modal.service';
import { NotificationService } from '../../services/notification.service';
import { Subscription } from 'rxjs';

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
  adminOnly?: boolean;
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
    UserModal,
    NotificationDropdownComponent
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
  editingUser: ApiUser | null = null;
  editingCompany: ApiCompany | null = null;

  // Notifications - mantendo compatibilidade com o header original
  notifications: Notification[] = [];
  unreadNotificationsCount = 0;

  // Navigation items with routes
  navSections: NavSection[] = [
    {
      title: 'Principal',
      items: [
        { id: 'dashboard', icon: 'fas fa-chart-line', text: 'Dashboard', active: false, route: '/home/dashboard' },
        { id: 'contracts', icon: 'fas fa-file-contract', text: 'Contratos', active: false, route: '/home/contracts' },
        { id: 'companies', icon: 'fas fa-building', text: 'Empresas', active: false, route: '/home/companies' },
        { id: 'services', icon: 'fas fa-briefcase', text: 'Serviços', active: false, route: '/home/services' }
      ]
    },
    {
      title: 'Análises',
      items: [
        { id: 'reports', icon: 'fas fa-chart-bar', text: 'Relatórios', active: false, route: '/home/reports' },
        { id: 'analytics', icon: 'fas fa-chart-pie', text: 'Analytics', active: false, route: '/home/analytics' }
      ]
    },
    {
      title: 'Configurações',
      items: [
        { id: 'users', icon: 'fas fa-users', text: 'Usuários', active: false, route: '/home/users', adminOnly: true },
        { id: 'settings', icon: 'fas fa-cog', text: 'Configurações', active: false, route: '/home/settings' }
      ]
    },
    {
      title: 'Ajuda',
      items: [
        { id: 'help', icon: 'fas fa-question-circle', text: 'Suporte', active: false, route: '/home/help' }
      ]
    }
  ];

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

  // Subscriptions
  private subscriptions = new Subscription();

  constructor(
    private router: Router,
    private authService: AuthService,
    private modalService: ModalService,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    this.loadThemePreference();
    this.setupKeyboardShortcuts();
    this.updateActiveNavItem();
    this.filterNavigationByRole();
    
    // Listen to route changes to update active nav item
    this.router.events.subscribe(() => {
      this.updateActiveNavItem();
    });

    // Atualizar dados do usuário do AuthService
    this.loadUserData();
    
    // Subscrever aos eventos do ModalService
    this.subscribeToModalEvents();
    
    // Subscrever ao contador de notificações
    this.subscriptions.add(
      this.notificationService.unreadCount$.subscribe(count => {
        this.unreadNotificationsCount = count;
      })
    );
    
    // Mostrar notificação de boas-vindas
    const user = this.authService.getUser();
    if (user) {
      this.notificationService.success(
        `Bem-vindo de volta, ${user.name}!`,
        'Login Realizado',
        { duration: 3000 }
      );
    }
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  /**
   * Subscrever aos eventos do ModalService
   */
  private subscribeToModalEvents() {
    // Subscrever ao evento de abrir modal de empresa
    this.subscriptions.add(
      this.modalService.openCompanyModal$.subscribe((companyOrVoid: ApiCompany | void) => {
        if (companyOrVoid && typeof companyOrVoid === 'object' && 'id' in companyOrVoid) {
          this.editingCompany = companyOrVoid as ApiCompany;
        } else {
          this.editingCompany = null;
        }
        this.openCompanyModal();
      })
    );
    
    // Bridge entre o sistema antigo e o novo de notificações
    this.subscriptions.add(
      this.modalService.showNotification$.subscribe(({ message, isSuccess }) => {
        if (isSuccess) {
          this.notificationService.success(message);
        } else {
          this.notificationService.error(message);
        }
      })
    );
  }

  /**
   * Carregar dados do usuário do AuthService
   */
  private loadUserData() {
    const user = this.authService.getUser();
    if (user) {
      this.userName = user.name;
      this.userRole = user.role === 'admin' ? 'Administrador' : 'Usuário';
      this.userInitials = this.generateInitials(user.name);
    }
  }

  /**
   * Gerar iniciais do nome
   */
  private generateInitials(name: string): string {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  /**
   * Filtrar itens de navegação baseado na role do usuário
   */
  private filterNavigationByRole() {
    const isAdmin = this.authService.isAdmin();
    
    this.navSections = this.navSections.map(section => ({
      ...section,
      items: section.items.filter(item => {
        if (item.adminOnly && !isAdmin) {
          return false;
        }
        return true;
      })
    }));
  }

  /**
   * Verificar se o usuário é admin
   */
  isUserAdmin(): boolean {
    return this.authService.isAdmin();
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
    // Verificar se o usuário tem permissão para acessar a página
    if (pageId === 'users' && !this.isUserAdmin()) {
      this.notificationService.error(
        'Acesso negado. Apenas administradores podem acessar esta página.',
        'Permissão Negada'
      );
      return;
    }

    const route = `/home/${pageId}`;
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
  }

  // Notifications
  toggleNotifications() {
    this.isNotificationOpen = !this.isNotificationOpen;
  }

  clearNotifications() {
    this.notificationService.clearHistory();
    this.notificationService.info('Notificações limpas com sucesso!', 'Sucesso');
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
    this.editingCompany = null;
  }

  openUserModal(userToEdit: ApiUser | null = null) {
    // Verificar se é admin antes de abrir o modal
    if (!this.isUserAdmin()) {
      this.notificationService.error(
        'Acesso negado. Apenas administradores podem gerenciar usuários.',
        'Permissão Negada'
      );
      return;
    }
    
    this.editingUser = userToEdit;
    this.isUserModalOpen = true;
  }

  closeUserModal() {
    this.isUserModalOpen = false;
    this.editingUser = null;
  }

  // Save operations
  saveContract() {
    console.log('Saving contract...');
    this.closeContractModal();
    this.notificationService.success('Contrato salvo com sucesso!', 'Sucesso');
  }

  saveCompany(event: any) {
    console.log('Saving company...', event);
    
    // Mostrar mensagem apropriada
    const message = event?.isNew ? 'Empresa criada com sucesso!' : 'Empresa atualizada com sucesso!';
    this.notificationService.success(message, 'Sucesso');
    
    // Notificar componente de empresas para atualizar a lista
    this.refreshCompaniesPage();
  }

  /**
   * Notificar página de empresas para atualizar
   */
  private refreshCompaniesPage() {
    if (this.router.url.includes('/home/companies')) {
      window.dispatchEvent(new CustomEvent('refreshCompanies'));
    }
  }

  saveUser() {
    console.log('Saving user...');
    this.closeUserModal();
    this.notificationService.success('Usuário salvo com sucesso!', 'Sucesso');
    
    // Notificar componente de usuários para atualizar a lista
    this.refreshUsersPage();
  }

  /**
   * Notificar página de usuários para atualizar
   */
  private refreshUsersPage() {
    if (this.router.url.includes('/home/users')) {
      window.dispatchEvent(new CustomEvent('refreshUsers'));
    }
  }

  // Export functions
  exportToPDF() {
    console.log('Exporting to PDF...');
    this.notificationService.info('Exportando relatório em PDF...', 'Exportando');
  }

  exportToExcel() {
    console.log('Exporting to Excel...');
    this.notificationService.info('Exportando relatório em Excel...', 'Exportando');
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
    this.notificationService.info('Saindo do sistema...', 'Logout');
    
    // Tentar logout via AuthService
    this.authService.logout().subscribe({
      next: (response) => {
        // Redirecionamento já é feito no AuthService
      },
      error: (error) => {
        console.error('❌ Erro no logout:', error);
        // Fallback para logout forçado
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.router.navigate(['/login']);
      }
    });
  }
}