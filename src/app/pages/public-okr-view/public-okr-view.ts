import { Component, OnInit, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../../environments/environment';
import {
  PlanejamentoEstrategicoService,
  OkrObjetivo,
  OkrKeyResult,
  OkrTarefa
} from '../../services/planejamento-estrategico.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-public-okr-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './public-okr-view.html',
  styleUrls: ['./public-okr-view.css'],
})
export class PublicOkrViewComponent implements OnInit {

  private route = inject(ActivatedRoute);
  private planejamentoService = inject(PlanejamentoEstrategicoService);
  private toastr = inject(ToastrService);

  token: string = '';
  isLoading = true;
  isSaving = false;
  error = '';
  hasChanges = false;

  departamento: {
    id: number;
    nome_departamento: string;
    unique_token: string;
  } | null = null;

  planejamento: any = null;
  objetivos: OkrObjetivo[] = [];

  // Estado de expansão
  expandedObjetivos: Set<number> = new Set();
  expandedKeyResults: Set<number> = new Set();

  // Estado de edição
  editingObjetivos: Set<number> = new Set();
  editingKeyResults: Set<number> = new Set();
  editingTarefas: Set<number> = new Set();

  // Estado de menus abertos
  openMenus: Map<string, number | null> = new Map([
    ['objetivo', null],
    ['kr', null],
    ['tarefa', null]
  ]);

  // Contadores para IDs temporários (novos itens)
  private tempIdCounter = -1;

  // Fechar menus ao clicar fora
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown-menu-container')) {
      this.closeAllMenus();
    }
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.token = params['token'];
      if (this.token) {
        this.loadOkr();
      }
    });
  }

  async loadOkr(): Promise<void> {
    this.isLoading = true;
    this.error = '';

    try {
      const response = await firstValueFrom(
        this.planejamentoService.obterOkrDepartamentoPublico(this.token)
      );

      if (response.success && response.data) {
        this.departamento = response.data.departamento;
        this.planejamento = response.data.planejamento;
        this.objetivos = response.data.objetivos || [];

        // Expandir todos os objetivos e KRs por padrão
        this.objetivos.forEach(obj => {
          this.expandedObjetivos.add(obj.id);
          if (obj.key_results) {
            obj.key_results.forEach(kr => {
              this.expandedKeyResults.add(kr.id);
            });
          }
        });

        this.hasChanges = false;
      }
    } catch (err: any) {
      console.error('Erro ao carregar OKRs:', err);
      this.error = 'Não foi possível carregar os OKRs deste departamento.';
      this.toastr.error('OKRs não encontrados', 'Erro');
    } finally {
      this.isLoading = false;
    }
  }

  getClientName(): string {
    if (!this.planejamento?.client) return 'N/A';

    const client = this.planejamento.client;

    if (client.name) return client.name;
    if (client.full_name) return client.full_name;
    if (client.trade_name) return client.trade_name;
    if (client.company_name) return client.company_name;

    if (client.clients_pf) {
      return client.clients_pf.full_name || 'N/A';
    }
    if (client.clients_pj) {
      return client.clients_pj.trade_name || client.clients_pj.company_name || 'N/A';
    }

    return 'N/A';
  }

  getClientLogoUrl(): string | null {
    if (!this.planejamento?.client?.id) return null;
    return `${environment.apiUrl}/clients/${this.planejamento.client.id}/logo`;
  }

  formatDate(dateString: string | null | undefined): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  }

  getTotalKeyResults(): number {
    return this.objetivos.reduce((total, obj) => total + (obj.key_results?.length || 0), 0);
  }

  // ===== Toggle Expansão =====
  toggleObjetivo(objetivo: OkrObjetivo): void {
    const isExpanding = !this.expandedObjetivos.has(objetivo.id);

    if (isExpanding) {
      this.expandedObjetivos.add(objetivo.id);
      // Também expande todos os KRs filhos
      if (objetivo.key_results) {
        objetivo.key_results.forEach(kr => {
          this.expandedKeyResults.add(kr.id);
        });
      }
    } else {
      this.expandedObjetivos.delete(objetivo.id);
    }
  }

  isObjetivoExpanded(id: number): boolean {
    return this.expandedObjetivos.has(id);
  }

  toggleKeyResult(id: number): void {
    if (this.expandedKeyResults.has(id)) {
      this.expandedKeyResults.delete(id);
    } else {
      this.expandedKeyResults.add(id);
    }
  }

  isKeyResultExpanded(id: number): boolean {
    return this.expandedKeyResults.has(id);
  }

  // ===== Estado de Edição =====
  isEditingObjetivo(id: number): boolean {
    return this.editingObjetivos.has(id);
  }

  startEditingObjetivo(id: number): void {
    this.editingObjetivos.add(id);
  }

  stopEditingObjetivo(id: number): void {
    this.editingObjetivos.delete(id);
    this.markAsChanged();
  }

  isEditingKr(id: number): boolean {
    return this.editingKeyResults.has(id);
  }

  startEditingKr(id: number): void {
    this.editingKeyResults.add(id);
  }

  stopEditingKr(id: number): void {
    this.editingKeyResults.delete(id);
    this.markAsChanged();
  }

  isEditingTarefa(id: number): boolean {
    return this.editingTarefas.has(id);
  }

  startEditingTarefa(id: number): void {
    this.editingTarefas.add(id);
  }

  stopEditingTarefa(id: number): void {
    this.editingTarefas.delete(id);
    this.markAsChanged();
  }

  // ===== Menu Operations =====
  toggleMenu(type: string, id: number): void {
    const currentOpen = this.openMenus.get(type);
    // Fechar todos os menus primeiro
    this.closeAllMenus();
    // Se não estava aberto, abrir
    if (currentOpen !== id) {
      this.openMenus.set(type, id);
    }
  }

  isMenuOpen(type: string, id: number): boolean {
    return this.openMenus.get(type) === id;
  }

  closeAllMenus(): void {
    this.openMenus.set('objetivo', null);
    this.openMenus.set('kr', null);
    this.openMenus.set('tarefa', null);
  }

  // ===== CRUD Operations =====
  addObjetivo(): void {
    const tempId = this.tempIdCounter--;
    const novoObjetivo: OkrObjetivo = {
      id: tempId,
      departamento_id: this.departamento?.id || 0,
      titulo: 'Novo Objetivo',
      descricao: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      key_results: []
    };

    this.objetivos.push(novoObjetivo);
    this.expandedObjetivos.add(tempId);
    this.editingObjetivos.add(tempId);
    this.markAsChanged();
  }

  removeObjetivo(objetivo: OkrObjetivo, index: number): void {
    if (confirm('Tem certeza que deseja remover este objetivo e todos seus Key Results?')) {
      this.objetivos.splice(index, 1);
      this.expandedObjetivos.delete(objetivo.id);
      this.editingObjetivos.delete(objetivo.id);
      this.markAsChanged();
    }
  }

  addKeyResult(objetivo: OkrObjetivo): void {
    const tempId = this.tempIdCounter--;
    const novoKr: OkrKeyResult = {
      id: tempId,
      objetivo_id: objetivo.id,
      titulo: 'Novo KR',
      descricao: '',
      status: 'pendente',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      tarefas: []
    };

    if (!objetivo.key_results) {
      objetivo.key_results = [];
    }

    objetivo.key_results.push(novoKr);
    this.expandedKeyResults.add(tempId);
    this.editingKeyResults.add(tempId);
    this.markAsChanged();
  }

  removeKeyResult(objetivo: OkrObjetivo, kr: OkrKeyResult, index: number): void {
    if (confirm('Tem certeza que deseja remover este Key Result e todas suas tarefas?')) {
      objetivo.key_results?.splice(index, 1);
      this.expandedKeyResults.delete(kr.id);
      this.editingKeyResults.delete(kr.id);
      this.markAsChanged();
    }
  }

  addTarefa(kr: OkrKeyResult): void {
    const tempId = this.tempIdCounter--;
    const novaTarefa: OkrTarefa = {
      id: tempId,
      key_result_id: kr.id,
      titulo: 'Nova Tarefa',
      descricao: '',
      concluida: false,
      responsavel: '',
      data_limite: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (!kr.tarefas) {
      kr.tarefas = [];
    }

    kr.tarefas.push(novaTarefa);
    this.editingTarefas.add(tempId);
    this.markAsChanged();
  }

  removeTarefa(kr: OkrKeyResult, tarefa: OkrTarefa, index: number): void {
    if (confirm('Tem certeza que deseja remover esta tarefa?')) {
      kr.tarefas?.splice(index, 1);
      this.editingTarefas.delete(tarefa.id);
      this.markAsChanged();
    }
  }

  toggleTarefaConcluida(tarefa: OkrTarefa): void {
    tarefa.concluida = !tarefa.concluida;
    this.markAsChanged();
  }

  markAsChanged(): void {
    this.hasChanges = true;
  }

  // ===== Salvar Alterações =====
  async salvarAlteracoes(): Promise<void> {
    if (this.isSaving) return;

    this.isSaving = true;

    try {
      const response = await firstValueFrom(
        this.planejamentoService.salvarOkrDepartamentoPublico(this.token, this.objetivos)
      );

      if (response.success) {
        this.toastr.success('OKRs salvos com sucesso!', 'Sucesso');
        this.hasChanges = false;
        // Recarregar para obter IDs atualizados
        await this.loadOkr();
      } else {
        this.toastr.error(response.message || 'Erro ao salvar OKRs', 'Erro');
      }
    } catch (err: any) {
      console.error('Erro ao salvar OKRs:', err);
      this.toastr.error(err.error?.message || 'Erro ao salvar OKRs', 'Erro');
    } finally {
      this.isSaving = false;
    }
  }

  // ===== Helpers =====
  getStatusLabel(status: string): string {
    switch (status) {
      case 'pendente': return 'Pendente';
      case 'em_progresso': return 'Em Progresso';
      case 'concluido': return 'Concluído';
      case 'cancelado': return 'Cancelado';
      default: return status;
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'pendente': return 'status-pendente';
      case 'em_progresso': return 'status-em-progresso';
      case 'concluido': return 'status-concluido';
      case 'cancelado': return 'status-cancelado';
      default: return '';
    }
  }

  getCurrentYear(): number {
    return new Date().getFullYear();
  }
}
