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

@Component({
  selector: 'app-analise-ameacas',
  standalone: true,
  imports: [
    CommonModule,
    BreadcrumbComponent
  ],
  templateUrl: './analise-ameacas.html',
  styleUrls: ['./analise-ameacas.css'],
})
export class AnaliseAmeacasComponent implements OnInit, AfterViewInit {

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

  ameacas: string[] = [];
  fraquezas: string[] = [];
  forcas: string[] = [];
  analiseItems: ItemAnalise[] = [];
  somaFraqueza = 0;
  somaForca = 0;
  chartFraquezas: Chart | null = null;
  chartForcas: Chart | null = null;
  chartsIndividuaisFraquezas: Chart[] = [];
  chartsIndividuaisForcas: Chart[] = [];

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
      const planejamentoResponse = await firstValueFrom(
        this.planejamentoService.obterPlanejamento(this.planejamentoId)
      );

      if (planejamentoResponse.success && planejamentoResponse.data) {
        this.planejamento = planejamentoResponse.data;
        await this.loadMatrizFinal();
        await this.loadMatrizCruzamento();
        this.extrairItensDaMatrizFinal();
        this.calcularAnalise();

        setTimeout(() => {
          this.criarGrafico();
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
      this.ameacas = [];
      this.fraquezas = [];
      this.forcas = [];
      return;
    }

    const extrairItens = (texto: string | null | undefined): string[] => {
      if (!texto || !texto.trim()) return [];
      return texto.split('\n').filter(item => item.trim() !== '');
    };

    this.ameacas = extrairItens(this.matrizFinal.ameacas);
    this.fraquezas = extrairItens(this.matrizFinal.fraquezas);
    this.forcas = extrairItens(this.matrizFinal.forcas);
  }

  calcularAnalise(): void {
    if (!this.matrizCruzamento) return;

    const gridFraqueza = this.matrizCruzamento.problemas || [];
    const gridForca = this.matrizCruzamento.defesas || [];

    this.analiseItems = [];
    this.somaFraqueza = 0;
    this.somaForca = 0;

    this.ameacas.forEach((texto, index) => {
      const fraqueza = gridFraqueza[index] ? gridFraqueza[index].reduce((acc, val) => acc + val, 0) : 0;
      const forca = gridForca[index] ? gridForca[index].reduce((acc, val) => acc + val, 0) : 0;

      this.somaFraqueza += fraqueza;
      this.somaForca += forca;

      this.analiseItems.push({
        texto,
        fraqueza,
        forca,
        percentual: 0
      });
    });

    const total = this.somaFraqueza + this.somaForca;
    if (total > 0) {
      this.analiseItems.forEach(item => {
        const somaItem = item.fraqueza + item.forca;
        item.percentual = parseFloat(((somaItem / total) * 100).toFixed(1));
      });
    }
  }

  ngAfterViewInit(): void {
    if (this.analiseItems.length > 0) {
      setTimeout(() => {
        this.criarGrafico();
      }, 100);
    }
  }

  criarGrafico(): void {
    this.criarGraficoFraquezas();
    this.criarGraficoForcas();
    this.criarGraficosIndividuais();
  }

  criarGraficosIndividuais(): void {
    this.ameacas.forEach((ameaca, index) => {
      this.criarGraficoIndividualFraquezas(index);
      this.criarGraficoIndividualForcas(index);
    });
  }

  criarGraficoIndividualFraquezas(ameacaIndex: number): void {
    const canvas = document.getElementById(`chartFraqueza${ameacaIndex}`) as HTMLCanvasElement;
    if (!canvas || !this.matrizCruzamento) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const problemas = this.matrizCruzamento.problemas || [];
    const valores = problemas[ameacaIndex] || [];
    const total = valores.reduce((acc, val) => acc + val, 0);

    const config: ChartConfiguration = {
      type: 'pie',
      data: {
        labels: this.fraquezas,
        datasets: [{
          data: valores,
          backgroundColor: [
            '#ef4444', '#f97316', '#f59e0b', '#eab308', '#fbbf24',
            '#fde047', '#facc15', '#fcd34d', '#fde68a', '#fef3c7'
          ],
          borderColor: '#ffffff',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: {
            bottom: 5
          }
        },
        plugins: {
          legend: {
            position: 'bottom',
            onClick: () => {},
            labels: {
              font: { size: 9 },
              padding: 6,
              usePointStyle: true,
              boxWidth: 6
            }
          },
          tooltip: {
            callbacks: {
              label: (context: any) => {
                const valor = context.parsed;
                const percentual = total > 0 ? parseFloat(((valor / total) * 100).toFixed(1)) : 0;
                return ` ${valor} (${percentual}%)`;
              }
            }
          }
        }
      },
      plugins: [{
        id: 'pieLabelsIndividual',
        afterDatasetDraw: (chart) => {
          const ctx = chart.ctx;
          const meta = chart.getDatasetMeta(0);
          meta.data.forEach((element: any, index) => {
            const valor = valores[index];
            const percentual = total > 0 ? Math.round((valor / total) * 100) : 0;
            if (percentual > 5) {
              ctx.fillStyle = '#ffffff';
              ctx.font = 'bold 10px Arial';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              const position = element.tooltipPosition();
              ctx.fillText(`${percentual}%`, position.x, position.y);
            }
          });
        }
      }]
    };

    const chart = new Chart(ctx, config);
    this.chartsIndividuaisFraquezas.push(chart);
  }

  criarGraficoIndividualForcas(ameacaIndex: number): void {
    const canvas = document.getElementById(`chartForca${ameacaIndex}`) as HTMLCanvasElement;
    if (!canvas || !this.matrizCruzamento) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const defesas = this.matrizCruzamento.defesas || [];
    const valores = defesas[ameacaIndex] || [];
    const total = valores.reduce((acc, val) => acc + val, 0);

    const config: ChartConfiguration = {
      type: 'pie',
      data: {
        labels: this.forcas,
        datasets: [{
          data: valores,
          backgroundColor: [
            '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6',
            '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'
          ],
          borderColor: '#ffffff',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: {
            bottom: 5
          }
        },
        plugins: {
          legend: {
            position: 'bottom',
            onClick: () => {},
            labels: {
              font: { size: 9 },
              padding: 6,
              usePointStyle: true,
              boxWidth: 6
            }
          },
          tooltip: {
            callbacks: {
              label: (context: any) => {
                const valor = context.parsed;
                const percentual = total > 0 ? parseFloat(((valor / total) * 100).toFixed(1)) : 0;
                return ` ${valor} (${percentual}%)`;
              }
            }
          }
        }
      },
      plugins: [{
        id: 'pieLabelsIndividual',
        afterDatasetDraw: (chart) => {
          const ctx = chart.ctx;
          const meta = chart.getDatasetMeta(0);
          meta.data.forEach((element: any, index) => {
            const valor = valores[index];
            const percentual = total > 0 ? Math.round((valor / total) * 100) : 0;
            if (percentual > 5) {
              ctx.fillStyle = '#ffffff';
              ctx.font = 'bold 10px Arial';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              const position = element.tooltipPosition();
              ctx.fillText(`${percentual}%`, position.x, position.y);
            }
          });
        }
      }]
    };

    const chart = new Chart(ctx, config);
    this.chartsIndividuaisForcas.push(chart);
  }

  criarGraficoFraquezas(): void {
    const canvas = document.getElementById('chartFraquezas') as HTMLCanvasElement;
    if (!canvas || this.analiseItems.length === 0) return;

    if (this.chartFraquezas) {
      this.chartFraquezas.destroy();
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const config: ChartConfiguration = {
      type: 'pie',
      data: {
        labels: this.analiseItems.map((item, i) => `${i + 1}. ${item.texto}`),
        datasets: [{
          data: this.analiseItems.map(item => item.fraqueza),
          backgroundColor: [
            '#ef4444',
            '#f97316',
            '#f59e0b',
            '#eab308',
            '#fbbf24',
            '#fde047',
            '#facc15',
            '#fcd34d',
            '#fde68a',
            '#fef3c7'
          ],
          borderColor: '#ffffff',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: {
            bottom: 10
          }
        },
        plugins: {
          legend: {
            position: 'bottom',
            align: 'start',
            onClick: () => {},
            labels: {
              font: { size: 10 },
              padding: 6,
              usePointStyle: true,
              boxWidth: 8
            }
          },
          tooltip: {
            callbacks: {
              label: (context: any) => {
                const valor = context.parsed;
                const percentual = this.somaFraqueza > 0 ? parseFloat(((valor / this.somaFraqueza) * 100).toFixed(1)) : 0;
                return ` ${valor} (${percentual}%)`;
              }
            }
          }
        }
      },
      plugins: [{
        id: 'pieLabels',
        afterDatasetDraw: (chart) => {
          const ctx = chart.ctx;
          const meta = chart.getDatasetMeta(0);
          meta.data.forEach((element: any, index) => {
            const valor = this.analiseItems[index].fraqueza;
            const percentual = this.somaFraqueza > 0 ? Math.round((valor / this.somaFraqueza) * 100) : 0;
            if (percentual > 5) {
              ctx.fillStyle = '#ffffff';
              ctx.font = 'bold 12px Arial';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              const position = element.tooltipPosition();
              ctx.fillText(`${percentual}%`, position.x, position.y);
            }
          });
        }
      }]
    };

    this.chartFraquezas = new Chart(ctx, config);
  }

  criarGraficoForcas(): void {
    const canvas = document.getElementById('chartForcas') as HTMLCanvasElement;
    if (!canvas || this.analiseItems.length === 0) return;

    if (this.chartForcas) {
      this.chartForcas.destroy();
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const config: ChartConfiguration = {
      type: 'pie',
      data: {
        labels: this.analiseItems.map((item, i) => `${i + 1}. ${item.texto}`),
        datasets: [{
          data: this.analiseItems.map(item => item.forca),
          backgroundColor: [
            '#10b981',
            '#14b8a6',
            '#06b6d4',
            '#0ea5e9',
            '#3b82f6',
            '#6366f1',
            '#8b5cf6',
            '#a855f7',
            '#d946ef',
            '#ec4899'
          ],
          borderColor: '#ffffff',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: {
            bottom: 10
          }
        },
        plugins: {
          legend: {
            position: 'bottom',
            align: 'start',
            onClick: () => {},
            labels: {
              font: { size: 10 },
              padding: 6,
              usePointStyle: true,
              boxWidth: 8
            }
          },
          tooltip: {
            callbacks: {
              label: (context: any) => {
                const valor = context.parsed;
                const percentual = this.somaForca > 0 ? parseFloat(((valor / this.somaForca) * 100).toFixed(1)) : 0;
                return ` ${valor} (${percentual}%)`;
              }
            }
          }
        }
      },
      plugins: [{
        id: 'pieLabels',
        afterDatasetDraw: (chart) => {
          const ctx = chart.ctx;
          const meta = chart.getDatasetMeta(0);
          meta.data.forEach((element: any, index) => {
            const valor = this.analiseItems[index].forca;
            const percentual = this.somaForca > 0 ? Math.round((valor / this.somaForca) * 100) : 0;
            if (percentual > 5) {
              ctx.fillStyle = '#ffffff';
              ctx.font = 'bold 12px Arial';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              const position = element.tooltipPosition();
              ctx.fillText(`${percentual}%`, position.x, position.y);
            }
          });
        }
      }]
    };

    this.chartForcas = new Chart(ctx, config);
  }

  getClientName(): string {
    if (!this.planejamento?.client) return 'N/A';
    const client = this.planejamento.client;
    if (client.clients_pj) {
      if (Array.isArray(client.clients_pj) && client.clients_pj.length > 0) {
        return client.clients_pj[0].trade_name || client.clients_pj[0].company_name || 'N/A';
      } else if (typeof client.clients_pj === 'object') {
        return client.clients_pj.trade_name || client.clients_pj.company_name || 'N/A';
      }
    }
    if (client.clients_pf) {
      if (Array.isArray(client.clients_pf) && client.clients_pf.length > 0) {
        return client.clients_pf[0].full_name || 'N/A';
      } else if (typeof client.clients_pf === 'object') {
        return client.clients_pf.full_name || 'N/A';
      }
    }
    if (client.trade_name) return client.trade_name;
    if (client.company_name) return client.company_name;
    if (client.full_name) return client.full_name;
    if (client.name) return client.name;
    return 'N/A';
  }

  voltarParaAnaliseCenarios(): void {
    if (this.planejamentoId) {
      this.router.navigate(['/home/planejamento-estrategico/analise-cenarios', this.planejamentoId]);
    }
  }

  exportarPDF(): void {
    if (!this.planejamentoId) return;

    const url = this.planejamentoService.gerarUrlPdfAnaliseAmeacas(this.planejamentoId);
    window.open(url, '_blank');
    this.toastr.info('PDF sendo gerado...', 'Download');
  }
}
