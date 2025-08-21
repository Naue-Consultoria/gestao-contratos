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
    '/home/rotinas',
    '/home/configuracoes', 
    '/home/ajuda'
  ];

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    
    // Verificar se está autenticado
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return false;
    }

    // Se é admin, permitir acesso total
    if (this.authService.isAdmin()) {
      return true;
    }

    // Para usuários não-admin, verificar se a rota está permitida
    const currentUrl = state.url;
    
    // Verificar se a rota atual está na lista de rotas permitidas
    const isAllowedRoute = this.allowedRoutesForUser.some(allowedRoute => 
      currentUrl.startsWith(allowedRoute) || currentUrl === allowedRoute
    );

    if (isAllowedRoute) {
      console.log('✅ Acesso liberado - Rota permitida para usuário');
      return true;
    }

    // Se não é uma rota permitida, redirecionar para dashboard
    console.log('❌ Acesso negado - Rota não permitida para usuário');
    console.log('🔍 Rota atual:', currentUrl);
    console.log('🔍 User role:', this.authService.getUser()?.role);
    
    // Redirecionar para dashboard
    this.router.navigate(['/home/dashboard']);
    
    return false;
  }
}