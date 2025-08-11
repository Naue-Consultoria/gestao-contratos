import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProposalService } from '../../services/proposal';
import { firstValueFrom, Subscription } from 'rxjs';

interface StatCard {
  title: string;
  value: string | number;
  icon: string;
  color: string;
  trend?: number;
  subtitle?: string;
}

@Component({
  selector: 'app-proposal-stats-cards',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './proposal-stats-cards.html',
  styleUrls: ['./proposal-stats-cards.css']
})
export class ProposalStatsCardsComponent implements OnInit, OnDestroy {
  private proposalService = inject(ProposalService);
  private subscriptions = new Subscription();

  cards: StatCard[] = [];
  isLoading = true;
  error = '';

  ngOnInit() {
    this.loadStats();
    // Listen for proposal updates
    window.addEventListener('refreshProposals', this.loadStats.bind(this));
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    window.removeEventListener('refreshProposals', this.loadStats.bind(this));
  }

  async loadStats() {
    this.isLoading = true;
    this.error = '';
    
    try {
      const response = await firstValueFrom(this.proposalService.getProposalStats());
      
      if (response && response.success && response.stats) {
        this.buildStatCards(response.stats);
      } else {
        // Se não há dados, mostra zeros
        this.buildDefaultCards();
      }
    } catch (error: any) {
      console.error('❌ Error loading proposal stats:', error);
      
      // Se é erro 500 ou 404, mostra funcionalidade não disponível
      if (error?.status === 500 || error?.status === 404) {
        this.error = 'Estatísticas de propostas ainda não implementadas no backend.';
        this.buildDefaultCards();
      } else {
        this.error = 'Não foi possível carregar as estatísticas.';
        this.buildDefaultCards();
      }
    } finally {
      this.isLoading = false;
    }
  }

  private buildStatCards(stats: any) {
    const totalProposals = stats.total || 0;
    const sentProposals = stats.byStatus?.sent || 0;
    const signedProposals = stats.byStatus?.signed || 0;
    const pendingValue = (stats.totalValue || 0) - (stats.signedValue || 0);

    this.cards = [
      {
        title: 'Total de Propostas',
        value: totalProposals,
        icon: 'fas fa-file-alt',
        color: '#3b82f6',
        subtitle: 'Todas as propostas'
      },
      {
        title: 'Propostas Enviadas',
        value: sentProposals,
        icon: 'fas fa-paper-plane',
        color: '#f59e0b',
        subtitle: 'Aguardando resposta'
      },
      {
        title: 'Propostas Assinadas',
        value: signedProposals,
        icon: 'fas fa-check-circle',
        color: '#10b981',
        subtitle: 'Aceitas pelos clientes'
      },
      {
        title: 'Valor em Aberto',
        value: this.formatCurrency(pendingValue),
        icon: 'fas fa-dollar-sign',
        color: '#ef4444',
        subtitle: 'Propostas não assinadas'
      }
    ];
  }

  private buildDefaultCards() {
    this.cards = [
      {
        title: 'Total de Propostas',
        value: 0,
        icon: 'fas fa-file-alt',
        color: '#3b82f6',
        subtitle: 'Todas as propostas'
      },
      {
        title: 'Propostas Enviadas',
        value: 0,
        icon: 'fas fa-paper-plane',
        color: '#f59e0b',
        subtitle: 'Aguardando resposta'
      },
      {
        title: 'Propostas Assinadas',
        value: 0,
        icon: 'fas fa-check-circle',
        color: '#10b981',
        subtitle: 'Aceitas pelos clientes'
      },
      {
        title: 'Valor em Aberto',
        value: 'R$ 0,00',
        icon: 'fas fa-dollar-sign',
        color: '#ef4444',
        subtitle: 'Propostas não assinadas'
      }
    ];
  }

  private formatCurrency(value: number): string {
    return this.proposalService.formatCurrency(value);
  }

  getTrendIcon(trend?: number): string {
    if (!trend) return '';
    return trend > 0 ? 'fas fa-arrow-up' : 'fas fa-arrow-down';
  }

  getTrendClass(trend?: number): string {
    if (!trend) return '';
    return trend > 0 ? 'trend-positive' : 'trend-negative';
  }

  abs(value: number): number {
    return Math.abs(value);
  }

  trackByCardId(index: number, card: StatCard): string {
    return card.title;
  }
}