import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { PlanejamentoEstrategicoService } from '../../services/planejamento-estrategico.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-public-swot-consolidado',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './public-swot-consolidado.html',
  styleUrls: ['./public-swot-consolidado.css']
})
export class PublicSwotConsolidadoComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private planejamentoService = inject(PlanejamentoEstrategicoService);

  token: string | null = null;
  planejamento: any = null;
  grupos: any[] = [];
  matrizFinal: any = null;
  isLoading = true;
  isSaving = false;
  error = '';
  successMessage = '';
  currentYear = new Date().getFullYear();

  // Grupos expandidos
  expandedGrupos = new Set<number>();

  // Cache de itens editáveis (máximo 5 por quadrante)
  itensCache = {
    forcas: [] as string[],
    fraquezas: [] as string[],
    oportunidades: [] as string[],
    ameacas: [] as string[]
  };

  observacoes: string = '';

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['token']) {
        this.token = params['token'];
        this.loadDados();
      }
    });
  }

  async loadDados(): Promise<void> {
    if (!this.token) return;

    this.isLoading = true;
    this.error = '';

    try {
      const response = await firstValueFrom(
        this.planejamentoService.obterSwotConsolidadoPublico(this.token)
      );

      if (response.success && response.data) {
        this.planejamento = response.data.planejamento;
        this.grupos = response.data.grupos || [];
        this.matrizFinal = response.data.matrizFinal;

        // Inicializar cache de itens editáveis
        this.itensCache = {
          forcas: this.stringToArray(this.matrizFinal?.forcas),
          fraquezas: this.stringToArray(this.matrizFinal?.fraquezas),
          oportunidades: this.stringToArray(this.matrizFinal?.oportunidades),
          ameacas: this.stringToArray(this.matrizFinal?.ameacas)
        };

        this.observacoes = this.matrizFinal?.observacoes || '';

        // Garantir no mínimo 1 item vazio em cada quadrante
        Object.keys(this.itensCache).forEach(key => {
          const quadrante = key as keyof typeof this.itensCache;
          if (this.itensCache[quadrante].length === 0) {
            this.itensCache[quadrante].push('');
          }
        });
      }
    } catch (err: any) {
      console.error('Erro ao carregar dados:', err);
      this.error = 'Não foi possível carregar a matriz SWOT consolidada.';
    } finally {
      this.isLoading = false;
    }
  }

  getClientName(): string {
    if (!this.planejamento?.client) return 'N/A';

    const client = this.planejamento.client;

    if (client.name) return client.name;
    if (client.full_name) return client.full_name;
    if (client.company_name) return client.company_name;
    if (client.trade_name) return client.trade_name;

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

  getMatrizItens(grupo: any, quadrante: 'forcas' | 'fraquezas' | 'oportunidades' | 'ameacas'): string[] {
    if (!grupo.matriz_swot) return [];

    const valor = grupo.matriz_swot[quadrante];
    if (!valor || !valor.trim()) return [];
    const todosItens = valor.split('\n').filter((item: string) => item.trim() !== '');

    const classificacaoKey = `${quadrante}_classificacao`;
    const classificacoes = grupo.matriz_swot[classificacaoKey];

    if (!classificacoes || typeof classificacoes !== 'object') {
      return todosItens;
    }

    // Filtrar apenas itens com classificação "C" (Certeza)
    return todosItens.filter((item: string, index: number) => {
      const classificacao = classificacoes[index.toString()];
      return classificacao === 'C';
    });
  }

  isMatrizPreenchida(grupo: any): boolean {
    return !!grupo.matriz_swot?.preenchido_em;
  }

  // Gerenciar itens editáveis
  stringToArray(str: string | null | undefined): string[] {
    if (!str || !str.trim()) return [];
    return str.split('\n').filter(item => item.trim() !== '');
  }

  arrayToString(arr: string[]): string {
    return arr.filter(item => item.trim() !== '').join('\n');
  }

  getItens(quadrante: 'forcas' | 'fraquezas' | 'oportunidades' | 'ameacas'): string[] {
    return this.itensCache[quadrante];
  }

  addItem(quadrante: 'forcas' | 'fraquezas' | 'oportunidades' | 'ameacas'): void {
    if (this.itensCache[quadrante].length >= 5) {
      alert('Máximo de 5 itens por quadrante');
      return;
    }
    this.itensCache[quadrante].push('');
  }

  removeItem(quadrante: 'forcas' | 'fraquezas' | 'oportunidades' | 'ameacas', index: number): void {
    this.itensCache[quadrante].splice(index, 1);

    // Garantir que sempre tem pelo menos 1 campo vazio
    if (this.itensCache[quadrante].length === 0) {
      this.itensCache[quadrante].push('');
    }
  }

  updateItem(quadrante: 'forcas' | 'fraquezas' | 'oportunidades' | 'ameacas', index: number, event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.itensCache[quadrante][index] = target.value;
  }

  trackByIndex(index: number): number {
    return index;
  }

  async salvarMatriz(): Promise<void> {
    if (!this.token) return;

    this.isSaving = true;
    this.error = '';
    this.successMessage = '';

    try {
      const dados = {
        forcas: this.arrayToString(this.itensCache.forcas),
        fraquezas: this.arrayToString(this.itensCache.fraquezas),
        oportunidades: this.arrayToString(this.itensCache.oportunidades),
        ameacas: this.arrayToString(this.itensCache.ameacas),
        observacoes: this.observacoes
      };

      const response = await firstValueFrom(
        this.planejamentoService.salvarSwotConsolidadoPublico(this.token, dados)
      );

      if (response.success) {
        this.successMessage = 'Matriz SWOT consolidada salva com sucesso!';
        this.matrizFinal = response.data;

        // Limpar mensagem após 3 segundos
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      }
    } catch (err: any) {
      console.error('Erro ao salvar matriz:', err);
      this.error = err.error?.message || 'Erro ao salvar matriz. Tente novamente.';
    } finally {
      this.isSaving = false;
    }
  }
}
