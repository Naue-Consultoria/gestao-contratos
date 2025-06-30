import { Injectable } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth';

@Injectable({
  providedIn: 'root'
})
export class MustChangePasswordGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    const user = this.authService.getUser();
    
    console.log('🔍 MustChangePasswordGuard - User:', user);
    console.log('🔍 MustChangePasswordGuard - must_change_password:', user?.must_change_password);
    
    // Se o usuário precisa trocar a senha
    if (user?.must_change_password === true) {
      console.log('🔄 Redirecionando para change-password');
      
      // Se já está na página de troca de senha, permite
      if (state.url.includes('/change-password')) {
        return true;
      }
      
      // Caso contrário, redireciona para troca de senha
      this.router.navigate(['/change-password']);
      return false;
    }
    
    // Se não precisa trocar senha, permite acesso
    console.log('✅ Usuário não precisa trocar senha');
    return true;
  }
}