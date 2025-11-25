import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { PlanejamentoEstrategicoService } from '../../services/planejamento-estrategico.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-public-arvores-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './public-arvores-view.html',
  styleUrls: ['./public-arvores-view.css']
})
export class PublicArvoresViewComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private planejamentoService = inject(PlanejamentoEstrategicoService);

  token: string | null = null;
  planejamento: any = null;
  arvores: any[] = [];
  isLoading = true;
  error = '';
  expandedArvores: { [arvoreId: number]: boolean } = {};
  currentYear = new Date().getFullYear();

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['token']) {
        this.token = params['token'];
        this.loadArvores();
      }
    });
  }

  async loadArvores(): Promise<void> {
    if (!this.token) return;

    this.isLoading = true;
    this.error = '';

    try {
      const response = await firstValueFrom(
        this.planejamentoService.obterArvoresPublico(this.token)
      );

      if (response.success && response.data) {
        this.planejamento = response.data.planejamento;
        this.arvores = response.data.arvores;

        // Expandir todas as árvores por padrão
        this.arvores.forEach(arvore => {
          this.expandedArvores[arvore.id] = true;
        });
      }
    } catch (err: any) {
      console.error('Erro ao carregar árvores:', err);
      this.error = 'Não foi possível carregar as árvores de problemas.';
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

  toggleArvore(arvoreId: number): void {
    this.expandedArvores[arvoreId] = !this.expandedArvores[arvoreId];
  }

  isArvoreExpanded(arvoreId: number): boolean {
    return this.expandedArvores[arvoreId] || false;
  }

  formatDate(dateString: string | null | undefined): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  }

  formatarNumero(valor: any): string {
    if (valor === null || valor === undefined) return '-';
    return String(valor).replace('.', ',');
  }

  getPilaresDeDor(): any[] {
    const pilares: any[] = [];

    for (const arvore of this.arvores) {
      const itens = arvore.itens || [];
      for (const item of itens) {
        if (item.nota && item.nota > 20) {
          pilares.push({
            ...item,
            arvore_nome: arvore.nome_arvore
          });
        }
      }
    }

    // Ordenar por nota decrescente
    return pilares.sort((a, b) => (b.nota || 0) - (a.nota || 0));
  }
}
