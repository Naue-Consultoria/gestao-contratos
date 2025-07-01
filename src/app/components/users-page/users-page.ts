import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UserService, ApiUser } from '../../services/user';
import { ToastrService } from 'ngx-toastr';

interface DisplayUser {
  id: number;
  name: string;
  initials: string;
  email: string;
  role: string;
  permission: string;
  status: 'active' | 'inactive';
  since: string;
  avatarGradient?: string;
  must_change_password?: boolean;
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

  users: DisplayUser[] = [];
  loading = true;
  selectedUserId: number | null = null;

  ngOnInit() {
    this.loadUsers();
    
    // Escutar evento de refresh quando usuário é criado
    window.addEventListener('refreshUsers', () => {
      this.refreshUsers();
    });
  }

  /**
   * Atualizar lista de usuários
   */
  refreshUsers() {
    this.loadUsers();
  }

  ngOnDestroy() {
    // Cleanup do event listener
    window.removeEventListener('refreshUsers', () => {});
  }

  /**
   * Carregar usuários do backend
   */
  loadUsers() {
    this.loading = true;
    
    this.userService.getUsers().subscribe({
      next: (response) => {
        console.log('✅ Usuários carregados:', response);
        this.users = this.transformApiUsers(response.users);
        this.loading = false;
      },
      error: (error: any) => {
        console.error('❌ Erro ao carregar usuários:', error);
        this.toastr.error('Erro ao carregar usuários');
        this.loading = false;
        
        // Fallback para dados mock em caso de erro
        this.loadMockUsers();
      }
    });
  }

  /**
   * Transformar dados da API para formato de exibição
   */
  private transformApiUsers(apiUsers: ApiUser[]): DisplayUser[] {
    return apiUsers.map((user, index) => ({
      id: user.id,
      name: user.name,
      initials: this.generateInitials(user.name),
      email: user.email,
      role: this.getRoleDisplayName(user.role_name),
      permission: this.getPermissionFromRole(user.role_name),
      status: user.is_active ? 'active' : 'inactive',
      since: this.formatDate(user.created_at),
      avatarGradient: this.getAvatarGradient(index),
      must_change_password: user.must_change_password || false
    }));
  }

  /**
   * Gerar iniciais do nome
   */
  private generateInitials(name: string): string {
    if (!name) return '??';
    
    const words = name.split(' ').filter(word => word.length > 0);
    if (words.length === 0) return '??';
    
    if (words.length === 1) {
      return words[0].substring(0, 2).toUpperCase();
    }
    
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  }

  /**
   * Obter nome de exibição do role
   */
  private getRoleDisplayName(role: string): string {
    const roleMap: { [key: string]: string } = {
      'admin': 'Administrador',
      'user': 'Usuário',
      'editor': 'Editor',
      'viewer': 'Visualizador'
    };
    
    return roleMap[role] || role;
  }

  /**
   * Obter permissão baseada no role
   */
  private getPermissionFromRole(role: string): string {
    const permissionMap: { [key: string]: string } = {
      'admin': 'Admin',
      'user': 'Colaborador',
      'editor': 'Editor',
      'viewer': 'Visualizador'
    };
    
    return permissionMap[role] || 'Colaborador';
  }

  /**
   * Formatar data
   */
  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.getFullYear().toString();
  }

  /**
   * Obter gradiente do avatar
   */
  private getAvatarGradient(index: number): string {
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
    
    return gradients[index % gradients.length];
  }

  /**
   * Carregar dados mock (fallback)
   */
  private loadMockUsers() {
    this.users = [
      {
        id: 1,
        name: 'João Silva',
        initials: 'JS',
        email: 'joao.silva@naue.com',
        role: 'Administrador',
        permission: 'Admin',
        status: 'active',
        since: '2023',
        avatarGradient: this.getAvatarGradient(0)
      },
      {
        id: 2,
        name: 'Maria Santos',
        initials: 'MS',
        email: 'maria.santos@naue.com',
        role: 'Usuário',
        permission: 'Colaborador',
        status: 'active',
        since: '2024',
        avatarGradient: this.getAvatarGradient(1)
      }
    ];
  }

  /**
   * Navegar para página de novo usuário
   */
  openNewUserPage() {
    this.router.navigate(['/home/users/new']);
  }

  /**
   * Navegar para página de edição de usuário
   */
  editUser(id: number) {
    this.router.navigate(['/home/users/edit', id]);
  }

  /**
   * Alternar status do usuário
   */
  toggleUserStatus(id: number) {
    const user = this.users.find(u => u.id === id);
    if (!user) return;
    
    this.userService.toggleUserStatus(id).subscribe({
      next: () => {
        user.status = user.status === 'active' ? 'inactive' : 'active';
        this.toastr.success(`Usuário ${user.status === 'active' ? 'ativado' : 'desativado'} com sucesso`);
      },
      error: (error: any) => {
        console.error('❌ Erro ao alterar status:', error);
        this.toastr.error('Erro ao alterar status do usuário');
      }
    });
  }

  /**
   * Deletar usuário
   */
  deleteUser(id: number) {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) {
      return;
    }
    
    this.userService.deleteUser(id).subscribe({
      next: () => {
        this.users = this.users.filter(u => u.id !== id);
        this.toastr.success('Usuário excluído com sucesso');
      },
      error: (error: any) => {
        console.error('❌ Erro ao excluir usuário:', error);
        this.toastr.error('Erro ao excluir usuário');
      }
    });
  }

  /**
   * Resetar senha do usuário
   */
  resetPassword(id: number) {
    const user = this.users.find(u => u.id === id);
    if (!user) return;
    
    if (!confirm('Tem certeza que deseja resetar a senha deste usuário?')) {
      return;
    }
    
    this.userService.resetUserPassword(id).subscribe({
      next: () => {
        this.toastr.success('Senha resetada com sucesso. O usuário receberá um email com as instruções.');
      },
      error: (error: any) => {
        console.error('❌ Erro ao resetar senha:', error);
        this.toastr.error('Erro ao resetar senha');
      }
    });
  }

  /**
   * Toggle para mostrar dropdown de ações
   */
  toggleUserDropdown(userId: number) {
    this.selectedUserId = this.selectedUserId === userId ? null : userId;
  }

  /**
   * Track by function para otimização do ngFor
   */
  trackByUserId(index: number, user: DisplayUser): number {
    return user.id;
  }

  /**
   * Obter cor da permissão
   */
  getPermissionColor(permission: string): string {
    switch (permission) {
      case 'Admin':
        return '#6366f1';
      case 'Colaborador':
        return '#10b981';
      default:
        return '#6b7280';
    }
  }
}