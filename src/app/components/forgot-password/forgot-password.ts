import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LoginLayout } from '../login-layout/login-layout';
import { LoginPrimaryInput } from '../login-primary-input/login-primary-input';
import { AuthService } from '../../services/auth';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    RouterLink,
    LoginLayout, 
    LoginPrimaryInput
  ],
  templateUrl: './forgot-password.html',
  styleUrls: ['./forgot-password.css']
})
export class ForgotPasswordComponent {
  forgotPasswordForm: FormGroup;
  loading = false;
  resendLoading = false;
  emailSent = false;
  sentToEmail = '';
  error = '';
  buttonText = 'Enviar código';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private notificationService: NotificationService
  ) {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  onKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter' && this.forgotPasswordForm.valid && !this.loading) {
      event.preventDefault();
      this.submit();
    }
  }

  submit() {
    if (this.forgotPasswordForm.valid && !this.loading) {
      this.loading = true;
      this.error = '';
      this.buttonText = 'Enviando...';

      const email = this.forgotPasswordForm.value.email;

      this.authService.forgotPassword(email).subscribe({
        next: (response) => {
          this.emailSent = true;
          this.sentToEmail = email;
          this.loading = false;
          this.buttonText = 'Enviar código';
          
          this.notificationService.success(
            'Código enviado!',
            'Verifique seu email para recuperar a senha.'
          );
        },
        error: (error) => {
          this.loading = false;
          this.buttonText = 'Enviar código';
          
          if (error.status === 429) {
            this.error = 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
          } else if (error.status === 0) {
            this.error = 'Erro de conexão. Verifique sua internet e tente novamente.';
          } else {
            // Sempre mostrar mensagem genérica por segurança
            this.error = 'Se o email existir, você receberá as instruções de recuperação.';
            // Mas ainda assim mostrar como sucesso para não revelar se o email existe
            setTimeout(() => {
              this.emailSent = true;
              this.sentToEmail = email;
              this.error = '';
            }, 2000);
          }
        }
      });
    }
  }

  resendCode() {
    if (!this.resendLoading && this.sentToEmail) {
      this.resendLoading = true;
      this.error = '';

      this.authService.forgotPassword(this.sentToEmail).subscribe({
        next: () => {
          this.resendLoading = false;
          this.notificationService.success(
            'Código reenviado!',
            'Verifique seu email novamente.'
          );
        },
        error: (error) => {
          this.resendLoading = false;
          
          if (error.status === 429) {
            this.error = 'Aguarde alguns minutos antes de solicitar novo código.';
          } else {
            this.error = 'Erro ao reenviar código. Tente novamente.';
          }
        }
      });
    }
  }

  goToResetPassword() {
    // Navegar para a página de reset com o email
    this.router.navigate(['/reset-password'], {
      queryParams: { email: this.sentToEmail }
    });
  }
}