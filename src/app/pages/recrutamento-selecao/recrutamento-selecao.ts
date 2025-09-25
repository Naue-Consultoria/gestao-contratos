import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BreadcrumbComponent } from '../../components/breadcrumb/breadcrumb.component';
import { BreadcrumbService } from '../../services/breadcrumb.service';

interface Vaga {
  id: number;
  codigo: string;
  clienteId: number;
  clienteNome: string;
  usuarioId: number;
  usuarioNome: string;
  cargo: string;
  tipoCargo: 'administrativo' | 'comercial' | 'estagio' | 'gestao' | 'operacional' | 'jovem_aprendiz';
  tipoAbertura: 'nova' | 'reposicao';
  status: 'aberta' | 'divulgacao_prospec' | 'entrevista_nc' | 'entrevista_empresa' | 'testes' |
          'fechada' | 'fechada_rep' | 'cancelada_cliente' | 'standby' | 'nao_cobrada' | 'encerramento_cont';
  fonteRecrutamento: 'catho' | 'email' | 'indicacao' | 'linkedin' | 'whatsapp' | 'trafego' | 'outros';
  statusEntrevista?: 'realizada' | 'desistiu' | 'remarcou';
  salario: number;
  dataAbertura: Date;
  dataFechamentoCancelamento?: Date;
  observacoes?: string;
  candidatoAprovado?: string;
  contatoCandidato?: string;
  totalCandidatos: number;
}


@Component({
  selector: 'app-recrutamento-selecao',
  standalone: true,
  imports: [CommonModule, FormsModule, BreadcrumbComponent],
  templateUrl: './recrutamento-selecao.html',
  styleUrl: './recrutamento-selecao.css'
})
export class RecrutamentoSelecao implements OnInit {
  isLoading: boolean = false;
  searchTerm: string = '';
  statusFilter: string = '';
  departmentFilter: string = '';
  tipoCargoFilter: string = '';
  fonteRecrutamentoFilter: string = '';
  openDropdownId: number | null = null;

  constructor(
    private router: Router,
    private breadcrumbService: BreadcrumbService
  ) {}

  // Mapeamentos para labels
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
    'realizada': 'Realizada',
    'desistiu': 'Desistiu',
    'remarcou': 'Remarcou'
  };

  // Stats
  totalVagasAbertas: number = 12;
  totalVagasFechadas: number = 28;
  vagasFechadasMes: number = 7;
  tempoMedioFechamento: number = 18;
  taxaConversao: number = 32;

  // Data arrays
  vagas: Vaga[] = [];

  // Filtered arrays
  filteredVagas: Vaga[] = [];

  ngOnInit() {
    this.setBreadcrumb();
    this.loadData();
  }

  private setBreadcrumb() {
    this.breadcrumbService.setBreadcrumbs([
      { label: 'Home', url: '/home/dashboard', icon: 'fas fa-home' },
      { label: 'Recrutamento e Seleção' }
    ]);
  }

  loadData() {
    // Mock data for demonstration
    this.vagas = [
      {
        id: 1,
        codigo: 'VAG001',
        clienteId: 1,
        clienteNome: 'Tech Solutions Ltda',
        usuarioId: 1,
        usuarioNome: 'Ana Recrutadora',
        cargo: 'Desenvolvedor Full Stack',
        tipoCargo: 'gestao',
        tipoAbertura: 'nova',
        status: 'entrevista_empresa',
        fonteRecrutamento: 'linkedin',
        statusEntrevista: 'realizada',
        salario: 8500,
        dataAbertura: new Date('2024-01-10'),
        observacoes: 'Urgente - Projeto novo cliente',
        candidatoAprovado: 'João Silva',
        contatoCandidato: '(11) 98765-4321',
        totalCandidatos: 15
      },
      {
        id: 2,
        codigo: 'VAG002',
        clienteId: 2,
        clienteNome: 'Finance Corp',
        usuarioId: 2,
        usuarioNome: 'Carlos RH',
        cargo: 'Analista de RH',
        tipoCargo: 'administrativo',
        tipoAbertura: 'reposicao',
        status: 'divulgacao_prospec',
        fonteRecrutamento: 'catho',
        salario: 4500,
        dataAbertura: new Date('2024-01-15'),
        observacoes: 'Substituição de colaborador',
        totalCandidatos: 8
      },
      {
        id: 3,
        codigo: 'VAG003',
        clienteId: 3,
        clienteNome: 'Comercial Plus',
        usuarioId: 1,
        usuarioNome: 'Ana Recrutadora',
        cargo: 'Coordenador Comercial',
        tipoCargo: 'comercial',
        tipoAbertura: 'nova',
        status: 'standby',
        fonteRecrutamento: 'indicacao',
        salario: 12000,
        dataAbertura: new Date('2024-01-05'),
        dataFechamentoCancelamento: new Date('2024-01-20'),
        observacoes: 'Cliente pausou processo temporariamente',
        totalCandidatos: 22
      },
      {
        id: 4,
        codigo: 'VAG004',
        clienteId: 4,
        clienteNome: 'Startup XYZ',
        usuarioId: 2,
        usuarioNome: 'Carlos RH',
        cargo: 'Estagiário de Marketing',
        tipoCargo: 'estagio',
        tipoAbertura: 'nova',
        status: 'aberta',
        fonteRecrutamento: 'trafego',
        salario: 2000,
        dataAbertura: new Date('2024-01-18'),
        observacoes: 'Início imediato',
        totalCandidatos: 35
      },
      {
        id: 5,
        codigo: 'VAG005',
        clienteId: 5,
        clienteNome: 'Indústria ABC',
        usuarioId: 1,
        usuarioNome: 'Ana Recrutadora',
        cargo: 'Operador de Produção',
        tipoCargo: 'operacional',
        tipoAbertura: 'reposicao',
        status: 'fechada',
        fonteRecrutamento: 'whatsapp',
        statusEntrevista: 'realizada',
        salario: 2800,
        dataAbertura: new Date('2024-01-02'),
        dataFechamentoCancelamento: new Date('2024-01-25'),
        observacoes: 'Vaga preenchida com sucesso',
        candidatoAprovado: 'Pedro Santos',
        contatoCandidato: '(11) 97654-3210',
        totalCandidatos: 18
      }
    ];


    this.applyFilters();
  }

  getSearchPlaceholder(): string {
    return 'Buscar por código, cliente, cargo ou responsável...';
  }

  getNewButtonText(): string {
    return 'Nova Vaga';
  }

  onSearch() {
    this.applyFilters();
  }

  clearSearch() {
    this.searchTerm = '';
    this.applyFilters();
  }

  applyFilters() {
    const searchLower = this.searchTerm.toLowerCase();

    // Filter vagas
    this.filteredVagas = this.vagas.filter(vaga => {
      const matchesSearch = !this.searchTerm ||
        vaga.cargo.toLowerCase().includes(searchLower) ||
        vaga.codigo.toLowerCase().includes(searchLower) ||
        vaga.clienteNome.toLowerCase().includes(searchLower) ||
        vaga.usuarioNome.toLowerCase().includes(searchLower) ||
        (vaga.candidatoAprovado && vaga.candidatoAprovado.toLowerCase().includes(searchLower));

      const matchesStatus = !this.statusFilter || vaga.status === this.statusFilter;
      const matchesTipoCargo = !this.tipoCargoFilter || vaga.tipoCargo === this.tipoCargoFilter;
      const matchesFonte = !this.fonteRecrutamentoFilter || vaga.fonteRecrutamento === this.fonteRecrutamentoFilter;

      return matchesSearch && matchesStatus && matchesTipoCargo && matchesFonte;
    });

  }

  clearFilters() {
    this.searchTerm = '';
    this.statusFilter = '';
    this.departmentFilter = '';
    this.tipoCargoFilter = '';
    this.fonteRecrutamentoFilter = '';
    this.applyFilters();
  }

  hasFilters(): boolean {
    return !!(this.searchTerm || this.statusFilter || this.departmentFilter || this.tipoCargoFilter || this.fonteRecrutamentoFilter);
  }

  // Helper method to get Object.keys in template
  get Object() {
    return Object;
  }

  openNewModal() {
    this.router.navigate(['/home/recrutamento-selecao/nova-vaga']);
  }

  // Helper method to format currency
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }

  // Vaga actions
  viewVaga(vaga: Vaga) {
    this.router.navigate(['/home/recrutamento-selecao/visualizar', vaga.id]);
  }

  editVaga(vaga: Vaga) {
    this.router.navigate(['/home/recrutamento-selecao/editar', vaga.id]);
  }

  deleteVaga(vaga: Vaga) {
    if (confirm('Tem certeza que deseja excluir esta vaga?')) {
      // TODO: Implement delete functionality
      console.log('Deleting vaga:', vaga);
      // After successful deletion:
      // this.loadData();
    }
  }

  // Dropdown management
  toggleDropdown(vagaId: number, event: Event) {
    event.stopPropagation();
    this.openDropdownId = this.openDropdownId === vagaId ? null : vagaId;
  }

  closeDropdown(event: Event) {
    event.stopPropagation();
    this.openDropdownId = null;
  }

  // SLA calculation methods
  calculateSla(vaga: Vaga): number {
    if (!vaga.dataFechamentoCancelamento) {
      return 0;
    }
    const start = new Date(vaga.dataAbertura);
    const end = new Date(vaga.dataFechamentoCancelamento);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  calculateActiveSla(vaga: Vaga): number {
    const start = new Date(vaga.dataAbertura);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  getSlaClass(days: number): string {
    if (days <= 7) {
      return 'sla-excellent';
    } else if (days <= 15) {
      return 'sla-good';
    } else if (days <= 30) {
      return 'sla-warning';
    } else {
      return 'sla-danger';
    }
  }

}
