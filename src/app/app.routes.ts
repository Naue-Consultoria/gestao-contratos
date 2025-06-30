import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { HomeComponent } from './pages/home/home';
import { DashboardContentComponent } from './components/dashboard-content/dashboard-content';
import { ContractsTableComponent } from './components/contracts-table/contracts-table';
import { CompaniesTableComponent } from './components/companies-table/companies-table';
import { ReportsPage } from './components/reports-page/reports-page';
import { AnalyticsPageComponent } from './components/analytics-page/analytics-page';
import { UsersPageComponent } from './components/users-page/users-page';
import { SettingsPageComponent } from './components/settings-page/settings-page';
import { HelpPageComponent } from './components/help-page/help-page';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    component: Login
  },
// {
//     path: "esqueceu-senha",
//     component: ForgotPasswordComponent
// },
  {
    path: 'home',
    component: HomeComponent,
    // TODO - Tirar comentário quando o AuthGuard estiver implementado
    // canActivate: [AuthGuard]
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        component: DashboardContentComponent,
        title: 'Dashboard - NAUE Consultoria'
      },
      {
        path: 'contracts',
        component: ContractsTableComponent,
        title: 'Contratos - NAUE Consultoria'
      },
      {
        path: 'companies',
        component: CompaniesTableComponent,
        title: 'Empresas - NAUE Consultoria'
      },
      {
        path: 'reports',
        component: ReportsPage,
        title: 'Relatórios - NAUE Consultoria'
      },
      {
        path: 'analytics',
        component: AnalyticsPageComponent,
        title: 'Analytics - NAUE Consultoria'
      },
      {
        path: 'users',
        component: UsersPageComponent,
        title: 'Usuários - NAUE Consultoria'
      },
      {
        path: 'settings',
        component: SettingsPageComponent,
        title: 'Configurações - NAUE Consultoria'
      },
      {
        path: 'help',
        component: HelpPageComponent,
        title: 'Ajuda - NAUE Consultoria'
      }
    ]
  },
];