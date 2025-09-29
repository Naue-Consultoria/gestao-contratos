import { Component, OnInit, OnDestroy, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
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
export class ProposalStatsCardsComponent implements OnInit, OnDestroy, OnChanges {
  private proposalService = inject(ProposalService);
  private subscriptions = new Subscription();

  @Input() filteredProposals: any[] = [];
  @Input() useFilteredData = false;

  cards: StatCard[] = [];
  isLoading = true;
  error = '';
  allProposals: any[] = [];

  ngOnInit() {
    this.loadStats();
    // Listen for proposal updates
    window.addEventListener('refreshProposals', this.loadStats.bind(this));
  }

  ngOnChanges(changes: SimpleChanges) {
    if ((changes['filteredProposals'] && this.useFilteredData && this.filteredProposals)) {
      this.updateCardsWithFilteredData();
    }
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    window.removeEventListener('refreshProposals', this.loadStats.bind(this));
  }

  async loadStats() {
    this.isLoading = true;
    this.error = '';

    try {
      // Carregar todas as propostas
      const proposalsResponse = await firstValueFrom(this.proposalService.getProposals());

      if (proposalsResponse && proposalsResponse.success && proposalsResponse.data) {
        this.allProposals = proposalsResponse.data;

        // Se está usando dados filtrados, usar os filtrados, senão usar todos
        const proposalsToUse = this.useFilteredData && this.filteredProposals.length >= 0
          ? this.filteredProposals
          : this.allProposals;

        this.calculateAndUpdateCards(proposalsToUse);
      } else {
        this.buildDefaultCards();
      }

      // Também carregar estatísticas do backend se disponível
      try {
        const statsResponse = await firstValueFrom(this.proposalService.getProposalStats());
        if (statsResponse && statsResponse.success && statsResponse.data && !this.useFilteredData) {
          // Usar stats do backend apenas quando não estiver usando dados filtrados
          this.buildStatCards(statsResponse.data);
        }
      } catch {
        // Ignorar erro de stats, usar cálculo local
      }
    } catch (error: any) {
      console.error('❌ Error loading proposal stats:', error);

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

  private updateCardsWithFilteredData() {
    if (!this.allProposals || this.allProposals.length === 0) {
      return;
    }

    const proposals = this.filteredProposals.map(fp => fp.raw || fp);
    this.calculateAndUpdateCards(proposals);
  }

  private calculateAndUpdateCards(proposals: any[]) {
    const totalProposals = proposals.length;
    const sentProposals = proposals.filter((p: any) => p.status === 'sent').length;
    const signedProposals = proposals.filter((p: any) => p.status === 'signed').length;
    const convertedProposals = proposals.filter((p: any) => p.status === 'converted').length;

    // Calcular valor em aberto (propostas enviadas e assinadas, mas não convertidas)
    const pendingValue = proposals
      .filter((p: any) => p.status === 'sent' || p.status === 'signed' || p.status === 'draft')
      .reduce((sum: number, p: any) => sum + (p.total_value || 0), 0);

    // Calcular valor total de todas as propostas filtradas
    const totalValue = proposals.reduce((sum: number, p: any) => sum + (p.total_value || 0), 0);

    this.cards = [
      {
        title: 'Total de Propostas',
        value: totalProposals,
        icon: 'fas fa-file-alt',
        color: '#003b2b',
        subtitle: this.useFilteredData ? 'Propostas filtradas' : undefined
      },
      {
        title: 'Propostas Enviadas',
        value: sentProposals,
        icon: 'fas fa-paper-plane',
        color: '#003b2b',
        subtitle: totalProposals > 0 ? `${Math.round((sentProposals / totalProposals) * 100)}% do total` : '0% do total'
      },
      {
        title: 'Propostas Assinadas',
        value: signedProposals + convertedProposals,
        icon: 'fas fa-check-circle',
        color: '#003b2b',
        subtitle: totalProposals > 0 ? `${Math.round(((signedProposals + convertedProposals) / totalProposals) * 100)}% do total` : '0% do total'
      },
      {
        title: 'Valor em Aberto',
        value: this.formatCurrency(pendingValue),
        icon: 'fas fa-dollar-sign',
        color: '#003b2b',
        subtitle: this.useFilteredData ? `${totalProposals} proposta${totalProposals !== 1 ? 's' : ''} filtrada${totalProposals !== 1 ? 's' : ''}` : 'Propostas não convertidas'
      }
    ];

    this.isLoading = false;
  }

  private buildStatCards(stats: any) {
    const totalProposals = stats.total || 0;
    const sentProposals = stats.byStatus?.sent || 0;
    const signedProposals = stats.byStatus?.signed || 0;
    const acceptedProposals = stats.byStatus?.accepted || 0;
    const pendingValue = (stats.totalValue || 0) - (stats.acceptedValue || 0);

    this.cards = [
      {
        title: 'Total de Propostas',
        value: totalProposals,
        icon: 'fas fa-file-alt',
        color: '#003b2b',
      },
      {
        title: 'Propostas Enviadas',
        value: sentProposals,
        icon: 'fas fa-paper-plane',
        color: '#003b2b',
      },
      {
        title: 'Propostas Assinadas',
        value: signedProposals + acceptedProposals,
        icon: 'fas fa-check-circle',
        color: '#003b2b',
      },
      {
        title: 'Valor em Aberto',
        value: this.formatCurrency(pendingValue),
        icon: 'fas fa-dollar-sign',
        color: '#003b2b',
      }
    ];
  }

  private buildDefaultCards() {
    this.cards = [
      {
        title: 'Total de Propostas',
        value: 0,
        icon: 'fas fa-file-alt',
        color: '#003b2b',
      },
      {
        title: 'Propostas Enviadas',
        value: 0,
        icon: 'fas fa-paper-plane',
        color: '#003b2b',
      },
      {
        title: 'Propostas Assinadas',
        value: 0,
        icon: 'fas fa-check-circle',
        color: '#003b2b',
      },
      {
        title: 'Valor em Aberto',
        value: 'R$ 0,00',
        icon: 'fas fa-dollar-sign',
        color: '#003b2b',
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