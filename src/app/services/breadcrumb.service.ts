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
    // Novas rotas em português - Contratos
    '/home/contratos': [
      { label: 'Home', url: '/home/dashboard', icon: 'fas fa-home' },
      { label: 'Contratos', url: '/home/contratos' }
    ],
    '/home/contratos/novo': [
      { label: 'Home', url: '/home/dashboard', icon: 'fas fa-home' },
      { label: 'Contratos', url: '/home/contratos' },
      { label: 'Novo Contrato' }
    ],
    '/home/contratos/editar': [
      { label: 'Home', url: '/home/dashboard', icon: 'fas fa-home' },
      { label: 'Contratos', url: '/home/contratos' },
      { label: 'Editar Contrato' }
    ],
    '/home/contratos/visualizar': [
      { label: 'Home', url: '/home/dashboard', icon: 'fas fa-home' },
      { label: 'Contratos', url: '/home/contratos' },
      { label: 'Visualizar Contrato' }
    ],
    // Novas rotas em português - Clientes
    '/home/clientes': [
      { label: 'Home', url: '/home/dashboard', icon: 'fas fa-home' },
      { label: 'Clientes', url: '/home/clientes' }
    ],
    '/home/clientes/novo': [
      { label: 'Home', url: '/home/dashboard', icon: 'fas fa-home' },
      { label: 'Clientes', url: '/home/clientes' },
      { label: 'Novo Cliente' }
    ],
    '/home/clientes/visualizar': [
      { label: 'Home', url: '/home/dashboard', icon: 'fas fa-home' },
      { label: 'Clientes', url: '/home/clientes' },
      { label: 'Detalhes do Cliente' }
    ],
    '/home/clientes/editar': [
      { label: 'Home', url: '/home/dashboard', icon: 'fas fa-home' },
      { label: 'Clientes', url: '/home/clientes' },
      { label: 'Editar Cliente' }
    ],
    // Novas rotas em português - Serviços
    '/home/servicos': [
      { label: 'Home', url: '/home/dashboard', icon: 'fas fa-home' },
      { label: 'Serviços', url: '/home/servicos' }
    ],
    '/home/servicos/novo': [
      { label: 'Home', url: '/home/dashboard', icon: 'fas fa-home' },
      { label: 'Serviços', url: '/home/servicos' },
      { label: 'Novo Serviço' }
    ],
    '/home/servicos/editar': [
      { label: 'Home', url: '/home/dashboard', icon: 'fas fa-home' },
      { label: 'Serviços', url: '/home/servicos' },
      { label: 'Editar Serviço' }
    ],
    // Novas rotas em português - Propostas
    '/home/propostas': [
      { label: 'Home', url: '/home/dashboard', icon: 'fas fa-home' },
      { label: 'Propostas', url: '/home/propostas' }
    ],
    '/home/propostas/nova': [
      { label: 'Home', url: '/home/dashboard', icon: 'fas fa-home' },
      { label: 'Propostas', url: '/home/propostas' },
      { label: 'Nova Proposta' }
    ],
    '/home/propostas/editar': [
      { label: 'Home', url: '/home/dashboard', icon: 'fas fa-home' },
      { label: 'Propostas', url: '/home/propostas' },
      { label: 'Editar Proposta' }
    ],
    '/home/propostas/visualizar': [
      { label: 'Home', url: '/home/dashboard', icon: 'fas fa-home' },
      { label: 'Propostas', url: '/home/propostas' },
      { label: 'Visualizar Proposta' }
    ],
    // Novas rotas em português - Usuários
    '/home/usuarios': [
      { label: 'Home', url: '/home/dashboard', icon: 'fas fa-home' },
      { label: 'Usuários', url: '/home/usuarios' }
    ],
    '/home/usuarios/novo': [
      { label: 'Home', url: '/home/dashboard', icon: 'fas fa-home' },
      { label: 'Usuários', url: '/home/usuarios' },
      { label: 'Novo Usuário' }
    ],
    '/home/usuarios/editar': [
      { label: 'Home', url: '/home/dashboard', icon: 'fas fa-home' },
      { label: 'Usuários', url: '/home/usuarios' },
      { label: 'Editar Usuário' }
    ],
    // Outras rotas
    '/home/profile': [
      { label: 'Home', url: '/home/dashboard', icon: 'fas fa-home' },
      { label: 'Meu Perfil' }
    ],
    '/home/configuracoes': [
      { label: 'Home', url: '/home/dashboard', icon: 'fas fa-home' },
      { label: 'Configurações' }
    ],
    '/home/relatorios': [
      { label: 'Home', url: '/home/dashboard', icon: 'fas fa-home' },
      { label: 'Relatórios' }
    ],
    '/home/analytics': [
      { label: 'Home', url: '/home/dashboard', icon: 'fas fa-home' },
      { label: 'Analytics' }
    ],
    '/home/ajuda': [
      { label: 'Home', url: '/home/dashboard', icon: 'fas fa-home' },
      { label: 'Ajuda' }
    ],
    '/home/rotinas': [
      { label: 'Home', url: '/home/dashboard', icon: 'fas fa-home' },
      { label: 'Rotinas de Contratos' }
    ],
    '/home/rotinas/view': [
      { label: 'Home', url: '/home/dashboard', icon: 'fas fa-home' },
      { label: 'Rotinas de Contratos', url: '/home/rotinas' },
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
      // Para URLs como /home/contratos/editar/123
      if (urlParts.length === 5 && urlParts[3] === 'editar') {
        const baseRoute = `/${urlParts[1]}/${urlParts[2]}/editar`;
        if (this.routeMap[baseRoute]) {
          const breadcrumbs = [...this.routeMap[baseRoute]];
          breadcrumbs[breadcrumbs.length - 1].label = `Editar ${this.getEntityName(urlParts[2])} #${urlParts[4]}`;
          this.setBreadcrumbs(breadcrumbs);
          return;
        }
      }

      // Para URLs como /home/contratos/visualizar/123
      if (urlParts.length === 5 && urlParts[3] === 'visualizar') {
        const baseRoute = `/${urlParts[1]}/${urlParts[2]}/visualizar`;
        if (this.routeMap[baseRoute]) {
          const breadcrumbs = [...this.routeMap[baseRoute]];
          breadcrumbs[breadcrumbs.length - 1].label = `Visualizar ${this.getEntityName(urlParts[2])} #${urlParts[4]}`;
          this.setBreadcrumbs(breadcrumbs);
          return;
        }
      }
      
      // Para URLs como /home/rotinas/123 (detalhes do contrato)
      if (urlParts.length === 4 && urlParts[2] === 'rotinas' && !isNaN(Number(urlParts[3]))) {
        const breadcrumbs: any[] = [
          { label: 'Home', url: '/home/dashboard', icon: 'fas fa-home' },
          { label: 'Rotinas de Contratos', url: '/home/rotinas' },
          { label: `Detalhes da Rotina #${urlParts[3]}` }
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
      'contratos': 'Contrato',
      'clientes': 'Cliente',
      'servicos': 'Serviço',
      'propostas': 'Proposta',
      'usuarios': 'Usuário',
      // Manter mapeamento antigo para compatibilidade
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
      'contratos': 'Contratos',
      'clientes': 'Clientes',
      'servicos': 'Serviços',
      'propostas': 'Propostas',
      'usuarios': 'Usuários',
      'rotinas': 'Rotinas de Contratos',
      'dashboard': 'Dashboard',
      'analytics': 'Analytics',
      'relatorios': 'Relatórios',
      'notifications': 'Notificações',
      'configuracoes': 'Configurações',
      'profile': 'Meu Perfil',
      'ajuda': 'Ajuda',
      // Manter mapeamento antigo para compatibilidade
      'contracts': 'Contratos',
      'clients': 'Clientes',
      'services': 'Serviços',
      'proposals': 'Propostas',
      'users': 'Usuários',
      'routines': 'Rotinas de Contratos',
      'reports': 'Relatórios',
      'settings': 'Configurações',
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