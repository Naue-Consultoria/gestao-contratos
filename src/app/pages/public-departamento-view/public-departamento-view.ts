import { Component, OnInit, inject, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../../environments/environment';
import {
  PlanejamentoEstrategicoService,
  Departamento,
  UpdateMatrizRequest
} from '../../services/planejamento-estrategico.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-public-departamento-view',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './public-departamento-view.html',
  styleUrls: ['./public-departamento-view.css'],
})
export class PublicDepartamentoViewComponent implements OnInit, AfterViewChecked {

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private planejamentoService = inject(PlanejamentoEstrategicoService);
  private toastr = inject(ToastrService);

  departamento: Departamento | null = null;
  token: string = '';

  isLoading = true;
  isSaving = false;
  error = '';

  // Cache local dos itens (para edição em tempo real)
  itensCache = {
    vulnerabilidades: [] as string[],
    conquistas: [] as string[],
    licoes_aprendidas: [] as string[],
    compromissos: [] as string[]
  };

  // Flag para controlar resize
  private lastResizeCheck = 0;

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.token = params['token'];
      if (this.token) {
        this.loadDepartamento();
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

  async loadDepartamento(): Promise<void> {
    this.isLoading = true;
    this.error = '';

    try {
      const response = await firstValueFrom(
        this.planejamentoService.obterDepartamentoPublico(this.token)
      );

      if (response.success && response.data) {
        this.departamento = response.data;

        // Inicializar cache de itens
        this.initializeCache();
      }
    } catch (err: any) {
      console.error('Erro ao carregar departamento:', err);
      this.error = 'Não foi possível carregar o departamento.';
      this.toastr.error('Departamento não encontrado', 'Erro');
    } finally {
      this.isLoading = false;
    }
  }

  getClientName(): string {
    if (!this.departamento?.planejamento?.client) return 'N/A';

    const client = this.departamento.planejamento.client;

    // Tenta campos diretos primeiro
    if (client.name) return client.name;
    if (client.full_name) return client.full_name;
    if (client.trade_name) return client.trade_name;
    if (client.company_name) return client.company_name;

    // Tenta estruturas aninhadas
    if (client.clients_pf) {
      return client.clients_pf.full_name || 'N/A';
    }
    if (client.clients_pj) {
      return client.clients_pj.trade_name || client.clients_pj.company_name || 'N/A';
    }

    return 'N/A';
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
    if (!this.departamento?.planejamento?.prazo_preenchimento) return false;
    return new Date(this.departamento.planejamento.prazo_preenchimento) < new Date();
  }

  isMatrizPreenchida(): boolean {
    return !!this.departamento?.matriz?.preenchido_em;
  }

  initializeCache(): void {
    if (!this.departamento) return;

    this.itensCache = {
      vulnerabilidades: this.stringToArray(this.departamento.matriz?.vulnerabilidades),
      conquistas: this.stringToArray(this.departamento.matriz?.conquistas),
      licoes_aprendidas: this.stringToArray(this.departamento.matriz?.licoes_aprendidas),
      compromissos: this.stringToArray(this.departamento.matriz?.compromissos)
    };
  }

  stringToArray(text: string | null | undefined): string[] {
    if (!text || !text.trim()) return [];
    return text.split('\n').filter(item => item.trim() !== '');
  }

  arrayToString(items: string[]): string {
    return items.filter(item => item.trim() !== '').join('\n');
  }

  getItens(coluna: 'vulnerabilidades' | 'conquistas' | 'licoes_aprendidas' | 'compromissos'): string[] {
    return this.itensCache[coluna];
  }

  addItem(coluna: 'vulnerabilidades' | 'conquistas' | 'licoes_aprendidas' | 'compromissos'): void {
    if (this.isPrazoVencido()) return;
    this.itensCache[coluna].push('');
  }

  updateItem(coluna: 'vulnerabilidades' | 'conquistas' | 'licoes_aprendidas' | 'compromissos', index: number, event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    this.itensCache[coluna][index] = textarea.value;

    // Auto-resize textarea
    this.autoResizeTextarea(textarea);
  }

  autoResizeTextarea(textarea: HTMLTextAreaElement): void {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  }

  removeItem(coluna: 'vulnerabilidades' | 'conquistas' | 'licoes_aprendidas' | 'compromissos', index: number): void {
    if (this.isPrazoVencido()) return;
    this.itensCache[coluna].splice(index, 1);
  }

  trackByIndex(index: number): number {
    return index;
  }

  async salvarMatriz(): Promise<void> {
    if (this.isPrazoVencido()) {
      this.toastr.warning('O prazo para edição desta matriz expirou', 'Atenção');
      return;
    }

    this.isSaving = true;

    try {
      // Converter arrays para strings
      const updateData: UpdateMatrizRequest = {
        vulnerabilidades: this.arrayToString(this.itensCache.vulnerabilidades),
        conquistas: this.arrayToString(this.itensCache.conquistas),
        licoes_aprendidas: this.arrayToString(this.itensCache.licoes_aprendidas),
        compromissos: this.arrayToString(this.itensCache.compromissos)
      };

      const response = await firstValueFrom(
        this.planejamentoService.atualizarMatrizDepartamentoPublico(
          this.token,
          updateData
        )
      );

      if (response.success) {
        const nomeDepartamento = this.departamento?.nome_departamento || 'Departamento';
        this.toastr.success(
          `Matriz do departamento "${nomeDepartamento}" salva com sucesso!`,
          '✓ Salvo com Sucesso',
          { timeOut: 4000 }
        );
        this.loadDepartamento(); // Recarregar para mostrar dados atualizados
      }
    } catch (err: any) {
      console.error('Erro ao salvar matriz:', err);
      this.toastr.error(
        err.error?.message || 'Erro ao salvar matriz',
        'Erro'
      );
    } finally {
      this.isSaving = false;
    }
  }

  getCurrentYear(): number {
    return new Date().getFullYear();
  }

  getClientLogoUrl(): string | null {
    return this.departamento?.planejamento?.client?.logo_url || null;
  }

  exportarPDF(): void {
    if (!this.departamento || !this.isMatrizPreenchida()) {
      this.toastr.warning('Esta matriz ainda não foi preenchida', 'Atenção');
      return;
    }

    const url = `${environment.apiUrl}/planejamento-estrategico/publico/matriz/${this.departamento.id}/pdf`;
    window.open(url, '_blank');
    this.toastr.info('PDF sendo gerado...', 'Download');
  }
}
