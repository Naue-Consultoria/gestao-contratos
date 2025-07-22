import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; // Import for *ngIf
import { FormsModule } from '@angular/forms';   // Import for ngModel and ngForm
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../services/auth';
import { NotificationService } from '../../services/notification.service';
import { LoginLayout } from '../login-layout/login-layout';
import { LoginPrimaryInput } from '../login-primary-input/login-primary-input';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    LoginLayout,
    LoginPrimaryInput
  ],
  templateUrl: './forgot-password.html',
  styleUrls: ['./forgot-password.css']
})
export class ForgotPasswordComponent {
  // --- Define all properties here ---
  formStage: 'request' | 'validate' = 'request';
  email: string = '';
  isLoading: boolean = false;
  
  // Properties for the second stage
  code: string = '';
  newPassword: string = '';

  constructor(
    private authService: AuthService,
    private notificationService: NotificationService,
    private router: Router
  ) {}

  async requestReset() {
    if (!this.email) {
      this.notificationService.warning('Por favor, informe seu e-mail.');
      return;
    }
    this.isLoading = true;
    try {
      await firstValueFrom(this.authService.forgotPassword(this.email));
      this.notificationService.success('Um código de recuperação foi enviado para seu e-mail.', 'Verifique sua caixa de entrada');
      this.formStage = 'validate';
    } catch (error: any) {
      this.notificationService.error(error.error?.message || 'Falha ao enviar e-mail de recuperação.');
    } finally {
      this.isLoading = false;
    }
  }

  async resetPassword() {
    if (!this.code || !this.newPassword) {
      this.notificationService.warning('Por favor, preencha o código e a nova senha.');
      return;
    }
    this.isLoading = true;
    try {
      await firstValueFrom(this.authService.resetPassword(this.code, this.newPassword));
      this.notificationService.success('Sua senha foi alterada com sucesso!');
      this.router.navigate(['/login']);
    } catch (error: any) {
      this.notificationService.error(error.error?.message || 'Código inválido ou expirado.');
    } finally {
      this.isLoading = false;
    }
  }
}