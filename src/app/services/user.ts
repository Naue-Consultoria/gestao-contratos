import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'user';
}

export interface UpdateUserRequest {
  email?: string;
  name?: string;
  role?: 'admin' | 'user';
  password?: string;
  is_active?: boolean;
}

export interface ApiUser {
  id: number;
  email: string;
  name: string;
  role_name: string;
  is_active: boolean;
  created_at: string;
  must_change_password?: boolean;
  last_login_at?: string | null;
  last_activity_at?: string | null;
  login_count?: number;
}

export interface UsersResponse {
  users: ApiUser[];
}

export interface CreateUserResponse {
  message: string;
  user: ApiUser;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly API_URL = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  /**
   * Listar todos os usuários (apenas admin)
   */
  getUsers(): Observable<UsersResponse> {
    return this.http.get<UsersResponse>(this.API_URL);
  }

  /**
   * Criar novo usuário (apenas admin)
   */
  createUser(userData: CreateUserRequest): Observable<CreateUserResponse> {
    return this.http.post<CreateUserResponse>(this.API_URL, userData);
  }

  /**
   * Atualizar usuário (apenas admin)
   */
  updateUser(id: number, userData: UpdateUserRequest): Observable<any> {
    return this.http.put(`${this.API_URL}/${id}`, userData);
  }

  /**
   * Ativar/Desativar usuário (apenas admin)
   */
  toggleUserStatus(id: number): Observable<any> {
    return this.http.patch(`${this.API_URL}/${id}/toggle-status`, {});
  }

  /**
   * Deletar usuário (apenas admin)
   */
  deleteUserPermanent(userId: number): Observable<any> {
    // This is the new hard delete
    return this.http.delete(`${this.API_URL}/users/${userId}/permanent`);
  }

  /**
   * Resetar senha do usuário (apenas admin)
   */
  resetUserPassword(id: number): Observable<any> {
    return this.http.post(`${this.API_URL}/${id}/reset-password`, {});
  }

  /**
   * Gerar senha temporária
   */
  generateTempPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
}