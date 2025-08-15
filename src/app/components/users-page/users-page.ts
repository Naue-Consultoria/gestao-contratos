import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UserService } from '../../services/user';
import { ProfilePictureService } from '../../services/profile-picture.service';
import { ToastrService } from 'ngx-toastr';
import { firstValueFrom, Subscription } from 'rxjs';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  permission: string;
  status: 'active' | 'inactive';
  since: string;
  initials: string;
  avatarGradient: string;
  profilePictureUrl?: string;
  hasProfilePicture?: boolean;
}

@Component({
  selector: 'app-users-page',
  standalone: true,
  imports: [CommonModule, BreadcrumbComponent],
  templateUrl: './users-page.html',
  styleUrls: ['./users-page.css']
})
export class UsersPageComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private userService = inject(UserService);
  private profilePictureService = inject(ProfilePictureService);
  private toastr = inject(ToastrService);
  private subscriptions = new Subscription();

  users: User[] = [];
  loading = false;
  error = '';
  currentFilter: 'active' | 'inactive' | 'all' = 'active';
  openDropdownId: number | null = null;

  ngOnInit() {
    this.loadUsers();
    this.subscribeToRefreshEvents();
    // Close dropdown when clicking outside
    document.addEventListener('click', this.closeDropdown.bind(this));
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    window.removeEventListener('refreshUsers', this.handleRefreshUsers);
    document.removeEventListener('click', this.closeDropdown.bind(this));
  }

  private subscribeToRefreshEvents() {
    window.addEventListener('refreshUsers', this.handleRefreshUsers);
  }

  private handleRefreshUsers = () => {
    this.loadUsers();
  }

  setFilter(filter: 'active' | 'inactive' | 'all') {
    this.currentFilter = filter;
    this.loadUsers();
  }

  async loadUsers() {
    this.loading = true;
    this.error = '';

    const params: { is_active?: boolean } = {};
    if (this.currentFilter !== 'all') {
      params.is_active = this.currentFilter === 'active';
    }

    try {
      const response = await firstValueFrom(this.userService.getUsers(params));
      
      if (response && response.users) {
        this.users = response.users.map(user => this.mapApiUserToTableUser(user));
        this.loadProfilePictures();
      }
    } catch (error: any) {
      console.error('❌ Erro ao carregar usuários:', error);
      this.error = 'Erro ao carregar usuários. Tente novamente.';
      this.toastr.error('Erro ao carregar usuários');
    } finally {
      this.loading = false;
    }
  }

  private mapApiUserToTableUser(apiUser: any): User {
    const initials = this.getInitials(apiUser.name || apiUser.email);
    const since = apiUser.created_at 
    ? new Date(apiUser.created_at).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
    : new Date().toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
    
    return {
      id: apiUser.id,
      name: apiUser.name || 'Usuário',
      email: apiUser.email,
      role: this.getRoleDisplay(apiUser.role_name),
      permission: this.getPermissionDisplay(apiUser.role_name),
      status: apiUser.is_active ? 'active' : 'inactive',
      since: since,
      initials: initials,
      profilePictureUrl: undefined,
      avatarGradient: this.generateGradient(apiUser.name || apiUser.email),
      hasProfilePicture: !!(apiUser.profile_picture_path) // Nova propriedade
    };
  }

  private loadProfilePictures(): void {
    this.users.forEach(user => {
      // Só carrega se o usuário tem foto de perfil no banco
      if (user.hasProfilePicture) {
        this.profilePictureService.getProfilePictureUrl(user.id).subscribe({
          next: (url) => {
            if (url) {
              user.profilePictureUrl = url;
            }
          },
          error: () => {
            // Ignora erros, mantém undefined para mostrar iniciais
          }
        });
      }
    });
  }

  private getRoleDisplay(roleName: string): string {
    const roleMap: { [key: string]: string } = {
      'admin': 'Administrador',
      'user': 'Usuário',
      'collaborator': 'Colaborador'
    };
    return roleMap[roleName] || 'Usuário';
  }

  private getPermissionDisplay(roleName: string): string {
    const permissionMap: { [key: string]: string } = {
      'admin': 'Admin',
      'user': 'Colaborador',
      'collaborator': 'Colaborador'
    };
    return permissionMap[roleName] || 'Colaborador';
  }

  private getInitials(name: string): string {
    if (!name) return 'NN';
    
    const words = name.split(' ').filter(word => word.length > 0);
    
    if (words.length === 0) return 'NN';
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
    
    return (words[0][0] + words[1][0]).toUpperCase();
  }

  private generateGradient(name: string): string {
    const gradients = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
      'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
      'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)'
    ];
    
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = ((hash << 5) - hash) + name.charCodeAt(i);
      hash = hash & hash;
    }
    
    return gradients[Math.abs(hash) % gradients.length];
  }

  openNewUserPage() {
    this.router.navigate(['/home/users/new']);
  }

  editUser(userId: number) {
    this.router.navigate(['/home/users/edit', userId]);
  }

  trackByUserId(index: number, user: User): number {
    return user.id;
  }

  async toggleUserStatus(user: User) {
    this.closeDropdown();
    const action = user.status === 'active' ? 'desativar' : 'ativar';
    const confirmMessage = `Tem certeza que deseja ${action} o usuário ${user.name}?`;
    
    if (confirm(confirmMessage)) {
      try {
        const newStatus = user.status === 'active' ? false : true;
        await this.userService.updateUser(user.id, { is_active: newStatus }).toPromise();
        
        this.toastr.success(`Usuário ${action === 'desativar' ? 'desativado' : 'ativado'} com sucesso!`);
        this.loadUsers();
      } catch (error) {
        console.error('❌ Erro ao alterar status do usuário:', error);
        this.toastr.error(`Erro ao ${action} usuário`);
      }
    }
  }

  async resetPassword(user: User) {
    this.closeDropdown();
    const confirmMessage = `Tem certeza que deseja resetar a senha do usuário ${user.name}? Uma nova senha temporária será enviada por email.`;
    
    if (confirm(confirmMessage)) {
      try {
        // Implementar chamada para API de reset de senha
        await this.userService.resetUserPassword(user.id).toPromise();
        
        this.toastr.success('Senha resetada com sucesso! O usuário receberá as instruções por email.');
      } catch (error) {
        console.error('❌ Erro ao resetar senha:', error);
        this.toastr.error('Erro ao resetar senha do usuário');
      }
    }
  }

  toggleDropdown(userId: number) {
    this.openDropdownId = this.openDropdownId === userId ? null : userId;
  }

  closeDropdown() {
    this.openDropdownId = null;
  }

  async deleteUser(userId: number, userName: string) {
    this.closeDropdown();
    // First, ask for a permanent delete
    const hardDeleteConfirmation = confirm(`Você deseja EXCLUIR PERMANENTEMENTE o usuário "${userName}"?

⚠️ Esta ação é irreversível e o usuário não poderá ser recuperado.

Clique em "OK" para a exclusão permanente.`);

    if (hardDeleteConfirmation) {
      try {
        await firstValueFrom(this.userService.hardDeleteUser(userId));
        this.toastr.success('Usuário excluído permanentemente!');
        this.loadUsers(); // Refresh list
      } catch (error: any) {
        this.toastr.error(error.error?.error || 'Erro ao excluir permanentemente o usuário.');
      }
      return; // End the function here
    }

    // If the user cancelled the hard delete, ask for a soft delete
    const softDeleteConfirmation = confirm(`Você deseja DESATIVAR e ANONIMIZAR o usuário "${userName}"?

Esta ação manterá o histórico do usuário, mas impedirá seu acesso ao sistema.

Clique em "OK" para desativar e anonimizar.`);

    if (softDeleteConfirmation) {
      try {
        await firstValueFrom(this.userService.softDeleteUser(userId));
        this.toastr.info('Usuário desativado e anonimizado.');
        this.loadUsers();
      } catch (error: any) {
        this.toastr.error(error.error?.error || 'Erro ao desativar o usuário.');
      }
    }
  }
}