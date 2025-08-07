import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { NotificationService } from './notification.service';
import { environment } from '../../environments/environment';
import { WebsocketService } from './websocket.service';

export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  role_id: number;
  must_change_password: boolean;
  permissions?: string[];
}

export interface ApiUserResponse {
  user: {
    id: number;
    email: string;
    name: string;
    role: string;
    permissions: string[];
    must_change_password: boolean;
    last_password_change: string | null;
    first_login_at: string | null;
    last_login_at?: string | null;
    created_at?: string;
  }
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

export interface ForgotPasswordResponse {
  message: string;
  success?: boolean;
}

export interface ResetPasswordResponse {
  message: string;
  success?: boolean;
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
    private notificationService: NotificationService,
    private websocketService: WebsocketService
  ) {
    this.loadUserFromStorage();
  }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.API_URL}/login`, { email, password }).pipe(
      tap(response => {
        if (response.token && response.user) {
          this.setSession(response.token, response.user);
          this.websocketService.connect(response.user.id);
        }
      }),
      catchError(error => {
        this.notificationService.error('Email ou senha inválidos', 'Falha no Login');
        return throwError(() => error);
      })
    );
  }

  logout(): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post(`${this.API_URL}/logout`, {}, { headers }).pipe(
      tap(() => {
        this.websocketService.disconnect(); // <<< ADICIONE
        this.clearSession();
        this.notificationService.info('Você foi desconectado.', 'Sessão Encerrada');
        this.router.navigate(['/login']);
      }),
      catchError(error => {
        this.websocketService.disconnect(); // <<< ADICIONE (mesmo em caso de erro)
        this.clearSession();
        this.router.navigate(['/login']);
        return throwError(() => error);
      })
    );
  }

  changePassword(endpoint: string, data: any): Observable<ChangePasswordResponse> {
    const headers = this.getAuthHeaders();
    const fullUrl = `${this.API_URL}/${endpoint}`;
    
    return this.http.post<ChangePasswordResponse>(fullUrl, data, { headers }).pipe(
      tap(response => {
        if (response.token && response.user) {
          this.setSession(response.token, response.user);
        } else if (response.user) {
          this.updateUser(response.user);
        }
      })
    );
  }

  forgotPassword(email: string): Observable<ForgotPasswordResponse> {
    return this.http.post<ForgotPasswordResponse>(`${this.API_URL}/forgot-password`, { email }).pipe(
      tap(response => {
        console.log('✅ Solicitação de recuperação enviada');
      }),
      catchError(error => {
        console.error('❌ Erro ao solicitar recuperação:', error);
        return throwError(() => error);
      })
    );
  }

  resetPassword(code: string, password: string): Observable<ResetPasswordResponse> {
    return this.http.post<ResetPasswordResponse>(`${this.API_URL}/reset-password`, {
      token: code,
      password
    }).pipe(
      tap(response => {
        console.log('✅ Senha resetada com sucesso');
      }),
      catchError(error => {
        console.error('❌ Erro ao resetar senha:', error);
        return throwError(() => error);
      })
    );
  }

  validateResetCode(code: string): Observable<any> {
    return this.http.post(`${this.API_URL}/validate-reset-code`, { token: code }).pipe(
      tap(response => {
        console.log('✅ Código validado');
      }),
      catchError(error => {
        console.error('❌ Código inválido:', error);
        return throwError(() => error);
      })
    );
  }

  getMe(): Observable<ApiUserResponse> {
    const headers = this.getAuthHeaders();
    return this.http.get<ApiUserResponse>(`${this.API_URL}/me`, { headers });
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp > currentTime;
    } catch {
      return false;
    }
  }

  hasRole(role: string): boolean {
    const user = this.getUser();
    return user?.role === role;
  }

  isAdmin(): boolean {
    const user = this.getUser();
    return user?.role === 'admin' || user?.role_id === 1;
  }

  hasPermission(permission: string): boolean {
    const user = this.getUser();
    return user?.permissions?.includes(permission) || false;
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getUser(): User | null {
    return this.currentUserSubject.value;
  }

  mustChangePassword(): boolean {
    const user = this.getUser();
    return user?.must_change_password || false;
  }

  updateUser(user: User): void {
    localStorage.setItem('user', JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  private setSession(token: string, user: User): void {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  private clearSession(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.currentUserSubject.next(null);
  }

  private loadUserFromStorage(): void {
    const userJson = localStorage.getItem('user');
    if (userJson && this.isAuthenticated()) {
      const user = JSON.parse(userJson);
      this.currentUserSubject.next(user);
    } else {
      this.clearSession();
    }
  }

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