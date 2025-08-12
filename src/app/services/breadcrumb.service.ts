import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

export interface BreadcrumbItem {
  label: string;
  url?: string;
  icon?: string;
}

@Injectable({
  providedIn: 'root'
})
export class BreadcrumbService {
  private breadcrumbsSubject = new BehaviorSubject<BreadcrumbItem[]>([]);
  public breadcrumbs$ = this.breadcrumbsSubject.asObservable();

  private routeMap: { [key: string]: BreadcrumbItem[] } = {
    '/home/dashboard': [
      { label: 'Home', url: '/home/dashboard', icon: 'fas fa-home' },
      { label: 'Dashboard' }
    ],
    '/home/contracts': [
      { label: 'Home', url: '/home/dashboard', icon: 'fas fa-home' },
      { label: 'Contratos', url: '/home/contracts' }
    ],
    '/home/contracts/new': [
      { label: 'Home', url: '/home/dashboard', icon: 'fas fa-home' },
      { label: 'Contratos', url: '/home/contracts' },
      { label: 'Novo Contrato' }
    ],
    '/home/contracts/edit': [
      { label: 'Home', url: '/home/dashboard', icon: 'fas fa-home' },
      { label: 'Contratos', url: '/home/contracts' },
      { label: 'Editar Contrato' }
    ],
    '/home/contracts/view': [
      { label: 'Home', url: '/home/dashboard', icon: 'fas fa-home' },
      { label: 'Contratos', url: '/home/contracts' },
      { label: 'Visualizar Contrato' }
    ],
    '/home/clients': [
      { label: 'Home', url: '/home/dashboard', icon: 'fas fa-home' },
      { label: 'Clientes', url: '/home/clients' }
    ],
    '/home/clients/new': [
      { label: 'Home', url: '/home/dashboard', icon: 'fas fa-home' },
      { label: 'Clientes', url: '/home/clients' },
      { label: 'Novo Cliente' }
    ],
    '/home/clients/view': [
      { label: 'Home', url: '/home/dashboard', icon: 'fas fa-home' },
      { label: 'Clientes', url: '/home/clients' },
      { label: 'Detalhes do Cliente' }
    ],
    '/home/clients/edit': [
      { label: 'Home', url: '/home/dashboard', icon: 'fas fa-home' },
      { label: 'Clientes', url: '/home/clients' },
      { label: 'Editar Cliente' }
    ],
    '/home/services': [
      { label: 'Home', url: '/home/dashboard', icon: 'fas fa-home' },
      { label: 'Serviços', url: '/home/services' }
    ],
    '/home/services/new': [
      { label: 'Home', url: '/home/dashboard', icon: 'fas fa-home' },
      { label: 'Serviços', url: '/home/services' },
      { label: 'Novo Serviço' }
    ],
    '/home/services/edit': [
      { label: 'Home', url: '/home/dashboard', icon: 'fas fa-home' },
      { label: 'Serviços', url: '/home/services' },
      { label: 'Editar Serviço' }
    ],
    '/home/proposals': [
      { label: 'Home', url: '/home/dashboard', icon: 'fas fa-home' },
      { label: 'Propostas', url: '/home/proposals' }
    ],
    '/home/proposals/new': [
      { label: 'Home', url: '/home/dashboard', icon: 'fas fa-home' },
      { label: 'Propostas', url: '/home/proposals' },
      { label: 'Nova Proposta' }
    ],
    '/home/proposals/edit': [
      { label: 'Home', url: '/home/dashboard', icon: 'fas fa-home' },
      { label: 'Propostas', url: '/home/proposals' },
      { label: 'Editar Proposta' }
    ],
    '/home/proposals/view': [
      { label: 'Home', url: '/home/dashboard', icon: 'fas fa-home' },
      { label: 'Propostas', url: '/home/proposals' },
      { label: 'Visualizar Proposta' }
    ],
    '/home/users': [
      { label: 'Home', url: '/home/dashboard', icon: 'fas fa-home' },
      { label: 'Usuários', url: '/home/users' }
    ],
    '/home/users/new': [
      { label: 'Home', url: '/home/dashboard', icon: 'fas fa-home' },
      { label: 'Usuários', url: '/home/users' },
      { label: 'Novo Usuário' }
    ],
    '/home/users/edit': [
      { label: 'Home', url: '/home/dashboard', icon: 'fas fa-home' },
      { label: 'Usuários', url: '/home/users' },
      { label: 'Editar Usuário' }
    ],
    '/home/profile': [
      { label: 'Home', url: '/home/dashboard', icon: 'fas fa-home' },
      { label: 'Meu Perfil' }
    ],
    '/home/settings': [
      { label: 'Home', url: '/home/dashboard', icon: 'fas fa-home' },
      { label: 'Configurações' }
    ],
    '/home/reports': [
      { label: 'Home', url: '/home/dashboard', icon: 'fas fa-home' },
      { label: 'Relatórios' }
    ],
    '/home/analytics': [
      { label: 'Home', url: '/home/dashboard', icon: 'fas fa-home' },
      { label: 'Analytics' }
    ],
    '/home/help': [
      { label: 'Home', url: '/home/dashboard', icon: 'fas fa-home' },
      { label: 'Ajuda' }
    ],
    '/home/routines': [
      { label: 'Home', url: '/home/dashboard', icon: 'fas fa-home' },
      { label: 'Rotinas de Contratos' }
    ],
    '/home/routines/view': [
      { label: 'Home', url: '/home/dashboard', icon: 'fas fa-home' },
      { label: 'Rotinas de Contratos', url: '/home/routines' },
      { label: 'Detalhes do Contrato' }
    ],
    '/home/notifications': [
      { label: 'Home', url: '/home/dashboard', icon: 'fas fa-home' },
      { label: 'Notificações' }
    ]
  };

  constructor(private router: Router) {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.updateBreadcrumbs(event.url);
      });
  }

  setBreadcrumbs(breadcrumbs: BreadcrumbItem[]): void {
    this.breadcrumbsSubject.next(breadcrumbs);
  }

  private updateBreadcrumbs(url: string): void {
    // Remove query params e fragmentos
    const cleanUrl = url.split('?')[0].split('#')[0];
    
    // Procura rota exata primeiro
    if (this.routeMap[cleanUrl]) {
      this.setBreadcrumbs(this.routeMap[cleanUrl]);
      return;
    }

    // Procura rota com ID dinâmico
    const urlParts = cleanUrl.split('/');
    if (urlParts.length >= 3) {
      // Para URLs como /home/contracts/edit/123
      if (urlParts.length === 5 && urlParts[3] === 'edit') {
        const baseRoute = `/${urlParts[1]}/${urlParts[2]}/edit`;
        if (this.routeMap[baseRoute]) {
          const breadcrumbs = [...this.routeMap[baseRoute]];
          breadcrumbs[breadcrumbs.length - 1].label = `Editar ${this.getEntityName(urlParts[2])} #${urlParts[4]}`;
          this.setBreadcrumbs(breadcrumbs);
          return;
        }
      }

      // Para URLs como /home/contracts/view/123
      if (urlParts.length === 5 && urlParts[3] === 'view') {
        const baseRoute = `/${urlParts[1]}/${urlParts[2]}/view`;
        if (this.routeMap[baseRoute]) {
          const breadcrumbs = [...this.routeMap[baseRoute]];
          breadcrumbs[breadcrumbs.length - 1].label = `Visualizar ${this.getEntityName(urlParts[2])} #${urlParts[4]}`;
          this.setBreadcrumbs(breadcrumbs);
          return;
        }
      }
      
      // Para URLs como /home/routines/123 (detalhes do contrato)
      if (urlParts.length === 4 && urlParts[2] === 'routines' && !isNaN(Number(urlParts[3]))) {
        const breadcrumbs: any[] = [
          { label: 'Home', url: '/home/dashboard', icon: 'fas fa-home' },
          { label: 'Rotinas de Contratos', url: '/home/routines' },
          { label: `Detalhes do Contrato #${urlParts[3]}` }
        ];
        this.setBreadcrumbs(breadcrumbs);
        return;
      }
      
      // Para URLs como /home/contracts/123
      if (urlParts.length === 4 && !isNaN(Number(urlParts[3]))) {
        const baseRoute = `/${urlParts[1]}/${urlParts[2]}`;
        if (this.routeMap[baseRoute]) {
          const breadcrumbs: any[] = [...this.routeMap[baseRoute]];
          breadcrumbs.push({ label: `Detalhes ${this.getEntityName(urlParts[2])} #${urlParts[3]}` });
          this.setBreadcrumbs(breadcrumbs);
          return;
        }
      }
    }

    // Fallback para rota não mapeada - mantém pelo menos o breadcrumb padrão
    const fallbackBreadcrumbs: any[] = [
      { label: 'Home', url: '/home/dashboard', icon: 'fas fa-home' }
    ];
    
    // Tenta identificar a seção atual
    if (urlParts.length >= 3) {
      const section = urlParts[2];
      const sectionName = this.getSectionName(section);
      if (sectionName) {
        fallbackBreadcrumbs.push({ label: sectionName, url: `/${urlParts[1]}/${section}` });
      }
    }
    
    this.setBreadcrumbs(fallbackBreadcrumbs);
  }

  private getEntityName(entity: string): string {
    const entityMap: { [key: string]: string } = {
      'contracts': 'Contrato',
      'clients': 'Cliente',
      'services': 'Serviço',
      'proposals': 'Proposta',
      'users': 'Usuário'
    };
    return entityMap[entity] || entity;
  }

  private getSectionName(section: string): string {
    const sectionMap: { [key: string]: string } = {
      'contracts': 'Contratos',
      'clients': 'Clientes',
      'services': 'Serviços',
      'proposals': 'Propostas',
      'users': 'Usuários',
      'routines': 'Rotinas de Contratos',
      'dashboard': 'Dashboard',
      'analytics': 'Analytics',
      'reports': 'Relatórios',
      'notifications': 'Notificações',
      'settings': 'Configurações',
      'profile': 'Meu Perfil',
      'help': 'Ajuda'
    };
    return sectionMap[section] || '';
  }

  addBreadcrumb(item: BreadcrumbItem): void {
    const current = this.breadcrumbsSubject.value;
    this.setBreadcrumbs([...current, item]);
  }

  removeLast(): void {
    const current = this.breadcrumbsSubject.value;
    if (current.length > 1) {
      this.setBreadcrumbs(current.slice(0, -1));
    }
  }

  clear(): void {
    this.setBreadcrumbs([]);
  }
}