import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UserService } from '../../services/user';
import { ToastrService } from 'ngx-toastr';
import { firstValueFrom, Subscription } from 'rxjs';

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
}

@Component({
  selector: 'app-users-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './users-page.html',
  styleUrls: ['./users-page.css']
})
export class UsersPageComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private userService = inject(UserService);
  private toastr = inject(ToastrService);
  private subscriptions = new Subscription();

  users: User[] = [];
  loading = false;
  error = '';

  ngOnInit() {
    this.loadUsers();
    this.subscribeToRefreshEvents();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    window.removeEventListener('refreshUsers', this.handleRefreshUsers);
  }

  /**
   * Inscrever-se em eventos de atualização
   */
  private subscribeToRefreshEvents() {
    // Escutar evento de atualização de usuários
    window.addEventListener('refreshUsers', this.handleRefreshUsers);
  }

  private handleRefreshUsers = () => {
    this.loadUsers();
  }

  /**
   * Carregar usuários do servidor
   */
  async loadUsers() {
    this.loading = true;
    this.error = '';

    try {
      const response = await this.userService.getUsers().toPromise();
      
      if (response && response.users) {
        this.users = response.users.map(user => this.mapApiUserToTableUser(user));
      }
    } catch (error: any) {
      console.error('❌ Erro ao carregar usuários:', error);
      this.error = 'Erro ao carregar usuários. Tente novamente.';
      this.toastr.error('Erro ao carregar usuários');
    } finally {
      this.loading = false;
    }
  }

  /**
   * Mapear usuário da API para formato da tabela
   */
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
      avatarGradient: this.generateGradient(apiUser.name || apiUser.email)
    };
  }

  /**
   * Obter display do cargo
   */
  private getRoleDisplay(roleName: string): string {
    const roleMap: { [key: string]: string } = {
      'admin': 'Administrador',
      'user': 'Usuário',
      'collaborator': 'Colaborador'
    };
    return roleMap[roleName] || 'Usuário';
  }

  /**
   * Obter display da permissão
   */
  private getPermissionDisplay(roleName: string): string {
    const permissionMap: { [key: string]: string } = {
      'admin': 'Admin',
      'user': 'Colaborador',
      'collaborator': 'Colaborador'
    };
    return permissionMap[roleName] || 'Colaborador';
  }

  /**
   * Gerar iniciais do nome
   */
  private getInitials(name: string): string {
    if (!name) return 'NN';
    
    const words = name.split(' ').filter(word => word.length > 0);
    
    if (words.length === 0) return 'NN';
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
    
    return (words[0][0] + words[1][0]).toUpperCase();
  }

  /**
   * Gerar gradiente baseado no nome
   */
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

  /**
   * Abrir página de novo usuário
   */
  openNewUserPage() {
    this.router.navigate(['/home/users/new']);
  }

  /**
   * Editar usuário
   */
  editUser(userId: number) {
    this.router.navigate(['/home/users/edit', userId]);
  }

  /**
   * Track by para otimização
   */
  trackByUserId(index: number, user: User): number {
    return user.id;
  }

  /**
   * Alternar status do usuário (ativar/desativar)
   */
  async toggleUserStatus(user: User) {
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

  /**
   * Resetar senha do usuário
   */
  async resetPassword(user: User) {
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

  /**
   * Deletar usuário
   */
  async deleteUser(userId: number) {
    if (confirm('Tem certeza que deseja excluir este usuário permanentemente? Esta ação não pode ser desfeita.')) {
      try {
        // Change this to call the new endpoint
        await firstValueFrom(this.userService.deleteUserPermanent(userId));
        this.toastr.success('Usuário excluído com sucesso!');
        this.loadUsers(); // Refresh the user list
      } catch (error: any) {
        console.error('Erro ao excluir usuário:', error);
        this.toastr.error(error.error?.message || 'Falha ao excluir usuário');
      }
    }
  }
}