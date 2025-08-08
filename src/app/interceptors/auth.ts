import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // URLs que não precisam de token
  const publicUrls = [
    '/auth/login',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/validate-reset-token'
  ];

  // Verificar se deve adicionar token
  const shouldAddToken = !publicUrls.some(url => req.url.includes(url));
  
  // Clonar requisição e adicionar headers padrão
  // Não definir Content-Type para FormData (uploads de arquivo)
  const isFormData = req.body instanceof FormData;
  
  let authReq = req.clone({
    setHeaders: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      'Accept': 'application/json'
    }
  });

  // Adicionar token se necessário
  if (shouldAddToken) {
    const token = authService.getToken();
    if (token && token.trim() !== '' && token !== 'null' && token !== 'undefined') {
      authReq = authReq.clone({
        setHeaders: {
          'Authorization': `Bearer ${token}`
        }
      });
    } else if (shouldAddToken) {
      // Se deveria ter token mas não tem, redirecionar para login
      console.warn('🔑 Token ausente ou inválido - redirecionando para login');
      router.navigate(['/login']);
      return throwError(() => new Error('Token não encontrado'));
    }
  }


  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {

      // Erro 401 - Token inválido ou expirado
      if (error.status === 401) {
        console.log('🔄 Token inválido - fazendo logout');
        authService.logout().subscribe(() => {
          router.navigate(['/login']);
        });
      }

      // Erro 403 - Acesso negado
      if (error.status === 403) {
        console.log('🚫 Acesso negado');
        router.navigate(['/home/dashboard']);
      }

      // Erro 0 - Problema de rede
      if (error.status === 0) {
        console.error('🌐 Erro de conexão com o servidor');
      }

      return throwError(() => error);
    })
  );
};