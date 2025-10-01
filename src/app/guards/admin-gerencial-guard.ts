import { Injectable } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth';

@Injectable({
  providedIn: 'root'
})
export class AdminGerencialGuard implements CanActivate {
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
      console.log('❌ AdminGerencialGuard: Usuário não autenticado');
      this.router.navigate(['/login']);
      return false;
    }

    const user = this.authService.getUser();
    console.log('🔍 AdminGerencialGuard - User:', user);
    console.log('🔍 AdminGerencialGuard - isAdmin:', this.authService.isAdmin());
    console.log('🔍 AdminGerencialGuard - isAdminGerencial:', this.authService.isAdminGerencial());

    // Permitir acesso para Admin e Admin Gerencial
    if (this.authService.isAdmin() || this.authService.isAdminGerencial()) {
      console.log('✅ AdminGerencialGuard: Acesso permitido');
      return true;
    }

    // Redirecionar para página de acesso negado
    console.log('❌ AdminGerencialGuard: Acesso negado - redirecionando');
    this.router.navigate(['/access-denied']);

    return false;
  }
}
