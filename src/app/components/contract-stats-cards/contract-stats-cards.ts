import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContractService, ApiContract, ContractsResponse } from '../../services/contract';
import { ToastrService } from 'ngx-toastr';

interface StatsCard {
  id: string;
  title: string;
  value: string | number;
  icon: string;
  color: string;
  trend?: number;
  subtitle?: string;
}

@Component({
  selector: 'app-contract-stats-cards',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './contract-stats-cards.html',
  styleUrl: './contract-stats-cards.css'
})
export class ContractStatsCardsComponent implements OnInit {
  isLoading = true;
  error: string | null = null;
  cards: StatsCard[] = [];

  constructor(
    private contractService: ContractService,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    this.loadStatistics();
  }

  loadStatistics() {
    this.isLoading = true;
    this.error = null;

    this.contractService.getContracts().subscribe({
      next: (response: ContractsResponse) => {
        const contracts = response.contracts;
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

        // Total de contratos
        const totalContracts = contracts.length;

        // Contratos ativos
        const activeContracts = contracts.filter((c: ApiContract) => c.status === 'active').length;

        // Contratos deste mês
        const contractsThisMonth = contracts.filter((c: ApiContract) => {
          const date = new Date(c.created_at);
          return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        }).length;

        // Contratos do mês passado
        const contractsLastMonth = contracts.filter((c: ApiContract) => {
          const date = new Date(c.created_at);
          return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
        }).length;

        // Calcular tendência
        const trend = contractsLastMonth > 0 
          ? Math.round(((contractsThisMonth - contractsLastMonth) / contractsLastMonth) * 100)
          : contractsThisMonth > 0 ? 100 : 0;

        // Valor total dos contratos ativos
        const totalValue = contracts
          .filter((c: ApiContract) => c.status === 'active')
          .reduce((sum: number, c: ApiContract) => sum + (c.total_value || 0), 0);

        // Taxa de conclusão
        const completedContracts = contracts.filter((c: ApiContract) => c.status === 'completed').length;
        const completionRate = totalContracts > 0 
          ? Math.round((completedContracts / totalContracts) * 100)
          : 0;

        // Contratos vencendo em breve (próximos 30 dias)
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        
        const expiringContracts = contracts.filter((c: ApiContract) => {
          if (c.status !== 'active' || !c.end_date) return false;
          const endDate = new Date(c.end_date);
          return endDate >= now && endDate <= thirtyDaysFromNow;
        }).length;

        this.cards = [
          {
            id: 'active',
            title: 'Contratos Ativos',
            value: activeContracts,
            icon: 'fas fa-check-circle',
            color: '#003b2b',
            subtitle: `${Math.round((activeContracts / totalContracts) * 100)}% do total`
          },
          {
            id: 'value',
            title: 'Valor Total',
            value: this.formatCurrency(totalValue),
            icon: 'fas fa-dollar-sign',
            color: '#003b2b',
            subtitle: 'Contratos ativos'
          },
          {
            id: 'expiring',
            title: 'Vencendo em Breve',
            value: expiringContracts,
            icon: 'fas fa-clock',
            color: '#003b2b',
            subtitle: 'Próximos 30 dias'
          }
        ];

        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Erro ao carregar estatísticas:', error);
        this.error = 'Erro ao carregar estatísticas de contratos';
        this.isLoading = false;
        this.toastr.error('Erro ao carregar estatísticas');
      }
    });
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }

  getTrendClass(trend: number): string {
    return trend > 0 ? 'positive' : trend < 0 ? 'negative' : 'neutral';
  }

  abs(value: number): number {
    return Math.abs(value);
  }

  trackByCardId(index: number, card: StatsCard): string {
    return card.id;
  }
}