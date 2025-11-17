import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';
import { PlanejamentoEstrategicoService, PlanejamentoEstrategico } from '../../services/planejamento-estrategico.service';
import { AuthService } from '../../services/auth';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-planejamento-estrategico-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    BreadcrumbComponent
  ],
  templateUrl: './planejamento-estrategico-page.html',
  styleUrls: ['./planejamento-estrategico-page.css'],
})
export class PlanejamentoEstrategicoPageComponent implements OnInit, OnDestroy {

  private router = inject(Router);
  private planejamentoService = inject(PlanejamentoEstrategicoService);
  public authService = inject(AuthService);
  private toastr = inject(ToastrService);

  planejamentos: PlanejamentoEstrategico[] = [];
  filteredPlanejamentos: PlanejamentoEstrategico[] = [];
  searchTerm = '';
  isLoading = true;
  error = '';

  // Filtros
  statusFilter: string = 'todos';

  // Modal de exclusão
  showDeleteModal = false;
  planejamentoToDelete: PlanejamentoEstrategico | null = null;

  ngOnInit(): void {
    this.loadPlanejamentos();
  }

  ngOnDestroy(): void {
    // Limpeza de recursos
  }

  async loadPlanejamentos(): Promise<void> {
    this.isLoading = true;
    this.error = '';

    try {
      const response = await firstValueFrom(
        this.planejamentoService.listarPlanejamentos()
      );

      if (response.success) {
        this.planejamentos = response.data;
        this.applyFilters();
      }
    } catch (err: any) {
      console.error('Erro ao carregar planejamentos:', err);
      this.error = 'Não foi possível carregar os planejamentos estratégicos.';
      this.toastr.error('Erro ao carregar planejamentos', 'Erro');
    } finally {
      this.isLoading = false;
    }
  }

  applyFilters(): void {
    let filtered = [...this.planejamentos];

    // Filtro de status
    if (this.statusFilter !== 'todos') {
      filtered = filtered.filter(p => p.status === this.statusFilter);
    }

    // Filtro de busca
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.titulo.toLowerCase().includes(term) ||
        this.getClientName(p).toLowerCase().includes(term) ||
        p.contract?.contract_number?.toLowerCase().includes(term)
      );
    }

    this.filteredPlanejamentos = filtered;
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onStatusFilterChange(): void {
    this.applyFilters();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.applyFilters();
  }

  getClientName(planejamento: PlanejamentoEstrategico): string {
    if (!planejamento.client) return 'N/A';

    const clientPF = planejamento.client.clients_pf?.[0];
    const clientPJ = planejamento.client.clients_pj?.[0];

    if (clientPF) {
      return clientPF.full_name || 'N/A';
    } else if (clientPJ) {
      return clientPJ.company_name || clientPJ.trade_name || 'N/A';
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

  novoPlanejamento(): void {
    this.router.navigate(['/home/planejamento-estrategico/novo']);
  }

  visualizarPlanejamento(id: number): void {
    this.router.navigate(['/home/planejamento-estrategico/visualizar', id]);
  }

  editarPlanejamento(id: number): void {
    this.router.navigate(['/home/planejamento-estrategico/editar', id]);
  }

  openDeleteModal(planejamento: PlanejamentoEstrategico, event: Event): void {
    event.stopPropagation();
    this.planejamentoToDelete = planejamento;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.planejamentoToDelete = null;
  }

  async confirmDelete(): Promise<void> {
    if (!this.planejamentoToDelete) return;

    try {
      const response = await firstValueFrom(
        this.planejamentoService.deletarPlanejamento(this.planejamentoToDelete.id)
      );

      if (response.success) {
        this.toastr.success('Planejamento deletado com sucesso', 'Sucesso');
        this.closeDeleteModal();
        this.loadPlanejamentos();
      }
    } catch (err: any) {
      console.error('Erro ao deletar planejamento:', err);
      this.toastr.error('Erro ao deletar planejamento', 'Erro');
    }
  }

  copiarLinkPublico(planejamento: PlanejamentoEstrategico, event: Event): void {
    event.stopPropagation();
    const url = this.planejamentoService.gerarUrlPublica(planejamento.unique_token);

    navigator.clipboard.writeText(url).then(() => {
      this.toastr.success('Link copiado para a área de transferência', 'Sucesso');
    }).catch(err => {
      console.error('Erro ao copiar link:', err);
      this.toastr.error('Erro ao copiar link', 'Erro');
    });
  }

  formatDate(dateString: string | null | undefined): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  }

  isPrazoVencido(prazo: string | null | undefined): boolean {
    if (!prazo) return false;
    return new Date(prazo) < new Date();
  }
}
