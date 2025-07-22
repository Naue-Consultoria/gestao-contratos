// src/app/components/forgot-password/forgot-password.ts

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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
    ReactiveFormsModule,
    RouterLink,
    LoginLayout,
    LoginPrimaryInput
  ],
  templateUrl: './forgot-password.html',
  styleUrls: ['./forgot-password.css']
})
export class ForgotPasswordComponent {
  formStage: 'request' | 'validate' = 'request';
  isLoading = false;
  error = '';
  
  requestForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private notificationService: NotificationService,
    private router: Router
  ) {
    this.requestForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  async requestReset() {
    if (this.requestForm.invalid) {
      this.notificationService.warning('Por favor, informe um e-mail válido.');
      return;
    }
    this.isLoading = true;
    this.error = '';

    try {
      const email = this.requestForm.value.email;
      await firstValueFrom(this.authService.forgotPassword(email));
      
      // This is the key change: switch to the next stage
      this.formStage = 'validate';
      
    } catch (error: any) {
      // For security, even on error, we show the success message
      // so we don't reveal which emails are registered.
      this.formStage = 'validate';
    } finally {
      this.isLoading = false;
    }
  }

  // Navigate to the page where the user will input the code and new password
  goToResetPasswordPage() {
    const email = this.requestForm.value.email;
    this.router.navigate(['/reset-password'], { queryParams: { email: email } });
  }
}