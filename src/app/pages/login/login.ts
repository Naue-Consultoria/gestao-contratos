// src/app/pages/login/login.component.ts
import { Component } from '@angular/core';
import { LoginLayout } from '../../components/login-layout/login-layout';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LoginPrimaryInput } from '../../components/login-primary-input/login-primary-input';
import { Router, RouterLink } from '@angular/router';
import { LoginService } from '../../services/login';
import { ToastrService } from 'ngx-toastr';

interface LoginForm {
  email: FormControl;
  password: FormControl;
}

@Component({
  selector: 'app-login',
  imports: [LoginLayout,
    ReactiveFormsModule,
    LoginPrimaryInput,
    RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
loginForm!: FormGroup<LoginForm>;

  constructor(
    private router: Router,
    private loginService: LoginService,
    private toastService: ToastrService
  ) {
    this.loginForm = new FormGroup({
      email: new FormControl('', [Validators.required, Validators.email]),
      password: new FormControl('', [
        Validators.required,
        Validators.minLength(6),
      ]),
    });
  }

  submit() {
    this.loginService.login(this.loginForm.value.email, this.loginForm.value.password).subscribe({
      next: () => {
        this.toastService.success('Login successful!');
        this.router.navigate(['/home']);
      },
      error: () => this.toastService.error('Login failed!')
    })
  }

  navigate() {
    this.router.navigate(['register']);
  }
}