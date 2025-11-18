import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';
import {
  PlanejamentoEstrategicoService,
  PlanejamentoEstrategico,
  MatrizSwotFinal,
  MatrizSwotCruzamento,
  UpdateMatrizCruzamentoRequest
} from '../../services/planejamento-estrategico.service';
import { AuthService } from '../../services/auth';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-matriz-cruzamento-swot',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    BreadcrumbComponent
  ],
  templateUrl: './matriz-cruzamento-swot.html',
  styleUrls: ['./matriz-cruzamento-swot.css'],
})
export class MatrizCruzamentoSwotComponent implements OnInit {

  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private planejamentoService = inject(PlanejamentoEstrategicoService);
  public authService = inject(AuthService);
  private toastr = inject(ToastrService);

  planejamentoId: number | null = null;
  planejamento: PlanejamentoEstrategico | null = null;
  matrizFinal: MatrizSwotFinal | null = null;

  isLoading = true;
  isSaving = false;
  error = '';

  // Itens da matriz SWOT consolidada
  oportunidades: string[] = [];
  ameacas: string[] = [];
  forcas: string[] = [];
  fraquezas: string[] = [];

  // Matriz de Cruzamento SWOT
  matrizCruzamento: MatrizSwotCruzamento | null = null;

  // Grids de cruzamento (arrays 2D)
  alavancas: number[][] = []; // Oportunidades × Forças
  defesas: number[][] = []; // Ameaças × Forças
  restricoes: number[][] = []; // Oportunidades × Fraquezas
  problemas: number[][] = []; // Ameaças × Fraquezas

  // Opções de pontuação
  opcoesPontuacao = [0, 10, 20, 30, 40, 50];

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
      // Carregar planejamento
      const planejamentoResponse = await firstValueFrom(
        this.planejamentoService.obterPlanejamento(this.planejamentoId)
      );

      if (planejamentoResponse.success && planejamentoResponse.data) {
        this.planejamento = planejamentoResponse.data;

        // Carregar matriz SWOT final consolidada
        await this.loadMatrizFinal();

        // Extrair itens da matriz final
        this.extrairItensDaMatrizFinal();

        // Carregar matriz de cruzamento
        await this.loadMatrizCruzamento();

        // Inicializar grids se necessário
        this.inicializarGrids();
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

  extrairItensDaMatrizFinal(): void {
    if (!this.matrizFinal) {
      console.warn('⚠️ Matriz SWOT Consolidada não encontrada');
      this.oportunidades = [];
      this.ameacas = [];
      this.forcas = [];
      this.fraquezas = [];
      return;
    }

    console.log('📊 Matriz Final:', this.matrizFinal);

    const extrairItens = (texto: string | null | undefined): string[] => {
      if (!texto || !texto.trim()) return [];
      return texto.split('\n').filter(item => item.trim() !== '');
    };

    this.oportunidades = extrairItens(this.matrizFinal.oportunidades);
    this.ameacas = extrairItens(this.matrizFinal.ameacas);
    this.forcas = extrairItens(this.matrizFinal.forcas);
    this.fraquezas = extrairItens(this.matrizFinal.fraquezas);

    console.log('✅ Itens extraídos:');
    console.log('  Oportunidades:', this.oportunidades);
    console.log('  Ameaças:', this.ameacas);
    console.log('  Forças:', this.forcas);
    console.log('  Fraquezas:', this.fraquezas);
  }

  inicializarGrids(): void {
    // Se já tem dados salvos, usa-os. Senão, inicializa com zeros
    if (this.matrizCruzamento) {
      this.alavancas = this.matrizCruzamento.alavancas || [];
      this.defesas = this.matrizCruzamento.defesas || [];
      this.restricoes = this.matrizCruzamento.restricoes || [];
      this.problemas = this.matrizCruzamento.problemas || [];
    }

    // Garantir que os arrays têm o tamanho correto
    this.alavancas = this.ajustarGrid(this.alavancas, this.oportunidades.length, this.forcas.length);
    this.defesas = this.ajustarGrid(this.defesas, this.ameacas.length, this.forcas.length);
    this.restricoes = this.ajustarGrid(this.restricoes, this.oportunidades.length, this.fraquezas.length);
    this.problemas = this.ajustarGrid(this.problemas, this.ameacas.length, this.fraquezas.length);
  }

  ajustarGrid(grid: number[][], linhas: number, colunas: number): number[][] {
    const resultado: number[][] = [];

    for (let i = 0; i < linhas; i++) {
      resultado[i] = [];
      for (let j = 0; j < colunas; j++) {
        resultado[i][j] = (grid[i] && grid[i][j] !== undefined) ? grid[i][j] : 0;
      }
    }

    return resultado;
  }

  async loadMatrizCruzamento(): Promise<void> {
    if (!this.planejamentoId) return;

    try {
      const response = await firstValueFrom(
        this.planejamentoService.obterMatrizCruzamento(this.planejamentoId)
      );

      if (response.success && response.data) {
        this.matrizCruzamento = response.data;
      }
    } catch (err: any) {
      console.error('Erro ao carregar matriz de cruzamento:', err);
    }
  }

  async salvarMatrizCruzamento(): Promise<void> {
    if (!this.planejamentoId) return;

    this.isSaving = true;

    try {
      const dados: UpdateMatrizCruzamentoRequest = {
        alavancas: this.alavancas,
        defesas: this.defesas,
        restricoes: this.restricoes,
        problemas: this.problemas
      };

      const response = await firstValueFrom(
        this.planejamentoService.salvarMatrizCruzamento(this.planejamentoId, dados)
      );

      if (response.success) {
        this.toastr.success('Matriz de Cruzamento salva com sucesso', 'Sucesso');
        await this.loadMatrizCruzamento();
      }
    } catch (err: any) {
      console.error('Erro ao salvar matriz de cruzamento:', err);
      this.toastr.error('Erro ao salvar matriz de cruzamento', 'Erro');
    } finally {
      this.isSaving = false;
    }
  }

  getClientName(): string {
    if (!this.planejamento?.client) return 'N/A';

    const client = this.planejamento.client;

    if (client.name) return client.name;
    if (client.full_name) return client.full_name;
    if (client.trade_name) return client.trade_name;
    if (client.company_name) return client.company_name;

    if (client.clients_pf && client.clients_pf.length > 0) {
      return client.clients_pf[0].full_name || 'N/A';
    }
    if (client.clients_pj && client.clients_pj.length > 0) {
      return client.clients_pj[0].trade_name || client.clients_pj[0].company_name || 'N/A';
    }

    return 'N/A';
  }

  voltarParaPlanejamento(): void {
    if (this.planejamentoId) {
      this.router.navigate(['/home/planejamento-estrategico/visualizar', this.planejamentoId]);
    }
  }

  irParaMatrizConsolidada(): void {
    if (this.planejamentoId) {
      this.router.navigate(['/home/planejamento-estrategico/swot-consolidado', this.planejamentoId]);
    }
  }

  trackByIndex(index: number): number {
    return index;
  }

  validarCelula(grid: number[][], linha: number, coluna: number): void {
    const valor = grid[linha][coluna];

    // Garantir que o valor é múltiplo de 10 e está entre 0 e 50
    if (valor < 0) {
      grid[linha][coluna] = 0;
    } else if (valor > 50) {
      grid[linha][coluna] = 50;
    } else {
      // Arredondar para o múltiplo de 10 mais próximo
      grid[linha][coluna] = Math.round(valor / 10) * 10;
    }
  }
}

