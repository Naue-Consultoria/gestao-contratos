import { Component, OnInit, AfterViewInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';
import {
  PlanejamentoEstrategicoService,
  PlanejamentoEstrategico,
  MatrizSwotFinal,
  MatrizSwotCruzamento
} from '../../services/planejamento-estrategico.service';
import { AuthService } from '../../services/auth';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);

interface ItemAnalise {
  texto: string;
  fraqueza: number;
  forca: number;
  percentual: number;
}

interface AnaliseQuadrante {
  items: ItemAnalise[];
  somaFraqueza: number;
  somaForca: number;
}

@Component({
  selector: 'app-analise-cenarios',
  standalone: true,
  imports: [
    CommonModule,
    BreadcrumbComponent
  ],
  templateUrl: './analise-cenarios.html',
  styleUrls: ['./analise-cenarios.css'],
})
export class AnaliseCenariosComponent implements OnInit, AfterViewInit {

  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private planejamentoService = inject(PlanejamentoEstrategicoService);
  public authService = inject(AuthService);
  private toastr = inject(ToastrService);

  planejamentoId: number | null = null;
  planejamento: PlanejamentoEstrategico | null = null;
  matrizFinal: MatrizSwotFinal | null = null;
  matrizCruzamento: MatrizSwotCruzamento | null = null;

  isLoading = true;
  error = '';

  // Itens da matriz SWOT consolidada
  oportunidades: string[] = [];
  ameacas: string[] = [];

  // Análises calculadas
  analiseOportunidades: AnaliseQuadrante | null = null;
  analiseAmeacas: AnaliseQuadrante | null = null;

  // Gráficos
  chartOportunidades: Chart | null = null;
  chartAmeacas: Chart | null = null;

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

        // Carregar matriz SWOT final
        await this.loadMatrizFinal();

        // Carregar matriz de cruzamento
        await this.loadMatrizCruzamento();

        // Extrair itens e calcular análise
        this.extrairItensDaMatrizFinal();
        this.calcularAnalises();

        // Criar gráficos após calcular análises
        setTimeout(() => {
          this.criarGraficos();
        }, 100);
      }
    } catch (err: any) {
      console.error('Erro ao carregar dados:', err);
      this.error = 'Não foi possível carregar os dados.';
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

  extrairItensDaMatrizFinal(): void {
    if (!this.matrizFinal) {
      this.oportunidades = [];
      this.ameacas = [];
      return;
    }

    const extrairItens = (texto: string | null | undefined): string[] => {
      if (!texto || !texto.trim()) return [];
      return texto.split('\n').filter(item => item.trim() !== '');
    };

    this.oportunidades = extrairItens(this.matrizFinal.oportunidades);
    this.ameacas = extrairItens(this.matrizFinal.ameacas);
  }

  calcularAnalises(): void {
    if (!this.matrizCruzamento) return;

    // Análise de Oportunidades
    this.analiseOportunidades = this.calcularAnaliseQuadrante(
      this.oportunidades,
      this.matrizCruzamento.restricoes || [], // Fraqueza
      this.matrizCruzamento.alavancas || []   // Força
    );

    // Análise de Ameaças
    this.analiseAmeacas = this.calcularAnaliseQuadrante(
      this.ameacas,
      this.matrizCruzamento.problemas || [], // Fraqueza
      this.matrizCruzamento.defesas || []    // Força
    );
  }

  calcularAnaliseQuadrante(items: string[], gridFraqueza: number[][], gridForca: number[][]): AnaliseQuadrante {
    const itemsAnalise: ItemAnalise[] = [];
    let somaFraqueza = 0;
    let somaForca = 0;

    items.forEach((texto, index) => {
      // Somar valores da linha correspondente
      const fraqueza = gridFraqueza[index] ? gridFraqueza[index].reduce((acc, val) => acc + val, 0) : 0;
      const forca = gridForca[index] ? gridForca[index].reduce((acc, val) => acc + val, 0) : 0;

      somaFraqueza += fraqueza;
      somaForca += forca;

      itemsAnalise.push({
        texto,
        fraqueza,
        forca,
        percentual: 0 // Será calculado depois
      });
    });

    // Calcular percentuais
    const total = somaFraqueza + somaForca;
    if (total > 0) {
      itemsAnalise.forEach(item => {
        const somaItem = item.fraqueza + item.forca;
        item.percentual = Math.round((somaItem / total) * 100);
      });
    }

    return {
      items: itemsAnalise,
      somaFraqueza,
      somaForca
    };
  }

  getClientName(): string {
    if (!this.planejamento?.client) return 'N/A';

    const client = this.planejamento.client;

    // Para PJ - Priorizar nome fantasia (trade_name)
    if (client.clients_pj) {
      if (Array.isArray(client.clients_pj) && client.clients_pj.length > 0) {
        return client.clients_pj[0].trade_name || client.clients_pj[0].company_name || 'N/A';
      } else if (typeof client.clients_pj === 'object') {
        return client.clients_pj.trade_name || client.clients_pj.company_name || 'N/A';
      }
    }

    // Para PF - Nome completo
    if (client.clients_pf) {
      if (Array.isArray(client.clients_pf) && client.clients_pf.length > 0) {
        return client.clients_pf[0].full_name || 'N/A';
      } else if (typeof client.clients_pf === 'object') {
        return client.clients_pf.full_name || 'N/A';
      }
    }

    // Fallbacks diretos
    if (client.trade_name) return client.trade_name;
    if (client.company_name) return client.company_name;
    if (client.full_name) return client.full_name;
    if (client.name) return client.name;

    return 'N/A';
  }

  voltarParaDefinicaoImpacto(): void {
    if (this.planejamentoId) {
      this.router.navigate(['/home/planejamento-estrategico/swot-cruzamento', this.planejamentoId]);
    }
  }

  voltarParaPlanejamento(): void {
    if (this.planejamentoId) {
      this.router.navigate(['/home/planejamento-estrategico/visualizar', this.planejamentoId]);
    }
  }

  ngAfterViewInit(): void {
    // Criar gráficos após a view estar pronta
    if (this.analiseOportunidades && this.analiseAmeacas) {
      setTimeout(() => {
        this.criarGraficos();
      }, 100);
    }
  }

  criarGraficos(): void {
    this.criarGraficoOportunidades();
    this.criarGraficoAmeacas();
  }

  criarGraficoOportunidades(): void {
    const canvas = document.getElementById('chartOportunidades') as HTMLCanvasElement;
    if (!canvas || !this.analiseOportunidades) return;

    // Destruir gráfico anterior se existir
    if (this.chartOportunidades) {
      this.chartOportunidades.destroy();
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Preparar dados para bubble chart
    const bubbleData = this.analiseOportunidades.items.map((item, index) => ({
      x: item.fraqueza,
      y: item.forca,
      r: Math.max(15, item.percentual * 0.8), // Raio proporcional ao percentual (min 15px)
      label: `${index + 1}`,
      texto: item.texto,
      percentual: item.percentual
    }));

    // Calcular ranges dinâmicos
    const valoresX = bubbleData.map(d => d.x);
    const valoresY = bubbleData.map(d => d.y);
    const minX = Math.min(...valoresX);
    const maxX = Math.max(...valoresX);
    const minY = Math.min(...valoresY);
    const maxY = Math.max(...valoresY);
    const paddingX = (maxX - minX) * 0.2 || 20;
    const paddingY = (maxY - minY) * 0.2 || 20;

    const config: ChartConfiguration = {
      type: 'bubble',
      data: {
        datasets: [{
          label: 'Oportunidades',
          data: bubbleData,
          backgroundColor: 'rgba(59, 130, 246, 0.7)',
          borderColor: '#3b82f6',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
          x: {
            title: {
              display: true,
              text: 'Impacto FRAQUEZAS',
              font: {
                size: 14,
                weight: 'bold'
              }
            },
            min: Math.max(0, minX - paddingX),
            max: maxX + paddingX,
            grid: {
              color: '#e5e7eb'
            }
          },
          y: {
            title: {
              display: true,
              text: 'Impacto FORÇAS',
              font: {
                size: 14,
                weight: 'bold'
              }
            },
            min: Math.max(0, minY - paddingY),
            max: maxY + paddingY,
            grid: {
              color: '#e5e7eb'
            }
          }
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: (context: any) => {
                const dataPoint = context.raw;
                return [
                  `Item ${dataPoint.label}`,
                  `Fraqueza: ${dataPoint.x}`,
                  `Força: ${dataPoint.y}`,
                  `Percentual: ${dataPoint.percentual}%`
                ];
              }
            }
          }
        }
      },
      plugins: [{
        id: 'bubbleLabels',
        afterDatasetDraw: (chart) => {
          const ctx = chart.ctx;
          const meta = chart.getDatasetMeta(0);
          meta.data.forEach((element: any, index) => {
            const dataPoint = bubbleData[index];
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(dataPoint.label, element.x, element.y);
          });
        }
      }]
    };

    this.chartOportunidades = new Chart(ctx, config);
  }

  criarGraficoAmeacas(): void {
    const canvas = document.getElementById('chartAmeacas') as HTMLCanvasElement;
    if (!canvas || !this.analiseAmeacas) return;

    // Destruir gráfico anterior se existir
    if (this.chartAmeacas) {
      this.chartAmeacas.destroy();
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Preparar dados para bubble chart
    const bubbleData = this.analiseAmeacas.items.map((item, index) => ({
      x: item.fraqueza,
      y: item.forca,
      r: Math.max(15, item.percentual * 0.8), // Raio proporcional ao percentual (min 15px)
      label: `${index + 1}`,
      texto: item.texto,
      percentual: item.percentual
    }));

    // Calcular ranges dinâmicos
    const valoresX = bubbleData.map(d => d.x);
    const valoresY = bubbleData.map(d => d.y);
    const minX = Math.min(...valoresX);
    const maxX = Math.max(...valoresX);
    const minY = Math.min(...valoresY);
    const maxY = Math.max(...valoresY);
    const paddingX = (maxX - minX) * 0.2 || 20;
    const paddingY = (maxY - minY) * 0.2 || 20;

    const config: ChartConfiguration = {
      type: 'bubble',
      data: {
        datasets: [{
          label: 'Ameaças',
          data: bubbleData,
          backgroundColor: 'rgba(239, 68, 68, 0.7)',
          borderColor: '#ef4444',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
          x: {
            title: {
              display: true,
              text: 'Impacto FRAQUEZAS',
              font: {
                size: 14,
                weight: 'bold'
              }
            },
            min: Math.max(0, minX - paddingX),
            max: maxX + paddingX,
            grid: {
              color: '#e5e7eb'
            }
          },
          y: {
            title: {
              display: true,
              text: 'Impacto FORÇAS',
              font: {
                size: 14,
                weight: 'bold'
              }
            },
            min: Math.max(0, minY - paddingY),
            max: maxY + paddingY,
            grid: {
              color: '#e5e7eb'
            }
          }
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: (context: any) => {
                const dataPoint = context.raw;
                return [
                  `Item ${dataPoint.label}`,
                  `Fraqueza: ${dataPoint.x}`,
                  `Força: ${dataPoint.y}`,
                  `Percentual: ${dataPoint.percentual}%`
                ];
              }
            }
          }
        }
      },
      plugins: [{
        id: 'bubbleLabels',
        afterDatasetDraw: (chart) => {
          const ctx = chart.ctx;
          const meta = chart.getDatasetMeta(0);
          meta.data.forEach((element: any, index) => {
            const dataPoint = bubbleData[index];
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(dataPoint.label, element.x, element.y);
          });
        }
      }]
    };

    this.chartAmeacas = new Chart(ctx, config);
  }
}

