import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService, CreateUserRequest } from '../../services/user';
import { ToastrService } from 'ngx-toastr';

interface UserFormData {
  name: string;
  email: string;
  role: 'admin' | 'user';
  password: string;
}

@Component({
  selector: 'app-user-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-modal.html',
  styleUrls: ['./user-modal.css']
})
export class UserModal implements OnInit {
  @Input() isOpen = false;
  
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<void>();
  
  // Form data
  userData: UserFormData = {
    name: '',
    email: '',
    role: 'user',
    password: ''
  };
  
  roleOptions = [
    { value: 'user', label: 'Usuário' },
    { value: 'admin', label: 'Administrador' }
  ];

  loading = false;
  
  constructor(
    private userService: UserService,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    // Gerar senha temporária quando o modal abrir
    if (this.isOpen) {
      this.generatePassword();
    }
  }

  ngOnChanges() {
    // Gerar nova senha quando o modal for aberto
    if (this.isOpen && !this.userData.password) {
      this.generatePassword();
    }
  }

  generatePassword() {
    this.userData.password = this.userService.generateTempPassword();
  }
  
  onBackdropClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal')) {
      this.close.emit();
    }
  }
  
  onSave() {
    if (!this.validateForm()) {
      return;
    }

    this.loading = true;

    const createUserData: CreateUserRequest = {
      email: this.userData.email,
      password: this.userData.password,
      name: this.userData.name,
      role: this.userData.role
    };

    this.userService.createUser(createUserData).subscribe({
      next: (response) => {
        this.toastr.success('Usuário criado com sucesso!');
        this.resetForm();
        this.save.emit(); // Notificar componente pai
        this.close.emit();
        this.loading = false;
      },
      error: (error) => {
        console.error('Erro ao criar usuário:', error);
        
        let errorMessage = 'Erro ao criar usuário';
        if (error.status === 409) {
          errorMessage = 'Email já cadastrado';
        } else if (error.error?.error) {
          errorMessage = error.error.error;
        }
        
        this.toastr.error(errorMessage);
        this.loading = false;
      }
    });
  }

  private validateForm(): boolean {
    if (!this.userData.name.trim()) {
      this.toastr.warning('Nome é obrigatório');
      return false;
    }

    if (!this.userData.email.trim()) {
      this.toastr.warning('Email é obrigatório');
      return false;
    }

    if (!this.isValidEmail(this.userData.email)) {
      this.toastr.warning('Email inválido');
      return false;
    }

    if (!this.userData.password) {
      this.toastr.warning('Senha é obrigatória');
      return false;
    }

    if (this.userData.password.length < 6) {
      this.toastr.warning('Senha deve ter pelo menos 6 caracteres');
      return false;
    }

    return true;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private resetForm() {
    this.userData = {
      name: '',
      email: '',
      role: 'user',
      password: ''
    };
  }

  onClose() {
    this.resetForm();
    this.close.emit();
  }
}