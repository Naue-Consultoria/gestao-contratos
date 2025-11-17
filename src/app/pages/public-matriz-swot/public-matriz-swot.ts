import { Component, OnInit, inject, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../../environments/environment';
import {
  PlanejamentoEstrategicoService,
  PlanejamentoEstrategico,
  Grupo,
  UpdateMatrizSwotRequest
} from '../../services/planejamento-estrategico.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-public-matriz-swot',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './public-matriz-swot.html',
  styleUrls: ['./public-matriz-swot.css'],
})
export class PublicMatrizSwotComponent implements OnInit, AfterViewChecked {

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private planejamentoService = inject(PlanejamentoEstrategicoService);
  private toastr = inject(ToastrService);

  grupo: Grupo | null = null;
  planejamento: any = null;
  token: string = '';

  isLoading = true;
  isSaving = false;
  error = '';

  // Cache local dos itens do grupo (para edição em tempo real)
  itensCache = {
    forcas: [] as string[],
    fraquezas: [] as string[],
    oportunidades: [] as string[],
    ameacas: [] as string[]
  };

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
        this.planejamentoService.obterGrupoPublico(this.token)
      );

      if (response.success && response.data) {
        this.grupo = response.data;
        this.planejamento = response.data.planejamento;

        // Inicializar cache de itens do grupo
        this.itensCache = {
          forcas: this.stringToArray(this.grupo.matriz_swot?.forcas),
          fraquezas: this.stringToArray(this.grupo.matriz_swot?.fraquezas),
          oportunidades: this.stringToArray(this.grupo.matriz_swot?.oportunidades),
          ameacas: this.stringToArray(this.grupo.matriz_swot?.ameacas)
        };
      }
    } catch (err: any) {
      console.error('Erro ao carregar grupo:', err);
      this.error = 'Não foi possível carregar o grupo.';
      this.toastr.error('Grupo não encontrado', 'Erro');
    } finally {
      this.isLoading = false;
    }
  }

  getClientName(): string {
    if (!this.planejamento || !this.planejamento.client) return 'N/A';

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

  isMatrizSwotPreenchida(): boolean {
    return !!this.grupo?.matriz_swot?.preenchido_em;
  }

  getMatrizSwotPreenchimentoPercentage(): number {
    return this.isMatrizSwotPreenchida() ? 100 : 0;
  }

  stringToArray(text: string | null | undefined): string[] {
    if (!text || !text.trim()) return [];
    return text.split('\n').filter(item => item.trim() !== '');
  }

  arrayToString(items: string[]): string {
    return items.filter(item => item.trim() !== '').join('\n');
  }

  // Funções para gerenciar itens
  getItens(quadrante: 'forcas' | 'fraquezas' | 'oportunidades' | 'ameacas'): string[] {
    return this.itensCache[quadrante];
  }

  addItem(quadrante: 'forcas' | 'fraquezas' | 'oportunidades' | 'ameacas'): void {
    if (this.isPrazoVencido()) return;
    this.itensCache[quadrante].push('');
  }

  updateItem(quadrante: 'forcas' | 'fraquezas' | 'oportunidades' | 'ameacas', index: number, event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    this.itensCache[quadrante][index] = textarea.value;

    // Auto-resize textarea
    this.autoResizeTextarea(textarea);
  }

  autoResizeTextarea(textarea: HTMLTextAreaElement): void {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  }

  removeItem(quadrante: 'forcas' | 'fraquezas' | 'oportunidades' | 'ameacas', index: number): void {
    if (this.isPrazoVencido()) return;
    this.itensCache[quadrante].splice(index, 1);
  }

  trackByIndex(index: number): number {
    return index;
  }

  async salvarMatrizSwot(): Promise<void> {
    if (this.isPrazoVencido()) {
      this.toastr.warning('O prazo para edição desta matriz expirou', 'Atenção');
      return;
    }

    if (!this.grupo) return;

    this.isSaving = true;

    try {
      // Converter arrays para strings (compatibilidade com backend)
      const updateData: UpdateMatrizSwotRequest = {
        forcas: this.arrayToString(this.itensCache.forcas),
        fraquezas: this.arrayToString(this.itensCache.fraquezas),
        oportunidades: this.arrayToString(this.itensCache.oportunidades),
        ameacas: this.arrayToString(this.itensCache.ameacas)
      };

      const response = await firstValueFrom(
        this.planejamentoService.atualizarMatrizSwotPublico(
          this.grupo.id,
          updateData
        )
      );

      if (response.success) {
        this.toastr.success('Matriz SWOT salva com sucesso', 'Sucesso');
        this.loadPlanejamento(); // Recarregar para mostrar dados atualizados
      }
    } catch (err: any) {
      console.error('Erro ao salvar matriz SWOT:', err);
      this.toastr.error(
        err.error?.message || 'Erro ao salvar matriz SWOT',
        'Erro'
      );
    } finally {
      this.isSaving = false;
    }
  }

  getCurrentYear(): number {
    return new Date().getFullYear();
  }

  exportarPDF(): void {
    if (!this.isMatrizSwotPreenchida() || !this.grupo) {
      this.toastr.warning('Esta matriz ainda não foi preenchida', 'Atenção');
      return;
    }

    const url = `${environment.apiUrl}/planejamento-estrategico/publico/matriz-swot/${this.grupo.id}/pdf`;
    window.open(url, '_blank');
    this.toastr.info('PDF sendo gerado...', 'Download');
  }
}
