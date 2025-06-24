import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { LoginResponse } from '../types/login-response';
import { tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoginService {
  // TODO: Trocar URL para o servidor de produção do backend
  apiUrl = "http://localhost:8080/auth";

  constructor(private httpClient: HttpClient) { }

  login(email: string, password: string) {
    return this.httpClient.post<LoginResponse>(this.apiUrl + "/login" , { email, password }).pipe(
      tap((value) => {
        sessionStorage.setItem('auth-token', value.token);
        sessionStorage.setItem('username', value.name);
      })
    );
  }

  forgotPassword(email: string) {
    return this.httpClient.post(this.apiUrl + "/esqueceu-senha", { email });
  }

  verifyResetCode(email: string, code: string) {
    return this.httpClient.post<{ token: string }>(this.apiUrl + "/verificar-codigo", { email, code });
  }

  resetPassword(token: string, newPassword: string) {
    return this.httpClient.post(this.apiUrl + "/trocar-senha", { token, password: newPassword });
  }
}

