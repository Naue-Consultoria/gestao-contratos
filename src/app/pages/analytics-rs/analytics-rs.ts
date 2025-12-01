import { Component, OnInit, AfterViewInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { Chart } from 'chart.js';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { BreadcrumbComponent } from '../../components/breadcrumb/breadcrumb.component';
import { VagaService } from '../../services/vaga.service';

interface RsMetrics {
  totalVagas: number;
  vagasAbertas: number;
  vagasFechadas: number;
  vagasCanceladas: number;
  totalCandidatos: number;
  candidatosAprovados: number;
  taxaFechamento: number;
  slaMedia: number;
  faturamentoTotal: number;
  faturamentoPrevisto: number;
}

interface VagaPorStatus {
  status: string;
  count: number;
}

interface VagaPorConsultora {
  userId: number;
  userName: string;
  totalVagas: number;
  vagasFechadas: number;
  taxaFechamento: number;
}

@Component({
  selector: 'app-analytics-rs',
  standalone: true,
  imports: [CommonModule, FormsModule, BreadcrumbComponent],
  templateUrl: './analytics-rs.html',
  styleUrls: ['./analytics-rs.css']
})
export class AnalyticsRsComponent implements OnInit, AfterViewInit, OnDestroy {
  private vagaService = inject(VagaService);
  private router = inject(Router);

  // Estado
  isLoading = true;

  // Filtros
  selectedMonth: string = '';
  selectedYear: string = '';
  availableYears: number[] = [];

  // Dados originais (sem filtro)
  private allVagas: any[] = [];

  // Dados
  metrics: RsMetrics | null = null;
  vagasPorStatus: VagaPorStatus[] = [];
  vagasPorConsultora: VagaPorConsultora[] = [];
  vagasPorTipoCargo: any[] = [];
  vagasPorFonteRecrutamento: any[] = [];

  // Charts
  private charts: { [key: string]: Chart } = {};

  ngOnInit() {
    this.loadData();
  }

  async ngAfterViewInit() {
    setTimeout(async () => {
      if (this.metrics) {
        await this.initializeCharts();
      }
    }, 100);
  }

  ngOnDestroy() {
    Object.values(this.charts).forEach(chart => {
      if (chart) chart.destroy();
    });
  }

  async loadData() {
    try {
      this.isLoading = true;

      // Buscar todas as vagas
      const response = await firstValueFrom(this.vagaService.getAll());
      this.allVagas = response.data || [];

      // Extrair anos disponíveis
      this.extractAvailableYears();

      // Aplicar filtros e calcular métricas
      this.applyFilters();

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      this.metrics = null;
    } finally {
      this.isLoading = false;
    }
  }

  private extractAvailableYears() {
    const years = new Set<number>();
    this.allVagas.forEach(vaga => {
      // Extrair anos da data de fechamento (sem conversão de timezone)
      if (vaga.data_fechamento_cancelamento) {
        const dateOnly = vaga.data_fechamento_cancelamento.split('T')[0];
        const year = parseInt(dateOnly.split('-')[0]);
        years.add(year);
      }
    });
    this.availableYears = Array.from(years).sort((a, b) => b - a);
  }

  applyFilters() {
    // Filtrar vagas baseado em mês e ano usando data de fechamento
    let filteredVagas = [...this.allVagas];

    if (this.selectedYear) {
      filteredVagas = filteredVagas.filter(vaga => {
        if (!vaga.data_fechamento_cancelamento) return false;
        // Extrair ano sem conversão de timezone
        const dateOnly = vaga.data_fechamento_cancelamento.split('T')[0];
        const year = parseInt(dateOnly.split('-')[0]);
        return year === parseInt(this.selectedYear);
      });
    }

    if (this.selectedMonth) {
      filteredVagas = filteredVagas.filter(vaga => {
        if (!vaga.data_fechamento_cancelamento) return false;
        // Extrair mês sem conversão de timezone
        const dateOnly = vaga.data_fechamento_cancelamento.split('T')[0];
        const month = parseInt(dateOnly.split('-')[1]);
        return month === parseInt(this.selectedMonth);
      });
    }

    // Calcular métricas com dados filtrados
    this.calculateMetrics(filteredVagas);
    this.calculateVagasPorStatus(filteredVagas);
    this.calculateVagasPorConsultora(filteredVagas);
    this.calculateVagasPorTipoCargo(filteredVagas);
    this.calculateVagasPorFonte(filteredVagas);

    // Reinicializar charts
    this.destroyCharts();
    setTimeout(() => this.initializeCharts(), 100);
  }

  clearFilters() {
    this.selectedMonth = '';
    this.selectedYear = '';
    this.applyFilters();
  }

  async refreshData() {
    await this.loadData();
  }

  private destroyCharts() {
    Object.values(this.charts).forEach(chart => {
      if (chart) chart.destroy();
    });
    this.charts = {};
  }

  private calculateMetrics(vagas: any[]) {
    const totalVagas = vagas.length;
    const vagasAbertas = vagas.filter(v => v.status === 'aberta').length;
    const vagasFechadas = vagas.filter(v => v.status === 'fechada' || v.status === 'fechada_rep').length;
    const vagasCanceladas = vagas.filter(v => v.status === 'cancelada_cliente').length;

    const totalCandidatos = vagas.reduce((sum, v) => sum + (v.total_candidatos || 0), 0);
    const candidatosAprovados = vagas.filter(v => v.candidato_aprovado_id).length;

    const taxaFechamento = totalVagas > 0 ? Math.round((vagasFechadas / totalVagas) * 100) : 0;

    // Calcular SLA médio para vagas fechadas
    const slaMedia = this.calculateAverageSLA(vagas.filter(v => v.status === 'fechada' || v.status === 'fechada_rep'));

    // Calcular faturamento (incluindo vagas canceladas, igual à tabela de fechamento)
    const faturamentoTotal = vagas
      .filter(v => v.status === 'fechada' || v.status === 'fechada_rep' || v.status === 'cancelada_cliente')
      .reduce((sum, v) => sum + (v.valor_faturamento || 0), 0);

    const faturamentoPrevisto = vagas
      .filter(v => v.status !== 'nao_cobrada')
      .reduce((sum, v) => sum + (v.valor_faturamento || 0), 0);

    this.metrics = {
      totalVagas,
      vagasAbertas,
      vagasFechadas,
      vagasCanceladas,
      totalCandidatos,
      candidatosAprovados,
      taxaFechamento,
      slaMedia,
      faturamentoTotal,
      faturamentoPrevisto
    };
  }

  private calculateAverageSLA(vagasFechadas: any[]): number {
    if (vagasFechadas.length === 0) return 0;

    const totalDays = vagasFechadas.reduce((sum, vaga) => {
      // Extrair apenas as datas sem timezone
      const aberturaDate = vaga.data_abertura.split('T')[0];
      const fechamentoDate = vaga.data_fechamento_cancelamento ? vaga.data_fechamento_cancelamento.split('T')[0] : new Date().toISOString().split('T')[0];

      const dataAbertura = new Date(aberturaDate + 'T00:00:00');
      const dataFechamento = new Date(fechamentoDate + 'T00:00:00');
      const diffTime = Math.abs(dataFechamento.getTime() - dataAbertura.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return sum + diffDays;
    }, 0);

    return Math.round(totalDays / vagasFechadas.length);
  }

  private calculateVagasPorStatus(vagas: any[]) {
    const statusCount: { [key: string]: number } = {};

    vagas.forEach(vaga => {
      const status = vaga.status || 'aberta';
      statusCount[status] = (statusCount[status] || 0) + 1;
    });

    this.vagasPorStatus = Object.entries(statusCount).map(([status, count]) => ({
      status,
      count
    }));
  }

  private calculateVagasPorConsultora(vagas: any[]) {
    const consultoraMap: { [key: number]: any } = {};

    vagas.forEach(vaga => {
      const userId = vaga.user_id;
      const userName = vaga.user?.name || 'Sem consultora';

      if (!consultoraMap[userId]) {
        consultoraMap[userId] = {
          userId,
          userName,
          totalVagas: 0,
          vagasFechadas: 0
        };
      }

      consultoraMap[userId].totalVagas++;
      if (vaga.status === 'fechada' || vaga.status === 'fechada_rep') {
        consultoraMap[userId].vagasFechadas++;
      }
    });

    this.vagasPorConsultora = Object.values(consultoraMap).map(c => ({
      ...c,
      taxaFechamento: c.totalVagas > 0 ? Math.round((c.vagasFechadas / c.totalVagas) * 100) : 0
    })).sort((a, b) => b.totalVagas - a.totalVagas);
  }

  private calculateVagasPorTipoCargo(vagas: any[]) {
    const tipoCount: { [key: string]: number } = {};

    vagas.forEach(vaga => {
      const tipo = vaga.tipo_cargo || 'outros';
      tipoCount[tipo] = (tipoCount[tipo] || 0) + 1;
    });

    this.vagasPorTipoCargo = Object.entries(tipoCount)
      .map(([tipo, count]) => ({ tipo, count }))
      .sort((a, b) => b.count - a.count);
  }

  private calculateVagasPorFonte(vagas: any[]) {
    const fonteCount: { [key: string]: number } = {};

    vagas.forEach(vaga => {
      const fonte = vaga.fonte_recrutamento || 'outros';
      fonteCount[fonte] = (fonteCount[fonte] || 0) + 1;
    });

    this.vagasPorFonteRecrutamento = Object.entries(fonteCount)
      .map(([fonte, count]) => ({ fonte, count }))
      .sort((a, b) => b.count - a.count);
  }

  private async initializeCharts() {
    const { Chart, registerables } = await import('chart.js');
    Chart.register(...registerables);
    (window as any).Chart = Chart;

    this.initStatusDonut();
    this.initConsultoraChart();
    this.initTipoCargoChart();
    this.initFonteRecrutamentoChart();
  }

  private initStatusDonut() {
    const canvas = document.getElementById('statusDonut') as HTMLCanvasElement;
    if (!canvas || !this.vagasPorStatus.length) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Cores variadas e distintas para cada status
    const statusColors: { [key: string]: string } = {
      'aberta': '#0A8060',           // Verde escuro
      'divulgacao_prospec': '#3b82f6', // Azul
      'entrevista_nc': '#8b5cf6',    // Roxo
      'entrevista_empresa': '#f59e0b', // Laranja
      'testes': '#06b6d4',           // Ciano
      'fechada': '#10b981',          // Verde claro
      'fechada_rep': '#14b8a6',      // Teal
      'cancelada_cliente': '#ef4444', // Vermelho
      'standby': '#10b981',          // Verde
      'nao_cobrada': '#f87171',      // Vermelho claro
      'encerramento_cont': '#9ca3af' // Cinza claro
    };

    const labels = this.vagasPorStatus.map(v => this.getStatusLabel(v.status));
    const data = this.vagasPorStatus.map(v => v.count);
    const colors = this.vagasPorStatus.map(v => statusColors[v.status] || '#0A8060');

    const Chart = (window as any).Chart;
    this.charts['statusDonut'] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 15,
              font: { size: 11 },
              color: '#6b7280'
            }
          },
          tooltip: {
            callbacks: {
              label: (context: any) => {
                const label = context.label || '';
                const value = context.parsed || 0;
                const total = data.reduce((a, b) => a + b, 0);
                const percentage = Math.round((value / total) * 100);
                return `${label}: ${value} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  }

  private initConsultoraChart() {
    const canvas = document.getElementById('consultoraChart') as HTMLCanvasElement;
    if (!canvas || !this.vagasPorConsultora.length) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const topConsultoras = this.vagasPorConsultora.slice(0, 8);
    const labels = topConsultoras.map(c => c.userName);
    const totalVagas = topConsultoras.map(c => c.totalVagas);
    const vagasFechadas = topConsultoras.map(c => c.vagasFechadas);

    const Chart = (window as any).Chart;
    this.charts['consultoraChart'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Total de Vagas',
            data: totalVagas,
            backgroundColor: '#3b82f6',
            borderRadius: 6
          },
          {
            label: 'Vagas Fechadas',
            data: vagasFechadas,
            backgroundColor: '#0A8060',
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              padding: 15,
              font: { size: 12 },
              color: '#6b7280'
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: '#6b7280',
              font: { size: 11 }
            }
          },
          y: {
            grid: { color: 'rgba(0, 0, 0, 0.05)' },
            ticks: {
              color: '#6b7280',
              stepSize: 1
            },
            beginAtZero: true
          }
        }
      }
    });
  }

  private initTipoCargoChart() {
    const canvas = document.getElementById('tipoCargoChart') as HTMLCanvasElement;
    if (!canvas || !this.vagasPorTipoCargo.length) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const labels = this.vagasPorTipoCargo.map(t => this.getTipoCargoLabel(t.tipo));
    const data = this.vagasPorTipoCargo.map(t => t.count);

    const Chart = (window as any).Chart;
    this.charts['tipoCargoChart'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Vagas',
          data,
          backgroundColor: '#0A8060',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            grid: { color: 'rgba(0, 0, 0, 0.05)' },
            ticks: { color: '#6b7280', stepSize: 1 },
            beginAtZero: true
          },
          y: {
            grid: { display: false },
            ticks: { color: '#6b7280', font: { size: 11 } }
          }
        }
      }
    });
  }

  private initFonteRecrutamentoChart() {
    const canvas = document.getElementById('fonteRecrutamentoChart') as HTMLCanvasElement;
    if (!canvas || !this.vagasPorFonteRecrutamento.length) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const labels = this.vagasPorFonteRecrutamento.map(f => this.getFonteLabel(f.fonte));
    const data = this.vagasPorFonteRecrutamento.map(f => f.count);

    // Generate green shades palette
    const greenShades = [
      '#0A8060', // Primary green
      '#0ea578', // Lighter
      '#12c98f', // Even lighter
      '#16eaa7', // Much lighter
      '#5cf3c1', // Very light
      '#88f6d0', // Pale green
      '#b4f9df'  // Very pale
    ];

    const Chart = (window as any).Chart;
    this.charts['fonteRecrutamentoChart'] = new Chart(ctx, {
      type: 'pie',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: greenShades.slice(0, data.length),
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 12,
              font: { size: 11 },
              color: '#6b7280'
            }
          }
        }
      }
    });
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'aberta': 'Aberta',
      'divulgacao_prospec': 'Divulgação/Prospecção',
      'entrevista_nc': 'Entrevista NC',
      'entrevista_empresa': 'Entrevista Empresa',
      'testes': 'Testes',
      'fechada': 'Fechada',
      'fechada_rep': 'Fechada/Reposição',
      'cancelada_cliente': 'Cancelada',
      'standby': 'Standby',
      'nao_cobrada': 'Não Cobrada',
      'encerramento_cont': 'Encerramento'
    };
    return labels[status] || status;
  }

  getTipoCargoLabel(tipo: string): string {
    const labels: { [key: string]: string } = {
      'administrativo': 'Administrativo',
      'comercial': 'Comercial',
      'estagio': 'Estágio',
      'gestao': 'Gestão',
      'operacional': 'Operacional',
      'jovem_aprendiz': 'Jovem Aprendiz'
    };
    return labels[tipo] || tipo;
  }

  getFonteLabel(fonte: string): string {
    const labels: { [key: string]: string } = {
      'catho': 'Catho',
      'email': 'E-mail',
      'indicacao': 'Indicação',
      'linkedin': 'LinkedIn',
      'whatsapp': 'WhatsApp',
      'trafego': 'Tráfego',
      'outros': 'Outros'
    };
    return labels[fonte] || fonte;
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }
}
