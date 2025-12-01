import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  PlanejamentoEstrategicoService,
  ClassificacaoOportunidade,
  ClassificacaoAmeaca,
  ItemRiscoOportunidade,
  ItemRiscoAmeaca,
  UpdateClassificacaoRiscosRequest
} from '../../services/planejamento-estrategico.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-public-classificacao-riscos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './public-classificacao-riscos.html',
  styleUrls: ['./public-classificacao-riscos.css']
})
export class PublicClassificacaoRiscosComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private planejamentoService = inject(PlanejamentoEstrategicoService);

  token: string | null = null;
  planejamento: any = null;
  matrizFinal: any = null;
  isLoading = true;
  isSaving = false;
  isExportingPDF = false;
  error = '';
  showToast = false;
  toastMessage = '';
  currentYear = new Date().getFullYear();

  // Dados de classificação
  oportunidades: ItemRiscoOportunidade[] = [];
  ameacas: ItemRiscoAmeaca[] = [];

  // Opções de classificação
  opcoesOportunidades: { value: ClassificacaoOportunidade; label: string; descricao: string }[] = [
    {
      value: 'explorar',
      label: 'Explorar',
      descricao: 'Realizar ações para garantir que a oportunidade aconteça'
    },
    {
      value: 'melhorar',
      label: 'Melhorar',
      descricao: 'Tomar medidas para aumentar a probabilidade ou o impacto positivo do risco'
    },
    {
      value: 'compartilhar',
      label: 'Compartilhar',
      descricao: 'Repassar a oportunidade para uma terceira parte mais capacitada'
    },
    {
      value: 'aceitar',
      label: 'Aceitar',
      descricao: 'Não fazer nada e não tomar medidas proativas para buscar a oportunidade'
    }
  ];

  opcoesAmeacas: { value: ClassificacaoAmeaca; label: string; descricao: string }[] = [
    {
      value: 'evitar',
      label: 'Evitar',
      descricao: 'Eliminar a atividade que gera o risco ou alterar o plano do projeto'
    },
    {
      value: 'transferir',
      label: 'Transferir',
      descricao: 'Passar a responsabilidade para outra entidade, como seguros ou contratos'
    },
    {
      value: 'mitigar',
      label: 'Mitigar',
      descricao: 'Tomar ações para reduzir a probabilidade de ocorrência ou diminuir seu impacto'
    },
    {
      value: 'aceitar',
      label: 'Aceitar',
      descricao: 'Decidir não fazer nada, com ou sem reserva de contingência'
    }
  ];

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['token']) {
        this.token = params['token'];
        this.loadDados();
      }
    });
  }

  async loadDados(): Promise<void> {
    if (!this.token) return;

    this.isLoading = true;
    this.error = '';

    try {
      const response = await firstValueFrom(
        this.planejamentoService.obterClassificacaoRiscosPublico(this.token)
      );

      if (response.success && response.data) {
        this.planejamento = response.data.planejamento;
        this.matrizFinal = response.data.matrizFinal;

        // Extrair oportunidades e ameaças da matriz SWOT consolidada
        const oportunidadesTexto = this.matrizFinal?.oportunidades || '';
        const ameacasTexto = this.matrizFinal?.ameacas || '';

        const oportunidadesArray = oportunidadesTexto
          .split('\n')
          .filter((item: string) => item.trim() !== '');

        const ameacasArray = ameacasTexto
          .split('\n')
          .filter((item: string) => item.trim() !== '');

        // Inicializar com dados salvos ou criar novos
        if (response.data.classificacao) {
          this.oportunidades = response.data.classificacao.oportunidades;
          this.ameacas = response.data.classificacao.ameacas;
        } else {
          // Criar itens vazios baseados na matriz SWOT
          this.oportunidades = oportunidadesArray.map((item: string) => ({
            item,
            classificacao: null,
            tratativa: ''
          }));

          this.ameacas = ameacasArray.map((item: string) => ({
            item,
            classificacao: null,
            tratativa: ''
          }));
        }
      }
    } catch (err: any) {
      console.error('Erro ao carregar dados:', err);
      this.error = 'Não foi possível carregar os dados de classificação de riscos.';
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

  formatDate(dateString: string | null | undefined): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  }

  getClassificacaoLabel(classificacao: ClassificacaoOportunidade | ClassificacaoAmeaca | null): string {
    if (!classificacao) return 'Não classificado';

    const oportunidade = this.opcoesOportunidades.find(op => op.value === classificacao);
    if (oportunidade) return oportunidade.label;

    const ameaca = this.opcoesAmeacas.find(op => op.value === classificacao);
    if (ameaca) return ameaca.label;

    return 'Não classificado';
  }

  getProgressoClassificacao(): number {
    const total = this.oportunidades.length + this.ameacas.length;
    if (total === 0) return 0;

    const classificados = this.oportunidades.filter(o => o.classificacao !== null).length +
                          this.ameacas.filter(a => a.classificacao !== null).length;

    return Math.round((classificados / total) * 100);
  }

  getProgressoTratativas(): number {
    const total = this.oportunidades.length + this.ameacas.length;
    if (total === 0) return 0;

    const preenchidos = this.oportunidades.filter(o => o.tratativa.trim() !== '').length +
                        this.ameacas.filter(a => a.tratativa.trim() !== '').length;

    return Math.round((preenchidos / total) * 100);
  }

  async salvar(): Promise<void> {
    if (!this.token) return;

    this.isSaving = true;
    this.error = '';

    try {
      const dados: UpdateClassificacaoRiscosRequest = {
        oportunidades: this.oportunidades,
        ameacas: this.ameacas
      };

      const response = await firstValueFrom(
        this.planejamentoService.salvarClassificacaoRiscosPublico(this.token, dados)
      );

      if (response.success) {
        this.showToast = true;
        this.toastMessage = 'Salvo com sucesso!';

        // Ocultar toast após 3 segundos
        setTimeout(() => {
          this.showToast = false;
        }, 3000);
      }
    } catch (err: any) {
      console.error('Erro ao salvar classificação:', err);
      this.error = err.error?.message || 'Erro ao salvar classificação. Tente novamente.';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      this.isSaving = false;
    }
  }

  exportarPDF(): void {
    if (!this.token) return;

    this.isExportingPDF = true;
    try {
      this.planejamentoService.exportarClassificacaoRiscosPDF(this.token);

      // Mostrar toast de exportação
      this.showToast = true;
      this.toastMessage = 'Exportando PDF...';

      setTimeout(() => {
        this.showToast = false;
      }, 2000);
    } catch (err) {
      console.error('Erro ao exportar PDF:', err);
    } finally {
      setTimeout(() => {
        this.isExportingPDF = false;
      }, 1000);
    }
  }

  trackByIndex(index: number): number {
    return index;
  }
}
