import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth';

interface NavItem {
  id: string;
  icon: string;
  text: string;
  route: string;
  adminOnly?: boolean;
  userRestricted?: boolean; // Para itens que usuários normais não podem acessar
}

interface NavSection {
  title: string;
  items: NavItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.css']
})
export class SidebarComponent {
  // CORRECTED: Each property has its own @Input() decorator
  @Input() isCollapsed = false;
  @Input() isMobileSidebarOpen = false;
  @Output() sidebarToggled = new EventEmitter<void>();

  navSections: NavSection[] = [
    {
      title: 'PRINCIPAL',
      items: [
        { id: 'dashboard', icon: 'fas fa-chart-line', text: 'Dashboard', route: '/home/dashboard' },
        { id: 'rotinas', icon: 'fas fa-calendar-check', text: 'Rotinas', route: '/home/rotinas' },
        { id: 'servicos', icon: 'fas fa-briefcase', text: 'Serviços', route: '/home/servicos', userRestricted: true },
        { id: 'clientes', icon: 'fas fa-users', text: 'Clientes', route: '/home/clientes', userRestricted: true },
        { id: 'propostas', icon: 'fas fa-file-alt', text: 'Propostas', route: '/home/propostas', userRestricted: true },
        { id: 'contratos', icon: 'fas fa-file-contract', text: 'Contratos', route: '/home/contratos', userRestricted: true }
      ]
    },
    {
      title: 'ANÁLISES',
      items: [
        { id: 'relatorios', icon: 'fas fa-chart-bar', text: 'Relatórios', route: '/home/relatorios', userRestricted: true },
        { id: 'analytics', icon: 'fas fa-chart-pie', text: 'Analytics', route: '/home/analytics', userRestricted: true }
      ]
    },
    {
      title: 'CONFIGURAÇÕES',
      items: [
        { id: 'usuarios', icon: 'fas fa-users', text: 'Usuários', route: '/home/usuarios', adminOnly: true },
        { id: 'configuracoes', icon: 'fas fa-cog', text: 'Configurações', route: '/home/configuracoes' }
      ]
    },
    {
      title: 'AJUDA',
      items: [
        { id: 'ajuda', icon: 'fas fa-question-circle', text: 'Suporte', route: '/home/ajuda' }
      ]
    }
  ];
  
  filteredNavSections: NavSection[] = [];

  constructor(private router: Router, private authService: AuthService) {
    this.filterNavigationByRole();
  }

  isRouteActive(route: string): boolean {
    return this.router.isActive(route, { 
      paths: 'subset', 
      queryParams: 'subset', 
      fragment: 'ignored', 
      matrixParams: 'ignored' 
    });
  }

  private filterNavigationByRole() {
    const isAdmin = this.authService.isAdmin();
    
    this.filteredNavSections = this.navSections.map(section => ({
      ...section,
      items: section.items.filter(item => {
        // Se é admin, pode ver tudo
        if (isAdmin) {
          return true;
        }
        
        // Se não é admin, não pode ver itens adminOnly
        if (item.adminOnly) {
          return false;
        }
        
        // Se não é admin, não pode ver itens userRestricted
        if (item.userRestricted) {
          return false;
        }
        
        // Caso contrário, pode ver
        return true;
      })
    })).filter(section => section.items.length > 0);
  }

  toggleSidebar(): void {
    this.sidebarToggled.emit();
  }
}