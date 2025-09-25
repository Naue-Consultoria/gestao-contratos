import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { HomeComponent } from './pages/home/home';
import { ChangePasswordComponent } from './components/change-password/change-password';
import { ForgotPasswordComponent } from './components/forgot-password/forgot-password';
import { ResetPasswordComponent } from './components/reset-password/reset-password';
import { DashboardContentComponent } from './components/dashboard-content/dashboard-content';
import { ContractsTableComponent } from './components/contracts-table/contracts-table';
import { ContractFormComponent } from './components/contract-form/contract-form';
import { ContractViewPageComponent } from './components/contract-view-page/contract-view-page';
import { ClientsTableComponent } from './components/clients-table/clients-table';
import { NewClientPageComponent } from './components/new-client-page/new-client-page';
import { ClientViewPageComponent } from './components/client-view-page/client-view-page';
import { ServicesTableComponent } from './components/services-table/services-table';
import { ServiceFormComponent } from './components/services-form/services-form';
import { ProposalsPageComponent } from './components/proposals-page/proposals-page';
import { ProposalFormComponent } from './components/proposal-form/proposal-form';
import { ProposalViewPageComponent } from './components/proposal-view-page/proposal-view-page';
import { PublicProposalViewComponent } from './pages/public-proposal-view/public-proposal-view.component';
import { ReportsPage } from './components/reports-page/reports-page';
import { AnalyticsPageComponent } from './components/analytics-page/analytics-page';
import { UsersPageComponent } from './components/users-page/users-page';
import { NewUserPageComponent } from './components/new-user-page/new-user-page';
import { SettingsPageComponent } from './components/settings-page/settings-page';
import { HelpPageComponent } from './components/help-page/help-page';
import { RoutinesPageComponent } from './components/routines-page/routines-page';
import { RoutineViewPageComponent } from './components/routine-view-page/routine-view-page';
import { ServiceTrackingPageComponent } from './components/service-tracking-page/service-tracking-page';
import { RecrutamentoSelecao } from './pages/recrutamento-selecao/recrutamento-selecao';
import { NovaVagaComponent } from './pages/nova-vaga/nova-vaga.component';
import { VisualizarVagaComponent } from './pages/visualizar-vaga/visualizar-vaga';
import { AuthGuard } from './guards/auth-guard';
import { MustChangePasswordGuard } from './guards/must-change-password-guard';
import { AdminGuard } from './guards/admin-guard';
import { UserGuard } from './guards/user-guard';

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

  // Rotas de recuperação de senha - públicas
  {
    path: 'forgot-password',
    component: ForgotPasswordComponent,
    title: 'Esqueci minha senha - NAUE Consultoria',
  },
  {
    path: 'reset-password',
    component: ResetPasswordComponent,
    title: 'Nova senha - NAUE Consultoria',
  },


  // Rota pública para visualização de propostas
  {
    path: 'public/proposal/:token',
    component: PublicProposalViewComponent,
    title: 'Proposta Comercial - NAUE Consultoria',
  },

  // Rota para trocar senha - protegida apenas por autenticação
  {
    path: 'change-password',
    component: ChangePasswordComponent,
    canActivate: [AuthGuard],
    title: 'Alterar Senha - NAUE Consultoria',
  },
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
        path: 'contratos',
        component: ContractsTableComponent,
        canActivate: [UserGuard],
        title: 'Contratos - NAUE Consultoria',
      },
      
      // Novo contrato
      {
        path: 'contratos/novo',
        component: ContractFormComponent,
        canActivate: [UserGuard],
        title: 'Novo Contrato - NAUE Consultoria',
      },
      
      // Visualizar contrato
      {
        path: 'contratos/visualizar/:id',
        component: ContractViewPageComponent,
        canActivate: [UserGuard],
        title: 'Visualizar Contrato - NAUE Consultoria',
      },
      
      // Editar contrato
      {
        path: 'contratos/editar/:id',
        component: ContractFormComponent,
        canActivate: [UserGuard],
        title: 'Editar Contrato - NAUE Consultoria',
      },

      // Gestão de clientes
      {
        path: 'clientes',
        component: ClientsTableComponent,
        canActivate: [UserGuard],
        title: 'Clientes - NAUE Consultoria',
      },
      
      // Novo cliente
      {
        path: 'clientes/novo',
        component: NewClientPageComponent,
        canActivate: [UserGuard],
        title: 'Novo Cliente - NAUE Consultoria',
      },
      
      // Visualizar cliente
      {
        path: 'clientes/visualizar/:id',
        component: ClientViewPageComponent,
        canActivate: [UserGuard],
        title: 'Detalhes do Cliente - NAUE Consultoria',
      },
      
      // Editar cliente
      {
        path: 'clientes/editar/:id',
        component: NewClientPageComponent,
        canActivate: [UserGuard],
        title: 'Editar Cliente - NAUE Consultoria',
      },

      // Gestão de serviços
      {
        path: 'servicos',
        component: ServicesTableComponent,
        canActivate: [UserGuard],
        title: 'Serviços - NAUE Consultoria',
      },
      
      // Novo serviço
      {
        path: 'servicos/novo',
        component: ServiceFormComponent,
        canActivate: [UserGuard],
        title: 'Novo Serviço - NAUE Consultoria',
      },
      
      // Editar serviço
      {
        path: 'servicos/editar/:id',
        component: ServiceFormComponent,
        canActivate: [UserGuard],
        title: 'Editar Serviço - NAUE Consultoria',
      },

      // Gestão de propostas
      {
        path: 'propostas',
        component: ProposalsPageComponent,
        canActivate: [UserGuard],
        title: 'Propostas - NAUE Consultoria',
      },
      
      // Nova proposta
      {
        path: 'propostas/nova',
        component: ProposalFormComponent,
        canActivate: [UserGuard],
        title: 'Nova Proposta - NAUE Consultoria',
      },
      
      // Visualizar proposta
      {
        path: 'propostas/visualizar/:id',
        component: ProposalViewPageComponent,
        canActivate: [UserGuard],
        title: 'Visualizar Proposta - NAUE Consultoria',
      },
      
      // Editar proposta
      {
        path: 'propostas/editar/:id',
        component: ProposalFormComponent,
        canActivate: [UserGuard],
        title: 'Editar Proposta - NAUE Consultoria',
      },

      // Relatórios
      {
        path: 'relatorios',
        component: ReportsPage,
        canActivate: [UserGuard],
        title: 'Relatórios - NAUE Consultoria',
      },

      // Analytics e métricas
      {
        path: 'analytics',
        component: AnalyticsPageComponent,
        canActivate: [UserGuard],
        title: 'Analytics - NAUE Consultoria',
      },

      // Recrutamento & Seleção
      {
        path: 'recrutamento-selecao',
        component: RecrutamentoSelecao,
        canActivate: [UserGuard],
        title: 'Recrutamento & Seleção - NAUE Consultoria',
      },

      // Nova Vaga
      {
        path: 'recrutamento-selecao/nova-vaga',
        component: NovaVagaComponent,
        canActivate: [UserGuard],
        title: 'Nova Vaga - NAUE Consultoria',
      },

      // Visualizar Vaga
      {
        path: 'recrutamento-selecao/visualizar/:id',
        component: VisualizarVagaComponent,
        canActivate: [UserGuard],
        title: 'Visualizar Vaga - NAUE Consultoria',
      },

      // Editar Vaga
      {
        path: 'recrutamento-selecao/editar/:id',
        component: NovaVagaComponent,
        canActivate: [UserGuard],
        title: 'Editar Vaga - NAUE Consultoria',
      },

      // Rotinas
      {
        path: 'rotinas',
        component: RoutinesPageComponent,
        canActivate: [UserGuard],
        title: 'Rotinas - NAUE Consultoria',
      },
      
      // Visualizar rotina
      {
        path: 'rotinas/visualizar/:id',
        component: RoutineViewPageComponent,
        canActivate: [UserGuard],
        title: 'Detalhes da Rotina - NAUE Consultoria',
      },

      // Acompanhamento de serviço
      {
        path: 'rotinas/:routineId/servico/:serviceId',
        component: ServiceTrackingPageComponent,
        canActivate: [UserGuard],
        title: 'Acompanhamento de Serviço - NAUE Consultoria',
      },

      // Gestão de usuários
      {
        path: 'usuarios',
        component: UsersPageComponent,
        canActivate: [AdminGuard], // Protege a rota para apenas administradores
        title: 'Usuários - NAUE Consultoria',
      },
      
      // Novo usuário
      {
        path: 'usuarios/novo',
        component: NewUserPageComponent,
        canActivate: [AdminGuard],
        title: 'Novo Usuário - NAUE Consultoria',
      },
      
      // Editar usuário
      {
        path: 'usuarios/editar/:id',
        component: NewUserPageComponent,
        canActivate: [AdminGuard],
        title: 'Editar Usuário - NAUE Consultoria',
      },

      // Configurações do sistema
      {
        path: 'configuracoes',
        component: SettingsPageComponent,
        title: 'Configurações - NAUE Consultoria',
      },

      // Ajuda e suporte
      {
        path: 'ajuda',
        component: HelpPageComponent,
        title: 'Ajuda - NAUE Consultoria',
      },

      // Redirecionamentos para compatibilidade com rotas antigas
      { path: 'contracts', redirectTo: 'contratos', pathMatch: 'full' },
      { path: 'contracts/new', redirectTo: 'contratos/novo', pathMatch: 'full' },
      { path: 'contracts/view/:id', redirectTo: 'contratos/visualizar/:id', pathMatch: 'full' },
      { path: 'contracts/edit/:id', redirectTo: 'contratos/editar/:id', pathMatch: 'full' },
      
      { path: 'clients', redirectTo: 'clientes', pathMatch: 'full' },
      { path: 'clients/new', redirectTo: 'clientes/novo', pathMatch: 'full' },
      { path: 'clients/view/:id', redirectTo: 'clientes/visualizar/:id', pathMatch: 'full' },
      { path: 'clients/edit/:id', redirectTo: 'clientes/editar/:id', pathMatch: 'full' },
      
      { path: 'services', redirectTo: 'servicos', pathMatch: 'full' },
      { path: 'services/new', redirectTo: 'servicos/novo', pathMatch: 'full' },
      { path: 'services/edit/:id', redirectTo: 'servicos/editar/:id', pathMatch: 'full' },
      
      { path: 'proposals', redirectTo: 'propostas', pathMatch: 'full' },
      { path: 'proposals/new', redirectTo: 'propostas/nova', pathMatch: 'full' },
      { path: 'proposals/view/:id', redirectTo: 'propostas/visualizar/:id', pathMatch: 'full' },
      { path: 'proposals/edit/:id', redirectTo: 'propostas/editar/:id', pathMatch: 'full' },
      
      { path: 'reports', redirectTo: 'relatorios', pathMatch: 'full' },
      { path: 'routines', redirectTo: 'rotinas', pathMatch: 'full' },
      { path: 'routines/:id', redirectTo: 'rotinas/visualizar/:id', pathMatch: 'full' },
      { path: 'rotinas/:id', redirectTo: 'rotinas/visualizar/:id', pathMatch: 'full' },
      
      { path: 'users', redirectTo: 'usuarios', pathMatch: 'full' },
      { path: 'users/new', redirectTo: 'usuarios/novo', pathMatch: 'full' },
      { path: 'users/edit/:id', redirectTo: 'usuarios/editar/:id', pathMatch: 'full' },
      
      { path: 'settings', redirectTo: 'configuracoes', pathMatch: 'full' },
      { path: 'help', redirectTo: 'ajuda', pathMatch: 'full' },
    ],
  },

  // Rota wildcard para páginas não encontradas - redireciona para login
  {
    path: '**',
    redirectTo: '/login',
  },
];