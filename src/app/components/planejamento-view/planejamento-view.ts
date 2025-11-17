import { Component, OnInit, OnDestroy, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';
import { PlanejamentoEstrategicoService, PlanejamentoEstrategico, Departamento, CreateDepartamentoRequest, UpdateDepartamentoRequest } from '../../services/planejamento-estrategico.service';
import { AuthService } from '../../services/auth';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-planejamento-view',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    BreadcrumbComponent
  ],
  templateUrl: './planejamento-view.html',
  styleUrls: ['./planejamento-view.css'],
})
export class PlanejamentoViewComponent implements OnInit, OnDestroy {

  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private planejamentoService = inject(PlanejamentoEstrategicoService);
  public authService = inject(AuthService);
  private toastr = inject(ToastrService);

  planejamentoId: number | null = null;
  planejamento: PlanejamentoEstrategico | null = null;
  departamentos: Departamento[] = [];

  isLoading = true;
  error = '';

  // Modal de departamento
  showDepartamentoModal = false;
  isEditingDepartamento = false;
  departamentoForm = {
    id: 0,
    nome_departamento: '',
    responsavel_nome: '',
    responsavel_email: ''
  };

  // Modal de exclusão
  showDeleteModal = false;
  departamentoToDelete: Departamento | null = null;

  // Menu dropdown
  openMenuId: number | null = null;

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.planejamentoId = +params['id'];
        this.loadPlanejamento();
      }
    });
  }

  ngOnDestroy(): void {
    // Cleanup
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.dep-actions')) {
      this.closeMenu();
    }
  }

  async loadPlanejamento(): Promise<void> {
    if (!this.planejamentoId) return;

    this.isLoading = true;
    this.error = '';

    try {
      const response = await firstValueFrom(
        this.planejamentoService.obterPlanejamento(this.planejamentoId)
      );

      if (response.success && response.data) {
        this.planejamento = response.data;
        this.departamentos = response.data.departamentos || [];
      }
    } catch (err: any) {
      console.error('Erro ao carregar planejamento:', err);
      this.error = 'Não foi possível carregar o planejamento.';
      this.toastr.error('Erro ao carregar planejamento', 'Erro');
    } finally {
      this.isLoading = false;
    }
  }

  getClientName(): string {
    if (!this.planejamento?.client) return 'N/A';

    const client = this.planejamento.client;

    // Tenta pegar o nome de diferentes possíveis estruturas
    if (client.name) return client.name;
    if (client.full_name) return client.full_name;
    if (client.company_name) return client.company_name;
    if (client.trade_name) return client.trade_name;

    // Tenta estruturas aninhadas (objeto direto, não array)
    if (client.clients_pf) {
      return client.clients_pf.full_name || 'N/A';
    }
    if (client.clients_pj) {
      return client.clients_pj.trade_name || client.clients_pj.company_name || 'N/A';
    }

    return 'N/A';
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'ativo':
        return 'badge-success';
      case 'concluido':
        return 'badge-info';
      case 'cancelado':
        return 'badge-danger';
      default:
        return 'badge-secondary';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'ativo':
        return 'Ativo';
      case 'concluido':
        return 'Concluído';
      case 'cancelado':
        return 'Cancelado';
      default:
        return status;
    }
  }

  formatDate(dateString: string | null | undefined): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  }

  formatDateTime(dateTimeString: string | null | undefined): string {
    if (!dateTimeString) return 'N/A';
    const date = new Date(dateTimeString);
    return date.toLocaleString('pt-BR');
  }

  isPrazoVencido(): boolean {
    if (!this.planejamento?.prazo_preenchimento) return false;
    return new Date(this.planejamento.prazo_preenchimento) < new Date();
  }

  isMatrizPreenchida(departamento: Departamento): boolean {
    return !!departamento.matriz?.preenchido_em;
  }

  getMatrizPreenchimentoPercentage(): number {
    if (this.departamentos.length === 0) return 0;
    const preenchidos = this.getMatrizesPreenchidas();
    return Math.round((preenchidos / this.departamentos.length) * 100);
  }

  getMatrizesPreenchidas(): number {
    return this.departamentos.filter(d => this.isMatrizPreenchida(d)).length;
  }

  // Ações do planejamento
  editarPlanejamento(): void {
    if (this.planejamentoId) {
      this.router.navigate(['/home/planejamento-estrategico/editar', this.planejamentoId]);
    }
  }

  visualizarPlanejamento(): void {
    if (this.planejamento) {
      const url = this.planejamentoService.gerarUrlPublica(this.planejamento.unique_token);
      window.open(url, '_blank');
    }
  }

  copiarLinkPublico(): void {
    if (!this.planejamento) return;

    const url = this.planejamentoService.gerarUrlPublica(this.planejamento.unique_token);

    navigator.clipboard.writeText(url).then(() => {
      this.toastr.success('Link copiado para a área de transferência', 'Sucesso');
    }).catch(err => {
      console.error('Erro ao copiar link:', err);
      this.toastr.error('Erro ao copiar link', 'Erro');
    });
  }

  voltarParaLista(): void {
    this.router.navigate(['/home/planejamento-estrategico']);
  }

  // Menu dropdown actions
  toggleMenu(depId: number): void {
    this.openMenuId = this.openMenuId === depId ? null : depId;
  }

  closeMenu(): void {
    this.openMenuId = null;
  }

  // Gestão de departamentos
  openNovoDepartamentoModal(): void {
    this.isEditingDepartamento = false;
    this.departamentoForm = {
      id: 0,
      nome_departamento: '',
      responsavel_nome: '',
      responsavel_email: ''
    };
    this.showDepartamentoModal = true;
  }

  openEditarDepartamentoModal(departamento: Departamento): void {
    this.isEditingDepartamento = true;
    this.departamentoForm = {
      id: departamento.id,
      nome_departamento: departamento.nome_departamento,
      responsavel_nome: departamento.responsavel_nome || '',
      responsavel_email: departamento.responsavel_email || ''
    };
    this.showDepartamentoModal = true;
  }

  closeDepartamentoModal(): void {
    this.showDepartamentoModal = false;
    this.departamentoForm = {
      id: 0,
      nome_departamento: '',
      responsavel_nome: '',
      responsavel_email: ''
    };
  }

  async saveDepartamento(): Promise<void> {
    if (!this.departamentoForm.nome_departamento.trim()) {
      this.toastr.warning('Por favor, informe o nome do departamento', 'Atenção');
      return;
    }

    if (!this.planejamentoId) return;

    try {
      if (this.isEditingDepartamento && this.departamentoForm.id) {
        // Atualizar departamento
        const updateData: UpdateDepartamentoRequest = {
          nome_departamento: this.departamentoForm.nome_departamento,
          responsavel_nome: this.departamentoForm.responsavel_nome || undefined,
          responsavel_email: this.departamentoForm.responsavel_email || undefined
        };

        const response = await firstValueFrom(
          this.planejamentoService.atualizarDepartamento(this.departamentoForm.id, updateData)
        );

        if (response.success) {
          this.toastr.success('Departamento atualizado com sucesso', 'Sucesso');
        }
      } else {
        // Criar novo departamento
        const createData: CreateDepartamentoRequest = {
          nome_departamento: this.departamentoForm.nome_departamento,
          responsavel_nome: this.departamentoForm.responsavel_nome || undefined,
          responsavel_email: this.departamentoForm.responsavel_email || undefined
        };

        const response = await firstValueFrom(
          this.planejamentoService.adicionarDepartamento(this.planejamentoId, createData)
        );

        if (response.success) {
          this.toastr.success('Departamento adicionado com sucesso', 'Sucesso');
        }
      }

      this.closeDepartamentoModal();
      this.loadPlanejamento();
    } catch (err: any) {
      console.error('Erro ao salvar departamento:', err);
      this.toastr.error(err.error?.message || 'Erro ao salvar departamento', 'Erro');
    }
  }

  openDeleteModal(departamento: Departamento): void {
    this.departamentoToDelete = departamento;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.departamentoToDelete = null;
  }

  async confirmDeleteDepartamento(): Promise<void> {
    if (!this.departamentoToDelete) return;

    try {
      const response = await firstValueFrom(
        this.planejamentoService.deletarDepartamento(this.departamentoToDelete.id)
      );

      if (response.success) {
        this.toastr.success('Departamento excluído com sucesso', 'Sucesso');
        this.closeDeleteModal();
        this.loadPlanejamento();
      }
    } catch (err: any) {
      console.error('Erro ao deletar departamento:', err);
      this.toastr.error('Erro ao deletar departamento', 'Erro');
    }
  }
}
