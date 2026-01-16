import { Component, OnInit, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { BreadcrumbComponent } from '../../components/breadcrumb/breadcrumb.component';
import { BreadcrumbService } from '../../services/breadcrumb.service';
import { CandidatoModalComponent } from '../../components/candidato-modal/candidato-modal.component';
import { EntrevistaModal } from '../../components/entrevista-modal/entrevista-modal';
import { ObservacoesModalComponent } from '../../components/observacoes-modal/observacoes-modal.component';
import { Entrevista, EntrevistaService } from '../../services/entrevista.service';
import { Candidato } from '../../services/candidato.service';
import { VagaService } from '../../services/vaga.service';
import { UserService } from '../../services/user.service';
import { VagaExportService } from '../../services/vaga-export.service';
import { DateNoTimezonePipe } from '../../pipes/date-no-timezone-pipe';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

interface Vaga {
  id: number;
  codigo: string;
  clienteId: number;
  clienteNome: string;
  contratoId?: number;
  contratoNumero?: string;
  usuarioId: number;
  usuarioNome: string;
  cargo: string;
  tipoCargo: string;
  tipoAbertura: string;
  status: string;
  fonteRecrutamento: string;
  statusEntrevista?: string;
  salario: number;
  pretensaoSalarial?: number;
  dataAbertura: string;
  dataFechamentoCancelamento?: string;
  observacoes?: string;
  candidatoAprovado?: string;
  emailCandidato?: string;
  telefoneCandidato?: string;
  porcentagemFaturamento?: number;  // Porcentagem sobre o salário
  valorFaturamento?: number;  // Valor calculado: salario * (porcentagemFaturamento / 100)
  sigilosa: boolean;
  impostoEstado: number;
}

interface VagaCandidato {
  id: number;
  vaga_id: number;
  candidato: Candidato;
  status: string;
  data_inscricao: string;
  observacoes?: string;
  entrevistas: any[]; // Temporário até integrar com backend
}


interface CandidateForm {
  nome: string;
  email: string;
  telefone: string;
  status: string;
  data_inscricao: string;
  observacoes: string;
}

@Component({
  selector: 'app-visualizar-vaga',
  standalone: true,
  imports: [CommonModule, FormsModule, BreadcrumbComponent, CandidatoModalComponent, EntrevistaModal, ObservacoesModalComponent, DateNoTimezonePipe],
  templateUrl: './visualizar-vaga.html',
  styleUrl: './visualizar-vaga.css'
})
export class VisualizarVagaComponent implements OnInit {
  vaga: Vaga | null = null;
  isLoading = true;
  vagaId: number = 0;

  // Candidatos e entrevistas
  candidatos: VagaCandidato[] = [];
  showAddCandidateModal = false;
  selectedCandidateId: number | null = null;

  // Novo modal de candidato
  isCandidatoModalVisible = false;
  selectedCandidato: Candidato | null = null;

  // Modal de entrevista
  isEntrevistaModalVisible = false;
  selectedVagaCandidato: VagaCandidato | null = null;
  selectedEntrevista: Entrevista | null = null;

  // Modal de observações
  isObservacoesModalVisible = false;
  selectedCandidatoForObservacoes: Candidato | null = null;

  // Menu dropdown de ações do candidato
  openMenuId: number | null = null;
  menuPosition = { top: 0, left: 0 };

  // Formulários
  candidateForm = {
    nome: '',
    email: '',
    telefone: '',
    status: 'pendente', // pendente, aprovado, reprovado
    observacoes: ''
  };

  interviewForm = {
    data_entrevista: '',
    hora_entrevista: '',
    link_chamada: '',
    entrevistador_id: null as number | null,
    observacoes: ''
  };

  // Lista de entrevistadores (usuários)
  entrevistadores: any[] = [];

  // Labels para exibição
  tipoCargoLabels: Record<string, string> = {
    'administrativo': 'Administrativo',
    'comercial': 'Comercial',
    'estagio': 'Estágio',
    'gestao': 'Gestão',
    'operacional': 'Operacional',
    'jovem_aprendiz': 'Jovem Aprendiz'
  };

  tipoAberturaLabels: Record<string, string> = {
    'nova': 'Nova Vaga',
    'reposicao': 'Reposição'
  };

  statusLabels: Record<string, string> = {
    'aberta': 'Aberta',
    'divulgacao_prospec': 'Divulgação/Prospecção',
    'entrevista_nc': 'Entrevista NC',
    'entrevista_empresa': 'Entrevista Empresa',
    'testes': 'Testes',
    'fechada': 'Fechada',
    'fechada_rep': 'Fechada/Reposição',
    'cancelada_cliente': 'Cancelada pelo Cliente',
    'standby': 'Standby',
    'nao_cobrada': 'Não Cobrada',
    'encerramento_cont': 'Encerramento de Contrato'
  };

  fonteRecrutamentoLabels: Record<string, string> = {
    'catho': 'Catho',
    'email': 'E-mail',
    'indicacao': 'Indicação',
    'linkedin': 'LinkedIn',
    'whatsapp': 'WhatsApp',
    'trafego': 'Tráfego',
    'outros': 'Outros'
  };

  statusEntrevistaLabels: Record<string, string> = {
    'agendada': 'Agendada',
    'realizada': 'Realizada',
    'cancelada': 'Cancelada',
    'nao_compareceu': 'Não Compareceu',
    'remarcada': 'Remarcada',
    'desistiu': 'Desistiu',
    'remarcou': 'Remarcou'
  };

  private vagaService = inject(VagaService);
  private userService = inject(UserService);
  private entrevistaService = inject(EntrevistaService);
  private vagaExportService = inject(VagaExportService);
  private toastr = inject(ToastrService);

  isExporting = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private breadcrumbService: BreadcrumbService
  ) {}

  ngOnInit() {
    // Obter ID da vaga da rota
    this.route.params.subscribe(params => {
      this.vagaId = +params['id'];
      this.loadVagaData();
      this.loadCandidatos();
      this.loadEntrevistadores();
      this.setBreadcrumb();
    });
  }

  private setBreadcrumb() {
    this.breadcrumbService.setBreadcrumbs([
      { label: 'Home', url: '/home/dashboard', icon: 'fas fa-home' },
      { label: 'Recrutamento e Seleção', url: '/home/recrutamento-selecao' },
      { label: `Vaga #${this.vagaId}` }
    ]);
  }

  async loadVagaData() {
    try {
      this.isLoading = true;
      const vagaData = await firstValueFrom(this.vagaService.getById(this.vagaId));

      // Extrair nome do cliente de acordo com a estrutura do banco
      let clienteNome = 'Cliente não informado';
      if (vagaData.client) {
        // Para PJ (empresas) - Supabase retorna como objeto, não array
        if (vagaData.client.clients_pj) {
          clienteNome = vagaData.client.clients_pj.trade_name ||
                       vagaData.client.clients_pj.company_name ||
                       'Cliente não informado';
        }
        // Para PF (pessoas físicas) - Supabase retorna como objeto, não array
        else if (vagaData.client.clients_pf) {
          clienteNome = vagaData.client.clients_pf.full_name || 'Cliente não informado';
        }
      }

      // Mapear dados do backend para o formato esperado
      this.vaga = {
        id: vagaData.id,
        codigo: vagaData.codigo,
        clienteId: vagaData.client_id,
        clienteNome: clienteNome,
        contratoId: vagaData.contract_id,
        contratoNumero: vagaData.contract?.contract_number,
        usuarioId: vagaData.user_id,
        usuarioNome: vagaData.user?.name || 'Não atribuído',
        cargo: vagaData.cargo,
        tipoCargo: vagaData.tipo_cargo,
        tipoAbertura: vagaData.tipo_abertura,
        status: vagaData.status,
        fonteRecrutamento: vagaData.fonte_recrutamento,
        salario: Number(vagaData.salario || 0),
        pretensaoSalarial: vagaData.pretensao_salarial ? Number(vagaData.pretensao_salarial) : undefined,
        dataAbertura: typeof vagaData.data_abertura === 'string' ? vagaData.data_abertura : vagaData.data_abertura.toISOString(),
        dataFechamentoCancelamento: vagaData.data_fechamento_cancelamento
          ? (typeof vagaData.data_fechamento_cancelamento === 'string' ? vagaData.data_fechamento_cancelamento : vagaData.data_fechamento_cancelamento.toISOString())
          : undefined,
        observacoes: vagaData.observacoes,
        candidatoAprovado: vagaData.candidato_aprovado?.nome,
        porcentagemFaturamento: Number(vagaData.porcentagem_faturamento || 100),
        valorFaturamento: Number(vagaData.valor_faturamento || 0),
        sigilosa: vagaData.sigilosa || false,
        impostoEstado: Number(vagaData.imposto_estado || 0)
      };

      this.isLoading = false;
    } catch (error) {
      console.error('Erro ao carregar vaga:', error);
      this.isLoading = false;
    }
  }

  async loadCandidatos() {
    try {
      console.log('Carregando candidatos para vaga:', this.vagaId);
      const candidatosData = await firstValueFrom(this.vagaService.getCandidatos(this.vagaId));
      console.log('Candidatos recebidos do backend:', candidatosData);

      // Mapear dados do backend para o formato esperado
      this.candidatos = candidatosData.map((vagaCandidato: any) => ({
        id: vagaCandidato.id,
        vaga_id: vagaCandidato.vaga_id,
        candidato: vagaCandidato.candidato,
        status: vagaCandidato.status,
        data_inscricao: vagaCandidato.data_inscricao,
        observacoes: vagaCandidato.observacoes,
        entrevistas: vagaCandidato.entrevistas || []
      }));

      console.log('Candidatos mapeados:', this.candidatos);

      // Atualizar candidato aprovado na vaga
      if (this.vaga && !this.vaga.candidatoAprovado) {
        // Verificar status na tabela vaga_candidatos OU na tabela candidatos
        const candidatoAprovado = this.candidatos.find(
          vc => vc.status === 'aprovado' || vc.candidato.status === 'aprovado'
        );

        if (candidatoAprovado) {
          this.vaga.candidatoAprovado = candidatoAprovado.candidato.nome;
        }
      }
    } catch (error) {
      console.error('Erro ao carregar candidatos:', error);
      this.candidatos = [];
    }
  }

  getStatusClass(status: string): string {
    return 'status-' + status.replace('_', '-');
  }

  getTipoAberturaClass(tipo: string): string {
    return tipo === 'nova' ? 'badge-success' : 'badge-warning';
  }

  calculateSLA(): number {
    if (!this.vaga) return 0;

    // Extrair apenas as datas sem timezone
    const startDateOnly = this.vaga.dataAbertura.split('T')[0];
    const endDateOnly = this.vaga.dataFechamentoCancelamento
      ? this.vaga.dataFechamentoCancelamento.split('T')[0]
      : new Date().toISOString().split('T')[0];

    const startDate = new Date(startDateOnly + 'T00:00:00');
    const endDate = new Date(endDateOnly + 'T00:00:00');

    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  }

  getSLAClass(days: number): string {
    if (days <= 7) return 'badge-success';
    if (days <= 15) return 'badge-info';
    if (days <= 30) return 'badge-warning';
    return 'badge-danger';
  }

  editVaga() {
    this.router.navigate(['/home/recrutamento-selecao/editar', this.vagaId]);
  }

  async deleteVaga() {
    if (confirm('Tem certeza que deseja excluir esta vaga?')) {
      try {
        await firstValueFrom(this.vagaService.delete(this.vagaId));
        this.router.navigate(['/home/recrutamento-selecao']);
      } catch (error) {
        console.error('Erro ao excluir vaga:', error);
        alert('Erro ao excluir vaga. Tente novamente.');
      }
    }
  }

  goBack() {
    this.router.navigate(['/home/recrutamento-selecao']);
  }

  async exportToPdf() {
    if (!this.vaga || this.isExporting) return;

    try {
      this.isExporting = true;
      this.toastr.info('Gerando PDF...', 'Exportação');

      await this.vagaExportService.exportToPdf(this.vaga, this.candidatos);

      this.toastr.success('PDF exportado com sucesso!', 'Exportação');
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      this.toastr.error('Erro ao exportar PDF. Tente novamente.', 'Erro');
    } finally {
      this.isExporting = false;
    }
  }

  // Candidate Management Methods
  addCandidate() {
    if (!this.candidateForm.nome || !this.candidateForm.email) {
      alert('Nome e email são obrigatórios!');
      return;
    }

    // Simulação - substituir por chamada real ao backend
    const novoId = this.candidatos.length + 1;

    const novoCandidato: Candidato = {
      id: novoId,
      nome: this.candidateForm.nome,
      email: this.candidateForm.email,
      telefone: this.candidateForm.telefone,
      status: this.candidateForm.status as 'pendente' | 'aprovado' | 'reprovado'
    };

    const novaInscricao: VagaCandidato = {
      id: novoId,
      vaga_id: this.vagaId,
      candidato: novoCandidato,
      status: 'inscrito',
      data_inscricao: new Date().toISOString(),
      observacoes: this.candidateForm.observacoes,
      entrevistas: []
    };

    this.candidatos.push(novaInscricao);

    // Limpar formulário
    this.candidateForm = {
      nome: '',
      email: '',
      telefone: '',
      status: 'pendente',
      observacoes: ''
    };

    this.showAddCandidateModal = false;
    console.log('Candidato adicionado:', novoCandidato);
  }

  // Métodos para o modal de entrevista
  openEntrevistaModal(vagaCandidato: VagaCandidato, entrevista?: Entrevista) {
    this.selectedVagaCandidato = vagaCandidato;
    this.selectedEntrevista = entrevista || null;
    this.isEntrevistaModalVisible = true;
  }

  closeEntrevistaModal() {
    this.isEntrevistaModalVisible = false;
    this.selectedVagaCandidato = null;
    this.selectedEntrevista = null;
  }

  onEntrevistaSaved(entrevista: Entrevista) {
    console.log('Entrevista salva:', entrevista);
    // Aqui você pode atualizar a lista de entrevistas do candidato
    // Por enquanto, vou simular adicionando à lista local
    if (this.selectedVagaCandidato) {
      const candidatoIndex = this.candidatos.findIndex(c => c.id === this.selectedVagaCandidato?.id);
      if (candidatoIndex !== -1) {
        // Se for uma nova entrevista, adiciona à lista
        if (!this.selectedEntrevista) {
          this.candidatos[candidatoIndex].entrevistas.push({
            id: entrevista.id || Date.now(),
            data_entrevista: entrevista.data_entrevista,
            hora_entrevista: entrevista.hora_entrevista,
            status: entrevista.status || 'agendada',
            link_chamada: entrevista.link_chamada,
            observacoes: entrevista.observacoes,
            avaliacao: '',
            entrevistador_nome: entrevista.entrevistador_nome
          });
          // Atualizar status do candidato
          this.candidatos[candidatoIndex].status = 'entrevista_agendada';
        }
      }
    }
  }

  async loadEntrevistadores() {
    try {
      const response = await firstValueFrom(this.userService.getAll());
      const usersList = response.users || response || [];
      this.entrevistadores = usersList.map((user: any) => ({
        id: user.id,
        name: user.name
      }));
    } catch (error) {
      console.error('Erro ao carregar entrevistadores:', error);
      this.entrevistadores = [];
    }
  }

  // Métodos para o novo modal de candidato
  openCandidatoModal(candidato?: Candidato) {
    this.selectedCandidato = candidato || null;
    this.isCandidatoModalVisible = true;
  }

  closeCandidatoModal() {
    this.isCandidatoModalVisible = false;
    this.selectedCandidato = null;
  }

  async onCandidatoSaved(candidato: Candidato) {
    console.log('Candidato salvo:', candidato);

    if (!this.selectedCandidato && candidato.id) {
      // Novo candidato - vincular à vaga
      try {
        console.log('Vinculando candidato', candidato.id, 'à vaga', this.vagaId);
        await firstValueFrom(this.vagaService.vincularCandidato(this.vagaId, candidato.id));
        console.log('Candidato vinculado com sucesso!');

        // Recarregar lista de candidatos
        await this.loadCandidatos();
      } catch (error) {
        console.error('Erro ao vincular candidato:', error);
        alert('Erro ao vincular candidato à vaga. Tente novamente.');
      }
    } else if (this.selectedCandidato) {
      // Candidato editado - apenas recarregar lista
      console.log('Candidato editado, recarregando lista...');
      await this.loadCandidatos();
    }

    // Fechar o modal antigo se estiver aberto
    this.showAddCandidateModal = false;
  }

  // Métodos para o modal de observações
  openObservacoesModal(candidato: Candidato) {
    this.selectedCandidatoForObservacoes = candidato;
    this.isObservacoesModalVisible = true;
  }

  closeObservacoesModal() {
    this.isObservacoesModalVisible = false;
    this.selectedCandidatoForObservacoes = null;
  }

  onObservacoesSaved(candidatoAtualizado: Candidato) {
    console.log('Observações salvas:', candidatoAtualizado);

    // Atualizar o candidato na lista local
    const vagaCandidatoIndex = this.candidatos.findIndex(
      vc => vc.candidato.id === candidatoAtualizado.id
    );

    if (vagaCandidatoIndex !== -1) {
      this.candidatos[vagaCandidatoIndex].candidato = candidatoAtualizado;
    }
  }

  // Métodos auxiliares para exibir dados da entrevista
  getLatestInterview(vagaCandidato: VagaCandidato): any {
    if (!vagaCandidato.entrevistas || vagaCandidato.entrevistas.length === 0) {
      return null;
    }
    // Retorna a última entrevista (mais recente)
    return vagaCandidato.entrevistas[vagaCandidato.entrevistas.length - 1];
  }

  getInterviewStatusLabel(status: string): string {
    return this.statusEntrevistaLabels[status] || status;
  }

  async onInterviewStatusChange(vagaCandidato: VagaCandidato, event: any) {
    const newStatus = event.target.value;
    const latestInterview = this.getLatestInterview(vagaCandidato);

    if (!latestInterview || !latestInterview.id) {
      this.toastr.error('Entrevista não encontrada');
      return;
    }

    try {
      // Update interview status via API
      await firstValueFrom(
        this.entrevistaService.updateEntrevista(latestInterview.id, { status: newStatus })
      );

      // Update local state
      latestInterview.status = newStatus;

      this.toastr.success('Status da entrevista atualizado com sucesso');
    } catch (error) {
      console.error('Erro ao atualizar status da entrevista:', error);
      this.toastr.error('Erro ao atualizar status da entrevista');
      // Revert the select value
      event.target.value = latestInterview.status;
    }
  }

  // Métodos para o menu dropdown de candidatos
  toggleCandidatoMenu(vagaCandidatoId: number, event: MouseEvent) {
    event.stopPropagation();

    if (this.openMenuId === vagaCandidatoId) {
      this.openMenuId = null;
    } else {
      const button = event.target as HTMLElement;
      const rect = button.getBoundingClientRect();

      // Posicionar o menu abaixo do botão, alinhado à direita
      this.menuPosition = {
        top: rect.bottom + 5,
        left: rect.right - 180 // 180 é a largura mínima do menu
      };

      this.openMenuId = vagaCandidatoId;
    }
  }

  closeMenu() {
    this.openMenuId = null;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    // Fecha o menu se clicar fora dele
    if (this.openMenuId !== null) {
      const target = event.target as HTMLElement;
      if (!target.closest('.dropdown-menu-container')) {
        this.openMenuId = null;
      }
    }
  }

  async deleteCandidato(vagaCandidato: VagaCandidato) {
    const candidatoNome = vagaCandidato.candidato.nome;
    const candidatoId = vagaCandidato.candidato.id;

    if (!candidatoId) {
      this.toastr.error('ID do candidato não encontrado');
      return;
    }

    if (!confirm(`Tem certeza que deseja excluir o candidato "${candidatoNome}" desta vaga?`)) {
      return;
    }

    try {
      await firstValueFrom(this.vagaService.desvincularCandidato(this.vagaId, candidatoId));
      this.toastr.success(`Candidato "${candidatoNome}" removido com sucesso`);
      await this.loadCandidatos();
    } catch (error) {
      console.error('Erro ao excluir candidato:', error);
      this.toastr.error('Erro ao excluir candidato. Tente novamente.');
    }
  }
}