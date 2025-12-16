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
import jsPDF from 'jspdf';

@Component({
  selector: 'app-public-classificacao-riscos-grupo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './public-classificacao-riscos-grupo.html',
  styleUrls: ['./public-classificacao-riscos-grupo.css']
})
export class PublicClassificacaoRiscosGrupoComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private planejamentoService = inject(PlanejamentoEstrategicoService);

  token: string | null = null;
  grupo: any = null;
  planejamento: any = null;
  matrizFinal: any = null;
  isLoading = true;
  isSaving = false;
  isExporting = false;
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
        this.planejamentoService.obterClassificacaoRiscosGrupoPublico(this.token)
      );

      if (response.success && response.data) {
        this.grupo = response.data.grupo;
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
          this.oportunidades = response.data.classificacao.oportunidades || [];
          this.ameacas = response.data.classificacao.ameacas || [];
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
        this.planejamentoService.salvarClassificacaoRiscosGrupoPublico(this.token, dados)
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

  trackByIndex(index: number): number {
    return index;
  }

  private async loadLogoAsBase64(): Promise<string | null> {
    try {
      const response = await fetch('/logoNaueNeg.png');
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }

  async exportarPdf(): Promise<void> {
    if (this.isExporting) return;

    this.isExporting = true;

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2);
      let yPosition = margin;

      // Cores
      const primaryColor: [number, number, number] = [0, 59, 43];
      const greenColor: [number, number, number] = [40, 167, 69];
      const redColor: [number, number, number] = [220, 53, 69];
      const grayColor: [number, number, number] = [113, 128, 150];

      // Cabeçalho
      pdf.setFillColor(...primaryColor);
      pdf.rect(0, 0, pageWidth, 50, 'F');

      // Tentar carregar o logo
      const logoBase64 = await this.loadLogoAsBase64();
      const logoWidth = 30;
      const logoHeight = 30;
      const logoX = margin;
      const logoY = 10;

      if (logoBase64) {
        try {
          pdf.addImage(logoBase64, 'PNG', logoX, logoY, logoWidth, logoHeight);
        } catch {
          // Se falhar, não adiciona logo
        }
      }

      // Textos do cabeçalho (centralizados à direita da logo)
      const textStartX = logoX + logoWidth + 10;
      const textCenterX = textStartX + (pageWidth - textStartX - margin) / 2;

      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Classificação de Riscos', textCenterX, 18, { align: 'center' });

      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text(this.getClientName(), textCenterX, 28, { align: 'center' });

      pdf.setFontSize(10);
      pdf.text(`Grupo: ${this.grupo?.nome_grupo || 'N/A'}`, textCenterX, 38, { align: 'center' });

      yPosition = 60;

      // Info Cards
      pdf.setFillColor(247, 250, 252);
      pdf.roundedRect(margin, yPosition, contentWidth, 20, 3, 3, 'F');

      pdf.setTextColor(...grayColor);
      pdf.setFontSize(9);
      pdf.text('Progresso Classificação', margin + 10, yPosition + 8);
      pdf.text('Progresso Tratativas', margin + contentWidth / 2, yPosition + 8);

      pdf.setTextColor(...primaryColor);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${this.getProgressoClassificacao()}%`, margin + 10, yPosition + 16);
      pdf.text(`${this.getProgressoTratativas()}%`, margin + contentWidth / 2, yPosition + 16);

      yPosition += 30;

      // Função auxiliar para adicionar seção
      const addSection = (
        title: string,
        items: Array<{ item: string; classificacao: string | null; tratativa: string }>,
        color: [number, number, number],
        icon: string
      ) => {
        // Verificar se precisa de nova página
        if (yPosition > pageHeight - 60) {
          pdf.addPage();
          yPosition = margin;
        }

        // Título da seção
        pdf.setFillColor(...color);
        pdf.roundedRect(margin, yPosition, contentWidth, 12, 2, 2, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${icon} ${title}`, margin + 5, yPosition + 8);
        yPosition += 18;

        if (items.length === 0) {
          pdf.setTextColor(...grayColor);
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'italic');
          pdf.text('Nenhum item identificado', margin + 5, yPosition);
          yPosition += 15;
          return;
        }

        // Itens
        items.forEach((item, index) => {
          // Verificar se precisa de nova página
          const estimatedHeight = 35 + (item.tratativa ? Math.ceil(item.tratativa.length / 80) * 5 : 0);
          if (yPosition + estimatedHeight > pageHeight - margin) {
            pdf.addPage();
            yPosition = margin;
          }

          // Card do item
          pdf.setFillColor(255, 255, 255);
          pdf.setDrawColor(226, 232, 240);
          pdf.roundedRect(margin, yPosition, contentWidth, 8, 1, 1, 'FD');

          // Número
          pdf.setFillColor(...color);
          pdf.circle(margin + 6, yPosition + 4, 3, 'F');
          pdf.setTextColor(255, 255, 255);
          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'bold');
          pdf.text(`${index + 1}`, margin + 6, yPosition + 5.5, { align: 'center' });

          // Título do item
          pdf.setTextColor(45, 55, 72);
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'bold');
          const itemText = item.item.length > 90 ? item.item.substring(0, 87) + '...' : item.item;
          pdf.text(itemText, margin + 12, yPosition + 5.5);
          yPosition += 12;

          // Classificação
          pdf.setTextColor(...grayColor);
          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'normal');
          pdf.text('Estratégia: ', margin + 5, yPosition);

          pdf.setTextColor(...primaryColor);
          pdf.setFont('helvetica', 'bold');
          const classificacaoLabel = this.getClassificacaoLabel(item.classificacao as any);
          pdf.text(classificacaoLabel, margin + 25, yPosition);
          yPosition += 6;

          // Tratativa
          if (item.tratativa && item.tratativa.trim()) {
            pdf.setTextColor(...grayColor);
            pdf.setFontSize(9);
            pdf.setFont('helvetica', 'normal');
            pdf.text('Plano de Ação:', margin + 5, yPosition);
            yPosition += 5;

            pdf.setTextColor(45, 55, 72);
            const tratativaLines = pdf.splitTextToSize(item.tratativa, contentWidth - 10);
            tratativaLines.forEach((line: string) => {
              if (yPosition > pageHeight - margin) {
                pdf.addPage();
                yPosition = margin;
              }
              pdf.text(line, margin + 5, yPosition);
              yPosition += 4;
            });
          } else {
            pdf.setTextColor(...grayColor);
            pdf.setFontSize(9);
            pdf.setFont('helvetica', 'italic');
            pdf.text('Plano de Ação: Não informado', margin + 5, yPosition);
          }

          yPosition += 10;
        });
      };

      // Seção de Oportunidades
      addSection(
        'Oportunidades (Riscos Positivos)',
        this.oportunidades,
        greenColor,
        '+'
      );

      yPosition += 5;

      // Seção de Ameaças
      addSection(
        'Ameaças (Riscos Negativos)',
        this.ameacas,
        redColor,
        '!'
      );

      // Rodapé em todas as páginas
      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFillColor(...primaryColor);
        pdf.rect(0, pageHeight - 15, pageWidth, 15, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(8);
        pdf.text(`NAUE Consultoria - ${this.currentYear}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
        pdf.text(`Página ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
      }

      // Salvar o PDF
      const fileName = `classificacao-riscos-${this.grupo?.nome_grupo || 'grupo'}-${this.getClientName().replace(/\s+/g, '-')}.pdf`;
      pdf.save(fileName);

      this.showToast = true;
      this.toastMessage = 'PDF exportado com sucesso!';
      setTimeout(() => {
        this.showToast = false;
      }, 3000);

    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      this.error = 'Erro ao exportar PDF. Tente novamente.';
    } finally {
      this.isExporting = false;
    }
  }
}
