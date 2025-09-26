import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { BreadcrumbComponent } from '../../components/breadcrumb/breadcrumb.component';
import { BreadcrumbService } from '../../services/breadcrumb.service';
import { CandidatoModalComponent } from '../../components/candidato-modal/candidato-modal.component';
import { EntrevistaModal } from '../../components/entrevista-modal/entrevista-modal';
import { ObservacoesModalComponent } from '../../components/observacoes-modal/observacoes-modal.component';
import { Entrevista } from '../../services/entrevista.service';
import { Candidato } from '../../services/candidato.service';

interface Vaga {
  id: number;
  codigo: string;
  clienteId: number;
  clienteNome: string;
  usuarioId: number;
  usuarioNome: string;
  cargo: string;
  tipoCargo: string;
  tipoAbertura: string;
  status: string;
  fonteRecrutamento: string;
  statusEntrevista?: string;
  salario: number;
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

  loadVagaData() {
    // Simular carregamento de dados - substituir por chamada real ao backend
    setTimeout(() => {
      this.vaga = {
        id: this.vagaId,
        codigo: 'VAG' + String(this.vagaId).padStart(3, '0'),
        clienteId: 1,
        clienteNome: 'Tech Solutions Ltda',
        usuarioId: 1,
        usuarioNome: 'Ana Recrutadora',
        cargo: 'Desenvolvedor Full Stack',
        tipoCargo: 'gestao',
        tipoAbertura: 'nova',
        status: 'fechada',
        fonteRecrutamento: 'linkedin',
        statusEntrevista: 'realizada',
        salario: 8500,
        dataAbertura: new Date('2024-01-10'),
        dataFechamentoCancelamento: new Date('2024-01-25'),
        observacoes: 'Vaga urgente para projeto novo cliente. Necessário conhecimento em Angular e Node.js.',
        candidatoAprovado: 'João Silva',
        emailCandidato: 'joao.silva@email.com',
        telefoneCandidato: '(11) 98765-4321',
        porcentagemFaturamento: 120,
        valorFaturamento: 10200,
        sigilosa: false,
        impostoEstado: 12
      };
      this.isLoading = false;
    }, 500);
  }

  loadCandidatos() {
    // Simular carregamento de candidatos - substituir por chamada real ao backend
    setTimeout(() => {
      this.candidatos = [
        {
          id: 1,
          vaga_id: this.vagaId,
          candidato: {
            id: 1,
            nome: 'João Silva',
            email: 'joao.silva@email.com',
            telefone: '(11) 98765-4321',
            status: 'aprovado'
          },
          status: 'aprovado',
          data_inscricao: new Date('2024-01-12'),
          observacoes: 'Candidato com ótimo perfil técnico',
          entrevistas: [
            {
              id: 1,
              data_entrevista: new Date('2024-01-15'),
              hora_entrevista: '14:00',
              status: 'realizada',
              link_chamada: 'https://meet.google.com/abc-defg-hij',
              observacoes: 'Entrevista técnica realizada com sucesso',
              avaliacao: 'Aprovado - conhecimento sólido em Angular e Node.js',
              entrevistador_nome: 'Ana Recrutadora'
            }
          ]
        },
        {
          id: 2,
          vaga_id: this.vagaId,
          candidato: {
            id: 2,
            nome: 'Maria Santos',
            email: 'maria.santos@email.com',
            telefone: '(11) 99876-5432',
            status: 'pendente'
          },
          status: 'entrevista_realizada',
          data_inscricao: new Date('2024-01-14'),
          observacoes: 'Perfil interessante, experiência em React',
          entrevistas: [
            {
              id: 2,
              data_entrevista: new Date('2024-01-18'),
              hora_entrevista: '10:00',
              status: 'realizada',
              link_chamada: 'https://meet.google.com/xyz-uvwx-123',
              observacoes: 'Primeira entrevista técnica',
              avaliacao: 'Bom perfil, mas precisa de treinamento em Angular',
              entrevistador_nome: 'Carlos Gestor'
            }
          ]
        }
      ];
    }, 600);
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

  deleteVaga() {
    if (confirm('Tem certeza que deseja excluir esta vaga?')) {
      // Implementar exclusão
      console.log('Excluir vaga:', this.vagaId);
      this.router.navigate(['/home/recrutamento-selecao']);
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

  loadEntrevistadores() {
    // Simulação - substituir por chamada real ao backend
    this.entrevistadores = [
      { id: 1, name: 'Ana Recrutadora' },
      { id: 2, name: 'Carlos Gestor' },
      { id: 3, name: 'Marina RH' }
    ];
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

  onCandidatoSaved(candidato: Candidato) {
    console.log('Candidato salvo:', candidato);
    // Aqui você pode atualizar a lista de candidatos
    // Por enquanto, vou simular adicionando à lista local
    if (!this.selectedCandidato) {
      // Novo candidato - adicionar à lista
      const novoCandidatoVaga: VagaCandidato = {
        id: this.candidatos.length + 1,
        vaga_id: this.vagaId,
        candidato: candidato,
        status: 'inscrito',
        data_inscricao: new Date(),
        entrevistas: []
      };
      this.candidatos.push(novoCandidatoVaga);
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
}