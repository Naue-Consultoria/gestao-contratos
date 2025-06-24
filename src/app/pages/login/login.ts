import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoginLayout } from '../../components/login-layout/login-layout';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LoginPrimaryInput } from '../../components/login-primary-input/login-primary-input';
import { Router, RouterLink } from '@angular/router';
import { LoginService } from '../../services/login';
import { ToastrService } from 'ngx-toastr';

interface LoginForm {
  email: FormControl<string | null>;
  password: FormControl<string | null>;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    LoginLayout,
    ReactiveFormsModule,
    LoginPrimaryInput,
    RouterLink
  ],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login implements OnInit {
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

  ngOnInit() {
    // Debug para verificar se o formulário foi criado
    console.log('Login Form:', this.loginForm);
    console.log('Email Control:', this.loginForm.get('email'));
    console.log('Password Control:', this.loginForm.get('password'));
  }

  submit() {
    if (this.loginForm.valid) {
      const email = this.loginForm.value.email || '';
      const password = this.loginForm.value.password || '';
      
      this.loginService.login(email, password).subscribe({
        next: () => {
          this.toastService.success('Login realizado com sucesso!');
          this.router.navigate(['/home']);
        },
        error: () => this.toastService.error('Falha no login!')
      });
    }
  }

  navigate() {
    this.router.navigate(['register']);
  }
}