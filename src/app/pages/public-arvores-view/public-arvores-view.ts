import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PlanejamentoEstrategicoService } from '../../services/planejamento-estrategico.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-public-arvores-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
  isSaving = false;
  error = '';
  successMessage = '';
  expandedArvores: { [arvoreId: number]: boolean } = {};
  currentYear = new Date().getFullYear();

  // Nova árvore
  novaArvoreNome: string = '';
  showNovaArvoreForm = false;

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
    if (valor === null || valor === undefined || valor === '') return '-';
    return String(valor).replace('.', ',');
  }

  adicionarNovaLinha(arvore: any): void {
    if (!arvore.itens) {
      arvore.itens = [];
    }

    arvore.itens.push({
      topico: '',
      pergunta_norteadora: '',
      gravidade: null,
      urgencia: null,
      tendencia: null,
      nota: null
    });
  }

  removerLinha(arvore: any, index: number): void {
    if (confirm('Tem certeza que deseja remover este item?')) {
      arvore.itens.splice(index, 1);
    }
  }

  calcularNota(item: any): void {
    const gravidade = item.gravidade ? parseFloat(String(item.gravidade).replace(',', '.')) : null;
    const urgencia = item.urgencia ? parseFloat(String(item.urgencia).replace(',', '.')) : null;
    const tendencia = item.tendencia ? parseFloat(String(item.tendencia).replace(',', '.')) : null;

    if (gravidade && urgencia && tendencia) {
      item.nota = gravidade * urgencia * tendencia;
    } else {
      item.nota = null;
    }
  }

  toggleNovaArvoreForm(): void {
    this.showNovaArvoreForm = !this.showNovaArvoreForm;
    if (!this.showNovaArvoreForm) {
      this.novaArvoreNome = '';
    }
  }

  criarNovaArvore(): void {
    if (!this.novaArvoreNome.trim()) {
      alert('Por favor, informe o nome da árvore');
      return;
    }

    // Criar árvore sem ID (será criada no servidor)
    const novaArvore = {
      nome_arvore: this.novaArvoreNome.trim(),
      itens: []
    };

    this.arvores.push(novaArvore);

    // Atribuir um ID temporário para controle local
    const tempId = -1 * (this.arvores.length);
    (novaArvore as any).id = tempId;

    this.expandedArvores[tempId] = true;
    this.novaArvoreNome = '';
    this.showNovaArvoreForm = false;
  }

  async salvarArvores(): Promise<void> {
    if (!this.token) return;

    // Validar dados
    for (const arvore of this.arvores) {
      if (!arvore.nome_arvore || !arvore.nome_arvore.trim()) {
        alert('Todas as árvores devem ter um nome');
        return;
      }

      for (const item of arvore.itens || []) {
        if (!item.topico || !item.topico.trim()) {
          alert('Todos os itens devem ter um tópico');
          return;
        }

        // Validar range de valores
        const gravidade = item.gravidade ? parseFloat(String(item.gravidade).replace(',', '.')) : null;
        const urgencia = item.urgencia ? parseFloat(String(item.urgencia).replace(',', '.')) : null;
        const tendencia = item.tendencia ? parseFloat(String(item.tendencia).replace(',', '.')) : null;

        if (gravidade !== null && (gravidade < 1 || gravidade > 5)) {
          alert('Gravidade deve estar entre 1 e 5');
          return;
        }
        if (urgencia !== null && (urgencia < 1 || urgencia > 5)) {
          alert('Urgência deve estar entre 1 e 5');
          return;
        }
        if (tendencia !== null && (tendencia < 1 || tendencia > 5)) {
          alert('Tendência deve estar entre 1 e 5');
          return;
        }
      }
    }

    this.isSaving = true;
    this.error = '';
    this.successMessage = '';

    try {
      // Preparar dados para envio (remover IDs temporários)
      const arvoresToSave = this.arvores.map(arvore => ({
        id: arvore.id > 0 ? arvore.id : null, // IDs negativos são temporários
        nome_arvore: arvore.nome_arvore,
        itens: arvore.itens || []
      }));

      const response = await firstValueFrom(
        this.planejamentoService.salvarItensArvorePublico(this.token, arvoresToSave)
      );

      if (response.success) {
        this.successMessage = 'Árvores salvas com sucesso!';

        // Recarregar dados do servidor
        setTimeout(() => {
          this.loadArvores();
          this.successMessage = '';
        }, 2000);
      }
    } catch (err: any) {
      console.error('Erro ao salvar árvores:', err);
      this.error = err.error?.message || 'Erro ao salvar árvores. Tente novamente.';
    } finally {
      this.isSaving = false;
    }
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
