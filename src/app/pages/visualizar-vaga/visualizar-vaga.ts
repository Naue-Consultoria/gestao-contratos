import { Component, OnInit, inject } from '@angular/core';
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
  dataAbertura: Date;
  dataFechamentoCancelamento?: Date;
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
  data_inscricao: Date;
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
  imports: [CommonModule, FormsModule, BreadcrumbComponent, CandidatoModalComponent, EntrevistaModal, ObservacoesModalComponent],
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
  private toastr = inject(ToastrService);

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
        dataAbertura: new Date(vagaData.data_abertura),
        dataFechamentoCancelamento: vagaData.data_fechamento_cancelamento ? new Date(vagaData.data_fechamento_cancelamento) : undefined,
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
        data_inscricao: new Date(vagaCandidato.data_inscricao),
        observacoes: vagaCandidato.observacoes,
        entrevistas: vagaCandidato.entrevistas || []
      }));

      console.log('Candidatos mapeados:', this.candidatos);

      // Atualizar candidato aprovado na vaga
      if (this.vaga) {
        console.log('Procurando candidato aprovado...');
        this.candidatos.forEach(vc => {
          console.log(`Candidato: ${vc.candidato.nome}, Status: ${vc.candidato.status}`);
        });

        const candidatoAprovado = this.candidatos.find(
          vc => vc.candidato.status === 'aprovado'
        );

        console.log('Candidato aprovado encontrado:', candidatoAprovado);
        this.vaga.candidatoAprovado = candidatoAprovado?.candidato.nome;
        console.log('vaga.candidatoAprovado:', this.vaga.candidatoAprovado);
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

    const endDate = this.vaga.dataFechamentoCancelamento || new Date();
    const startDate = this.vaga.dataAbertura;

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

  printVaga() {
    window.print();
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
      data_inscricao: new Date(),
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
            data_entrevista: new Date(entrevista.data_entrevista),
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
}