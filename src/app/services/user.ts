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

export interface AssignableUser {
  id: number;
  name: string;
  email: string;
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

  getUsers(params?: { is_active?: boolean }): Observable<UsersResponse> {
    return this.http.get<UsersResponse>(this.API_URL, { params });
  }

  createUser(userData: CreateUserRequest): Observable<CreateUserResponse> {
    return this.http.post<CreateUserResponse>(this.API_URL, userData);
  }

  updateUser(id: number, userData: UpdateUserRequest): Observable<any> {
    return this.http.put(`${this.API_URL}/${id}`, userData);
  }

  toggleUserStatus(id: number): Observable<any> {
    return this.http.patch(`${this.API_URL}/${id}/toggle-status`, {});
  }

  softDeleteUser(id: number): Observable<any> {
    return this.http.delete(`${this.API_URL}/${id}/soft-delete`);
  }

  hardDeleteUser(id: number): Observable<any> {
    return this.http.delete(`${this.API_URL}/${id}/hard-delete`);
  }

  resetUserPassword(id: number): Observable<any> {
    return this.http.post(`${this.API_URL}/${id}/reset-password`, {});
  }

  getUsersForAssignment(): Observable<AssignableUser[]> {
    return this.http.get<AssignableUser[]>(`${this.API_URL}/list-for-assignment`);
  }

  generateTempPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
}