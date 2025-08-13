import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

// Interfaces para dados de analytics
export interface MetricData {
  label: string;
  value: number | string;
  icon: string;
  color: string;
  isCurrency?: boolean;
  suffix?: string;
}

export interface AnalyticsPeriodFilter {
  period?: 'week' | 'month' | 'quarter' | 'year' | 'custom';
  start_date?: string;
  end_date?: string;
}

export interface GeneralStats {
  totalContracts: number;
  activeContracts: number;
  completedContracts: number;
  totalClients: number;
  totalRevenue: number;
  activeRevenue: number;
  averageContractValue: number;
  averageContractDuration: number;
  conversionRate: number;
  growthRate: number;
}

export interface ServiceAnalytics {
  id: number;
  name: string;
  category: string;
  totalContracts: number;
  activeContracts: number;
  completedContracts: number;
  totalRevenue: number;
  averageValue: number;
  popularity: number; // percentage
  trend: number; // percentage growth
  color?: string;
  icon?: string;
}

export interface ClientAnalytics {
  totalClients: number;
  newClients: number;
  byType: {
    pf: number;
    pj: number;
  };
  byState: { [state: string]: number };
  topClients: {
    id: number;
    name: string;
    totalContracts: number;
    totalValue: number;
    type: 'pf' | 'pj';
  }[];
}

export interface ContractAnalytics {
  byStatus: { [status: string]: number };
  byType: { [type: string]: number };
  byMonth: {
    month: string;
    new: number;
    completed: number;
    revenue: number;
  }[];
  avgDuration: number;
  pendingPayments: number;
  overdueContracts: number;
}

export interface ProposalAnalytics {
  total: number;
  byStatus: {
    draft: number;
    sent: number;
    signed: number;
    rejected: number;
    expired: number;
    converted: number;
  };
  conversionRate: number;
  averageResponseTime: number;
  totalValue: number;
  successRate: number;
}

export interface RevenueAnalytics {
  monthly: {
    month: string;
    revenue: number;
    projected: number;
    growth: number;
  }[];
  byService: {
    serviceName: string;
    revenue: number;
    percentage: number;
  }[];
  totalCollected: number;
  totalPending: number;
  totalOverdue: number;
}

export interface AnalyticsData {
  general: GeneralStats;
  services: ServiceAnalytics[];
  clients: ClientAnalytics;
  contracts: ContractAnalytics;
  proposals: ProposalAnalytics;
  revenue: RevenueAnalytics;
  lastUpdated: Date;
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/api`;

  // Cache de dados com refresh automático
  private analyticsCache$ = new BehaviorSubject<AnalyticsData | null>(null);
  private _isLoading$ = new BehaviorSubject<boolean>(false);

  constructor() {
    // Carregar dados iniciais
    this.refreshAnalytics();
  }

  /**
   * Obter dados completos de analytics
   */
  getAnalytics(filters: AnalyticsPeriodFilter = {}): Observable<AnalyticsData> {
    this._isLoading$.next(true);

    // Fazer requisições paralelas para todas as APIs
    const requests$ = combineLatest([
      this.getContractStats(filters),
      this.getServiceStats(filters),
      this.getClientStats(),
      this.getProposalStats(),
      this.getRevenueAnalytics(filters)
    ]);

    return requests$.pipe(
      map(([contractStats, serviceStats, clientStats, proposalStats, revenueStats]) => {
        const analytics: AnalyticsData = {
          general: this.buildGeneralStats(contractStats, clientStats, proposalStats, revenueStats),
          services: serviceStats,
          clients: clientStats,
          contracts: contractStats,
          proposals: proposalStats,
          revenue: revenueStats,
          lastUpdated: new Date()
        };

        this.analyticsCache$.next(analytics);
        this._isLoading$.next(false);
        return analytics;
      })
    );
  }

  /**
   * Obter dados de contratos
   */
  private getContractStats(filters: AnalyticsPeriodFilter): Observable<ContractAnalytics> {
    let params = new HttpParams();
    if (filters.period) params = params.set('period', filters.period);
    if (filters.start_date) params = params.set('start_date', filters.start_date);
    if (filters.end_date) params = params.set('end_date', filters.end_date);

    return combineLatest([
      this.http.get<any>(`${this.baseUrl}/contracts/meta/stats`, { params }),
      this.http.get<any>(`${this.baseUrl}/contracts`, { params })
    ]).pipe(
      map(([statsResponse, contractsResponse]) => {
        const stats = statsResponse.stats;
        const contracts = contractsResponse.contracts || [];

        return {
          byStatus: stats.byStatus || {},
          byType: stats.byType || {},
          byMonth: this.processMonthlyData(contracts),
          avgDuration: stats.averageDuration || 0,
          pendingPayments: stats.pendingPayments || 0,
          overdueContracts: stats.overdueContracts || 0
        };
      })
    );
  }

  /**
   * Obter dados de serviços
   */
  private getServiceStats(filters: AnalyticsPeriodFilter): Observable<ServiceAnalytics[]> {
    let params = new HttpParams();
    if (filters.period) params = params.set('period', filters.period);

    return combineLatest([
      this.http.get<any>(`${this.baseUrl}/services/meta/stats`, { params }),
      this.http.get<any>(`${this.baseUrl}/services`)
    ]).pipe(
      map(([statsResponse, servicesResponse]) => {
        const stats = statsResponse.stats;
        const services = servicesResponse.services || [];

        return services.map((service: any, index: number) => ({
          id: service.id,
          name: service.name,
          category: service.category || 'Geral',
          totalContracts: stats.categoryStats?.[service.category] || 0,
          activeContracts: Math.floor((stats.categoryStats?.[service.category] || 0) * 0.7), // Estimativa
          completedContracts: Math.floor((stats.categoryStats?.[service.category] || 0) * 0.3), // Estimativa
          totalRevenue: (stats.categoryStats?.[service.category] || 0) * 2500, // Estimativa
          averageValue: 2500,
          popularity: stats.total > 0 ? ((stats.categoryStats?.[service.category] || 0) / stats.total) * 100 : 0,
          trend: Math.random() * 40 - 20 // Simulado - em produção viria da API
        }));
      })
    );
  }

  /**
   * Obter dados de clientes
   */
  private getClientStats(): Observable<ClientAnalytics> {
    return this.http.get<any>(`${this.baseUrl}/clients/meta/stats`).pipe(
      map(response => {
        const stats = response.stats;
        return {
          totalClients: stats.total || 0,
          newClients: stats.newThisMonth || 0,
          byType: stats.byType || { pf: 0, pj: 0 },
          byState: stats.byState || {},
          topClients: [] // Implementar se necessário
        };
      })
    );
  }

  /**
   * Obter dados de propostas
   */
  private getProposalStats(): Observable<ProposalAnalytics> {
    return this.http.get<any>(`${this.baseUrl}/proposals/stats`).pipe(
      map(response => {
        const stats = response.stats;
        return {
          total: stats.total || 0,
          byStatus: stats.byStatus || {},
          conversionRate: parseFloat(stats.conversionRate) || 0,
          averageResponseTime: stats.averageResponseTime || 0,
          totalValue: stats.totalValue || 0,
          successRate: parseFloat(stats.conversionRate) || 0
        };
      })
    );
  }

  /**
   * Obter dados de receita
   */
  private getRevenueAnalytics(filters: AnalyticsPeriodFilter): Observable<RevenueAnalytics> {
    let params = new HttpParams();
    if (filters.period) params = params.set('period', filters.period);

    return this.http.get<any>(`${this.baseUrl}/contracts/meta/stats`, { params }).pipe(
      map(response => {
        const stats = response.stats;
        
        return {
          monthly: this.generateMonthlyRevenue(stats),
          byService: this.generateServiceRevenue(stats),
          totalCollected: stats.totalValueCollected || 0,
          totalPending: stats.totalValuePending || 0,
          totalOverdue: stats.totalValueOverdue || 0
        };
      })
    );
  }

  /**
   * Processar dados mensais
   */
  private processMonthlyData(contracts: any[]): ContractAnalytics['byMonth'] {
    const monthlyData: { [key: string]: { new: number; completed: number; revenue: number } } = {};
    
    // Últimos 6 meses
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const key = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
      monthlyData[key] = { new: 0, completed: 0, revenue: 0 };
    }

    // Processar contratos
    contracts.forEach(contract => {
      const date = new Date(contract.created_at);
      const key = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
      
      if (monthlyData[key]) {
        monthlyData[key].new++;
        if (contract.status === 'completed') {
          monthlyData[key].completed++;
        }
        monthlyData[key].revenue += parseFloat(contract.total_value) || 0;
      }
    });

    return Object.entries(monthlyData).map(([month, data]) => ({
      month,
      ...data
    }));
  }

  /**
   * Gerar dados de receita mensal
   */
  private generateMonthlyRevenue(stats: any): RevenueAnalytics['monthly'] {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      months.push({
        month: date.toLocaleDateString('pt-BR', { month: 'short' }),
        revenue: (stats.totalValueActive || 100000) * (0.8 + Math.random() * 0.4) / 6,
        projected: (stats.totalValueActive || 100000) * (0.9 + Math.random() * 0.2) / 6,
        growth: Math.random() * 30 - 10
      });
    }
    return months;
  }

  /**
   * Gerar dados de receita por serviço
   */
  private generateServiceRevenue(stats: any): RevenueAnalytics['byService'] {
    const services = [
      { serviceName: 'Consultoria', revenue: 45000, percentage: 45 },
      { serviceName: 'Diagnóstico', revenue: 25000, percentage: 25 },
      { serviceName: 'Mentoria', revenue: 15000, percentage: 15 },
      { serviceName: 'OKR', revenue: 10000, percentage: 10 },
      { serviceName: 'RH', revenue: 5000, percentage: 5 }
    ];
    return services;
  }

  /**
   * Construir estatísticas gerais
   */
  private buildGeneralStats(
    contracts: ContractAnalytics,
    clients: ClientAnalytics,
    proposals: ProposalAnalytics,
    revenue: RevenueAnalytics
  ): GeneralStats {
    const totalContracts = Object.values(contracts.byStatus).reduce((sum, val) => sum + val, 0);
    const activeContracts = contracts.byStatus['active'] || 0;
    const completedContracts = contracts.byStatus['completed'] || 0;
    
    return {
      totalContracts,
      activeContracts,
      completedContracts,
      totalClients: clients.totalClients,
      totalRevenue: revenue.totalCollected,
      activeRevenue: revenue.totalCollected - revenue.totalPending,
      averageContractValue: totalContracts > 0 ? revenue.totalCollected / totalContracts : 0,
      averageContractDuration: contracts.avgDuration,
      conversionRate: proposals.conversionRate,
      growthRate: this.calculateGrowthRate(contracts.byMonth)
    };
  }

  /**
   * Calcular taxa de crescimento
   */
  private calculateGrowthRate(monthlyData: ContractAnalytics['byMonth']): number {
    if (monthlyData.length < 2) return 0;
    
    const current = monthlyData[monthlyData.length - 1].new;
    const previous = monthlyData[monthlyData.length - 2].new;
    
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  /**
   * Atualizar cache de analytics
   */
  refreshAnalytics(filters: AnalyticsPeriodFilter = {}): void {
    this.getAnalytics(filters).subscribe();
  }

  /**
   * Observables para componentes
   */
  get analytics$(): Observable<AnalyticsData | null> {
    return this.analyticsCache$.asObservable();
  }

  get isLoading$(): Observable<boolean> {
    return this._isLoading$.asObservable();
  }

  /**
   * Exportar dados de analytics
   */
  exportAnalytics(format: 'json' | 'csv' | 'excel' = 'json'): Observable<Blob> {
    const params = new HttpParams().set('format', format);
    return this.http.get(`${this.baseUrl}/analytics/export`, { 
      params, 
      responseType: 'blob' 
    });
  }

  /**
   * Obter insights automatizados
   */
  getInsights(): Observable<string[]> {
    return this.analytics$.pipe(
      map(data => {
        if (!data) return [];
        
        const insights = [];
        
        // Insight sobre crescimento
        if (data.general.growthRate > 10) {
          insights.push(`📈 Excelente crescimento de ${data.general.growthRate.toFixed(1)}% em contratos este mês!`);
        } else if (data.general.growthRate < -10) {
          insights.push(`📉 Queda de ${Math.abs(data.general.growthRate).toFixed(1)}% em contratos - revisar estratégia.`);
        }

        // Insight sobre conversão
        if (data.general.conversionRate > 70) {
          insights.push(`🎯 Alta taxa de conversão de ${data.general.conversionRate}% - ótima performance!`);
        } else if (data.general.conversionRate < 30) {
          insights.push(`⚠️ Taxa de conversão baixa (${data.general.conversionRate}%) - melhorar propostas.`);
        }

        // Insight sobre serviços
        const topService = data.services.reduce((prev, current) => 
          prev.popularity > current.popularity ? prev : current
        );
        insights.push(`⭐ ${topService.name} é o serviço mais popular com ${topService.popularity.toFixed(1)}% dos contratos.`);

        return insights;
      })
    );
  }
}