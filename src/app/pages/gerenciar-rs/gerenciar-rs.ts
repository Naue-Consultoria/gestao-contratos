import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BreadcrumbComponent } from '../../components/breadcrumb/breadcrumb.component';
import { BreadcrumbService } from '../../services/breadcrumb.service';
import { VagasHubService } from '../../services/vagas-hub.service';
import { ClientService } from '../../services/client.service';
import { VagaComVisibilidade, ClientComHub } from '../../types/vagas-hub';
import { ToastrService } from 'ngx-toastr';
import { firstValueFrom } from 'rxjs';

interface ClienteComVagas {
  client: ClientComHub;
  vagas: VagaComVisibilidade[];
  expanded: boolean;
  loadingVagas: boolean;
}

@Component({
  selector: 'app-gerenciar-rs',
  standalone: true,
  imports: [CommonModule, FormsModule, BreadcrumbComponent],
  templateUrl: './gerenciar-rs.html',
  styleUrl: './gerenciar-rs.css'
})
export class GerenciarRsComponent implements OnInit {
  clientes: ClienteComVagas[] = [];
  clienteSelecionadoId: number | null = null;
  clienteSelecionado: ClienteComVagas | null = null;
  isLoading = true;
  isLoadingVagas = false;

  // Modal de link
  showLinkModal = false;
  selectedClient: ClienteComVagas | null = null;
  publicLink: string | null = null;
  linkExpiration: number = 0;

  constructor(
    private breadcrumbService: BreadcrumbService,
    private vagasHubService: VagasHubService,
    private clientService: ClientService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.setBreadcrumb();
    this.carregarClientes();
  }

  private setBreadcrumb(): void {
    this.breadcrumbService.setBreadcrumbs([
      { label: 'Home', url: '/home/dashboard', icon: 'fas fa-home' },
      { label: 'Gerenciar R&S' }
    ]);
  }

  async carregarClientes(): Promise<void> {
    try {
      this.isLoading = true;

      // Buscar apenas clientes com contratos R&S ativos
      const response = await firstValueFrom(this.vagasHubService.getClientesComRsAtivo());

      const todosClientes = response.data || [];

      // Transformar em ClienteComVagas
      const clientesComHub: ClienteComVagas[] = todosClientes.map((cliente: any) => ({
        client: {
          id: cliente.id,
          email: cliente.email || '',
          vagas_hub_token: cliente.vagas_hub_token,
          vagas_hub_token_expires_at: cliente.vagas_hub_token_expires_at,
          clients_pf: cliente.clients_pf || undefined,
          clients_pj: cliente.clients_pj || undefined
        },
        vagas: [],
        expanded: false,
        loadingVagas: false
      }));

      // Ordenar por nome alfabeticamente
      this.clientes = clientesComHub.sort((a, b) => {
        const nomeA = this.getClienteName(a.client).toLowerCase();
        const nomeB = this.getClienteName(b.client).toLowerCase();
        return nomeA.localeCompare(nomeB, 'pt-BR');
      });
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      this.toastr.error('Erro ao carregar clientes');
    } finally {
      this.isLoading = false;
    }
  }

  async onClienteChange(): Promise<void> {
    if (!this.clienteSelecionadoId) {
      this.clienteSelecionado = null;
      return;
    }

    // Encontrar cliente selecionado
    const cliente = this.clientes.find(c => c.client.id === this.clienteSelecionadoId);

    if (!cliente) {
      this.toastr.error('Cliente não encontrado');
      return;
    }

    this.clienteSelecionado = cliente;

    // Carregar vagas do cliente
    await this.carregarVagasCliente();
  }

  async carregarVagasCliente(): Promise<void> {
    if (!this.clienteSelecionado) return;

    try {
      this.isLoadingVagas = true;

      const response = await firstValueFrom(
        this.vagasHubService.getVagasComVisibilidade(this.clienteSelecionado.client.id)
      );

      if (response.success) {
        this.clienteSelecionado.vagas = response.data || [];
      }
    } catch (error) {
      console.error('Erro ao carregar vagas:', error);
      this.toastr.error('Erro ao carregar vagas do cliente');
    } finally {
      this.isLoadingVagas = false;
    }
  }

  async toggleVisibilidade(vaga: VagaComVisibilidade): Promise<void> {
    const novoEstado = !vaga.is_visible_in_hub;

    try {
      const response = await firstValueFrom(
        this.vagasHubService.atualizarVisibilidade(vaga.id, {
          is_visible_in_hub: novoEstado
        })
      );

      if (response.success) {
        vaga.is_visible_in_hub = novoEstado;
        this.toastr.success(
          novoEstado
            ? 'Vaga agora aparece no hub público'
            : 'Vaga ocultada do hub público'
        );
      }
    } catch (error: any) {
      console.error('Erro ao atualizar visibilidade:', error);
      this.toastr.error(error?.error?.message || 'Erro ao atualizar visibilidade');
    }
  }

  getClienteName(client: ClientComHub | any): string {
    // Tentar PF
    if (client.clients_pf?.full_name) {
      return client.clients_pf.full_name;
    }

    // Tentar PJ
    if (client.clients_pj?.trade_name) {
      return client.clients_pj.trade_name;
    }

    if (client.clients_pj?.company_name) {
      return client.clients_pj.company_name;
    }

    // Fallback para email
    if (client.email) {
      return client.email;
    }

    return `Cliente #${client.id}`;
  }

  hasHubToken(client: ClientComHub): boolean {
    return !!client.vagas_hub_token;
  }

  openLinkModal(): void {
    if (!this.clienteSelecionado) {
      this.toastr.warning('Selecione um cliente primeiro');
      return;
    }

    this.selectedClient = this.clienteSelecionado;
    this.showLinkModal = true;
    this.linkExpiration = 0;

    // Se já tem token, montar o link
    if (this.clienteSelecionado.client.vagas_hub_token) {
      this.publicLink = `${window.location.origin}/vagas-hub/${this.clienteSelecionado.client.vagas_hub_token}`;
    } else {
      this.publicLink = null;
    }
  }

  closeLinkModal(): void {
    this.showLinkModal = false;
    this.selectedClient = null;
    this.publicLink = null;
    this.linkExpiration = 0;
  }

  async gerarLinkHub(): Promise<void> {
    if (!this.selectedClient) return;

    try {
      const request = this.linkExpiration > 0 ? { expires_in_days: this.linkExpiration } : {};
      const response = await firstValueFrom(
        this.vagasHubService.gerarTokenHub(this.selectedClient.client.id, request)
      );

      if (response.success && response.data) {
        this.publicLink = response.data.public_url;
        this.selectedClient.client.vagas_hub_token = response.data.vagas_hub_token;
        this.selectedClient.client.vagas_hub_token_expires_at = response.data.vagas_hub_token_expires_at;
        this.toastr.success(response.message || 'Link do hub gerado com sucesso!');
      }
    } catch (error: any) {
      console.error('Erro ao gerar link do hub:', error);
      this.toastr.error(error?.error?.message || 'Erro ao gerar link do hub');
    }
  }

  async copiarLink(): Promise<void> {
    if (!this.publicLink) return;

    try {
      await navigator.clipboard.writeText(this.publicLink);
      this.toastr.success('Link copiado para a área de transferência!');
    } catch (error) {
      console.error('Erro ao copiar link:', error);
      this.toastr.error('Erro ao copiar link');
    }
  }

  async removerLinkHub(): Promise<void> {
    if (!this.selectedClient) return;

    if (!confirm('Tem certeza que deseja remover o acesso público ao hub de vagas deste cliente?')) {
      return;
    }

    try {
      const response = await firstValueFrom(
        this.vagasHubService.removerTokenHub(this.selectedClient.client.id)
      );

      if (response.success) {
        this.selectedClient.client.vagas_hub_token = undefined;
        this.selectedClient.client.vagas_hub_token_expires_at = undefined;
        this.toastr.success(response.message || 'Acesso público removido com sucesso!');
        this.closeLinkModal();
      }
    } catch (error: any) {
      console.error('Erro ao remover link do hub:', error);
      this.toastr.error(error?.error?.message || 'Erro ao remover link do hub');
    }
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'aberta': 'Aberta',
      'divulgacao_prospec': 'Divulgação',
      'entrevista_nc': 'Entrevista NC',
      'entrevista_empresa': 'Entrevista Cliente',
      'testes': 'Testes',
      'fechada': 'Fechada',
      'fechada_rep': 'Fechada/Rep',
      'cancelada_cliente': 'Cancelada',
      'standby': 'Standby',
      'nao_cobrada': 'Não Cobrada',
      'encerramento_cont': 'Encerramento'
    };
    return labels[status] || status;
  }

  getTipoCargoLabel(tipo: string): string {
    const labels: { [key: string]: string } = {
      'administrativo': 'Administrativo',
      'comercial': 'Comercial',
      'estagio': 'Estágio',
      'gestao': 'Gestão',
      'operacional': 'Operacional',
      'jovem_aprendiz': 'Jovem Aprendiz'
    };
    return labels[tipo] || tipo;
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
}
