import { Injectable } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
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

    // Verificar se é admin
    if (this.authService.isAdmin()) {
      console.log('✅ Acesso liberado - Usuário é admin');
      return true;
    }

    // Se não é admin, redirecionar para dashboard com mensagem
    console.log('❌ Acesso negado - Usuário não é admin');
    console.log('🔍 User role:', this.authService.getUser()?.role);
    console.log('🔍 User role_id:', this.authService.getUser()?.role_id);
    
    // Redirecionar para dashboard
    this.router.navigate(['/home/dashboard']);
    
    // Opcionalmente, você pode mostrar uma mensagem de erro
    // this.toastr.error('Acesso negado. Apenas administradores podem acessar esta página.');
    
    return false;
  }
}