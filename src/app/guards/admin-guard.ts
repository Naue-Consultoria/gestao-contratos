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
      return true;
    }
    
    // Redirecionar para dashboard
    this.router.navigate(['/home/dashboard']);
    
    // Opcionalmente, você pode mostrar uma mensagem de erro
    // this.toastr.error('Acesso negado. Apenas administradores podem acessar esta página.');
    
    return false;
  }
}