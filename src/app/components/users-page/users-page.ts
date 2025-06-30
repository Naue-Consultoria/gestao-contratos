// src/app/components/users-page/users-page.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HomeComponent } from '../../pages/home/home';

interface User {
  id: number;
  name: string;
  initials: string;
  email: string;
  role: string;
  permission: string;
  lastAccess: string;
  status: 'active' | 'inactive';
  since: string;
  avatarGradient?: string;
}

@Component({
  selector: 'app-users-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './users-page.html',
  styleUrls: ['./users-page.css']
})
export class UsersPageComponent {
  private homeComponent = inject(HomeComponent);

  users: User[] = [
    {
      id: 1,
      name: 'João Silva',
      initials: 'JS',
      email: 'joao@naue.com.br',
      role: 'Consultor',
      permission: 'Total',
      lastAccess: 'Há 2 horas',
      status: 'active',
      since: 'Jan 2023'
    },
    {
      id: 2,
      name: 'Maria Santos',
      initials: 'MS',
      email: 'maria@naue.com.br',
      role: 'Analista',
      permission: 'Leitura/Escrita',
      lastAccess: 'Há 1 dia',
      status: 'active',
      since: 'Mar 2023',
      avatarGradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
    }
  ];

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

  openUserModal() {
    this.homeComponent.openUserModal();
  }

  editUser(id: number) {
    console.log('Editing user:', id);
    this.homeComponent.openUserModal();
  }
}