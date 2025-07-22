// src/app/components/forgot-password/forgot-password.ts

import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../services/auth';
import { NotificationService } from '../../services/notification.service';
import { LoginLayout } from '../login-layout/login-layout';
import { LoginPrimaryInput } from '../login-primary-input/login-primary-input';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ CommonModule, ReactiveFormsModule, RouterLink, LoginLayout, LoginPrimaryInput ],
  templateUrl: './forgot-password.html',
  styleUrls: ['./forgot-password.css']
})
export class ForgotPasswordComponent {
  // --- State to control which form is visible ---
  formStage: 'request' | 'validate' = 'request';
  isLoading = false;
  error = '';
  
  requestForm: FormGroup;
  // --- This form is new; it handles the code and new password ---
  resetForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private notificationService: NotificationService,
    private router: Router
  ) {
    this.requestForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });

    this.resetForm = this.fb.group({
      code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  // --- Action for the first form (requesting the code) ---
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
      // For security, show the success stage even if the email doesn't exist
      this.formStage = 'validate';
    } finally {
      this.isLoading = false;
    }
  }

  // --- Action for the second form (validating code and resetting password) ---
  async resetPassword() {
    if (this.resetForm.invalid) {
      this.notificationService.warning('Por favor, preencha todos os campos corretamente.');
      return;
    }
    this.isLoading = true;
    this.error = '';

    try {
      const { code, password } = this.resetForm.value;
      await firstValueFrom(this.authService.resetPassword(code, password));
      
      this.notificationService.success('Sua senha foi alterada com sucesso!');
      this.router.navigate(['/login']);

    } catch (error: any) {
      this.error = 'Código inválido ou expirado. Tente novamente ou solicite um novo código.';
    } finally {
      this.isLoading = false;
    }
  }
}