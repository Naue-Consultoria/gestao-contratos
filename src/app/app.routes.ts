import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { HomeComponent } from './pages/home/home';
import { ChangePasswordComponent } from './components/change-password/change-password';
import { DashboardContentComponent } from './components/dashboard-content/dashboard-content';
import { ContractsTableComponent } from './components/contracts-table/contracts-table';
import { ContractFormComponent } from './components/contract-form/contract-form';
import { CompaniesTableComponent } from './components/companies-table/companies-table';
import { NewCompanyPageComponent } from './components/new-company-page/new-company-page';
import { ServicesTableComponent } from './components/services-table/services-table';
import { ServiceFormComponent } from './components/services-form/services-form';
import { ReportsPage } from './components/reports-page/reports-page';
import { AnalyticsPageComponent } from './components/analytics-page/analytics-page';
import { UsersPageComponent } from './components/users-page/users-page';
import { NewUserPageComponent } from './components/new-user-page/new-user-page';
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
      
      // Novo contrato
      {
        path: 'contracts/new',
        component: ContractFormComponent,
        title: 'Novo Contrato - NAUE Consultoria',
      },
      
      // Visualizar contrato
      {
        path: 'contracts/view/:id',
        component: ContractFormComponent,
        title: 'Visualizar Contrato - NAUE Consultoria',
      },
      
      // Editar contrato
      {
        path: 'contracts/edit/:id',
        component: ContractFormComponent,
        title: 'Editar Contrato - NAUE Consultoria',
      },

      // Gestão de empresas
      {
        path: 'companies',
        component: CompaniesTableComponent,
        title: 'Empresas - NAUE Consultoria',
      },
      
      // Nova empresa
      {
        path: 'companies/new',
        component: NewCompanyPageComponent,
        title: 'Nova Empresa - NAUE Consultoria',
      },
      
      // Editar empresa
      {
        path: 'companies/edit/:id',
        component: NewCompanyPageComponent,
        title: 'Editar Empresa - NAUE Consultoria',
      },

      // Gestão de serviços
      {
        path: 'services',
        component: ServicesTableComponent,
        title: 'Serviços - NAUE Consultoria',
      },
      
      // Novo serviço
      {
        path: 'services/new',
        component: ServiceFormComponent,
        title: 'Novo Serviço - NAUE Consultoria',
      },
      
      // Editar serviço
      {
        path: 'services/edit/:id',
        component: ServiceFormComponent,
        title: 'Editar Serviço - NAUE Consultoria',
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
      
      // Novo usuário
      {
        path: 'users/new',
        component: NewUserPageComponent,
        canActivate: [AdminGuard],
        title: 'Novo Usuário - NAUE Consultoria',
      },
      
      // Editar usuário
      {
        path: 'users/edit/:id',
        component: NewUserPageComponent,
        canActivate: [AdminGuard],
        title: 'Editar Usuário - NAUE Consultoria',
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