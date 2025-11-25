import { Component, OnInit, inject, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../../environments/environment';
import {
  PlanejamentoEstrategicoService,
  PlanejamentoEstrategico,
  Departamento,
  UpdateMatrizRequest
} from '../../services/planejamento-estrategico.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-public-planejamento-view',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './public-planejamento-view.html',
  styleUrls: ['./public-planejamento-view.css'],
})
export class PublicPlanejamentoViewComponent implements OnInit, AfterViewChecked {

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private planejamentoService = inject(PlanejamentoEstrategicoService);
  private toastr = inject(ToastrService);

  planejamento: PlanejamentoEstrategico | null = null;
  departamentos: Departamento[] = [];
  token: string = '';

  isLoading = true;
  isSaving = false;
  error = '';

  // Departamento em salvamento (para mostrar loading)
  selectedDepartamento: Departamento | null = null;

  // Cache local dos itens de cada departamento (para edição em tempo real)
  departamentosItensCache = new Map<number, {
    vulnerabilidades: string[];
    conquistas: string[];
    licoes_aprendidas: string[];
    compromissos: string[];
  }>();

  // Departamentos expandidos/colapsados
  expandedDepartamentos = new Set<number>();

  // Flag para controlar resize
  private lastResizeCheck = 0;

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.token = params['token'];
      if (this.token) {
        this.loadPlanejamento();
      }
    });
  }

  ngAfterViewChecked(): void {
    // Limitar checks para evitar loops
    const now = Date.now();
    if (now - this.lastResizeCheck < 100) return;
    this.lastResizeCheck = now;

    // Auto-resize todos os textareas visíveis após renderização
    const textareas = document.querySelectorAll('.item-textarea') as NodeListOf<HTMLTextAreaElement>;
    textareas.forEach(textarea => {
      if (textarea.scrollHeight > textarea.clientHeight) {
        this.autoResizeTextarea(textarea);
      }
    });
  }

  async loadPlanejamento(): Promise<void> {
    this.isLoading = true;
    this.error = '';

    try {
      const response = await firstValueFrom(
        this.planejamentoService.obterPlanejamentoPublico(this.token)
      );

      if (response.success && response.data) {
        this.planejamento = response.data;
        this.departamentos = response.data.departamentos || [];

        // Inicializar cache de itens para cada departamento
        this.departamentos.forEach(dep => {
          this.initializeDepartamentoCache(dep);
          // Todos os departamentos iniciam retraídos
        });
      }
    } catch (err: any) {
      console.error('Erro ao carregar planejamento:', err);
      this.error = 'Não foi possível carregar o planejamento estratégico.';
      this.toastr.error('Planejamento não encontrado', 'Erro');
    } finally {
      this.isLoading = false;
    }
  }

  getClientName(): string {
    if (!this.planejamento?.client) return 'N/A';

    const client = this.planejamento.client;

    // Tenta campos diretos primeiro
    if (client.name) return client.name;
    if (client.full_name) return client.full_name;
    if (client.trade_name) return client.trade_name;
    if (client.company_name) return client.company_name;

    // Tenta estruturas aninhadas (objeto direto, não array)
    if (client.clients_pf) {
      return client.clients_pf.full_name || 'N/A';
    }
    if (client.clients_pj) {
      return client.clients_pj.trade_name || client.clients_pj.company_name || 'N/A';
    }

    return 'N/A';
  }

  getClientLogoUrl(): string | null {
    return this.planejamento?.client?.logo_url || null;
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
    const preenchidos = this.departamentos.filter(d => this.isMatrizPreenchida(d)).length;
    return Math.round((preenchidos / this.departamentos.length) * 100);
  }

  initializeDepartamentoCache(departamento: Departamento): void {
    if (!this.departamentosItensCache.has(departamento.id)) {
      this.departamentosItensCache.set(departamento.id, {
        vulnerabilidades: this.stringToArray(departamento.matriz?.vulnerabilidades),
        conquistas: this.stringToArray(departamento.matriz?.conquistas),
        licoes_aprendidas: this.stringToArray(departamento.matriz?.licoes_aprendidas),
        compromissos: this.stringToArray(departamento.matriz?.compromissos)
      });
    }
  }

  stringToArray(text: string | null | undefined): string[] {
    if (!text || !text.trim()) return [];
    return text.split('\n').filter(item => item.trim() !== '');
  }

  arrayToString(items: string[]): string {
    return items.filter(item => item.trim() !== '').join('\n');
  }

  // Funções para gerenciar itens de cada departamento
  getDepartamentoItens(departamento: Departamento, coluna: 'vulnerabilidades' | 'conquistas' | 'licoes_aprendidas' | 'compromissos'): string[] {
    this.initializeDepartamentoCache(departamento);
    const cache = this.departamentosItensCache.get(departamento.id);
    return cache ? cache[coluna] : [];
  }

  addItemToDepartamento(departamento: Departamento, coluna: 'vulnerabilidades' | 'conquistas' | 'licoes_aprendidas' | 'compromissos'): void {
    if (this.isPrazoVencido()) return;

    this.initializeDepartamentoCache(departamento);
    const cache = this.departamentosItensCache.get(departamento.id);
    if (cache) {
      cache[coluna].push('');
    }
  }

  updateItemInDepartamento(departamento: Departamento, coluna: 'vulnerabilidades' | 'conquistas' | 'licoes_aprendidas' | 'compromissos', index: number, event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    const cache = this.departamentosItensCache.get(departamento.id);
    if (cache) {
      cache[coluna][index] = textarea.value;
    }

    // Auto-resize textarea
    this.autoResizeTextarea(textarea);
  }

  autoResizeTextarea(textarea: HTMLTextAreaElement): void {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  }

  removeItemFromDepartamento(departamento: Departamento, coluna: 'vulnerabilidades' | 'conquistas' | 'licoes_aprendidas' | 'compromissos', index: number): void {
    if (this.isPrazoVencido()) return;

    const cache = this.departamentosItensCache.get(departamento.id);
    if (cache) {
      cache[coluna].splice(index, 1);
    }
  }

  trackByIndex(index: number): number {
    return index;
  }

  // Toggle de departamento
  toggleDepartamento(depId: number): void {
    if (this.expandedDepartamentos.has(depId)) {
      this.expandedDepartamentos.delete(depId);
    } else {
      this.expandedDepartamentos.add(depId);
    }
  }

  isDepartamentoExpanded(depId: number): boolean {
    return this.expandedDepartamentos.has(depId);
  }

  async saveDepartamentoMatriz(departamento: Departamento): Promise<void> {
    if (this.isPrazoVencido()) {
      this.toastr.warning('O prazo para edição desta matriz expirou', 'Atenção');
      return;
    }

    this.selectedDepartamento = departamento;
    this.isSaving = true;

    try {
      const cache = this.departamentosItensCache.get(departamento.id);
      if (!cache) return;

      // Converter arrays para strings (compatibilidade com backend)
      const updateData: UpdateMatrizRequest = {
        vulnerabilidades: this.arrayToString(cache.vulnerabilidades),
        conquistas: this.arrayToString(cache.conquistas),
        licoes_aprendidas: this.arrayToString(cache.licoes_aprendidas),
        compromissos: this.arrayToString(cache.compromissos)
      };

      const response = await firstValueFrom(
        this.planejamentoService.atualizarMatrizPublico(
          departamento.id,
          updateData
        )
      );

      if (response.success) {
        this.toastr.success('Matriz salva com sucesso', 'Sucesso');
        this.loadPlanejamento(); // Recarregar para mostrar dados atualizados
      }
    } catch (err: any) {
      console.error('Erro ao salvar matriz:', err);
      this.toastr.error(
        err.error?.message || 'Erro ao salvar matriz',
        'Erro'
      );
    } finally {
      this.isSaving = false;
      this.selectedDepartamento = null;
    }
  }

  hasAnyMatrizPreenchida(): boolean {
    return this.departamentos.some(d => this.isMatrizPreenchida(d));
  }

  getCurrentYear(): number {
    return new Date().getFullYear();
  }

  exportarPDF(departamento: Departamento): void {
    if (!this.isMatrizPreenchida(departamento)) {
      this.toastr.warning('Esta matriz ainda não foi preenchida', 'Atenção');
      return;
    }

    const url = `${environment.apiUrl}/planejamento-estrategico/publico/matriz/${departamento.id}/pdf`;
    window.open(url, '_blank');
    this.toastr.info('PDF sendo gerado...', 'Download');
  }
}
