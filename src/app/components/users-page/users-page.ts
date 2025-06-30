import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HomeComponent } from '../../pages/home/home';
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
  private homeComponent = inject(HomeComponent);

  users: DisplayUser[] = [];
  loading = true;
  selectedUserId: number | null = null;

  constructor(
    private userService: UserService,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    this.loadUsers();
    
    // Escutar evento de refresh quando usuário é criado
    window.addEventListener('refreshUsers', () => {
      this.refreshUsers();
    });
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
      error: (error) => {
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
    
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  /**
   * Obter nome de exibição da role
   */
  private getRoleDisplayName(roleName: string): string {
    switch (roleName?.toLowerCase()) {
      case 'admin':
        return 'Administrador';
      case 'user':
        return 'Usuário';
      default:
        return roleName || 'Usuário';
    }
  }

  /**
   * Obter permissão baseada na role
   */
  private getPermissionFromRole(roleName: string): string {
    switch (roleName?.toLowerCase()) {
      case 'admin':
        return 'Total';
      case 'user':
        return 'Leitura/Escrita';
      default:
        return 'Leitura';
    }
  }

  /**
   * Formatar data de criação
   */
  private formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
                   'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  }

  /**
   * Obter gradiente do avatar
   */
  private getAvatarGradient(index: number): string {
    const gradients = [
      'linear-gradient(135deg, #1DD882 0%, #16a860 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    ];
    
    return gradients[index % gradients.length];
  }

  /**
   * Dados mock como fallback
   */
  private loadMockUsers() {
    this.users = [
      {
        id: 1,
        name: 'João Silva',
        initials: 'JS',
        email: 'joao@naue.com.br',
        role: 'Administrador',
        permission: 'Total',
        status: 'active',
        since: 'Jan 2023'
      },
      {
        id: 2,
        name: 'Maria Santos',
        initials: 'MS',
        email: 'maria@naue.com.br',
        role: 'Usuário',
        permission: 'Leitura/Escrita',
        status: 'active',
        since: 'Mar 2023',
        avatarGradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
      }
    ];
  }

  /**
   * Obter cor da permissão
   */
  getPermissionColor(permission: string): string {
    switch (permission) {
      case 'Total':
        return '#6366f1';
      case 'Leitura/Escrita':
        return '#fb923c';
      case 'Leitura':
        return '#94a3b8';
      default:
        return '#6b7280';
    }
  }

  /**
   * Abrir modal para novo usuário
   */
  openUserModal() {
    this.homeComponent.openUserModal();
  }

  /**
   * Editar usuário existente
   */
  editUser(id: number) {
    console.log('🔍 Editando usuário:', id);
    
    // Encontrar o usuário na lista
    const userToEdit = this.users.find(u => u.id === id);
    if (!userToEdit) {
      this.toastr.error('Usuário não encontrado');
      return;
    }

    console.log('🔍 User to edit found:', userToEdit); // Debug

    // Converter para formato da API
    const apiUser: ApiUser = {
      id: userToEdit.id,
      name: userToEdit.name,
      email: userToEdit.email,
      role_name: userToEdit.role === 'Administrador' ? 'admin' : 'user',
      is_active: userToEdit.status === 'active',
      created_at: new Date().toISOString(), // Placeholder
      must_change_password: userToEdit.must_change_password || false
    };

    console.log('🔍 API User object:', apiUser); // Debug

    // Abrir modal com dados do usuário
    this.homeComponent.openUserModal(apiUser);
  }

  /**
   * Alternar status do usuário (ativo/inativo)
   */
  toggleUserStatus(user: DisplayUser) {
    if (user.id === this.getCurrentUserId()) {
      this.toastr.warning('Você não pode desativar sua própria conta');
      return;
    }

    const action = user.status === 'active' ? 'desativar' : 'ativar';
    
    if (confirm(`Tem certeza que deseja ${action} o usuário ${user.name}?`)) {
      this.userService.toggleUserStatus(user.id).subscribe({
        next: (response) => {
          console.log('✅ Status do usuário alterado:', response);
          
          // Atualizar status localmente
          user.status = user.status === 'active' ? 'inactive' : 'active';
          
          this.toastr.success(`Usuário ${action}do com sucesso`);
        },
        error: (error) => {
          console.error('❌ Erro ao alterar status:', error);
          this.toastr.error(`Erro ao ${action} usuário`);
        }
      });
    }
  }

  /**
   * Resetar senha do usuário
   */
  resetPassword(user: DisplayUser) {
    if (confirm(`Resetar senha para ${user.name}? Uma nova senha temporária será enviada por email.`)) {
      // TODO: Implementar endpoint de reset de senha
      this.toastr.info('Funcionalidade em desenvolvimento');
    }
  }

  /**
   * Obter ID do usuário atual (para evitar auto-desativação)
   */
  private getCurrentUserId(): number {
    // TODO: Implementar obtenção do ID do usuário atual
    return 1; // Temporário
  }

  /**
   * Recarregar lista de usuários
   */
  refreshUsers() {
    this.loadUsers();
  }

  /**
   * Track by function para otimização do ngFor
   */
  trackByUserId(index: number, user: DisplayUser): number {
    return user.id;
  }

  /**
   * Callback quando usuário é salvo no modal
   */
  onUserSaved() {
    this.selectedUserId = null;
    this.refreshUsers();
  }
}