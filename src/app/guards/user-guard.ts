import { Injectable } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth';

@Injectable({
  providedIn: 'root'
})
export class UserGuard implements CanActivate {
  
  // Rotas permitidas para usuários com role 'usuario'
  private allowedRoutesForUser = [
    '/home/dashboard',
    '/home/contratos',
    '/home/clientes',
    '/home/servicos',
    '/home/propostas',
    '/home/relatorios',
    '/home/analytics',
    '/home/rotinas',
    '/home/configuracoes', 
    '/home/ajuda'
  ];

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  /**
   * Verifica se a URL corresponde a rotas dinâmicas permitidas
   */
  private checkDynamicRoutes(url: string): boolean {
    const dynamicRoutePatterns = [
      // Rotas de contratos com IDs
      /^\/home\/contratos\/visualizar\/\d+$/,
      /^\/home\/contratos\/editar\/\d+$/,
      
      // Rotas de clientes com IDs
      /^\/home\/clientes\/visualizar\/\d+$/,
      /^\/home\/clientes\/editar\/\d+$/,
      
      // Rotas de serviços com IDs
      /^\/home\/servicos\/editar\/\d+$/,
      
      // Rotas de propostas com IDs
      /^\/home\/propostas\/visualizar\/\d+$/,
      /^\/home\/propostas\/editar\/\d+$/,
      
      // Rotas de rotinas com IDs
      /^\/home\/rotinas\/visualizar\/\d+$/,
      
      // Rota de acompanhamento de serviço - a rota problemática!
      /^\/home\/rotinas\/\d+\/servico\/\d+$/,
      
      // Rotas de usuários (apenas para admin, mas vamos deixar o AdminGuard tratar isso)
      /^\/home\/usuarios\/editar\/\d+$/
    ];

    return dynamicRoutePatterns.some(pattern => pattern.test(url));
  }

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    
    console.log('🔍 UserGuard executando para:', state.url);
    
    // Verificar se está autenticado
    if (!this.authService.isAuthenticated()) {
      console.log('❌ Usuário não autenticado');
      this.router.navigate(['/login']);
      return false;
    }

    // Se é admin, permitir acesso total
    if (this.authService.isAdmin()) {
      console.log('✅ Acesso liberado - Usuário é admin');
      return true;
    }

    // Para usuários não-admin, verificar se a rota está permitida
    const currentUrl = state.url;
    
    // Verificar se a rota atual está na lista de rotas permitidas
    const isAllowedRoute = this.allowedRoutesForUser.some(allowedRoute => 
      currentUrl.startsWith(allowedRoute) || currentUrl === allowedRoute
    );

    // Verificar rotas especiais com parâmetros dinâmicos
    const isDynamicRoute = this.checkDynamicRoutes(currentUrl);

    if (isAllowedRoute || isDynamicRoute) {
      console.log('✅ Acesso liberado - Rota permitida para usuário');
      console.log('🔍 Rota atual:', currentUrl);
      console.log('🔍 isAllowedRoute:', isAllowedRoute);
      console.log('🔍 isDynamicRoute:', isDynamicRoute);
      return true;
    }

    // Se não é uma rota permitida, redirecionar para dashboard
    console.log('❌ Acesso negado - Rota não permitida para usuário');
    console.log('🔍 Rota atual:', currentUrl);
    console.log('🔍 User role:', this.authService.getUser()?.role);
    console.log('🔍 isAllowedRoute:', isAllowedRoute);
    console.log('🔍 isDynamicRoute:', isDynamicRoute);
    
    // Redirecionar para dashboard
    this.router.navigate(['/home/dashboard']);
    
    return false;
  }
}