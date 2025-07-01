import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { UserService, CreateUserRequest, UpdateUserRequest, ApiUser } from '../../services/user';
import { AuthService } from '../../services/auth';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-new-user-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './new-user-page.html',
  styleUrls: ['./new-user-page.css']
})
export class NewUserPageComponent implements OnInit {
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toastr = inject(ToastrService);
  
  // Form data
  userData = {
    name: '',
    email: '',
    role: 'user', // Default role
    password: '',
    confirmPassword: ''
  };
  
  // Estado do formulário
  isSaving = false;
  errors: { [key: string]: string } = {};
  isEditMode = false;
  editingUserId: number | null = null;
  showPassword = false;
  showConfirmPassword = false;
  
  // Lista de roles disponíveis
  availableRoles = [
    { value: 'admin', label: 'Administrador', description: 'Acesso total ao sistema' },
    { value: 'user', label: 'Usuário', description: 'Acesso limitado' }
  ];
  
  ngOnInit() {
    // Verificar se o usuário tem permissão de admin
    if (!this.authService.isAdmin()) {
      this.toastr.error('Acesso negado. Apenas administradores podem gerenciar usuários.');
      this.router.navigate(['/home/dashboard']);
      return;
    }
    
    // Verificar se é modo de edição através dos parâmetros da rota
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.editingUserId = +params['id'];
        this.loadUserData();
      }
    });
  }
  
  /**
   * Carregar dados do usuário para edição
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
          confirmPassword: ''
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
   * Validar formulário
   */
  validateForm(): boolean {
    this.errors = {};
    
    // Nome é obrigatório
    if (!this.userData.name.trim()) {
      this.errors['name'] = 'Nome é obrigatório';
    }
    
    // Email é obrigatório e deve ser válido
    if (!this.userData.email.trim()) {
      this.errors['email'] = 'Email é obrigatório';
    } else if (!this.isValidEmail(this.userData.email)) {
      this.errors['email'] = 'Email inválido';
    }
    
    // Senha é obrigatória apenas para novos usuários
    if (!this.isEditMode) {
      if (!this.userData.password) {
        this.errors['password'] = 'Senha é obrigatória';
      } else if (this.userData.password.length < 6) {
        this.errors['password'] = 'Senha deve ter no mínimo 6 caracteres';
      }
      
      if (this.userData.password !== this.userData.confirmPassword) {
        this.errors['confirmPassword'] = 'Senhas não conferem';
      }
    }
    
    // Se estiver editando e forneceu senha, validar
    if (this.isEditMode && this.userData.password) {
      if (this.userData.password.length < 6) {
        this.errors['password'] = 'Senha deve ter no mínimo 6 caracteres';
      }
      
      if (this.userData.password !== this.userData.confirmPassword) {
        this.errors['confirmPassword'] = 'Senhas não conferem';
      }
    }
    
    return Object.keys(this.errors).length === 0;
  }
  
  /**
   * Validar email
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  /**
   * Salvar usuário (criar ou atualizar)
   */
  async onSave() {
    if (!this.validateForm()) {
      return;
    }
    
    this.isSaving = true;
    
    try {
      if (this.isEditMode && this.editingUserId) {
        // Atualizar usuário existente
        await this.updateUser();
      } else {
        // Criar novo usuário
        await this.createUser();
      }
    } catch (error: any) {
      console.error('❌ Erro ao salvar usuário:', error);
      this.errors['general'] = error.error?.message || 'Erro ao salvar usuário. Tente novamente.';
    } finally {
      this.isSaving = false;
    }
  }
  
  /**
   * Criar novo usuário
   */
  private async createUser() {
    const userRequest: CreateUserRequest = {
      name: this.userData.name.trim(),
      email: this.userData.email.trim(),
      password: this.userData.password,
      role: this.userData.role as "user" | "admin"
    };
    
    this.userService.createUser(userRequest).subscribe({
      next: (response) => {
        console.log('✅ Usuário criado:', response);
        this.toastr.success('Usuário criado com sucesso!');
        
        // Disparar evento para atualizar lista
        window.dispatchEvent(new CustomEvent('refreshUsers'));
        
        // Navegar de volta para a lista
        this.router.navigate(['/home/users']);
      },
      error: (error) => {
        console.error('❌ Erro ao criar usuário:', error);
        this.errors['general'] = error.error?.message || 'Erro ao criar usuário';
        this.isSaving = false;
      }
    });
  }
  
  /**
   * Atualizar usuário existente
   */
  private async updateUser() {
    if (!this.editingUserId) return;
    
    const updateRequest: UpdateUserRequest = {
      name: this.userData.name.trim(),
      email: this.userData.email.trim(),
      role: this.userData.role as "user" | "admin"
    };
    
    this.userService.updateUser(this.editingUserId, updateRequest).subscribe({
      next: (response) => {
        console.log('✅ Usuário atualizado:', response);
        this.toastr.success('Usuário atualizado com sucesso!');
        
        // Disparar evento para atualizar lista
        window.dispatchEvent(new CustomEvent('refreshUsers'));
        
        // Navegar de volta para a lista
        this.router.navigate(['/home/users']);
      },
      error: (error) => {
        console.error('❌ Erro ao atualizar usuário:', error);
        this.errors['general'] = error.error?.message || 'Erro ao atualizar usuário';
        this.isSaving = false;
      }
    });
  }
  
  /**
   * Cancelar e voltar para a lista
   */
  onCancel() {
    this.router.navigate(['/home/users']);
  }
  
  /**
   * Obter título da página
   */
  getPageTitle(): string {
    return this.isEditMode ? 'Editar Usuário' : 'Novo Usuário';
  }
  
  /**
   * Obter texto do botão
   */
  getButtonText(): string {
    if (this.isSaving) {
      return this.isEditMode ? 'Atualizando...' : 'Salvando...';
    }
    return this.isEditMode ? 'Atualizar' : 'Salvar';
  }
  
  /**
   * Toggle para mostrar/ocultar senha
   */
  togglePasswordVisibility(field: 'password' | 'confirmPassword') {
    if (field === 'password') {
      this.showPassword = !this.showPassword;
    } else {
      this.showConfirmPassword = !this.showConfirmPassword;
    }
  }
  
  /**
   * Obter descrição do role
   */
  getRoleDescription(role: string): string {
    const roleInfo = this.availableRoles.find(r => r.value === role);
    return roleInfo?.description || '';
  }
}