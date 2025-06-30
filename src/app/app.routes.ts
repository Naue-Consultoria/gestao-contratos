import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { HomeComponent } from './pages/home/home';
import { ChangePasswordComponent } from './components/change-password/change-password';
import { DashboardContentComponent } from './components/dashboard-content/dashboard-content';
import { ContractsTableComponent } from './components/contracts-table/contracts-table';
import { CompaniesTableComponent } from './components/companies-table/companies-table';
import { ReportsPage } from './components/reports-page/reports-page';
import { AnalyticsPageComponent } from './components/analytics-page/analytics-page';
import { UsersPageComponent } from './components/users-page/users-page';
import { SettingsPageComponent } from './components/settings-page/settings-page';
import { HelpPageComponent } from './components/help-page/help-page';
import { AuthGuard } from './guards/auth-guard';
import { MustChangePasswordGuard } from './guards/must-change-password-guard';
import { AdminGuard } from './guards/admin-guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    component: Login,
  },

  // Rota para trocar senha - protegida apenas por autenticação
  {
    path: 'change-password',
    component: ChangePasswordComponent,
    canActivate: [AuthGuard],
    title: 'Alterar Senha - NAUE Consultoria',
  },
  // {
  //     path: "esqueceu-senha",
  //     component: ForgotPasswordComponent
  // },
  {
    path: 'home',
    component: HomeComponent,
    canActivate: [AuthGuard, MustChangePasswordGuard],
    children: [
      // Rota padrão dentro de /home redireciona para dashboard
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },

      // Dashboard principal
      {
        path: 'dashboard',
        component: DashboardContentComponent,
        title: 'Dashboard - NAUE Consultoria',
      },

      // Gestão de contratos
      {
        path: 'contracts',
        component: ContractsTableComponent,
        title: 'Contratos - NAUE Consultoria',
      },

      // Gestão de empresas
      {
        path: 'companies',
        component: CompaniesTableComponent,
        title: 'Empresas - NAUE Consultoria',
      },

      // Relatórios
      {
        path: 'reports',
        component: ReportsPage,
        title: 'Relatórios - NAUE Consultoria',
      },

      // Analytics e métricas
      {
        path: 'analytics',
        component: AnalyticsPageComponent,
        title: 'Analytics - NAUE Consultoria',
      },

      // Gestão de usuários
      {
        path: 'users',
        component: UsersPageComponent,
        canActivate: [AdminGuard], // Protege a rota para apenas administradores
        title: 'Usuários - NAUE Consultoria',
      },

      // Configurações do sistema
      {
        path: 'settings',
        component: SettingsPageComponent,
        title: 'Configurações - NAUE Consultoria',
      },

      // Ajuda e suporte
      {
        path: 'help',
        component: HelpPageComponent,
        title: 'Ajuda - NAUE Consultoria',
      },
    ],
  },

  // Rota wildcard para páginas não encontradas - redireciona para login
  {
    path: '**',
    redirectTo: '/login',
  },
];
