import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { NotificationService } from './notification.service';
import { environment } from '../../environments/environment';

export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  role_id: number; // Adicionar role_id
  must_change_password: boolean;
  permissions?: string[];
}

export interface LoginResponse {
  token: string;
  user: User;
  message: string;
}

export interface ChangePasswordResponse {
  message: string;
  token?: string;
  user?: User;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = `${environment.authUrl}`;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router,
    private notificationService: NotificationService
  ) {
    this.loadUserFromStorage();
  }

  /**
   * Realiza login do usuário
   */
  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.API_URL}/login`, {
      email,
      password
    }).pipe(
      tap(response => {
        if (response.token && response.user) {
          this.setSession(response.token, response.user);
          
          // Notificação de sucesso removida daqui
          // Será mostrada no HomeComponent
        }
      }),
      catchError(error => {
        // Notificação de erro
        if (error.status === 401) {
          this.notificationService.error(
            'Email ou senha incorretos',
            'Erro de Login'
          );
        } else if (error.status === 0) {
          this.notificationService.error(
            'Não foi possível conectar ao servidor. Verifique sua conexão.',
            'Erro de Conexão'
          );
        } else {
          this.notificationService.error(
            'Erro ao realizar login. Tente novamente.',
            'Erro'
          );
        }
        return throwError(() => error);
      })
    );
  }

  /**
   * Altera a senha do usuário
   */
  changePassword(endpoint: string, data: any): Observable<ChangePasswordResponse> {
    const headers = this.getAuthHeaders();
    const fullUrl = `${this.API_URL}/${endpoint}`;
    
    return this.http.post<ChangePasswordResponse>(fullUrl, data, { headers }).pipe(
      tap(response => {
        // Se retornou novo token e usuário, atualizar sessão
        if (response.token && response.user) {
          this.setSession(response.token, response.user);
        } else if (response.user) {
          // Se retornou apenas usuário atualizado, manter token atual
          this.updateUser(response.user);
        }
      })
    );
  }

   /**
   * Realiza logout do usuário
   */
   logout(): Observable<any> {
    const headers = this.getAuthHeaders();
    
    return this.http.post(`${this.API_URL}/logout`, {}, { headers }).pipe(
      tap(() => {
        this.notificationService.info('Você foi desconectado', 'Logout');
        this.clearSession();
        this.router.navigate(['/login']);
      }),
      catchError(error => {
        // Em caso de erro, fazer logout local mesmo assim
        this.clearSession();
        this.router.navigate(['/login']);
        return throwError(() => error);
      })
    );
  }
  /**
   * Verifica se o usuário está autenticado
   */
  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;

    // Verificar se o token não expirou
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp > currentTime;
    } catch {
      return false;
    }
  }

  /**
   * Verifica se o usuário tem uma role específica
   */
  hasRole(role: string): boolean {
    const user = this.getUser();
    return user?.role === role;
  }

  /**
   * Verifica se o usuário é admin
   */
  isAdmin(): boolean {
    const user = this.getUser();
    return user?.role === 'admin' || user?.role_id === 1;
  }

  /**
   * Verifica se o usuário tem uma permissão específica
   */
  hasPermission(permission: string): boolean {
    const user = this.getUser();
    return user?.permissions?.includes(permission) || false;
  }

  /**
   * Obtém o token de autenticação
   */
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  /**
   * Obtém o usuário atual
   */
  getUser(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Verifica se o usuário precisa trocar a senha
   */
  mustChangePassword(): boolean {
    const user = this.getUser();
    return user?.must_change_password || false;
  }

  /**
   * Atualiza os dados do usuário atual
   */
  updateUser(user: User): void {
    localStorage.setItem('user', JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  /**
   * Obtém headers com autorização
   */
  private getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  /**
   * Define a sessão do usuário
   */
  private setSession(token: string, user: User): void {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  /**
   * Limpa a sessão do usuário
   */
  private clearSession(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.currentUserSubject.next(null);
  }

  /**
   * Carrega o usuário do localStorage
   */
  private loadUserFromStorage(): void {
    const userJson = localStorage.getItem('user');
    if (userJson && this.isAuthenticated()) {
      const user = JSON.parse(userJson);
      this.currentUserSubject.next(user);
    } else {
      this.clearSession();
    }
  }

  /**
   * Refresh do token (se o backend suportar)
   */
  refreshToken(): Observable<LoginResponse> {
    const headers = this.getAuthHeaders();
    return this.http.post<LoginResponse>(`${this.API_URL}/refresh`, {}, { headers }).pipe(
      tap(response => {
        if (response.token && response.user) {
          this.setSession(response.token, response.user);
        }
      })
    );
  }
}