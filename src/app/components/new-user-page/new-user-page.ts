import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { UserService } from '../../services/user';
import { ToastrService } from 'ngx-toastr';

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
      const payload: any = {
        name: this.userData.name,
        email: this.userData.email,
        role: this.userData.role,
        is_active: this.userData.isActive
      };

      // Only include password if provided
      if (this.userData.password) {
        payload.password = this.userData.password;
      }

      if (this.isEditMode && this.editingUserId) {
        // Update existing user
        await this.userService.updateUser(this.editingUserId, payload).toPromise();
        this.toastr.success('Usuário atualizado com sucesso!');
      } else {
        // Create new user
        payload.password = this.userData.password; // Password is required for new users
        await this.userService.createUser(payload).toPromise();
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
      
      if (this.userData.password !== this.userData.confirmPassword) {
        this.errors['confirmPassword'] = 'As senhas não conferem';
      }
    }
    
    // If editing and password provided, validate
    if (this.isEditMode && this.userData.password) {
      if (this.userData.password.length < 6) {
        this.errors['password'] = 'Senha deve ter no mínimo 6 caracteres';
      }
      
      if (this.userData.password !== this.userData.confirmPassword) {
        this.errors['confirmPassword'] = 'As senhas não conferem';
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
}