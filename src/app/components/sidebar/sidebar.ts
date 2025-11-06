import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth';

interface NavItem {
  id: string;
  icon: string;
  text: string;
  route?: string;
  adminOnly?: boolean; // Requer Admin ou Admin Gerencial
  adminOnlyNotGerencial?: boolean; // Requer APENAS Admin (bloqueia Admin Gerencial)
  consultorRSOnly?: boolean; // Disponível apenas para Consultor R&S
  excludeConsultorRS?: boolean; // Esconder para Consultor R&S
  children?: NavItem[];
  isExpanded?: boolean;
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
        { id: 'controle-habitos', icon: 'fas fa-check-circle', text: 'Controle de Hábitos', route: '/home/controle-habitos' },
        { id: 'rotinas', icon: 'fas fa-calendar-check', text: 'Rotinas', route: '/home/rotinas', excludeConsultorRS: true },
        { id: 'servicos', icon: 'fas fa-briefcase', text: 'Serviços', route: '/home/servicos', excludeConsultorRS: true },
        { id: 'clientes', icon: 'fas fa-users', text: 'Clientes', route: '/home/clientes', adminOnly: true, excludeConsultorRS: true },
        { id: 'propostas', icon: 'fas fa-file-alt', text: 'Propostas', route: '/home/propostas', adminOnly: true, excludeConsultorRS: true },
        { id: 'contratos', icon: 'fas fa-file-contract', text: 'Contratos', route: '/home/contratos', adminOnly: true, excludeConsultorRS: true },
        { id: 'mentorias', icon: 'fas fa-chalkboard-teacher', text: 'Mentorias', route: '/home/mentorias', adminOnly: true, excludeConsultorRS: true },
        {
          id: 'recrutamento-selecao',
          icon: 'fas fa-user-tie',
          text: 'R&S',
          adminOnly: true, // Apenas Admin, Admin Gerencial e Consultor R&S
          isExpanded: false,
          children: [
            { id: 'rs-vagas', icon: 'fas fa-briefcase', text: 'Vagas', route: '/home/recrutamento-selecao' },
            { id: 'rs-gerenciar', icon: 'fas fa-cog', text: 'Gerenciar R&S', route: '/home/gerenciar-rs' },
            { id: 'rs-analytics', icon: 'fas fa-chart-line', text: 'Analytics R&S', route: '/home/analytics-rs' },
            { id: 'rs-relatorios', icon: 'fas fa-chart-bar', text: 'Relatórios R&S', route: '/home/relatorios-rs' }
          ]
        }
      ]
    },
    {
      title: 'ANÁLISES',
      items: [
        { id: 'relatorios', icon: 'fas fa-chart-bar', text: 'Relatórios', route: '/home/relatorios', adminOnly: true, adminOnlyNotGerencial: true, excludeConsultorRS: true },
        { id: 'analytics', icon: 'fas fa-chart-pie', text: 'Analytics', route: '/home/analytics', adminOnly: true, adminOnlyNotGerencial: true, excludeConsultorRS: true }
      ]
    },
    {
      title: 'CONFIGURAÇÕES',
      items: [
        { id: 'usuarios', icon: 'fas fa-users', text: 'Usuários', route: '/home/usuarios', adminOnly: true, adminOnlyNotGerencial: true, excludeConsultorRS: true },
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
    const isAdminGerencial = this.authService.isAdminGerencial();
    const isConsultorRS = this.authService.isConsultorRS();
    const hasRSAccess = isAdmin || isAdminGerencial || isConsultorRS;

    this.filteredNavSections = this.navSections.map(section => ({
      ...section,
      items: section.items.filter(item => {
        // Se é Consultor R&S, só pode ver itens sem excludeConsultorRS
        if (isConsultorRS) {
          if (item.excludeConsultorRS) {
            return false;
          }
          // Consultor R&S pode ver Dashboard e R&S
          return true;
        }

        // Bloquear itens que são APENAS para Admin (não Admin Gerencial)
        if (item.adminOnlyNotGerencial && !isAdmin) {
          return false;
        }

        // Se é admin, pode ver tudo (exceto itens consultorRSOnly)
        if (isAdmin) {
          return true;
        }

        // Se é Admin Gerencial, pode ver itens adminOnly (exceto adminOnlyNotGerencial)
        if (isAdminGerencial && item.adminOnly) {
          return true;
        }

        // Se não é admin nem admin gerencial, não pode ver itens adminOnly
        // Exceção: Item R&S pode ser visto por quem tem hasRSAccess
        if (item.adminOnly) {
          // Se for o item R&S, verificar hasRSAccess
          if (item.id === 'recrutamento-selecao' && hasRSAccess) {
            return true;
          }
          return false;
        }

        // Caso contrário, pode ver
        return true;
      }).map(item => {
        // Filtrar children também
        if (item.children) {
          return {
            ...item,
            children: item.children.filter(child => {
              // Se é Consultor R&S, só pode ver children sem excludeConsultorRS
              if (isConsultorRS && child.excludeConsultorRS) {
                return false;
              }
              // Bloquear children que são APENAS para Admin
              if (child.adminOnlyNotGerencial && !isAdmin) {
                return false;
              }
              return true;
            })
          };
        }
        return item;
      }).filter(item => !item.children || item.children.length > 0) // Remover itens com children vazios
    })).filter(section => section.items.length > 0);
  }

  toggleSidebar(): void {
    this.sidebarToggled.emit();
  }

  toggleDropdown(item: NavItem): void {
    if (item.children) {
      // Se a sidebar estiver encolhida, expandir primeiro
      if (this.isCollapsed) {
        this.toggleSidebar();
        // Dar um pequeno delay para a animação da sidebar
        setTimeout(() => {
          item.isExpanded = true;
        }, 100);
      } else {
        item.isExpanded = !item.isExpanded;
      }
    }
  }

  isChildRouteActive(children?: NavItem[]): boolean {
    if (!children) return false;
    return children.some(child => child.route && this.isRouteActive(child.route));
  }
}