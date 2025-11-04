import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { VagasHubService } from '../../services/vagas-hub.service';
import { VagaService } from '../../services/vaga.service';
import { ClientVagasHub } from '../../types/vagas-hub';
import { Vaga, VagaStatusHistory } from '../../types/vaga';
import { ToastrService } from 'ngx-toastr';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-public-vagas-hub',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './public-vagas-hub.html',
  styleUrl: './public-vagas-hub.css'
})
export class PublicVagasHubComponent implements OnInit {
  hubData: ClientVagasHub | null = null;
  isLoading = true;
  notFound = false;
  linkExpirado = false;
  historicos: Map<number, VagaStatusHistory[]> = new Map();
  expandedVagas: Set<number> = new Set();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private vagasHubService: VagasHubService,
    private vagaService: VagaService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token');
    if (!token) {
      this.notFound = true;
      this.isLoading = false;
      return;
    }

    this.carregarHub(token);
  }

  carregarHub(token: string): void {
    this.isLoading = true;
    this.vagasHubService.getHubPublico(token).subscribe({
      next: async (response) => {
        if (response.success && response.data) {
          this.hubData = response.data;

          // Carregar histórico de todas as vagas com token
          await this.carregarHistoricos();
        } else {
          this.notFound = true;
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erro ao carregar hub:', error);

        if (error.status === 404) {
          this.notFound = true;
        } else if (error.status === 410) {
          this.linkExpirado = true;
        } else {
          this.toastr.error('Erro ao carregar hub de vagas');
        }

        this.isLoading = false;
      }
    });
  }

  async carregarHistoricos(): Promise<void> {
    if (!this.hubData?.vagas) return;

    for (const vaga of this.hubData.vagas) {
      if (vaga.unique_token && vaga.is_public) {
        try {
          const response = await firstValueFrom(
            this.vagaService.getHistoricoStatusPublico(vaga.unique_token)
          );

          if (response.success && response.data) {
            this.historicos.set(vaga.id, response.data);
          }
        } catch (error) {
          console.log(`Histórico não disponível para vaga ${vaga.id}`);
        }
      }
    }
  }

  toggleHistorico(vagaId: number): void {
    if (this.expandedVagas.has(vagaId)) {
      this.expandedVagas.delete(vagaId);
    } else {
      this.expandedVagas.add(vagaId);
    }
  }

  isHistoricoExpanded(vagaId: number): boolean {
    return this.expandedVagas.has(vagaId);
  }

  getHistorico(vagaId: number): VagaStatusHistory[] {
    return this.historicos.get(vagaId) || [];
  }

  hasHistorico(vagaId: number): boolean {
    const historico = this.historicos.get(vagaId);
    return !!historico && historico.length > 0;
  }

  formatDateTime(dateString: string | Date | undefined): string {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('pt-BR');
  }

  getClientName(): string {
    if (!this.hubData?.client) return '';
    const client = this.hubData.client;

    if (client.clients_pf) {
      return client.clients_pf.full_name || '';
    } else if (client.clients_pj) {
      return client.clients_pj.company_name || client.clients_pj.trade_name || '';
    }
    return '';
  }

  getClientLocation(): string {
    if (!this.hubData?.client) return '';
    const client = this.hubData.client;
    return `${client.city || ''}, ${client.state || ''}`.trim();
  }

  // Método removido - não há mais visualização individual de vaga
  // As informações são exibidas diretamente nos cards do hub

  getVagasAbertas(): Vaga[] {
    if (!this.hubData?.vagas) return [];
    return this.hubData.vagas.filter(v =>
      v.status === 'aberta' || v.status === 'divulgacao_prospec'
    );
  }

  getVagasEmAndamento(): Vaga[] {
    if (!this.hubData?.vagas) return [];
    return this.hubData.vagas.filter(v =>
      v.status === 'entrevista_nc' ||
      v.status === 'entrevista_empresa' ||
      v.status === 'testes'
    );
  }

  getVagasFechadas(): Vaga[] {
    if (!this.hubData?.vagas) return [];
    return this.hubData.vagas.filter(v =>
      v.status === 'fechada' || v.status === 'fechada_rep'
    );
  }

  formatDate(dateString: string | Date | undefined): string {
    if (!dateString) return '-';

    if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateString.split('-');
      const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return d.toLocaleDateString('pt-BR');
    }

    return new Date(dateString).toLocaleDateString('pt-BR');
  }

  getStatusLabel(status: string): string {
    const statusLabels: { [key: string]: string } = {
      'aberta': 'Aberta',
      'divulgacao_prospec': 'Em Divulgação',
      'entrevista_nc': 'Entrevista NAUE',
      'entrevista_empresa': 'Entrevista Cliente',
      'testes': 'Testes',
      'fechada': 'Fechada',
      'fechada_rep': 'Fechada',
      'cancelada_cliente': 'Cancelada',
      'standby': 'Standby',
      'nao_cobrada': 'Não Cobrada',
      'encerramento_cont': 'Encerramento'
    };
    return statusLabels[status] || status;
  }

  getStatusClass(status: string): string {
    const statusClasses: { [key: string]: string } = {
      'aberta': 'status-aberta',
      'divulgacao_prospec': 'status-divulgacao',
      'entrevista_nc': 'status-entrevista',
      'entrevista_empresa': 'status-entrevista',
      'testes': 'status-testes',
      'fechada': 'status-fechada',
      'fechada_rep': 'status-fechada',
      'cancelada_cliente': 'status-cancelada',
      'standby': 'status-standby',
      'nao_cobrada': 'status-nao-cobrada',
      'encerramento_cont': 'status-encerramento'
    };
    return statusClasses[status] || '';
  }

  getTipoCargoLabel(tipo: string): string {
    const tipoLabels: { [key: string]: string } = {
      'administrativo': 'Administrativo',
      'comercial': 'Comercial',
      'estagio': 'Estágio',
      'gestao': 'Gestão',
      'operacional': 'Operacional',
      'jovem_aprendiz': 'Jovem Aprendiz'
    };
    return tipoLabels[tipo] || tipo;
  }

  getTipoAberturaLabel(tipo: string): string {
    return tipo === 'nova' ? 'Nova Vaga' : 'Reposição';
  }
}
