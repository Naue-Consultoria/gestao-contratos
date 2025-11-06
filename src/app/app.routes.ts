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
import { PublicRecruitmentProposalView } from './pages/public-recruitment-proposal-view/public-recruitment-proposal-view';
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
import { EditarVagaComponent } from './pages/editar-vaga/editar-vaga.component';
import { RelatoriosRsComponent } from './pages/relatorios-rs/relatorios-rs';
import { AnalyticsRsComponent } from './pages/analytics-rs/analytics-rs';
import { AccessDeniedComponent } from './pages/access-denied/access-denied';
import { MentoriaList } from './components/mentoria-list/mentoria-list';
import { MentoriaEditor } from './components/mentoria-editor/mentoria-editor';
import { MentoriaEdit } from './components/mentoria-edit/mentoria-edit';
import { MentoriaView } from './components/mentoria-view/mentoria-view';
import { MentoriaConteudoEditor } from './components/mentoria-conteudo-editor/mentoria-conteudo-editor';
import { PublicMentoriaViewComponent } from './pages/public-mentoria-view/public-mentoria-view';
import { PublicMentoriaHub } from './pages/public-mentoria-hub/public-mentoria-hub';
import { PublicVagasHubComponent } from './pages/public-vagas-hub/public-vagas-hub';
import { GerenciarRsComponent } from './pages/gerenciar-rs/gerenciar-rs';
import { AuthGuard } from './guards/auth-guard';
import { MustChangePasswordGuard } from './guards/must-change-password-guard';
import { AdminGuard } from './guards/admin-guard';
import { AdminOnlyGuard } from './guards/admin-only-guard';
import { AdminGerencialGuard } from './guards/admin-gerencial-guard';
import { UserGuard } from './guards/user-guard';
import { rsGuard } from './guards/rs-guard';

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

  // Rota pública para visualização de propostas de Recrutamento & Seleção
  {
    path: 'public/recruitment-proposal/:token',
    component: PublicRecruitmentProposalView,
    title: 'Proposta de Recrutamento & Seleção - NAUE Consultoria',
  },

  // Rota pública para visualização de encontros de mentoria
  {
    path: 'mentoria/:token',
    component: PublicMentoriaViewComponent,
    title: 'Encontro de Mentoria - NAUE Consultoria',
  },

  // Rota pública para visualização do hub de mentoria
  {
    path: 'mentoria-hub/:token',
    component: PublicMentoriaHub,
    title: 'Programa de Mentoria - NAUE Consultoria',
  },

  // Rota pública para hub de vagas do cliente
  {
    path: 'vagas-hub/:token',
    component: PublicVagasHubComponent,
    title: 'Vagas Disponíveis - NAUE Consultoria',
  },

  // Rota de acesso negado
  {
    path: 'access-denied',
    component: AccessDeniedComponent,
    title: 'Acesso Negado - NAUE Consultoria',
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
        canActivate: [AdminGerencialGuard],
        title: 'Contratos - NAUE Consultoria',
      },

      // Novo contrato
      {
        path: 'contratos/novo',
        component: ContractFormComponent,
        canActivate: [AdminGerencialGuard],
        title: 'Novo Contrato - NAUE Consultoria',
      },

      // Visualizar contrato
      {
        path: 'contratos/visualizar/:id',
        component: ContractViewPageComponent,
        canActivate: [AdminGerencialGuard],
        title: 'Visualizar Contrato - NAUE Consultoria',
      },

      // Editar contrato
      {
        path: 'contratos/editar/:id',
        component: ContractFormComponent,
        canActivate: [AdminGerencialGuard],
        title: 'Editar Contrato - NAUE Consultoria',
      },

      // Gestão de clientes
      {
        path: 'clientes',
        component: ClientsTableComponent,
        canActivate: [AdminGerencialGuard],
        title: 'Clientes - NAUE Consultoria',
      },

      // Novo cliente
      {
        path: 'clientes/novo',
        component: NewClientPageComponent,
        canActivate: [AdminGerencialGuard],
        title: 'Novo Cliente - NAUE Consultoria',
      },

      // Visualizar cliente
      {
        path: 'clientes/visualizar/:id',
        component: ClientViewPageComponent,
        canActivate: [AdminGerencialGuard],
        title: 'Detalhes do Cliente - NAUE Consultoria',
      },

      // Editar cliente
      {
        path: 'clientes/editar/:id',
        component: NewClientPageComponent,
        canActivate: [AdminGerencialGuard],
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
        canActivate: [AdminGerencialGuard],
        title: 'Propostas - NAUE Consultoria',
      },

      // Nova proposta
      {
        path: 'propostas/nova',
        component: ProposalFormComponent,
        canActivate: [AdminGerencialGuard],
        title: 'Nova Proposta - NAUE Consultoria',
      },

      // Visualizar proposta
      {
        path: 'propostas/visualizar/:id',
        component: ProposalViewPageComponent,
        canActivate: [AdminGerencialGuard],
        title: 'Visualizar Proposta - NAUE Consultoria',
      },

      // Editar proposta
      {
        path: 'propostas/editar/:id',
        component: ProposalFormComponent,
        canActivate: [AdminGerencialGuard],
        title: 'Editar Proposta - NAUE Consultoria',
      },

      // Relatórios - APENAS Admin (bloqueia Admin Gerencial)
      {
        path: 'relatorios',
        component: ReportsPage,
        canActivate: [AdminOnlyGuard],
        title: 'Relatórios - NAUE Consultoria',
      },

      // Relatórios R&S - Admin, Admin Gerencial e Consultor R&S
      {
        path: 'relatorios-rs',
        component: RelatoriosRsComponent,
        canActivate: [rsGuard],
        title: 'Relatórios R&S - NAUE Consultoria',
      },

      // Analytics R&S - Admin, Admin Gerencial e Consultor R&S
      {
        path: 'analytics-rs',
        component: AnalyticsRsComponent,
        canActivate: [rsGuard],
        title: 'Analytics R&S - NAUE Consultoria',
      },

      // Analytics e métricas - APENAS Admin (bloqueia Admin Gerencial)
      {
        path: 'analytics',
        component: AnalyticsPageComponent,
        canActivate: [AdminOnlyGuard],
        title: 'Analytics - NAUE Consultoria',
      },

      // Recrutamento & Seleção - Admin, Admin Gerencial e Consultor R&S
      {
        path: 'recrutamento-selecao',
        component: RecrutamentoSelecao,
        canActivate: [rsGuard],
        title: 'Recrutamento & Seleção - NAUE Consultoria',
      },

      // Nova Vaga - Admin, Admin Gerencial e Consultor R&S
      {
        path: 'recrutamento-selecao/nova-vaga',
        component: NovaVagaComponent,
        canActivate: [rsGuard],
        title: 'Nova Vaga - NAUE Consultoria',
      },

      // Visualizar Vaga - Admin, Admin Gerencial e Consultor R&S
      {
        path: 'recrutamento-selecao/visualizar/:id',
        component: VisualizarVagaComponent,
        canActivate: [rsGuard],
        title: 'Visualizar Vaga - NAUE Consultoria',
      },

      // Editar Vaga - Admin, Admin Gerencial e Consultor R&S
      {
        path: 'recrutamento-selecao/editar/:id',
        component: EditarVagaComponent,
        canActivate: [rsGuard],
        title: 'Editar Vaga - NAUE Consultoria',
      },

      // Gerenciar Vagas R&S (Hub Público) - Admin, Admin Gerencial e Consultor R&S
      {
        path: 'gerenciar-rs',
        component: GerenciarRsComponent,
        canActivate: [rsGuard],
        title: 'Gerenciar Vagas R&S - NAUE Consultoria',
      },

      // Mentorias - Lista
      // Nova mentoria (cria múltiplos encontros)
      {
        path: 'mentorias/nova',
        component: MentoriaEditor,
        canActivate: [AdminGerencialGuard],
        title: 'Nova Mentoria - NAUE Consultoria',
      },

      // Editar mentoria
      {
        path: 'mentorias/editar/:id',
        component: MentoriaEdit,
        canActivate: [AdminGerencialGuard],
        title: 'Editar Mentoria - NAUE Consultoria',
      },

      // Editar encontro individual de mentoria
      {
        path: 'mentorias/editar-encontro/:id',
        component: MentoriaEditor,
        canActivate: [AdminGerencialGuard],
        title: 'Editar Encontro - NAUE Consultoria',
      },

      // Visualizar detalhes da mentoria
      {
        path: 'mentorias/visualizar/:id',
        component: MentoriaView,
        canActivate: [AdminGerencialGuard],
        title: 'Detalhes da Mentoria - NAUE Consultoria',
      },

      // Editor de conteúdo do encontro de mentoria
      {
        path: 'mentorias/:id/conteudo',
        component: MentoriaConteudoEditor,
        canActivate: [AdminGerencialGuard],
        title: 'Editar Conteúdo - NAUE Consultoria',
      },

      {
        path: 'mentorias',
        component: MentoriaList,
        canActivate: [AdminGerencialGuard],
        title: 'Mentorias - NAUE Consultoria',
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

      // Gestão de usuários - Admin Gerencial pode APENAS visualizar
      {
        path: 'usuarios',
        component: UsersPageComponent,
        canActivate: [AdminGerencialGuard],
        title: 'Usuários - NAUE Consultoria',
      },

      // Novo usuário - APENAS Admin
      {
        path: 'usuarios/novo',
        component: NewUserPageComponent,
        canActivate: [AdminOnlyGuard],
        title: 'Novo Usuário - NAUE Consultoria',
      },

      // Editar usuário - APENAS Admin
      {
        path: 'usuarios/editar/:id',
        component: NewUserPageComponent,
        canActivate: [AdminOnlyGuard],
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