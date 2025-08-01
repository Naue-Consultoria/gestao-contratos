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
      };

      if (this.isEditMode && this.editingUserId) {
        payload.is_active = this.userData.isActive;
        
        await this.userService.updateUser(this.editingUserId, payload).toPromise();
        this.toastr.success('Usuário atualizado com sucesso!');
      } else {
        await firstValueFrom(this.userService.createUser(payload));
        this.toastr.success('Usuário criado com sucesso! Uma senha temporária foi enviada por e-mail.');
      }

      window.dispatchEvent(new CustomEvent('refreshUsers'));
      this.router.navigate(['/home/users']);
    } catch (error: any) {
      console.error('❌ Erro ao salvar usuário:', error);
      this.errorMessage = error.error?.message || 'Erro ao salvar usuário. Tente novamente.';
      this.toastr.error(this.errorMessage);
    } finally {
      this.isLoading = false;
    }
  }

  private validateForm(): boolean {
    this.errors = {};
    if (!this.userData.name.trim()) {
      this.errors['name'] = 'Nome é obrigatório';
    }
    if (!this.userData.email.trim()) {
      this.errors['email'] = 'Email é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.userData.email)) {
      this.errors['email'] = 'Email inválido';
    }
    return Object.keys(this.errors).length === 0;
  }

  cancel() {
    this.router.navigate(['/home/users']);
  }

  getPageTitle(): string {
    return this.isEditMode ? 'Editar Usuário' : 'Novo Usuário';
  }
}