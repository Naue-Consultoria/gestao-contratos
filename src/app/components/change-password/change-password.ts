import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-change-password',
  templateUrl: './change-password.html'
})
export class ChangePasswordComponent implements OnInit {
  changePasswordForm: FormGroup;
  isFirstLogin: boolean = false;
  loading: boolean = false;
  error: string = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.changePasswordForm = this.fb.group({
      current_password: [''],
      new_password: ['', [Validators.required, Validators.minLength(6)]],
      confirm_password: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit() {
    const user = this.authService.getUser();
    this.isFirstLogin = user?.must_change_password || false;

    if (this.isFirstLogin) {
      // Remover campo de senha atual se for primeiro login
      this.changePasswordForm.removeControl('current_password');
    }
  }

  passwordMatchValidator(g: FormGroup) {
    return g.get('new_password')?.value === g.get('confirm_password')?.value
      ? null : { mismatch: true };
  }

  onSubmit() {
    if (this.changePasswordForm.valid) {
      this.loading = true;
      this.error = '';

      const endpoint = this.isFirstLogin 
        ? '/api/auth/change-password-first-login'
        : '/api/auth/change-password';

      const data = this.isFirstLogin 
        ? { new_password: this.changePasswordForm.value.new_password }
        : this.changePasswordForm.value;

      this.authService.changePassword(endpoint, data).subscribe({
        next: (response) => {
          if (response.token) {
            // Atualizar token se vier novo
            localStorage.setItem('token', response.token);
            localStorage.setItem('user', JSON.stringify(response.user));
          }
          this.router.navigate(['/dashboard']);
        },
        error: (error) => {
          this.error = error.error?.error || 'Erro ao trocar senha';
          this.loading = false;
        }
      });
    }
  }
}