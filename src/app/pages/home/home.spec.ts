import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HomeComponent } from './home';
import { By } from '@angular/platform-browser';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with dashboard page', () => {
    expect(component.currentPage).toBe('dashboard');
  });

  it('should have correct user information', () => {
    expect(component.userName).toBe('João Silva');
    expect(component.userRole).toBe('Administrador');
    expect(component.userInitials).toBe('JS');
  });

  it('should toggle theme', () => {
    const initialTheme = component.isDarkMode;
    component.toggleTheme();
    expect(component.isDarkMode).toBe(!initialTheme);
  });

  it('should navigate between pages', () => {
    component.navigateTo('contracts');
    expect(component.currentPage).toBe('contracts');
    
    component.navigateTo('companies');
    expect(component.currentPage).toBe('companies');
  });

  it('should update unread notifications count', () => {
    component.notifications = [
      { id: 1, time: 'test', content: 'test', isUnread: true },
      { id: 2, time: 'test', content: 'test', isUnread: true },
      { id: 3, time: 'test', content: 'test', isUnread: false }
    ];
    component.updateUnreadNotificationsCount();
    expect(component.unreadNotificationsCount).toBe(2);
  });

  it('should clear notifications', () => {
    component.notifications = [
      { id: 1, time: 'test', content: 'test', isUnread: true },
      { id: 2, time: 'test', content: 'test', isUnread: true }
    ];
    component.clearNotifications();
    expect(component.notifications.every(n => !n.isUnread)).toBe(true);
    expect(component.unreadNotificationsCount).toBe(0);
  });

  it('should toggle sidebar', () => {
    const initialState = component.isSidebarCollapsed;
    component.toggleSidebar();
    expect(component.isSidebarCollapsed).toBe(!initialState);
  });

  it('should toggle mobile sidebar', () => {
    const initialState = component.isMobileSidebarOpen;
    component.toggleMobileSidebar();
    expect(component.isMobileSidebarOpen).toBe(!initialState);
  });

  it('should open and close modals', () => {
    // Contract modal
    component.openContractModal();
    expect(component.isContractModalOpen).toBe(true);
    component.closeContractModal();
    expect(component.isContractModalOpen).toBe(false);

    // Company modal
    component.openCompanyModal();
    expect(component.isCompanyModalOpen).toBe(true);
    component.closeCompanyModal();
    expect(component.isCompanyModalOpen).toBe(false);

    // User modal
    component.openUserModal();
    expect(component.isUserModalOpen).toBe(true);
    component.closeUserModal();
    expect(component.isUserModalOpen).toBe(false);
  });

  it('should toggle service selection', () => {
    const serviceId = 'diag-org';
    
    // Add service
    component.toggleService(serviceId);
    expect(component.isServiceSelected(serviceId)).toBe(true);
    
    // Remove service
    component.toggleService(serviceId);
    expect(component.isServiceSelected(serviceId)).toBe(false);
  });

  it('should show notification message', () => {
    const message = 'Test notification';
    const isSuccess = true;
    
    component.showNotificationMessage(message, isSuccess);
    
    expect(component.notificationMessage).toBe(message);
    expect(component.isNotificationSuccess).toBe(isSuccess);
    expect(component.showNotification).toBe(true);
  });

  it('should hide notification after timeout', (done) => {
    component.showNotificationMessage('Test', true);
    expect(component.showNotification).toBe(true);
    
    setTimeout(() => {
      expect(component.showNotification).toBe(false);
      done();
    }, 3500);
  });

  it('should update chart period', () => {
    component.updateChartPeriod('quarter');
    expect(component.currentChartPeriod).toBe('quarter');
    
    component.updateChartPeriod('year');
    expect(component.currentChartPeriod).toBe('year');
  });

  it('should update performance chart year', () => {
    component.updatePerformanceChart(2023);
    expect(component.currentPerformanceYear).toBe(2023);
    
    component.updatePerformanceChart(2022);
    expect(component.currentPerformanceYear).toBe(2022);
  });

  it('should have correct number of stat cards', () => {
    expect(component.statCards.length).toBe(4);
  });

  it('should have correct number of contracts', () => {
    expect(component.contracts.length).toBe(3);
  });

  it('should have correct number of services', () => {
    expect(component.servicesList.length).toBe(14);
  });

  it('should handle contract tab switching', () => {
    component.showContractTab('grandes');
    expect(component.currentContractTab).toBe('grandes');
    
    component.showContractTab('pontuais');
    expect(component.currentContractTab).toBe('pontuais');
  });

  it('should call console.log when saving contract', () => {
    spyOn(console, 'log');
    component.saveContract();
    expect(console.log).toHaveBeenCalledWith('Saving contract...');
  });

  it('should call console.log when saving company', () => {
    spyOn(console, 'log');
    component.saveCompany();
    expect(console.log).toHaveBeenCalledWith('Saving company...');
  });

  it('should call console.log when saving user', () => {
    spyOn(console, 'log');
    component.saveUser();
    expect(console.log).toHaveBeenCalledWith('Saving user...');
  });

  it('should handle view contract', () => {
    spyOn(console, 'log');
    component.viewContract(1);
    expect(console.log).toHaveBeenCalledWith('Viewing contract:', 1);
    expect(component.isContractModalOpen).toBe(true);
  });

  it('should handle edit company', () => {
    spyOn(console, 'log');
    component.editCompany(1);
    expect(console.log).toHaveBeenCalledWith('Editing company:', 1);
    expect(component.isCompanyModalOpen).toBe(true);
  });

  it('should handle edit user', () => {
    spyOn(console, 'log');
    component.editUser(1);
    expect(console.log).toHaveBeenCalledWith('Editing user:', 1);
    expect(component.isUserModalOpen).toBe(true);
  });

  it('should handle export to PDF', () => {
    spyOn(console, 'log');
    component.exportToPDF();
    expect(console.log).toHaveBeenCalledWith('Exporting to PDF...');
  });

  it('should handle export to Excel', () => {
    spyOn(console, 'log');
    component.exportToExcel();
    expect(console.log).toHaveBeenCalledWith('Exporting to Excel...');
  });

  it('should handle generate report', () => {
    spyOn(console, 'log');
    const reportType = 'monthly';
    component.generateReport(reportType);
    expect(console.log).toHaveBeenCalledWith('Generating report:', reportType);
  });

  it('should handle search functionality', () => {
    const initialState = component.isSearchActive;
    component.toggleSearch();
    expect(component.isSearchActive).toBe(!initialState);
  });

  it('should perform search', () => {
    spyOn(console, 'log');
    component.globalSearchTerm = 'test search';
    component.performSearch();
    expect(console.log).toHaveBeenCalledWith('Searching for:', 'test search');
  });

  it('should toggle notifications dropdown', () => {
    const initialState = component.isNotificationOpen;
    component.toggleNotifications();
    expect(component.isNotificationOpen).toBe(!initialState);
  });

  it('should handle logout', (done) => {
    spyOn(window.location, 'href' as any);
    component.logout();
    
    expect(component.notificationMessage).toBe('Saindo do sistema...');
    expect(component.isNotificationSuccess).toBe(false);
    
    setTimeout(() => {
      expect(window.location.href).toBe('/login');
      done();
    }, 1600);
  });

  it('should close modals on backdrop click', () => {
    component.isContractModalOpen = true;
    component.isCompanyModalOpen = true;
    component.isUserModalOpen = true;
    
    const mockEvent = {
      target: {
        classList: {
          contains: (className: string) => className === 'modal'
        }
      }
    } as unknown as MouseEvent;
    
    component.onModalBackdropClick(mockEvent);
    
    expect(component.isContractModalOpen).toBe(false);
    expect(component.isCompanyModalOpen).toBe(false);
    expect(component.isUserModalOpen).toBe(false);
  });

  it('should not close modals when clicking on modal content', () => {
    component.isContractModalOpen = true;
    
    const mockEvent = {
      target: {
        classList: {
          contains: (className: string) => className === 'modal-content'
        }
      }
    } as unknown as MouseEvent;
    
    component.onModalBackdropClick(mockEvent);
    
    expect(component.isContractModalOpen).toBe(true);
  });

  it('should load theme preference from localStorage', () => {
    spyOn(localStorage, 'getItem').and.returnValue('dark');
    component.loadThemePreference();
    expect(component.isDarkMode).toBe(true);
  });

  it('should save theme preference to localStorage', () => {
    spyOn(localStorage, 'setItem');
    component.isDarkMode = false;
    component.toggleTheme();
    expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'dark');
  });

  it('should update active navigation item when navigating', () => {
    component.navigateTo('reports');
    
    const reportsItem = component.navSections
      .flatMap(section => section.items)
      .find(item => item.id === 'reports');
    
    expect(reportsItem?.active).toBe(true);
    
    const dashboardItem = component.navSections
      .flatMap(section => section.items)
      .find(item => item.id === 'dashboard');
    
    expect(dashboardItem?.active).toBe(false);
  });

  it('should close mobile sidebar when navigating', () => {
    component.isMobileSidebarOpen = true;
    component.navigateTo('contracts');
    expect(component.isMobileSidebarOpen).toBe(false);
  });

  it('should have correct recent activities', () => {
    expect(component.recentActivities.length).toBe(3);
    expect(component.recentActivities[0].title).toContain('Empresa ABC');
  });

  it('should render correct number of pages', () => {
    const pages = fixture.debugElement.queryAll(By.css('.page'));
    expect(pages.length).toBe(8); // dashboard, contracts, companies, reports, analytics, users, settings, help
  });

  it('should display correct user avatar initials', () => {
    const avatarElement = fixture.debugElement.query(By.css('.user-avatar'));
    expect(avatarElement.nativeElement.textContent).toBe('JS');
  });
});