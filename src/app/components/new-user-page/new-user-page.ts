import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { UserService } from '../../services/user';
import { ToastrService } from 'ngx-toastr';
import { firstValueFrom } from 'rxjs';

interface UserData {
  name: string;
  email: string;
  role: string;
  password: string;
  confirmPassword: string;
  isActive: boolean;
}

@Component({
  selector: 'app-new-user-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './new-user-page.html',
  styleUrls: ['./new-user-page.css']
})
export class NewUserPageComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private userService = inject(UserService);
  private toastr = inject(ToastrService);

  // Form data
  userData: UserData = {
    name: '',
    email: '',
    role: 'user',
    password: '',
    confirmPassword: '',
    isActive: true
  };

  // UI states
  isEditMode = false;
  editingUserId: number | null = null;
  isLoading = false;
  errorMessage = '';
  errors: { [key: string]: string } = {};
  showPassword = false;
  showConfirmPassword = false;

  ngOnInit() {
    // Check if admin
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user.role !== 'admin') {
        this.toastr.error('Apenas administradores podem gerenciar usuários.');
        this.router.navigate(['/home/dashboard']);
        return;
      }
    }
    
    // Check if editing
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.editingUserId = +params['id'];
        this.loadUserData();
      } else {
        // Se estiver criando novo usuário, gerar senha automaticamente
        this.generateRandomPassword();
      }
    });
  }

  /**
   * Load user data for editing
   */
  private async loadUserData() {
    if (!this.editingUserId) return;
    
    try {
      const users = await this.userService.getUsers().toPromise();
      const user = users?.users.find(u => u.id === this.editingUserId);
      
      if (user) {
        this.isEditMode = true;
        this.userData = {
          name: user.name || '',
          email: user.email || '',
          role: user.role_name || 'user',
          password: '',
          confirmPassword: '',
          isActive: user.is_active !== false
        };
      } else {
        this.toastr.error('Usuário não encontrado');
        this.router.navigate(['/home/users']);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar usuário:', error);
      this.toastr.error('Erro ao carregar dados do usuário');
      this.router.navigate(['/home/users']);
    }
  }

  /**
   * Save user
   */
  async saveUser() {
    if (!this.validateForm()) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      // The payload is an object that will be sent to the API.
      // We are only including the fields the API expects.
      const payload: any = {
        name: this.userData.name,
        email: this.userData.email,
        role: this.userData.role,
        // The "is_active" field has been removed from here.
      };

      if (this.isEditMode && this.editingUserId) {
        payload.is_active = this.userData.isActive;
        
        await this.userService.updateUser(this.editingUserId, payload).toPromise();
        this.toastr.success('Usuário atualizado com sucesso!');
      } else {
        payload.password = this.userData.password;
        await firstValueFrom(this.userService.createUser(payload));
        this.toastr.success('Usuário criado com sucesso!');
      }

      // Dispatch event to refresh users list
      window.dispatchEvent(new CustomEvent('refreshUsers'));
      
      // Navigate back to users page
      this.router.navigate(['/home/users']);
    } catch (error: any) {
      console.error('❌ Erro ao salvar usuário:', error);
      this.errorMessage = error.error?.message || 'Erro ao salvar usuário. Tente novamente.';
      this.toastr.error(this.errorMessage);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Validate form
   */
  private validateForm(): boolean {
    this.errors = {};
    
    // Name is required
    if (!this.userData.name.trim()) {
      this.errors['name'] = 'Nome é obrigatório';
    }
    
    // Email is required and must be valid
    if (!this.userData.email.trim()) {
      this.errors['email'] = 'Email é obrigatório';
    } else if (!this.isValidEmail(this.userData.email)) {
      this.errors['email'] = 'Email inválido';
    }
    
    // Password is required only for new users
    if (!this.isEditMode) {
      if (!this.userData.password) {
        this.errors['password'] = 'Senha é obrigatória';
      } else if (this.userData.password.length < 6) {
        this.errors['password'] = 'Senha deve ter no mínimo 6 caracteres';
      }
    }
    
    return Object.keys(this.errors).length === 0;
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Cancel and go back
   */
  cancel() {
    this.router.navigate(['/home/users']);
  }

  /**
   * Get page title
   */
  getPageTitle(): string {
    return this.isEditMode ? 'Editar Usuário' : 'Novo Usuário';
  }

  /**
   * Generate random password
   */
  generateRandomPassword() {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    // Garantir que a senha tenha pelo menos:
    // - 1 letra minúscula
    // - 1 letra maiúscula
    // - 1 número
    // - 1 caractere especial
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const special = '!@#$%^&*';
    
    // Adicionar um de cada tipo obrigatório
    password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
    password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
    password += numbers.charAt(Math.floor(Math.random() * numbers.length));
    password += special.charAt(Math.floor(Math.random() * special.length));
    
    // Preencher o resto com caracteres aleatórios
    for (let i = password.length; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    // Embaralhar a senha
    password = password.split('').sort(() => Math.random() - 0.5).join('');
    
    // Atualizar os campos
    this.userData.password = password;
    this.userData.confirmPassword = password;
    
    // Mostrar a senha temporariamente
    this.showPassword = true;
    this.showConfirmPassword = true;
    
    // Limpar erros de senha se existirem
    delete this.errors['password'];
    delete this.errors['confirmPassword'];
    
    // Mostrar notificação apenas se foi clicado manualmente
    if (this.userData.name || this.userData.email) {
      this.toastr.info('Senha aleatória gerada! Certifique-se de salvá-la ou enviá-la ao usuário.');
    }
  }

  /**
   * Calculate password strength percentage
   */
  getPasswordStrength(): number {
    const password = this.userData.password;
    if (!password) return 0;
    
    let strength = 0;
    
    // Length
    if (password.length >= 6) strength += 20;
    if (password.length >= 8) strength += 20;
    if (password.length >= 12) strength += 20;
    
    // Character types
    if (/[a-z]/.test(password)) strength += 10;
    if (/[A-Z]/.test(password)) strength += 10;
    if (/[0-9]/.test(password)) strength += 10;
    if (/[^a-zA-Z0-9]/.test(password)) strength += 10;
    
    return Math.min(strength, 100);
  }

  /**
   * Get password strength text
   */
  getPasswordStrengthText(): string {
    const strength = this.getPasswordStrength();
    
    if (strength <= 33) return 'Fraca';
    if (strength <= 66) return 'Média';
    return 'Forte';
  }
}