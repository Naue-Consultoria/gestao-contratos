import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Adicionar token de autorização se disponível
    const token = this.authService.getToken();
    
    if (token && this.shouldAddToken(req.url)) {
      req = this.addTokenToRequest(req, token);
    }

    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        // Se erro 401 (Unauthorized)
        if (error.status === 401) {
          return this.handle401Error(req, next);
        }

        // Se erro 403 (Forbidden)
        if (error.status === 403) {
          this.authService.logout();
          this.router.navigate(['/login']);
        }

        return throwError(() => error);
      })
    );
  }

  /**
   * Verifica se deve adicionar token na requisição
   */
  private shouldAddToken(url: string): boolean {
    // Não adicionar token em rotas de login e registro
    const excludeUrls = ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password'];
    return !excludeUrls.some(excludeUrl => url.includes(excludeUrl));
  }

  /**
   * Adiciona token à requisição
   */
  private addTokenToRequest(req: HttpRequest<any>, token: string): HttpRequest<any> {
    return req.clone({
      setHeaders: {
        'Authorization': `Bearer ${token}`
      }
    });
  }

  /**
   * Trata erro 401 (Unauthorized)
   */
  private handle401Error(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Tentar refresh do token
    return this.authService.refreshToken().pipe(
      switchMap((response) => {
        // Se refresh funcionou, repetir requisição original
        const newToken = response.token;
        const newRequest = this.addTokenToRequest(req, newToken);
        return next.handle(newRequest);
      }),
      catchError((refreshError) => {
        // Se refresh falhou, fazer logout
        this.authService.logout();
        this.router.navigate(['/login']);
        return throwError(() => refreshError);
      })
    );
  }
}