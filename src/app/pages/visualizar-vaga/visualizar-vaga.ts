import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
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
}

@Component({
  selector: 'app-visualizar-vaga',
  standalone: true,
  imports: [CommonModule, BreadcrumbComponent],
  templateUrl: './visualizar-vaga.html',
  styleUrl: './visualizar-vaga.css'
})
export class VisualizarVagaComponent implements OnInit {
  vaga: Vaga | null = null;
  isLoading = true;
  vagaId: number = 0;

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
    'realizada': 'Realizada',
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
        status: 'entrevista_empresa',
        fonteRecrutamento: 'linkedin',
        statusEntrevista: 'realizada',
        salario: 8500,
        dataAbertura: new Date('2024-01-10'),
        observacoes: 'Vaga urgente para projeto novo cliente. Necessário conhecimento em Angular e Node.js.',
        candidatoAprovado: 'João Silva',
        emailCandidato: 'joao.silva@email.com',
        telefoneCandidato: '(11) 98765-4321'
      };
      this.isLoading = false;
    }, 500);
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
}