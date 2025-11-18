import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';
import { PlanejamentoEstrategicoService, PlanejamentoEstrategico, Grupo, MatrizSwotFinal, UpdateMatrizSwotFinalRequest } from '../../services/planejamento-estrategico.service';
import { AuthService } from '../../services/auth';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-matriz-swot-consolidado',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    BreadcrumbComponent
  ],
  templateUrl: './matriz-swot-consolidado.html',
  styleUrls: ['./matriz-swot-consolidado.css'],
})
export class MatrizSwotConsolidadoComponent implements OnInit {

  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private planejamentoService = inject(PlanejamentoEstrategicoService);
  public authService = inject(AuthService);
  private toastr = inject(ToastrService);

  planejamentoId: number | null = null;
  planejamento: PlanejamentoEstrategico | null = null;
  grupos: Grupo[] = [];

  isLoading = true;
  error = '';

  // Grupos expandidos
  expandedGrupos = new Set<number>();

  // Matriz SWOT Final
  matrizFinal: MatrizSwotFinal | null = null;
  editandoFinal = false;
  matrizFinalForm = {
    forcas: '',
    fraquezas: '',
    oportunidades: '',
    ameacas: '',
    observacoes: ''
  };

  // Cache para edição da matriz final (array de itens, máximo 5 por quadrante)
  itensCacheFinal = {
    forcas: [] as string[],
    fraquezas: [] as string[],
    oportunidades: [] as string[],
    ameacas: [] as string[]
  };

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.planejamentoId = +params['id'];
        this.loadDados();
      }
    });
  }

  async loadDados(): Promise<void> {
    if (!this.planejamentoId) return;

    this.isLoading = true;
    this.error = '';

    try {
      const response = await firstValueFrom(
        this.planejamentoService.obterPlanejamentoComSwot(this.planejamentoId)
      );

      if (response.success && response.data) {
        this.planejamento = response.data;
        this.grupos = response.data.grupos || [];

        // Expandir todos os grupos por padrão
        this.grupos.forEach(g => this.expandedGrupos.add(g.id));

        // Carregar matriz final
        await this.loadMatrizFinal();
      }
    } catch (err: any) {
      console.error('Erro ao carregar dados:', err);
      this.error = 'Não foi possível carregar os dados do planejamento.';
      this.toastr.error('Erro ao carregar dados', 'Erro');
    } finally {
      this.isLoading = false;
    }
  }

  async loadMatrizFinal(): Promise<void> {
    if (!this.planejamentoId) return;

    try {
      const response = await firstValueFrom(
        this.planejamentoService.obterMatrizSwotFinal(this.planejamentoId)
      );

      if (response.success && response.data) {
        this.matrizFinal = response.data;
      }
    } catch (err: any) {
      console.error('Erro ao carregar matriz final:', err);
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

  toggleGrupo(grupoId: number): void {
    if (this.expandedGrupos.has(grupoId)) {
      this.expandedGrupos.delete(grupoId);
    } else {
      this.expandedGrupos.add(grupoId);
    }
  }

  isGrupoExpanded(grupoId: number): boolean {
    return this.expandedGrupos.has(grupoId);
  }

  expandirTodos(): void {
    this.grupos.forEach(g => this.expandedGrupos.add(g.id));
  }

  colapsarTodos(): void {
    this.expandedGrupos.clear();
  }

  getMatrizItens(grupo: Grupo, quadrante: 'forcas' | 'fraquezas' | 'oportunidades' | 'ameacas'): string[] {
    if (!grupo.matriz_swot) return [];
    const valor = grupo.matriz_swot[quadrante];
    if (!valor || !valor.trim()) return [];
    return valor.split('\n').filter(item => item.trim() !== '');
  }

  isMatrizPreenchida(grupo: Grupo): boolean {
    return !!grupo.matriz_swot?.preenchido_em;
  }

  getProgressoPreenchimento(): number {
    if (this.grupos.length === 0) return 0;
    const preenchidos = this.grupos.filter(g => this.isMatrizPreenchida(g)).length;
    return Math.round((preenchidos / this.grupos.length) * 100);
  }

  voltarParaVisualizacao(): void {
    if (this.planejamentoId) {
      this.router.navigate(['/home/planejamento-estrategico/visualizar', this.planejamentoId]);
    }
  }

  exportarPDF(grupoId: number): void {
    const url = `${window.location.origin}/api/planejamento-estrategico/publico/matriz-swot/${grupoId}/pdf`;
    window.open(url, '_blank');
  }

  // Matriz SWOT Final
  toggleEditarFinal(): void {
    this.editandoFinal = true;
    this.matrizFinalForm = {
      forcas: this.matrizFinal?.forcas || '',
      fraquezas: this.matrizFinal?.fraquezas || '',
      oportunidades: this.matrizFinal?.oportunidades || '',
      ameacas: this.matrizFinal?.ameacas || '',
      observacoes: this.matrizFinal?.observacoes || ''
    };

    // Inicializar cache de itens da matriz final
    this.itensCacheFinal = {
      forcas: this.stringToArray(this.matrizFinal?.forcas),
      fraquezas: this.stringToArray(this.matrizFinal?.fraquezas),
      oportunidades: this.stringToArray(this.matrizFinal?.oportunidades),
      ameacas: this.stringToArray(this.matrizFinal?.ameacas)
    };
  }

  cancelarEdicaoFinal(): void {
    this.editandoFinal = false;
    this.matrizFinalForm = {
      forcas: '',
      fraquezas: '',
      oportunidades: '',
      ameacas: '',
      observacoes: ''
    };
    this.itensCacheFinal = {
      forcas: [],
      fraquezas: [],
      oportunidades: [],
      ameacas: []
    };
  }

  stringToArray(text: string | null | undefined): string[] {
    if (!text || !text.trim()) return [];
    return text.split('\n').filter(item => item.trim() !== '');
  }

  arrayToString(items: string[]): string {
    return items.filter(item => item.trim() !== '').join('\n');
  }

  // Funções para gerenciar itens da matriz final (máximo 5 por quadrante)
  getItensFinal(quadrante: 'forcas' | 'fraquezas' | 'oportunidades' | 'ameacas'): string[] {
    return this.itensCacheFinal[quadrante];
  }

  addItemFinal(quadrante: 'forcas' | 'fraquezas' | 'oportunidades' | 'ameacas'): void {
    if (this.itensCacheFinal[quadrante].length >= 5) {
      this.toastr.warning('Máximo de 5 itens por quadrante', 'Atenção');
      return;
    }
    this.itensCacheFinal[quadrante].push('');
  }

  updateItemFinal(quadrante: 'forcas' | 'fraquezas' | 'oportunidades' | 'ameacas', index: number, event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    this.itensCacheFinal[quadrante][index] = textarea.value;
    this.autoResizeTextarea(textarea);
  }

  autoResizeTextarea(textarea: HTMLTextAreaElement): void {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  }

  removeItemFinal(quadrante: 'forcas' | 'fraquezas' | 'oportunidades' | 'ameacas', index: number): void {
    this.itensCacheFinal[quadrante].splice(index, 1);
  }

  trackByIndex(index: number): number {
    return index;
  }

  async salvarMatrizFinal(): Promise<void> {
    if (!this.planejamentoId) return;

    try {
      // Converter arrays para strings (compatibilidade com backend)
      const updateData: UpdateMatrizSwotFinalRequest = {
        forcas: this.arrayToString(this.itensCacheFinal.forcas),
        fraquezas: this.arrayToString(this.itensCacheFinal.fraquezas),
        oportunidades: this.arrayToString(this.itensCacheFinal.oportunidades),
        ameacas: this.arrayToString(this.itensCacheFinal.ameacas),
        observacoes: this.matrizFinalForm.observacoes
      };

      const response = await firstValueFrom(
        this.planejamentoService.salvarMatrizSwotFinal(this.planejamentoId, updateData)
      );

      if (response.success) {
        this.toastr.success('Matriz SWOT final salva com sucesso', 'Sucesso');
        this.editandoFinal = false;
        await this.loadMatrizFinal();
      }
    } catch (err: any) {
      console.error('Erro ao salvar matriz final:', err);
      this.toastr.error('Erro ao salvar matriz final', 'Erro');
    }
  }

  getMatrizFinalItens(quadrante: 'forcas' | 'fraquezas' | 'oportunidades' | 'ameacas'): string[] {
    if (!this.matrizFinal) return [];
    const valor = this.matrizFinal[quadrante];
    if (!valor || !valor.trim()) return [];
    return valor.split('\n').filter(item => item.trim() !== '');
  }

  exportarMatrizConsolidadaPDF(): void {
    if (!this.planejamentoId) return;

    const url = this.planejamentoService.gerarUrlPdfMatrizConsolidada(this.planejamentoId);
    window.open(url, '_blank');
    this.toastr.info('PDF sendo gerado...', 'Download');
  }
}
