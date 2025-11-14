import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MentoriaService, MentoriaEncontro, EncontroBloco, BlocoInteracao } from '../../services/mentoria.service';
import { MentoriaTemplatesService } from '../../services/mentoria-templates.service';
import { MentoriaHelpers } from '../../types/mentoria.types';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { MatrizRaciEditorComponent } from '../../components/matriz-raci-editor/matriz-raci-editor.component';
import { AnaliseProblemasComponent } from '../../components/analise-problemas/analise-problemas';
import { GestaoErrosComponent } from '../../components/gestao-erros/gestao-erros';

interface TocItem {
  id: string;
  text: string;
  level: number;
}

// ===== MODELO ABC =====
interface ModeloABC {
  adversidade: string;
  pensamento: string;
  consequencia: string;
  antidotoExigencia: string;
  antidotoRotulo: string;
  fraseNocaute: string;
  planoAcao: string;
  nivelDisposicao: number;
  impedimentos: string;
  acaoImpedimentos: string;
}

// ===== ZONAS DE APRENDIZADO =====
interface PalavraZona {
  id: string;
  texto: string;
  zona: 'ansiedade' | 'aprendizado' | 'apatia' | 'conforto';
}

interface ZonasAprendizadoData {
  palavras: PalavraZona[];
}

// ===== THE GOLDEN CIRCLE =====
interface GoldenCircleData {
  why: string;  // Por que você faz o que você faz? Qual o propósito?
  how: string;  // Como você faz o que você faz? Seu processo.
  what: string; // O que você faz? Seu resultado.
}

// ===== TERMÔMETRO DE GESTÃO =====
interface TermometroGestaoAtividade {
  id: string;
  nome: string;
  categoria: 'strategic' | 'tactical' | 'operational';
}

interface TermometroGestaoData {
  atividades: TermometroGestaoAtividade[];
  perfilComparacao: 'direção' | 'gerencial' | 'profissional';
  percentualEstrategico: number;
  percentualTatico: number;
  percentualOperacional: number;
}

// ===== GANHOS E PERDAS =====
interface GanhosPerdidaItem {
  id: string;
  texto: string;
}

interface GanhosPerdasData {
  meta: string;
  ganhos_obtiver: GanhosPerdidaItem[];      // O que você ganha se obtiver (busca do prazer)
  perdas_obtiver: GanhosPerdidaItem[];      // O que você perde se obtiver (perda de valores)
  ganhos_nao_obtiver: GanhosPerdidaItem[];  // O que você ganha se NÃO obtiver (sabotadores)
  perdas_nao_obtiver: GanhosPerdidaItem[];  // O que você perde se NÃO obtiver (motivadores-dor)
}

// ===== CONTROLE DE HÁBITOS =====
interface HabitoDia {
  dia: number;
  status: 'empty' | 'done' | 'not-done' | 'not-needed';
}

interface Habito {
  id: string;
  nome: string;
  meta: number;
  descricao: string;
  notas: string;
  dias: HabitoDia[];
}

interface ControleHabitosData {
  ano: number;
  mes: number;  // 0-11 (Janeiro = 0)
  totalDias: number;  // 28, 29, 30 ou 31
  habitos: Habito[];
}

// ===== MAPA MENTAL =====
interface MapaMentalCard {
  id: string;
  colunaId: string;
  meta: string;
  indicador: string;
  prazo: string;
}

interface MapaMentalColuna {
  id: string;
  nome: string;
  cor: string;
  corBg: string;
  corBorda: string;
}

interface MapaMentalConexao {
  de: string;
  para: string;
}

interface MapaMentalData {
  colunas: MapaMentalColuna[];
  cards: { [colunaId: string]: MapaMentalCard[] };
  conexoes: MapaMentalConexao[];
}

@Component({
  selector: 'app-public-mentoria-view',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule, MatrizRaciEditorComponent, AnaliseProblemasComponent, GestaoErrosComponent],
  templateUrl: './public-mentoria-view.html',
  styleUrl: './public-mentoria-view.css'
})
export class PublicMentoriaViewComponent implements OnInit {
  encontro: MentoriaEncontro | null = null;
  blocos: EncontroBloco[] = [];
  token: string = '';

  // Estados
  isLoading = true;
  notFound = false;
  expired = false;

  // Interações do mentorado
  interacoes: { [blocoId: number]: any } = {};

  // Salvamento automático
  savingInteractions = false;

  // Cache de nomes de templates
  templateNamesCache: { [templateId: number]: string } = {};

  // Table of Contents
  tableOfContents: TocItem[] = [];
  showToc = false; // Começa recolhido

  // Outros encontros da mesma mentoria
  outrosEncontros: any[] = [];
  showEncontrosDropdown = false;

  // Modal de imagem
  modalImageSrc: string | null = null;

  // Mapa Mental
  mapaMentalConectando: string | null = null;
  mapaMentalSaveTimeout: any = null;
  salvandoMapaMental: boolean = false;
  mapaMentalId: number | null = null; // ID do mapa mental no banco
  showExportDropdown: boolean = false;

  // Modelo ABC
  modeloABC: ModeloABC = {
    adversidade: '',
    pensamento: '',
    consequencia: '',
    antidotoExigencia: '',
    antidotoRotulo: '',
    fraseNocaute: '',
    planoAcao: '',
    nivelDisposicao: 5,
    impedimentos: '',
    acaoImpedimentos: ''
  };
  modeloABCId: number | null = null;
  salvandoModeloABC: boolean = false;

  // Zonas de Aprendizado
  zonasAprendizado: ZonasAprendizadoData = {
    palavras: []
  };
  zonasAprendizadoId: number | null = null;
  salvandoZonas: boolean = false;
  novaPalavra: string = '';
  coresPredefinidas = [
    { cor: '#EF4444', corBg: 'bg-rose-600', corBorda: 'border-rose-600' },
    { cor: '#10B981', corBg: 'bg-emerald-600', corBorda: 'border-emerald-600' },
    { cor: '#8B5CF6', corBg: 'bg-violet-600', corBorda: 'border-violet-600' },
    { cor: '#EC4899', corBg: 'bg-fuchsia-600', corBorda: 'border-fuchsia-600' },
    { cor: '#F97316', corBg: 'bg-orange-600', corBorda: 'border-orange-600' },
    { cor: '#06B6D4', corBg: 'bg-cyan-600', corBorda: 'border-cyan-600' },
    { cor: '#84CC16', corBg: 'bg-lime-600', corBorda: 'border-lime-600' }
  ];
  nivelLetras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  // The Golden Circle
  goldenCircle: GoldenCircleData = {
    why: '',
    how: '',
    what: ''
  };
  goldenCircleId: number | null = null;
  salvandoGoldenCircle: boolean = false;

  // Roda da Vida MAAS
  rodaDaVida: any = {
    espiritual: { score: 5, note: '' },
    parentes: { score: 5, note: '' },
    conjugal: { score: 5, note: '' },
    filhos: { score: 5, note: '' },
    social: { score: 5, note: '' },
    saude: { score: 5, note: '' },
    servir: { score: 5, note: '' },
    intelectual: { score: 5, note: '' },
    financeiro: { score: 5, note: '' },
    profissional: { score: 5, note: '' },
    emocional: { score: 5, note: '' },
    fichas_caem: ''
  };
  rodaDaVidaAreas = [
    { key: 'espiritual', label: 'ESPIRITUAL', hint: 'Servir / Propósito / Fé' },
    { key: 'parentes', label: 'PARENTES', hint: 'Família de origem / vínculo' },
    { key: 'conjugal', label: 'CONJUGAL', hint: 'Relacionamento amoroso' },
    { key: 'filhos', label: 'FILHOS', hint: 'Relação, presença, educação' },
    { key: 'social', label: 'SOCIAL', hint: 'Amigos / Rede de apoio' },
    { key: 'saude', label: 'SAÚDE', hint: 'Energia / Sono / Corpo' },
    { key: 'servir', label: 'SERVIR', hint: 'Contribuição / Impacto social' },
    { key: 'intelectual', label: 'INTELECTUAL', hint: 'Aprendizado / Estudos' },
    { key: 'financeiro', label: 'FINANCEIRO', hint: 'Renda / Dívidas / Plano' },
    { key: 'profissional', label: 'PROFISSIONAL', hint: 'Carreira / Negócio' },
    { key: 'emocional', label: 'EMOCIONAL', hint: 'Estado interno / Autogestão' }
  ];
  rodaDaVidaId: number | null = null;
  salvandoRodaDaVida: boolean = false;
  rodaDaVidaChart: any = null;

  // Termômetro de Gestão
  termometroGestao: TermometroGestaoData = {
    atividades: [],
    perfilComparacao: 'direção',
    percentualEstrategico: 0,
    percentualTatico: 0,
    percentualOperacional: 0
  };
  termometroGestaoId: number | null = null;
  salvandoTermometro: boolean = false;
  novaAtividade: string = '';
  novaAtividadeCategoria: 'strategic' | 'tactical' | 'operational' = 'strategic';

  // Perfis de referência do Termômetro de Gestão
  perfisReferencia = {
    'direção': { strategic: 60, tactical: 30, operational: 10 },
    'gerencial': { strategic: 30, tactical: 50, operational: 20 },
    'profissional': { strategic: 10, tactical: 30, operational: 60 }
  };

  // Ganhos e Perdas
  ganhosPerdas: GanhosPerdasData = {
    meta: '',
    ganhos_obtiver: [],
    perdas_obtiver: [],
    ganhos_nao_obtiver: [],
    perdas_nao_obtiver: []
  };
  ganhosPerdasId: number | null = null;
  salvandoGanhosPerdas: boolean = false;

  // Controle de Hábitos
  controleHabitos: ControleHabitosData = {
    ano: new Date().getFullYear(),
    mes: new Date().getMonth(),
    totalDias: this.getDiasNoMes(new Date().getMonth(), new Date().getFullYear()),
    habitos: []
  };
  controleHabitosId: number | null = null;
  salvandoControleHabitos: boolean = false;

  // Referências - Anotações
  salvandoAnotacoes: boolean = false;

  // ViewChild para o container de visualização do mapa
  @ViewChild('mapaMentalVisualizacao', { static: false }) mapaMentalVisualizacao?: ElementRef;

  // ViewChild para gráficos do Termômetro de Gestão
  @ViewChild('userDonutTermometro', { static: false }) userDonutTermometro?: ElementRef;
  @ViewChild('referenceDonutTermometro', { static: false }) referenceDonutTermometro?: ElementRef;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private mentoriaService: MentoriaService,
    private templatesService: MentoriaTemplatesService,
    private toastr: ToastrService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') || '';

    if (!this.token) {
      this.notFound = true;
      this.isLoading = false;
      return;
    }

    this.carregarEncontro();
  }

  ngAfterViewChecked(): void {
    // Adicionar event listeners em todas as imagens após o conteúdo ser renderizado
    this.addImageClickListeners();
  }

  addImageClickListeners(): void {
    const images = document.querySelectorAll('.mentoria-content img');
    images.forEach((img: Element) => {
      const imgElement = img as HTMLImageElement;
      // Verificar se já tem o listener para não duplicar
      if (!imgElement.classList.contains('clickable-image')) {
        imgElement.classList.add('clickable-image');
        imgElement.style.cursor = 'pointer';
        imgElement.addEventListener('click', () => {
          this.openImageModal(imgElement.src);
        });
      }
    });
  }

  openImageModal(src: string): void {
    this.modalImageSrc = src;
    // Prevenir scroll do body quando modal está aberto
    document.body.style.overflow = 'hidden';
  }

  closeImageModal(): void {
    this.modalImageSrc = null;
    // Restaurar scroll do body
    document.body.style.overflow = 'auto';
  }

  // Conteúdo estruturado (novo formato)
  conteudoEstruturado: any = null;

  // Getter para obter seções ordenadas conforme configuração do editor
  get secoesOrdenadas(): string[] {
    if (!this.conteudoEstruturado?.ordemSecoes || this.conteudoEstruturado.ordemSecoes.length === 0) {
      return ['testes', 'proximosPassos', 'referencias', 'mapaMental', 'modeloABC', 'zonasAprendizado', 'goldenCircle', 'rodaDaVida', 'termometroGestao', 'ganhosPerdas', 'controleHabitos', 'matrizRaci', 'analiseProblemas', 'erros'];
    }
    return this.conteudoEstruturado.ordemSecoes;
  }

  getDiasNoMes(mes: number, ano: number): number {
    const diasPorMes = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    // Verifica ano bissexto
    if (mes === 1 && ((ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0)) {
      return 29;
    }
    return diasPorMes[mes];
  }

  carregarEncontro(): void {
    this.isLoading = true;

    this.mentoriaService.obterEncontroPublico(this.token).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.encontro = response.data;
          this.blocos = response.data.blocos || [];
          this.outrosEncontros = response.data.outros_encontros || [];

          console.log('📋 Outros encontros carregados:', this.outrosEncontros);

          // Tentar carregar conteúdo estruturado (novo formato JSON)
          if (this.encontro.conteudo_html) {
            try {
              const parsed = JSON.parse(this.encontro.conteudo_html);
              // Verificar se é o novo formato estruturado
              if (parsed.visaoGeral || parsed.mentoria || parsed.testes) {
                this.conteudoEstruturado = parsed;
                // Limpar conteudo_html para não renderizar duas vezes
                this.encontro.conteudo_html = '';

                // Carregar estados salvos das interações
                this.carregarEstadosSalvos();

                // Carregar nomes dos templates
                this.carregarNomesTemplates();
              }
            } catch (e) {
              // Não é JSON estruturado, é conteúdo HTML antigo
              this.conteudoEstruturado = null;
            }
          }

          // Carregar interações anteriores
          this.carregarInteracoes();

          // Gerar Table of Contents
          setTimeout(() => {
            this.generateTableOfContents();
          }, 100);

          // Verificar expiração
          if (this.encontro.token_expira_em) {
            const expiry = new Date(this.encontro.token_expira_em);
            if (expiry < new Date()) {
              this.expired = true;
            }
          }
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erro ao carregar encontro:', error);

        // Verificar se é erro 410 (link expirado)
        if (error.status === 410) {
          this.expired = true;
        } else {
          this.notFound = true;
        }

        this.isLoading = false;
      }
    });
  }

  carregarInteracoes(): void {
    if (!this.encontro) return;

    // Carregar interações salvas
    this.blocos.forEach(bloco => {
      if (bloco.interacoes && bloco.interacoes.length > 0) {
        const ultimaInteracao = bloco.interacoes[bloco.interacoes.length - 1];
        try {
          this.interacoes[bloco.id] = JSON.parse(ultimaInteracao.valor);
        } catch (e) {
          this.interacoes[bloco.id] = ultimaInteracao.valor;
        }
      }
    });
  }

  // ===== SALVAR INTERAÇÕES =====

  salvarInteracao(bloco: EncontroBloco, dados: any): void {
    if (!this.token || this.expired) return;

    this.interacoes[bloco.id] = dados;

    // Debounce para não salvar a cada tecla
    this.savingInteractions = true;

    this.mentoriaService.salvarInteracao(this.token, {
      bloco_id: bloco.id,
      tipo_interacao: 'resposta',
      valor: JSON.stringify(dados)
    }).subscribe({
      next: (response) => {
        if (response.success) {
          // Sucesso silencioso
          this.savingInteractions = false;
        }
      },
      error: (error) => {
        console.error('Erro ao salvar interação:', error);
        this.savingInteractions = false;
      }
    });
  }

  onCheckboxChange(bloco: EncontroBloco, itemId: string, checked: boolean): void {
    if (!this.interacoes[bloco.id]) {
      this.interacoes[bloco.id] = { checkboxes: {} };
    }
    if (!this.interacoes[bloco.id].checkboxes) {
      this.interacoes[bloco.id].checkboxes = {};
    }

    this.interacoes[bloco.id].checkboxes[itemId] = checked;
    this.salvarInteracao(bloco, this.interacoes[bloco.id]);
  }

  onRespostaChange(bloco: EncontroBloco, perguntaId: string, resposta: string): void {
    if (!this.interacoes[bloco.id]) {
      this.interacoes[bloco.id] = { respostas: {} };
    }
    if (!this.interacoes[bloco.id].respostas) {
      this.interacoes[bloco.id].respostas = {};
    }

    this.interacoes[bloco.id].respostas[perguntaId] = resposta;
    this.salvarInteracao(bloco, this.interacoes[bloco.id]);
  }

  // ===== GETTERS PARA INTERAÇÕES =====

  isCheckboxChecked(blocoId: number, itemId: string): boolean {
    return this.interacoes[blocoId]?.checkboxes?.[itemId] || false;
  }

  getResposta(blocoId: number, perguntaId: string): string {
    return this.interacoes[blocoId]?.respostas?.[perguntaId] || '';
  }

  // ===== HELPERS =====

  getNomeTipo(tipo: string): string {
    return MentoriaHelpers.getNomeTipo(tipo as any);
  }

  formatDate(date: string | Date): string {
    const d = new Date(date);
    return d.toLocaleDateString('pt-BR');
  }

  getYoutubeEmbedUrl(url: string): string {
    if (!url) return '';

    // Converter URL do YouTube para embed
    const videoIdMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);

    if (videoIdMatch && videoIdMatch[1]) {
      return `https://www.youtube.com/embed/${videoIdMatch[1]}`;
    }

    return url;
  }

  getImageSizeClass(size: string): string {
    switch (size) {
      case 'small': return 'img-small';
      case 'medium': return 'img-medium';
      case 'large': return 'img-large';
      case 'full': return 'img-full';
      default: return 'img-medium';
    }
  }

  getCurrentYear(): number {
    return new Date().getFullYear();
  }

  /**
   * Carrega nomes dos templates usados nos blocos de perguntas
   */
  carregarNomesTemplates(): void {
    if (!this.conteudoEstruturado?.proximosPassos?.blocos) return;

    const templateIds: number[] = [];

    // Coletar todos os template_ids únicos
    this.conteudoEstruturado.proximosPassos.blocos.forEach((bloco: any) => {
      if (bloco.template_id && !templateIds.includes(bloco.template_id)) {
        templateIds.push(bloco.template_id);
      }
    });

    // Buscar nomes dos templates usando endpoint público
    templateIds.forEach(templateId => {
      this.templatesService.obterNomeTemplatePublico(templateId).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.templateNamesCache[templateId] = response.data.nome;
          }
        },
        error: (error) => {
          console.error(`Erro ao carregar nome do template ${templateId}:`, error);
        }
      });
    });
  }

  /**
   * Obtém o nome do template para exibição
   */
  getNomeTemplate(bloco: any): string {
    // Se tem template_id, buscar do cache
    if (bloco.template_id && this.templateNamesCache[bloco.template_id]) {
      return this.templateNamesCache[bloco.template_id];
    }
    // Fallback para nome salvo no bloco (compatibilidade)
    if (bloco.nomeTemplate) {
      return bloco.nomeTemplate;
    }
    // Fallback padrão
    return 'Perguntas para Reflexão';
  }

  generateTableOfContents(): void {
    this.tableOfContents = [];

    // Extrair headings do conteúdo HTML (TipTap)
    if (this.encontro?.conteudo_html) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = this.encontro.conteudo_html;

      const headings = tempDiv.querySelectorAll('h1, h2, h3');
      headings.forEach((heading, index) => {
        const text = heading.textContent?.trim() || '';

        // Ignorar se estiver vazio ou for apenas espaços
        if (!text || text.length === 0) {
          return;
        }

        const level = parseInt(heading.tagName.substring(1));
        const id = `toc-heading-${index}`;

        // Adicionar ID ao heading no DOM real
        setTimeout(() => {
          const realHeadings = document.querySelectorAll('.conteudo-html h1, .conteudo-html h2, .conteudo-html h3');
          if (realHeadings[index]) {
            realHeadings[index].id = id;
          }
        }, 0);

        this.tableOfContents.push({ id, text, level });
      });
    }

    // Extrair títulos dos blocos
    this.blocos.forEach((bloco, index) => {
      if (bloco.tipo === 'titulo') {
        const text = bloco.configuracao?.texto || '';
        const level = bloco.configuracao?.nivel || 1;
        const id = `toc-bloco-${bloco.id}`;

        this.tableOfContents.push({ id, text, level });
      }
    });

    // Não mostrar automaticamente - sempre começa recolhido
    // this.showToc = this.tableOfContents.length > 0;
  }

  scrollToSection(id: string): void {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  toggleToc(): void {
    this.showToc = !this.showToc;
  }

  toggleEncontrosDropdown(): void {
    this.showEncontrosDropdown = !this.showEncontrosDropdown;
  }

  navegarParaEncontro(token: string): void {
    window.location.href = `/mentoria/${token}`;
  }

  /**
   * Obtém encontros publicados
   */
  getEncontrosPublicados(): any[] {
    if (!this.outrosEncontros) return [];
    return this.outrosEncontros.filter(e => e.status === 'published');
  }

  /**
   * Verifica se deve mostrar dropdown (2+ encontros publicados)
   */
  shouldShowDropdown(): boolean {
    return this.getEncontrosPublicados().length > 1;
  }

  /**
   * Verifica se deve mostrar botão voltar (apenas 1 encontro publicado)
   */
  shouldShowBackButton(): boolean {
    return this.getEncontrosPublicados().length === 1;
  }

  /**
   * Volta para o hub da mentoria
   */
  voltarParaHub(): void {
    if (!this.encontro?.mentoria_token) {
      console.error('Token da mentoria não encontrado');
      return;
    }
    window.location.href = `/mentoria-hub/${this.encontro.mentoria_token}`;
  }

  // ===== SALVAR RESPOSTAS DAS PERGUNTAS =====
  salvarRespostas(bloco: any): void {
    if (!this.token || this.expired || !bloco.perguntas) return;

    // Coletar todas as respostas
    const respostas: { [key: string]: string } = {};
    let hasRespostas = false;

    bloco.perguntas.forEach((pergunta: any, index: number) => {
      if (pergunta.respostaUsuario && pergunta.respostaUsuario.trim()) {
        respostas[`pergunta_${index}`] = pergunta.respostaUsuario;
        hasRespostas = true;
      }
    });

    if (!hasRespostas) {
      this.toastr.warning('Por favor, responda pelo menos uma pergunta antes de salvar.');
      return;
    }

    this.savingInteractions = true;

    // Salvar no backend
    this.mentoriaService.salvarInteracao(this.token, {
      bloco_id: bloco.id || 0,
      tipo_interacao: 'respostas_perguntas',
      valor: JSON.stringify({
        respostas: respostas,
        timestamp: new Date().toISOString()
      })
    }).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.toastr.success('Respostas salvas com sucesso!');
          console.log('Respostas salvas no banco de dados');
        }
        this.savingInteractions = false;
      },
      error: (error: any) => {
        console.error('Erro ao salvar respostas:', error);
        this.toastr.error('Erro ao salvar respostas. Tente novamente.');
        this.savingInteractions = false;
      }
    });
  }

  // ===== CARREGAR ESTADOS SALVOS =====
  carregarEstadosSalvos(): void {
    if (!this.token || !this.conteudoEstruturado) {
      console.warn('⚠️ carregarEstadosSalvos cancelado:', {
        token: !!this.token,
        conteudoEstruturado: !!this.conteudoEstruturado
      });
      return;
    }

    console.log('📥 Iniciando carregamento de estados salvos...');

    // Carregar interações antigas (perguntas e tarefas)
    this.mentoriaService.obterInteracoes(this.token).subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          response.data.forEach((interacao: any) => {
            try {
              // Para anotações de referência, não fazer parse
              if (interacao.tipo_interacao === 'anotacao_referencia' && interacao.chave_item) {
                const match = interacao.chave_item.match(/^referencia_(\d+)$/);
                if (match && this.conteudoEstruturado.referencias?.itens) {
                  const index = parseInt(match[1]);
                  if (this.conteudoEstruturado.referencias.itens[index]) {
                    this.conteudoEstruturado.referencias.itens[index].anotacaoMentorado = interacao.valor || '';
                  }
                }
                return; // Pular para próxima interação
              }

              // Para outros tipos, fazer parse
              const valor = JSON.parse(interacao.valor);

              // Restaurar respostas das perguntas
              if (interacao.tipo_interacao === 'respostas_perguntas' && valor.respostas) {
                if (this.conteudoEstruturado.proximosPassos && this.conteudoEstruturado.proximosPassos.blocos) {
                  this.conteudoEstruturado.proximosPassos.blocos.forEach((bloco: any) => {
                    if (bloco.tipo === 'perguntas' && bloco.perguntas && bloco.id === interacao.bloco_id) {
                      Object.keys(valor.respostas).forEach(key => {
                        const index = parseInt(key.replace('pergunta_', ''));
                        if (bloco.perguntas[index]) {
                          bloco.perguntas[index].respostaUsuario = valor.respostas[key];
                        }
                      });
                    }
                  });
                }
              }

              // Restaurar estado das tarefas
              if (interacao.tipo_interacao === 'tarefas_status' && valor.tarefas) {
                if (this.conteudoEstruturado.proximosPassos && this.conteudoEstruturado.proximosPassos.blocos) {
                  this.conteudoEstruturado.proximosPassos.blocos.forEach((bloco: any) => {
                    if (bloco.tipo === 'tarefas' && bloco.tarefas && bloco.tarefas.itens && bloco.id === interacao.bloco_id) {
                      valor.tarefas.forEach((tarefaSalva: any, index: number) => {
                        if (bloco.tarefas.itens[index]) {
                          if (typeof bloco.tarefas.itens[index] === 'string') {
                            bloco.tarefas.itens[index] = {
                              texto: bloco.tarefas.itens[index],
                              checked: tarefaSalva.checked || false
                            };
                          } else {
                            bloco.tarefas.itens[index].checked = tarefaSalva.checked || false
                          }
                        }
                      });
                    }
                  });
                }
              }
            } catch (e) {
              console.error('❌ Erro ao processar interação:', e, interacao);
            }
          });
        }
      },
      error: (error: any) => {
        console.error('❌ Erro ao carregar interações:', error);
      }
    });

    // Carregar Modelo ABC do banco de dados
    console.log('📋 Carregando Modelo ABC do banco de dados...');
    this.mentoriaService.obterModeloABCPublico(this.token).subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          console.log('✅ Modelo ABC carregado do banco:', response.data);
          this.modeloABCId = response.data.id;
          this.modeloABC = {
            adversidade: response.data.adversidade || '',
            pensamento: response.data.pensamento || '',
            consequencia: response.data.consequencia || '',
            antidotoExigencia: response.data.antidoto_exigencia || '',
            antidotoRotulo: response.data.antidoto_rotulo || '',
            fraseNocaute: response.data.frase_nocaute || '',
            planoAcao: response.data.plano_acao || '',
            nivelDisposicao: response.data.nivel_disposicao || 5,
            impedimentos: response.data.impedimentos || '',
            acaoImpedimentos: response.data.acao_impedimentos || ''
          };
        } else {
          console.log('ℹ️ Nenhum Modelo ABC encontrado no banco');
        }
      },
      error: (error: any) => {
        console.warn('⚠️ Erro ao carregar Modelo ABC:', error);
      }
    });

    // Carregar Zonas de Aprendizado do banco de dados
    console.log('📊 Carregando Zonas de Aprendizado do banco de dados...');
    this.mentoriaService.obterZonasAprendizadoPublico(this.token).subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          console.log('✅ Zonas de Aprendizado carregadas do banco:', response.data);
          this.zonasAprendizadoId = response.data.id;

          // Reconstruir array de palavras a partir dos 4 quadrantes
          const palavras: PalavraZona[] = [];

          if (response.data.zona_ansiedade) {
            response.data.zona_ansiedade.forEach((p: any) => {
              palavras.push({ id: p.id, texto: p.texto, zona: 'ansiedade' });
            });
          }
          if (response.data.zona_aprendizado) {
            response.data.zona_aprendizado.forEach((p: any) => {
              palavras.push({ id: p.id, texto: p.texto, zona: 'aprendizado' });
            });
          }
          if (response.data.zona_apatia) {
            response.data.zona_apatia.forEach((p: any) => {
              palavras.push({ id: p.id, texto: p.texto, zona: 'apatia' });
            });
          }
          if (response.data.zona_conforto) {
            response.data.zona_conforto.forEach((p: any) => {
              palavras.push({ id: p.id, texto: p.texto, zona: 'conforto' });
            });
          }

          this.zonasAprendizado.palavras = palavras;
        } else {
          console.log('ℹ️ Nenhuma Zona de Aprendizado encontrada no banco');
        }
      },
      error: (error: any) => {
        console.warn('⚠️ Erro ao carregar Zonas de Aprendizado:', error);
      }
    });

    // Carregar Mapa Mental do novo endpoint
    if (this.conteudoEstruturado.mapaMental?.ativo) {
      console.log('🗺️ Carregando Mapa Mental do banco de dados...');

      this.mentoriaService.obterMapaMentalPublico(this.token).subscribe({
        next: (response: any) => {
          if (response.success && response.data) {
            console.log('✅ Mapa Mental carregado do banco:', response.data);

            this.mapaMentalId = response.data.id;

            // Substituir estrutura do mapa mental com dados do banco
            if (response.data.data) {
              // Mapear colunas do formato do backend para o formato do frontend
              const colunasFormatadas = (response.data.data.colunas || []).map((col: any) => ({
                id: col.coluna_id || col.id,
                nome: col.nome,
                cor: col.cor,
                corBg: col.cor_bg || col.corBg,
                corBorda: col.cor_borda || col.corBorda,
                sort_order: col.sort_order
              }));

              // Mapear cards do formato do backend para o formato do frontend
              const cardsFormatados: any = {};
              Object.keys(response.data.data.cards || {}).forEach(colunaId => {
                cardsFormatados[colunaId] = (response.data.data.cards[colunaId] || []).map((card: any) => ({
                  id: card.card_id || card.id,
                  colunaId: card.coluna_id || card.colunaId || colunaId,
                  meta: card.meta || '',
                  indicador: card.indicador || '',
                  prazo: card.prazo || ''
                }));
              });

              // Mapear conexões
              const conexoesFormatadas = (response.data.data.conexoes || []).map((conn: any) => ({
                de: conn.de,
                para: conn.para
              }));

              this.conteudoEstruturado.mapaMental.data = {
                colunas: colunasFormatadas,
                cards: cardsFormatados,
                conexoes: conexoesFormatadas
              };

              const totalCards = Object.keys(cardsFormatados).reduce((acc, key) => {
                return acc + (Array.isArray(cardsFormatados[key]) ? cardsFormatados[key].length : 0);
              }, 0);

              console.log(`📊 Mapa Mental: ${colunasFormatadas.length} colunas, ${totalCards} cards, ${conexoesFormatadas.length} conexões`);
            }
          } else {
            console.log('ℹ️ Nenhum mapa mental encontrado no banco');
          }
        },
        error: (error: any) => {
          console.warn('⚠️ Erro ao carregar Mapa Mental:', error);
          // Se falhar, usuário começa com mapa vazio (já tem estrutura padrão do conteudoEstruturado)
        }
      });
    }

    // Carregar Termômetro de Gestão do banco de dados
    this.mentoriaService.obterTermometroGestaoPublico(this.token).subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          this.termometroGestaoId = response.data.id;

          // Parsear atividades do JSON
          const atividades = typeof response.data.atividades === 'string'
            ? JSON.parse(response.data.atividades)
            : response.data.atividades;

          this.termometroGestao = {
            atividades: atividades || [],
            perfilComparacao: response.data.perfil_comparacao || 'direção',
            percentualEstrategico: response.data.percentual_estrategico || 0,
            percentualTatico: response.data.percentual_tatico || 0,
            percentualOperacional: response.data.percentual_operacional || 0
          };

          // Atualizar gráficos após carregar dados
          if (this.termometroGestao.atividades.length > 0) {
            setTimeout(() => {
              this.atualizarGraficosTermometro();
            }, 500);
          }
        }
      },
      error: (error: any) => {
        console.error('Erro ao carregar Termômetro de Gestão:', error);
      }
    });

    // Carregar Roda da Vida MAAS do banco de dados
    console.log('🎯 Carregando Roda da Vida do banco de dados...');
    this.carregarRodaDaVida();

    // Carregar Ganhos e Perdas do banco de dados
    console.log('⚖️ Carregando Ganhos e Perdas do banco de dados...');
    this.carregarGanhosPerdas();

    // Carregar Controle de Hábitos do banco de dados
    console.log('📅 Carregando Controle de Hábitos do banco de dados...');
    this.carregarControleHabitos();

    // Carregar Golden Circle do banco de dados
    console.log('⭕ Carregando Golden Circle do banco de dados...');
    this.mentoriaService.obterGoldenCirclePublico(this.token).subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          console.log('✅ Golden Circle carregado do banco:', response.data);
          this.goldenCircleId = response.data.id;
          this.goldenCircle = {
            why: response.data.why || '',
            how: response.data.how || '',
            what: response.data.what || ''
          };
        }
      },
      error: (error: any) => {
        console.warn('⚠️ Erro ao carregar Golden Circle:', error);
      }
    });
  }

  // ===== AUTO-SAVE PARA RESPOSTAS =====
  salvarRespostaAutomaticamente(bloco: any, index: number): void {
    if (!this.token || this.expired || !bloco.perguntas) return;

    const pergunta = bloco.perguntas[index];
    if (!pergunta.respostaUsuario || !pergunta.respostaUsuario.trim()) return;

    // Salvar no backend silenciosamente
    this.mentoriaService.salvarInteracao(this.token, {
      bloco_id: bloco.id || 0,
      tipo_interacao: 'resposta_individual',
      valor: JSON.stringify({
        pergunta_index: index,
        resposta: pergunta.respostaUsuario,
        timestamp: new Date().toISOString()
      })
    }).subscribe({
      next: () => {
        console.log('Resposta salva automaticamente no banco');
      },
      error: (error: any) => {
        console.error('Erro ao salvar resposta:', error);
      }
    });
  }

  // ===== SALVAR ESTADO DAS TAREFAS =====
  salvarEstadoTarefa(bloco: any, index: number): void {
    if (!this.token || this.expired || !bloco.tarefas) return;

    // Salvar o estado de todas as tarefas do bloco
    const tarefasStatus = bloco.tarefas.itens.map((t: any) => ({
      texto: t.texto || t,
      checked: t.checked || false
    }));

    // Salvar no backend
    this.mentoriaService.salvarInteracao(this.token, {
      bloco_id: bloco.id || 0,
      tipo_interacao: 'tarefas_status',
      valor: JSON.stringify({
        tarefas: tarefasStatus,
        timestamp: new Date().toISOString()
      })
    }).subscribe({
      next: () => {
        console.log('Estado das tarefas salvo no banco');
      },
      error: (error: any) => {
        console.error('Erro ao salvar estado das tarefas:', error);
      }
    });
  }

  // ===== MAPA MENTAL =====

  adicionarNivelMapaMental(): void {
    if (!this.conteudoEstruturado?.mapaMental) return;

    const niveisAtuais = this.conteudoEstruturado.mapaMental.data.colunas.length - 2;
    const proximaLetra = this.nivelLetras[niveisAtuais];
    const corConfig = this.coresPredefinidas[niveisAtuais % this.coresPredefinidas.length];

    const novaColuna: MapaMentalColuna = {
      id: `nivel${proximaLetra}`,
      nome: `Nível ${proximaLetra}`,
      ...corConfig
    };

    this.conteudoEstruturado.mapaMental.data.colunas = [
      novaColuna,
      ...this.conteudoEstruturado.mapaMental.data.colunas
    ];

    this.salvarMapaMental();
  }

  removerNivelMapaMental(colunaId: string): void {
    if (!this.conteudoEstruturado?.mapaMental) return;

    // Verificar se é um nível protegido
    if (!this.podeRemoverNivel(colunaId)) {
      this.toastr.warning('Os níveis Visão, Metas e Nível A não podem ser removidos');
      return;
    }

    // Obter todos os IDs dos cards deste nível
    const cards = this.conteudoEstruturado.mapaMental.data.cards[colunaId] || [];
    const cardIds = cards.map((card: MapaMentalCard) => card.id);

    // Remover todas as conexões que envolvem cards deste nível
    this.conteudoEstruturado.mapaMental.data.conexoes =
      this.conteudoEstruturado.mapaMental.data.conexoes.filter(
        (c: MapaMentalConexao) => !cardIds.includes(c.de) && !cardIds.includes(c.para)
      );

    // Remover a coluna
    this.conteudoEstruturado.mapaMental.data.colunas =
      this.conteudoEstruturado.mapaMental.data.colunas.filter(
        (col: MapaMentalColuna) => col.id !== colunaId
      );

    // Remover todos os cards deste nível
    delete this.conteudoEstruturado.mapaMental.data.cards[colunaId];

    const totalRemovidos = cards.length;
    if (totalRemovidos > 0) {
      this.toastr.success(`Nível removido com sucesso (${totalRemovidos} card${totalRemovidos > 1 ? 's' : ''} deletado${totalRemovidos > 1 ? 's' : ''})`);
    } else {
      this.toastr.success('Nível removido com sucesso');
    }

    this.salvarMapaMental();
  }

  podeRemoverNivel(colunaId: string): boolean {
    // IDs dos níveis protegidos (Visão, Metas, Nível A)
    // Normalizar para lowercase para evitar problemas de case sensitivity
    const colunaIdLower = colunaId.toLowerCase();
    const niveisProtegidos = ['visao', 'metas', 'nivela'];
    return !niveisProtegidos.includes(colunaIdLower);
  }

  adicionarCardMapaMental(colunaId: string): void {
    if (!this.conteudoEstruturado?.mapaMental) return;

    const novoCard: MapaMentalCard = {
      id: `card-${Date.now()}`,
      colunaId,
      meta: '',
      indicador: '',
      prazo: ''
    };

    if (!this.conteudoEstruturado.mapaMental.data.cards[colunaId]) {
      this.conteudoEstruturado.mapaMental.data.cards[colunaId] = [];
    }

    this.conteudoEstruturado.mapaMental.data.cards[colunaId].push(novoCard);
    this.salvarMapaMental();
  }

  atualizarCardMapaMental(colunaId: string, cardId: string, campo: keyof MapaMentalCard, valor: string): void {
    if (!this.conteudoEstruturado?.mapaMental) return;

    const cards = this.conteudoEstruturado.mapaMental.data.cards[colunaId];
    if (!cards) return;

    const card = cards.find((c: MapaMentalCard) => c.id === cardId);
    if (card) {
      (card as any)[campo] = valor;
      this.salvarMapaMental();
    }
  }

  removerCardMapaMental(colunaId: string, cardId: string): void {
    if (!this.conteudoEstruturado?.mapaMental) return;

    const cards = this.conteudoEstruturado.mapaMental.data.cards[colunaId];
    if (!cards) return;

    this.conteudoEstruturado.mapaMental.data.cards[colunaId] = cards.filter((c: MapaMentalCard) => c.id !== cardId);

    // Remove conexões relacionadas
    this.conteudoEstruturado.mapaMental.data.conexoes =
      this.conteudoEstruturado.mapaMental.data.conexoes.filter(
        (c: MapaMentalConexao) => c.de !== cardId && c.para !== cardId
      );

    this.salvarMapaMental();
  }

  iniciarConexaoMapaMental(cardId: string): void {
    if (!this.conteudoEstruturado?.mapaMental) return;

    if (this.mapaMentalConectando === cardId) {
      // Cancelar conexão
      this.mapaMentalConectando = null;
      this.toastr.info('Modo de conexão cancelado');
    } else if (this.mapaMentalConectando) {
      // Criar conexão
      const cardOrigem = this.obterCardPorId(this.mapaMentalConectando);
      const cardDestino = this.obterCardPorId(cardId);

      this.conteudoEstruturado.mapaMental.data.conexoes.push({
        de: this.mapaMentalConectando,
        para: cardId
      });
      this.mapaMentalConectando = null;

      const origemTexto = cardOrigem?.meta || 'Card';
      const destinoTexto = cardDestino?.meta || 'Card';
      this.toastr.success(`Conexão criada: "${origemTexto}" → "${destinoTexto}"`);
      this.salvarMapaMental();
    } else {
      // Iniciar modo de conexão
      this.mapaMentalConectando = cardId;
    }
  }

  removerConexaoMapaMental(index: number): void {
    if (!this.conteudoEstruturado?.mapaMental) return;

    this.conteudoEstruturado.mapaMental.data.conexoes.splice(index, 1);
    this.salvarMapaMental();
  }

  obterCardPorId(cardId: string): MapaMentalCard | undefined {
    if (!this.conteudoEstruturado?.mapaMental) return undefined;

    for (const colunaId in this.conteudoEstruturado.mapaMental.data.cards) {
      const card = this.conteudoEstruturado.mapaMental.data.cards[colunaId].find((c: MapaMentalCard) => c.id === cardId);
      if (card) return card;
    }
    return undefined;
  }

  obterConexoesDoCard(cardId: string): MapaMentalConexao[] {
    if (!this.conteudoEstruturado?.mapaMental) return [];
    return this.conteudoEstruturado.mapaMental.data.conexoes.filter((c: MapaMentalConexao) => c.de === cardId);
  }

  obterNomeColunaDoCard(cardId: string): string {
    if (!this.conteudoEstruturado?.mapaMental) return '';

    // Encontrar o card e sua coluna
    for (const colunaId in this.conteudoEstruturado.mapaMental.data.cards) {
      const card = this.conteudoEstruturado.mapaMental.data.cards[colunaId].find((c: MapaMentalCard) => c.id === cardId);
      if (card) {
        // Encontrar a coluna pelo ID
        const coluna = this.conteudoEstruturado.mapaMental.data.colunas.find((col: MapaMentalColuna) => col.id === colunaId);
        return coluna ? coluna.nome : '';
      }
    }
    return '';
  }

  salvarMapaMental(): void {
    // Método silencioso sem debounce - apenas marca que há alterações pendentes
    // O usuário deve clicar em "Salvar Mapa" para persistir
    if (!this.token || this.expired || !this.conteudoEstruturado?.mapaMental) {
      return;
    }
    // Não faz nada automaticamente - usuário precisa salvar manualmente
  }

  onCardDrop(event: CdkDragDrop<MapaMentalCard[]>, colunaId: string): void {
    if (!this.conteudoEstruturado?.mapaMental) return;

    const cards = this.conteudoEstruturado.mapaMental.data.cards[colunaId];
    if (!cards) return;

    // Reordenar os cards usando a função do CDK
    moveItemInArray(cards, event.previousIndex, event.currentIndex);

    // Atualizar o array de cards
    this.conteudoEstruturado.mapaMental.data.cards[colunaId] = [...cards];

    // Marcar para salvar (usuário precisa clicar em "Salvar Mapa")
    this.salvarMapaMental();
  }

  salvarMapaMentalManual(): void {
    if (!this.token || this.expired || !this.conteudoEstruturado?.mapaMental) {
      console.warn('⚠️ Salvamento do Mapa Mental cancelado:', {
        token: !!this.token,
        expired: this.expired,
        mapaMental: !!this.conteudoEstruturado?.mapaMental
      });
      this.toastr.warning('Não foi possível salvar o mapa mental');
      return;
    }

    if (!this.mapaMentalId) {
      console.error('❌ Mapa Mental ID não encontrado');
      this.toastr.error('Erro: ID do mapa mental não encontrado');
      return;
    }

    // Verificar se há cards para salvar
    const totalCards = Object.keys(this.conteudoEstruturado.mapaMental.data.cards).reduce((acc, key) => {
      return acc + (Array.isArray(this.conteudoEstruturado.mapaMental.data.cards[key]) ? this.conteudoEstruturado.mapaMental.data.cards[key].length : 0);
    }, 0);

    if (totalCards === 0) {
      console.warn('⚠️ Nenhum card para salvar no Mapa Mental');
      this.toastr.info('Adicione cards ao mapa mental antes de salvar');
      return;
    }

    this.salvandoMapaMental = true;

    // Log completo dos dados que serão salvos
    console.log('💾 Salvando Mapa Mental manualmente...', {
      mapaMentalId: this.mapaMentalId,
      colunas: this.conteudoEstruturado.mapaMental.data.colunas.length,
      totalCards: totalCards,
      conexoes: this.conteudoEstruturado.mapaMental.data.conexoes.length,
      estruturaCompleta: this.conteudoEstruturado.mapaMental.data
    });

    // Salvar no novo endpoint de banco de dados dedicado
    this.mentoriaService.salvarMapaMentalCompleto(
      this.mapaMentalId,
      this.conteudoEstruturado.mapaMental.data
    ).subscribe({
      next: (response) => {
        console.log('✅ Mapa Mental salvo no banco de dados com sucesso!', response);
        this.toastr.success('Mapa Mental salvo com sucesso!');
        this.salvandoMapaMental = false;
      },
      error: (error: any) => {
        console.error('❌ Erro ao salvar Mapa Mental:', error);
        this.toastr.error('Erro ao salvar alterações do Mapa Mental');
        this.salvandoMapaMental = false;
      }
    });
  }

  trackByFn(index: number): number {
    return index;
  }

  // ===== EXPORTAÇÃO DO MAPA MENTAL =====

  toggleExportDropdown(): void {
    this.showExportDropdown = !this.showExportDropdown;
  }

  async exportarMapaMentalPNG(): Promise<void> {
    this.showExportDropdown = false; // Fechar dropdown após seleção
    if (!this.conteudoEstruturado?.mapaMental) {
      this.toastr.error('Nenhum mapa mental disponível para exportar');
      return;
    }

    try {
      this.toastr.info('Gerando imagem do mapa mental...');

      // Criar container temporário para renderização
      const container = this.criarContainerVisualizacao();
      document.body.appendChild(container);

      // Aguardar renderização
      await new Promise(resolve => setTimeout(resolve, 100));

      // Capturar como imagem
      const canvas = await html2canvas(container, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        width: container.scrollWidth,
        height: container.scrollHeight
      });

      // Remover container temporário
      document.body.removeChild(container);

      // Converter para blob e fazer download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `mapa-mental-${this.encontro?.mentorado_nome || 'mentoria'}-${Date.now()}.png`;
          link.click();
          URL.revokeObjectURL(url);
          this.toastr.success('Imagem exportada com sucesso!');
        }
      });
    } catch (error) {
      console.error('Erro ao exportar PNG:', error);
      this.toastr.error('Erro ao exportar imagem');
    }
  }

  async exportarMapaMentalPDF(): Promise<void> {
    this.showExportDropdown = false; // Fechar dropdown após seleção
    if (!this.conteudoEstruturado?.mapaMental) {
      this.toastr.error('Nenhum mapa mental disponível para exportar');
      return;
    }

    try {
      this.toastr.info('Gerando PDF do mapa mental...');

      // Criar container temporário para renderização
      const container = this.criarContainerVisualizacao();
      document.body.appendChild(container);

      // Aguardar renderização
      await new Promise(resolve => setTimeout(resolve, 100));

      // Capturar como imagem
      const canvas = await html2canvas(container, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        width: container.scrollWidth,
        height: container.scrollHeight
      });

      // Remover container temporário
      document.body.removeChild(container);

      // Converter para PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`mapa-mental-${this.encontro?.mentorado_nome || 'mentoria'}-${Date.now()}.pdf`);

      this.toastr.success('PDF exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      this.toastr.error('Erro ao exportar PDF');
    }
  }

  exportarMapaMentalICS(): void {
    this.showExportDropdown = false; // Fechar dropdown após seleção
    if (!this.conteudoEstruturado?.mapaMental) {
      this.toastr.error('Nenhum mapa mental disponível para exportar');
      return;
    }

    try {
      // Coletar todos os cards com prazo
      const todosCards: Array<MapaMentalCard & {colunaNome: string}> = [];
      const colunas = this.conteudoEstruturado.mapaMental.data.colunas;
      const cardsData = this.conteudoEstruturado.mapaMental.data.cards;

      colunas.forEach((coluna: MapaMentalColuna) => {
        const colCards = cardsData[coluna.id] || [];
        colCards.forEach((card: MapaMentalCard) => {
          if (card.prazo) {
            todosCards.push({ ...card, colunaNome: coluna.nome });
          }
        });
      });

      if (todosCards.length === 0) {
        this.toastr.warning('Nenhum card com prazo definido para exportar');
        return;
      }

      // Gerar conteúdo ICS (iCalendar)
      const icsLines: string[] = [];
      icsLines.push('BEGIN:VCALENDAR');
      icsLines.push('VERSION:2.0');
      icsLines.push('PRODID:-//NAUE//Mapa Mental//PT-BR');
      icsLines.push('CALSCALE:GREGORIAN');
      icsLines.push('METHOD:PUBLISH');
      icsLines.push(`X-WR-CALNAME:Mapa Mental - ${this.encontro?.mentorado_nome || 'Mentoria'}`);
      icsLines.push('X-WR-TIMEZONE:America/Sao_Paulo');

      todosCards.forEach((card) => {
        const prazoDate = new Date(card.prazo);
        const uid = `${card.id}@naue.com`;
        const dtstart = this.formatDateForICS(prazoDate);
        const dtend = this.formatDateForICS(prazoDate);
        const dtstamp = this.formatDateForICS(new Date());

        icsLines.push('BEGIN:VEVENT');
        icsLines.push(`UID:${uid}`);
        icsLines.push(`DTSTAMP:${dtstamp}`);
        icsLines.push(`DTSTART;VALUE=DATE:${dtstart}`);
        icsLines.push(`DTEND;VALUE=DATE:${dtend}`);
        icsLines.push(`SUMMARY:${this.escapeICSText(card.meta || 'Meta sem título')}`);
        icsLines.push(`DESCRIPTION:${this.escapeICSText(`[${card.colunaNome}]\\n\\nMeta: ${card.meta}\\n\\nIndicador de Sucesso: ${card.indicador || 'Não definido'}`)}`);
        icsLines.push(`LOCATION:${this.escapeICSText(card.colunaNome)}`);
        icsLines.push('STATUS:CONFIRMED');
        icsLines.push('TRANSP:OPAQUE');
        icsLines.push('END:VEVENT');
      });

      icsLines.push('END:VCALENDAR');

      // Criar blob e fazer download
      const icsContent = icsLines.join('\r\n');
      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mapa-mental-${this.encontro?.mentorado_nome || 'mentoria'}-${Date.now()}.ics`;
      link.click();
      URL.revokeObjectURL(url);

      this.toastr.success(`Agenda exportada com sucesso! (${todosCards.length} evento${todosCards.length > 1 ? 's' : ''})`);
    } catch (error) {
      console.error('Erro ao exportar ICS:', error);
      this.toastr.error('Erro ao exportar agenda');
    }
  }


  exportarMapaMentalMarkdown(): void {
    this.showExportDropdown = false; // Fechar dropdown após seleção
    if (!this.conteudoEstruturado?.mapaMental) {
      this.toastr.error('Nenhum mapa mental disponível para exportar');
      return;
    }

    try {
      const mdLines: string[] = [];

      // Cabeçalho
      mdLines.push(`# PDM | Plano de Desenvolvimento de Metas`);
      mdLines.push('');
      mdLines.push(`**Mentorado:** ${this.encontro?.mentorado_nome || 'Mentoria'}`);
      mdLines.push(`**Encontro:** ${this.encontro?.numero_encontro || ''}`);
      mdLines.push(`**Data de Exportação:** ${new Date().toLocaleDateString('pt-BR')}`);
      mdLines.push('');
      mdLines.push('---');
      mdLines.push('');

      // Usar a ordem atual das colunas (sem reordenar)
      const colunas = this.conteudoEstruturado.mapaMental.data.colunas;
      const cardsData = this.conteudoEstruturado.mapaMental.data.cards;
      const colunasOrdenadas = colunas; // Manter ordem atual

      // Adicionar cards por coluna
      colunasOrdenadas.forEach((coluna: MapaMentalColuna) => {
        const colCards = cardsData[coluna.id] || [];

        mdLines.push(`## ${coluna.nome}`);
        mdLines.push('');

        if (colCards.length === 0) {
          mdLines.push('*Nenhum card nesta coluna*');
          mdLines.push('');
        } else {
          colCards.forEach((card: MapaMentalCard, index: number) => {
            mdLines.push(`### ${index + 1}. ${card.meta || 'Meta sem título'}`);
            mdLines.push('');

            if (card.meta) {
              mdLines.push(`**Meta:** ${card.meta}`);
              mdLines.push('');
            }

            if (card.indicador) {
              mdLines.push(`**Indicador de Sucesso (IS):** ${card.indicador}`);
              mdLines.push('');
            }

            if (card.prazo) {
              mdLines.push(`**Prazo:** ${new Date(card.prazo).toLocaleDateString('pt-BR')}`);
              mdLines.push('');
            }

            // Conexões
            const conexoes = this.conteudoEstruturado.mapaMental.data.conexoes.filter(
              (c: MapaMentalConexao) => c.de === card.id
            );

            if (conexoes.length > 0) {
              mdLines.push('**Conexões:**');
              conexoes.forEach((conexao: MapaMentalConexao) => {
                const cardDestino = this.obterCardPorId(conexao.para);
                const colunaNome = this.obterNomeColunaDoCard(conexao.para);
                mdLines.push(`- → ${cardDestino?.meta || 'Card'} (${colunaNome})`);
              });
              mdLines.push('');
            }

            mdLines.push('---');
            mdLines.push('');
          });
        }
      });

      // Adicionar legenda de conexões no final
      const conexoes = this.conteudoEstruturado.mapaMental.data.conexoes;
      if (conexoes.length > 0) {
        mdLines.push('## Resumo de Conexões Estratégicas');
        mdLines.push('');
        conexoes.forEach((conexao: MapaMentalConexao) => {
          const cardOrigem = this.obterCardPorId(conexao.de);
          const cardDestino = this.obterCardPorId(conexao.para);
          const colunaOrigem = this.obterNomeColunaDoCard(conexao.de);
          const colunaDestino = this.obterNomeColunaDoCard(conexao.para);

          mdLines.push(`- **${cardOrigem?.meta || 'Card'}** (${colunaOrigem}) → **${cardDestino?.meta || 'Card'}** (${colunaDestino})`);
        });
        mdLines.push('');
      }

      // Footer
      mdLines.push('---');
      mdLines.push('');
      mdLines.push('*Documento gerado automaticamente pelo Sistema de Mentoria NAUE*');

      // Criar blob e fazer download
      const mdContent = mdLines.join('\n');
      const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mapa-mental-${this.encontro?.mentorado_nome || 'mentoria'}-${Date.now()}.md`;
      link.click();
      URL.revokeObjectURL(url);

      this.toastr.success('Markdown exportado com sucesso! Pronto para importar no Notion');
    } catch (error) {
      console.error('Erro ao exportar Markdown:', error);
      this.toastr.error('Erro ao exportar Markdown');
    }
  }

  private formatDateForICS(date: Date): string {
    // Formato: YYYYMMDD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }

  private escapeICSText(text: string): string {
    // Escapar caracteres especiais no formato ICS
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  }

  private criarContainerVisualizacao(): HTMLElement {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.background = '#ffffff';
    container.style.padding = '60px';
    container.style.minWidth = '2200px';
    container.style.minHeight = '1400px';
    container.style.fontFamily = 'Arial, sans-serif';

    // Logo no canto superior esquerdo
    const logo = document.createElement('img');
    logo.src = '/logoNaue.png';
    logo.style.position = 'absolute';
    logo.style.top = '40px';
    logo.style.left = '40px';
    logo.style.height = '45px';
    logo.style.width = 'auto';
    logo.style.objectFit = 'contain';
    logo.style.zIndex = '10';
    container.appendChild(logo);

    // Título e informações centralizados
    const header = document.createElement('div');
    header.style.textAlign = 'center';
    header.style.marginBottom = '60px';
    header.style.marginTop = '40px';
    header.style.color = '#022c22';

    // Título
    const h1 = document.createElement('h1');
    h1.textContent = 'PDM | Plano de Desenvolvimento de Metas';
    h1.style.fontSize = '36px';
    h1.style.margin = '0 0 15px 0';
    h1.style.fontWeight = 'bold';
    h1.style.color = '#022c22';
    header.appendChild(h1);

    // Info do mentorado e número do encontro (combinados)
    const info = document.createElement('div');
    info.textContent = `${this.encontro?.mentorado_nome || 'Mentoria'} - Encontro ${this.encontro?.numero_encontro || ''}`;
    info.style.fontSize = '18px';
    info.style.fontWeight = '600';
    info.style.color = '#666';
    header.appendChild(info);

    container.appendChild(header);

    // Criar SVG para as linhas de conexão
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.pointerEvents = 'none';
    svg.style.zIndex = '1';

    // Container para os cards (acima das linhas)
    const grafoContainer = document.createElement('div');
    grafoContainer.style.position = 'relative';
    grafoContainer.style.width = '100%';
    grafoContainer.style.minHeight = '800px';
    grafoContainer.style.zIndex = '2';

    // Coletar todos os cards mantendo a ordem atual das colunas
    const todosCards: Array<{card: MapaMentalCard, coluna: MapaMentalColuna}> = [];
    const colunas = this.conteudoEstruturado.mapaMental.data.colunas;
    const cardsData = this.conteudoEstruturado.mapaMental.data.cards;

    // Manter ordem atual das colunas (sem reordenar)
    const colunasOrdenadas = colunas;

    colunasOrdenadas.forEach((coluna: MapaMentalColuna) => {
      const colCards = cardsData[coluna.id] || [];
      colCards.forEach((card: MapaMentalCard) => {
        todosCards.push({ card, coluna });
      });
    });

    // Calcular posições dos cards (layout circular ou em camadas)
    const cardPositions = this.calcularPosicoesCards(todosCards, grafoContainer);

    // Renderizar linhas de conexão primeiro
    const conexoes = this.conteudoEstruturado.mapaMental.data.conexoes;
    conexoes.forEach((conexao: MapaMentalConexao) => {
      const posOrigem = cardPositions.get(conexao.de);
      const posDestino = cardPositions.get(conexao.para);

      if (posOrigem && posDestino) {
        this.desenharLinha(svg, posOrigem, posDestino);
      }
    });

    grafoContainer.appendChild(svg);
    container.appendChild(grafoContainer);

    return container;
  }

  private calcularPosicoesCards(
    todosCards: Array<{card: MapaMentalCard, coluna: MapaMentalColuna}>,
    container: HTMLElement
  ): Map<string, {x: number, y: number, width: number, height: number}> {
    const positions = new Map();
    const cardWidth = 280;
    const cardHeight = 180;
    const horizontalSpacing = 400; // Espaçamento entre colunas
    const verticalSpacing = 220; // Espaçamento entre cards verticalmente
    const startX = 200; // Começar da esquerda
    const startY = 200;

    // Agrupar cards por coluna
    const cardsPorColuna = new Map<string, Array<{card: MapaMentalCard, coluna: MapaMentalColuna}>>();
    todosCards.forEach(item => {
      if (!cardsPorColuna.has(item.coluna.id)) {
        cardsPorColuna.set(item.coluna.id, []);
      }
      cardsPorColuna.get(item.coluna.id)!.push(item);
    });

    // Manter ordem original das colunas (sem reordenar)
    // Pegar a ordem das colunas do array original
    const colunas = this.conteudoEstruturado.mapaMental.data.colunas;
    const colunasOrdenadas = colunas.map((col: MapaMentalColuna) => col.id).filter((id: string) => cardsPorColuna.has(id));

    // Posicionar cards por coluna, da esquerda para direita
    let colunaIndex = 0;
    colunasOrdenadas.forEach((colunaId: string) => {
      const cardsColuna = cardsPorColuna.get(colunaId)!;
      const x = startX + (colunaIndex * horizontalSpacing);

      // Calcular altura total da coluna para centralizar verticalmente
      const alturaTotal = cardsColuna.length * cardHeight + (cardsColuna.length - 1) * (verticalSpacing - cardHeight);
      const offsetY = startY - (alturaTotal / 2);

      // Adicionar label da coluna acima dos cards
      const labelColuna = document.createElement('div');
      labelColuna.textContent = cardsColuna[0].coluna.nome;
      labelColuna.style.position = 'absolute';
      labelColuna.style.left = `${x}px`;
      labelColuna.style.top = `${offsetY - 60}px`;
      labelColuna.style.width = `${cardWidth}px`;
      labelColuna.style.textAlign = 'center';
      labelColuna.style.fontSize = '18px';
      labelColuna.style.fontWeight = 'bold';
      labelColuna.style.color = cardsColuna[0].coluna.cor;
      labelColuna.style.textTransform = 'uppercase';
      labelColuna.style.letterSpacing = '1px';
      container.appendChild(labelColuna);

      cardsColuna.forEach((item, cardIndex) => {
        const y = offsetY + cardIndex * verticalSpacing;

        // Criar e posicionar o card
        const cardElement = this.criarCardGrafo(item.card, item.coluna);
        cardElement.style.position = 'absolute';
        cardElement.style.left = `${x}px`;
        cardElement.style.top = `${y}px`;
        cardElement.style.width = `${cardWidth}px`;

        container.appendChild(cardElement);

        // Salvar posição central do card para desenhar linhas
        positions.set(item.card.id, {
          x: x + cardWidth / 2,
          y: y + cardHeight / 2,
          width: cardWidth,
          height: cardHeight
        });
      });

      colunaIndex++;
    });

    return positions;
  }

  private desenharLinha(
    svg: SVGElement,
    origem: {x: number, y: number, width: number, height: number},
    destino: {x: number, y: number, width: number, height: number}
  ): void {
    // Calcular pontos nas bordas dos cards ao invés do centro
    const pontoBorda = this.calcularPontoBorda(origem, destino);
    const pontoDestinoAjustado = this.calcularPontoBorda(destino, origem);

    // Calcular pontos de controle para curva bezier suave
    const dx = pontoDestinoAjustado.x - pontoBorda.x;
    const dy = pontoDestinoAjustado.y - pontoBorda.y;

    // Pontos de controle para criar uma curva suave horizontal
    const controlOffset = Math.abs(dx) * 0.5;
    const cp1x = pontoBorda.x + controlOffset;
    const cp1y = pontoBorda.y;
    const cp2x = pontoDestinoAjustado.x - controlOffset;
    const cp2y = pontoDestinoAjustado.y;

    // Criar path com curva bezier
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const pathData = `M ${pontoBorda.x} ${pontoBorda.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${pontoDestinoAjustado.x} ${pontoDestinoAjustado.y}`;
    path.setAttribute('d', pathData);
    path.setAttribute('stroke', '#047857');
    path.setAttribute('stroke-width', '2.5');
    path.setAttribute('stroke-opacity', '0.8');
    path.setAttribute('fill', 'none');
    path.setAttribute('marker-end', 'url(#arrowhead)');

    // Adicionar marcador de seta (definir apenas uma vez)
    if (!svg.querySelector('#arrowhead')) {
      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
      marker.setAttribute('id', 'arrowhead');
      marker.setAttribute('markerWidth', '10');
      marker.setAttribute('markerHeight', '10');
      marker.setAttribute('refX', '9');
      marker.setAttribute('refY', '3');
      marker.setAttribute('orient', 'auto');

      const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      polygon.setAttribute('points', '0 0, 10 3, 0 6');
      polygon.setAttribute('fill', '#047857');
      polygon.setAttribute('fill-opacity', '0.8');

      marker.appendChild(polygon);
      defs.appendChild(marker);
      svg.appendChild(defs);
    }

    svg.appendChild(path);
  }

  private calcularPontoBorda(
    cardOrigem: {x: number, y: number, width: number, height: number},
    cardDestino: {x: number, y: number, width: number, height: number}
  ): {x: number, y: number} {
    // Calcular vetor direção do centro do card origem para o centro do card destino
    const dx = cardDestino.x - cardOrigem.x;
    const dy = cardDestino.y - cardOrigem.y;
    const angulo = Math.atan2(dy, dx);

    // Dimensões do card
    const halfWidth = cardOrigem.width / 2;
    const halfHeight = cardOrigem.height / 2;

    // Calcular ponto de intersecção na borda do card
    let x: number, y: number;

    // Determinar qual borda intersecta (esquerda, direita, topo ou fundo)
    const tan = Math.abs(Math.tan(angulo));
    const cardRatio = halfHeight / halfWidth;

    if (tan <= cardRatio) {
      // Intersecção nas bordas esquerda ou direita
      if (Math.cos(angulo) > 0) {
        // Direita
        x = cardOrigem.x + halfWidth;
        y = cardOrigem.y + halfWidth * Math.tan(angulo);
      } else {
        // Esquerda
        x = cardOrigem.x - halfWidth;
        y = cardOrigem.y - halfWidth * Math.tan(angulo);
      }
    } else {
      // Intersecção nas bordas topo ou fundo
      if (Math.sin(angulo) > 0) {
        // Fundo
        x = cardOrigem.x + halfHeight / Math.tan(angulo);
        y = cardOrigem.y + halfHeight;
      } else {
        // Topo
        x = cardOrigem.x - halfHeight / Math.tan(angulo);
        y = cardOrigem.y - halfHeight;
      }
    }

    return { x, y };
  }

  private criarCardGrafo(card: MapaMentalCard, coluna: MapaMentalColuna): HTMLElement {
    const cardDiv = document.createElement('div');
    cardDiv.style.background = 'white';
    cardDiv.style.borderRadius = '16px';
    cardDiv.style.padding = '16px';
    cardDiv.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.3)';
    cardDiv.style.border = `3px solid ${coluna.cor}`;
    cardDiv.style.minHeight = '160px';
    cardDiv.style.display = 'flex';
    cardDiv.style.flexDirection = 'column';
    cardDiv.style.gap = '8px';

    // Badge da coluna
    const badge = document.createElement('div');
    badge.textContent = coluna.nome;
    badge.style.fontSize = '10px';
    badge.style.fontWeight = '700';
    badge.style.color = 'white';
    badge.style.background = coluna.cor;
    badge.style.padding = '4px 10px';
    badge.style.borderRadius = '6px';
    badge.style.alignSelf = 'flex-start';
    badge.style.textTransform = 'uppercase';
    badge.style.letterSpacing = '0.5px';
    cardDiv.appendChild(badge);

    // Meta
    if (card.meta) {
      const metaDiv = document.createElement('div');
      metaDiv.style.flex = '1';

      const metaLabel = document.createElement('div');
      metaLabel.textContent = 'META';
      metaLabel.style.fontSize = '9px';
      metaLabel.style.fontWeight = '700';
      metaLabel.style.color = '#666';
      metaLabel.style.marginBottom = '4px';
      metaLabel.style.letterSpacing = '0.5px';

      const metaText = document.createElement('div');
      metaText.textContent = card.meta;
      metaText.style.color = '#022c22';
      metaText.style.fontSize = '13px';
      metaText.style.fontWeight = '600';
      metaText.style.lineHeight = '1.4';

      metaDiv.appendChild(metaLabel);
      metaDiv.appendChild(metaText);
      cardDiv.appendChild(metaDiv);
    }

    // Indicador e Prazo
    const footer = document.createElement('div');
    footer.style.fontSize = '11px';
    footer.style.color = '#666';
    footer.style.borderTop = '1px solid #e5e7eb';
    footer.style.paddingTop = '8px';
    footer.style.marginTop = 'auto';

    if (card.indicador) {
      const isDiv = document.createElement('div');
      isDiv.innerHTML = `<strong>IS:</strong> ${card.indicador}`;
      isDiv.style.marginBottom = '4px';
      footer.appendChild(isDiv);
    }

    if (card.prazo) {
      const prazoDiv = document.createElement('div');
      prazoDiv.innerHTML = `<strong>Prazo:</strong> ${new Date(card.prazo).toLocaleDateString('pt-BR')}`;
      footer.appendChild(prazoDiv);
    }

    if (card.indicador || card.prazo) {
      cardDiv.appendChild(footer);
    }

    return cardDiv;
  }

  private criarColunaVisualizacao(coluna: MapaMentalColuna, cards: MapaMentalCard[]): HTMLElement {
    const colunaDiv = document.createElement('div');
    colunaDiv.style.minWidth = '350px';
    colunaDiv.style.maxWidth = '350px';

    // Cabeçalho da coluna
    const header = document.createElement('div');
    header.style.background = 'linear-gradient(135deg, #022c22 0%, #00B74F 100%)';
    header.style.color = 'white';
    header.style.padding = '20px';
    header.style.borderRadius = '20px';
    header.style.marginBottom = '20px';
    header.style.textAlign = 'center';
    header.style.fontSize = '20px';
    header.style.fontWeight = 'bold';
    header.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.2)';
    header.textContent = coluna.nome;
    colunaDiv.appendChild(header);

    // Cards
    if (cards.length === 0) {
      const emptyMsg = document.createElement('p');
      emptyMsg.style.color = '#888';
      emptyMsg.style.textAlign = 'center';
      emptyMsg.style.fontSize = '14px';
      emptyMsg.textContent = 'Nenhum card nesta coluna';
      colunaDiv.appendChild(emptyMsg);
    } else {
      cards.forEach((card: MapaMentalCard) => {
        const cardDiv = this.criarCardVisualizacao(card);
        colunaDiv.appendChild(cardDiv);
      });
    }

    return colunaDiv;
  }

  private criarCardVisualizacao(card: MapaMentalCard): HTMLElement {
    const cardDiv = document.createElement('div');
    cardDiv.style.background = 'white';
    cardDiv.style.borderRadius = '20px';
    cardDiv.style.padding = '20px';
    cardDiv.style.marginBottom = '15px';
    cardDiv.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.15)';
    cardDiv.style.borderLeft = '4px solid #00B74F';

    // Meta
    if (card.meta) {
      const metaDiv = document.createElement('div');
      metaDiv.style.marginBottom = '12px';

      const metaLabel = document.createElement('strong');
      metaLabel.textContent = 'Meta: ';
      metaLabel.style.color = '#022c22';
      metaLabel.style.fontSize = '14px';

      const metaText = document.createElement('span');
      metaText.textContent = card.meta;
      metaText.style.color = '#333';
      metaText.style.fontSize = '14px';

      metaDiv.appendChild(metaLabel);
      metaDiv.appendChild(metaText);
      cardDiv.appendChild(metaDiv);
    }

    // Indicador de Sucesso
    if (card.indicador) {
      const indicadorDiv = document.createElement('div');
      indicadorDiv.style.marginBottom = '12px';

      const indicadorLabel = document.createElement('strong');
      indicadorLabel.textContent = 'IS: ';
      indicadorLabel.style.color = '#022c22';
      indicadorLabel.style.fontSize = '14px';

      const indicadorText = document.createElement('span');
      indicadorText.textContent = card.indicador;
      indicadorText.style.color = '#333';
      indicadorText.style.fontSize = '14px';

      indicadorDiv.appendChild(indicadorLabel);
      indicadorDiv.appendChild(indicadorText);
      cardDiv.appendChild(indicadorDiv);
    }

    // Prazo
    if (card.prazo) {
      const prazoDiv = document.createElement('div');
      prazoDiv.style.marginBottom = '12px';

      const prazoLabel = document.createElement('strong');
      prazoLabel.textContent = 'Prazo: ';
      prazoLabel.style.color = '#022c22';
      prazoLabel.style.fontSize = '14px';

      const prazoText = document.createElement('span');
      prazoText.textContent = new Date(card.prazo).toLocaleDateString('pt-BR');
      prazoText.style.color = '#333';
      prazoText.style.fontSize = '14px';

      prazoDiv.appendChild(prazoLabel);
      prazoDiv.appendChild(prazoText);
      cardDiv.appendChild(prazoDiv);
    }

    // Conexões
    const conexoes = this.obterConexoesDoCard(card.id);
    if (conexoes.length > 0) {
      const conexoesDiv = document.createElement('div');
      conexoesDiv.style.marginTop = '15px';
      conexoesDiv.style.paddingTop = '15px';
      conexoesDiv.style.borderTop = '1px solid #e5e7eb';

      const conexoesLabel = document.createElement('strong');
      conexoesLabel.textContent = 'CONEXÕES: ';
      conexoesLabel.style.color = '#00B74F';
      conexoesLabel.style.fontSize = '12px';
      conexoesDiv.appendChild(conexoesLabel);

      conexoes.forEach((conexao: MapaMentalConexao) => {
        const badge = document.createElement('span');
        badge.textContent = `→ ${this.obterNomeColunaDoCard(conexao.para)}`;
        badge.style.display = 'inline-block';
        badge.style.background = 'rgba(0, 183, 79, 0.1)';
        badge.style.color = '#022c22';
        badge.style.padding = '4px 10px';
        badge.style.borderRadius = '8px';
        badge.style.fontSize = '12px';
        badge.style.marginLeft = '5px';
        badge.style.marginTop = '5px';
        badge.style.border = '1px solid rgba(0, 183, 79, 0.3)';
        conexoesDiv.appendChild(badge);
      });

      cardDiv.appendChild(conexoesDiv);
    }

    return cardDiv;
  }

  private criarConexoesVisualizacao(conexoes: MapaMentalConexao[]): HTMLElement {
    const conexoesContainer = document.createElement('div');
    conexoesContainer.style.marginTop = '40px';
    conexoesContainer.style.background = 'rgba(255, 255, 255, 0.05)';
    conexoesContainer.style.borderRadius = '20px';
    conexoesContainer.style.padding = '30px';
    conexoesContainer.style.border = '1px solid rgba(255, 255, 255, 0.1)';

    const titulo = document.createElement('h3');
    titulo.textContent = 'Conexões Estratégicas';
    titulo.style.color = 'white';
    titulo.style.fontSize = '24px';
    titulo.style.marginBottom = '20px';
    titulo.style.textAlign = 'center';
    conexoesContainer.appendChild(titulo);

    const lista = document.createElement('div');
    lista.style.display = 'grid';
    lista.style.gridTemplateColumns = 'repeat(auto-fit, minmax(400px, 1fr))';
    lista.style.gap = '15px';

    conexoes.forEach((conexao: MapaMentalConexao) => {
      const cardOrigem = this.obterCardPorId(conexao.de);
      const cardDestino = this.obterCardPorId(conexao.para);

      const conexaoDiv = document.createElement('div');
      conexaoDiv.style.background = 'rgba(0, 183, 79, 0.1)';
      conexaoDiv.style.borderLeft = '4px solid #00B74F';
      conexaoDiv.style.padding = '15px 20px';
      conexaoDiv.style.borderRadius = '12px';
      conexaoDiv.style.color = 'white';
      conexaoDiv.style.fontSize = '14px';

      const origemSpan = document.createElement('strong');
      origemSpan.textContent = cardOrigem?.meta || 'Card origem';
      origemSpan.style.color = '#00B74F';

      const arrow = document.createElement('span');
      arrow.textContent = ' → ';
      arrow.style.color = '#00B74F';
      arrow.style.margin = '0 8px';

      const destinoSpan = document.createElement('strong');
      destinoSpan.textContent = cardDestino?.meta || 'Card destino';
      destinoSpan.style.color = '#00B74F';

      conexaoDiv.appendChild(origemSpan);
      conexaoDiv.appendChild(arrow);
      conexaoDiv.appendChild(destinoSpan);

      lista.appendChild(conexaoDiv);
    });

    conexoesContainer.appendChild(lista);
    return conexoesContainer;
  }

  // ===== MODELO ABC =====

  salvarModeloABC(): void {
    if (!this.token || this.expired) {
      this.toastr.warning('Não foi possível salvar o Modelo ABC');
      return;
    }

    // Validar se pelo menos um campo foi preenchido
    const temDados = this.modeloABC.adversidade || this.modeloABC.pensamento ||
                     this.modeloABC.consequencia || this.modeloABC.antidotoExigencia ||
                     this.modeloABC.antidotoRotulo || this.modeloABC.fraseNocaute ||
                     this.modeloABC.planoAcao || this.modeloABC.impedimentos ||
                     this.modeloABC.acaoImpedimentos;

    if (!temDados) {
      this.toastr.info('Preencha pelo menos um campo antes de salvar');
      return;
    }

    this.salvandoModeloABC = true;

    const dadosParaSalvar = {
      adversidade: this.modeloABC.adversidade,
      pensamento: this.modeloABC.pensamento,
      consequencia: this.modeloABC.consequencia,
      antidoto_exigencia: this.modeloABC.antidotoExigencia,
      antidoto_rotulo: this.modeloABC.antidotoRotulo,
      frase_nocaute: this.modeloABC.fraseNocaute,
      plano_acao: this.modeloABC.planoAcao,
      nivel_disposicao: this.modeloABC.nivelDisposicao,
      impedimentos: this.modeloABC.impedimentos,
      acao_impedimentos: this.modeloABC.acaoImpedimentos
    };

    console.log('💾 Salvando Modelo ABC...', dadosParaSalvar);

    this.mentoriaService.salvarModeloABC(this.token, dadosParaSalvar).subscribe({
      next: (response: any) => {
        console.log('✅ Modelo ABC salvo com sucesso!', response);
        if (response.data && response.data.id) {
          this.modeloABCId = response.data.id;
        }
        this.toastr.success('Modelo ABC salvo com sucesso!');
        this.salvandoModeloABC = false;
      },
      error: (error: any) => {
        console.error('❌ Erro ao salvar Modelo ABC:', error);
        this.toastr.error('Erro ao salvar Modelo ABC');
        this.salvandoModeloABC = false;
      }
    });
  }

  // ===== ZONAS DE APRENDIZADO =====

  adicionarPalavraZona(): void {
    if (!this.novaPalavra || !this.novaPalavra.trim()) {
      this.toastr.warning('Digite uma palavra antes de adicionar');
      return;
    }

    const novaPalavra: PalavraZona = {
      id: `palavra-${Date.now()}`,
      texto: this.novaPalavra.trim(),
      zona: 'aprendizado' // Padrão: zona de aprendizado (ideal)
    };

    this.zonasAprendizado.palavras.push(novaPalavra);
    this.novaPalavra = '';
  }

  moverPalavraParaZona(palavraId: string, novaZona: 'ansiedade' | 'aprendizado' | 'apatia' | 'conforto'): void {
    const palavra = this.zonasAprendizado.palavras.find(p => p.id === palavraId);
    if (palavra) {
      palavra.zona = novaZona;
    }
  }

  removerPalavraZona(palavraId: string): void {
    this.zonasAprendizado.palavras = this.zonasAprendizado.palavras.filter(p => p.id !== palavraId);
  }

  getPalavrasPorZona(zona: 'ansiedade' | 'aprendizado' | 'apatia' | 'conforto'): PalavraZona[] {
    return this.zonasAprendizado.palavras.filter(p => p.zona === zona);
  }

  // Drag and Drop para palavras
  palavraArrastada: string | null = null;

  onDragStart(event: DragEvent, palavraId: string): void {
    this.palavraArrastada = palavraId;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/html', '');
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    const target = event.currentTarget as HTMLElement;
    target.classList.add('drag-over');
  }

  onDragLeave(event: DragEvent): void {
    const target = event.currentTarget as HTMLElement;
    target.classList.remove('drag-over');
  }

  onDropPalavra(event: DragEvent, zona: 'ansiedade' | 'aprendizado' | 'apatia' | 'conforto'): void {
    event.preventDefault();
    event.stopPropagation();

    const target = event.currentTarget as HTMLElement;
    target.classList.remove('drag-over');

    if (this.palavraArrastada) {
      this.moverPalavraParaZona(this.palavraArrastada, zona);
      this.palavraArrastada = null;
    }
  }

  salvarZonasAprendizado(): void {
    if (!this.token || this.expired) {
      this.toastr.warning('Não foi possível salvar as Zonas de Aprendizado');
      return;
    }

    if (this.zonasAprendizado.palavras.length === 0) {
      this.toastr.info('Adicione pelo menos uma palavra antes de salvar');
      return;
    }

    this.salvandoZonas = true;

    // Agrupar palavras por zona
    const dadosParaSalvar = {
      zona_ansiedade: this.getPalavrasPorZona('ansiedade').map(p => ({ id: p.id, texto: p.texto })),
      zona_aprendizado: this.getPalavrasPorZona('aprendizado').map(p => ({ id: p.id, texto: p.texto })),
      zona_apatia: this.getPalavrasPorZona('apatia').map(p => ({ id: p.id, texto: p.texto })),
      zona_conforto: this.getPalavrasPorZona('conforto').map(p => ({ id: p.id, texto: p.texto }))
    };

    console.log('💾 Salvando Zonas de Aprendizado...', dadosParaSalvar);

    this.mentoriaService.salvarZonasAprendizado(this.token, dadosParaSalvar).subscribe({
      next: (response: any) => {
        console.log('✅ Zonas de Aprendizado salvas com sucesso!', response);
        if (response.data && response.data.id) {
          this.zonasAprendizadoId = response.data.id;
        }
        this.toastr.success('Zonas de Aprendizado salvas com sucesso!');
        this.salvandoZonas = false;
      },
      error: (error: any) => {
        console.error('❌ Erro ao salvar Zonas de Aprendizado:', error);
        this.toastr.error('Erro ao salvar Zonas de Aprendizado');
        this.salvandoZonas = false;
      }
    });
  }

  // ===== EXPORTAR ZONAS DE APRENDIZADO PDF =====
  async exportarZonasAprendizadoPDF(): Promise<void> {
    console.log('🖨️ Iniciando exportação PDF das Zonas de Aprendizado...');
    console.log('Palavras:', this.zonasAprendizado);

    try {
      this.toastr.info('Gerando PDF das Zonas de Aprendizado...');

      console.log('1️⃣ Criando container de visualização...');
      // Criar container temporário para renderização
      const container = this.criarContainerZonasVisualizacao();
      document.body.appendChild(container);

      console.log('2️⃣ Aguardando renderização...');
      // Aguardar renderização
      await new Promise(resolve => setTimeout(resolve, 300));

      console.log('3️⃣ Capturando como imagem com html2canvas...');
      // Capturar como imagem
      const canvas = await html2canvas(container, {
        backgroundColor: '#022c22',
        scale: 2,
        logging: true,
        width: container.scrollWidth,
        height: container.scrollHeight
      });

      console.log('4️⃣ Canvas criado:', canvas.width, 'x', canvas.height);

      // Remover container temporário
      document.body.removeChild(container);

      console.log('5️⃣ Gerando PDF...');
      // Converter para PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);

      console.log('6️⃣ Salvando PDF...');
      pdf.save(`zonas-aprendizado-${this.encontro?.mentorado_nome || 'mentoria'}-${Date.now()}.pdf`);

      console.log('✅ PDF exportado com sucesso!');
      this.toastr.success('PDF exportado com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao exportar PDF:', error);
      this.toastr.error('Erro ao exportar PDF: ' + (error as any).message);
    }
  }

  private criarContainerZonasVisualizacao(): HTMLElement {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.background = '#022c22';
    container.style.padding = '60px';
    container.style.minWidth = '1400px';
    container.style.fontFamily = 'Arial, sans-serif';
    container.style.color = 'white';

    // Logo
    const logo = document.createElement('img');
    logo.src = '/logoNaueNeg.png';
    logo.style.position = 'absolute';
    logo.style.top = '40px';
    logo.style.left = '40px';
    logo.style.height = '45px';
    logo.style.width = 'auto';
    logo.style.objectFit = 'contain';
    logo.style.zIndex = '10';
    container.appendChild(logo);

    // Título
    const header = document.createElement('div');
    header.style.textAlign = 'center';
    header.style.marginBottom = '40px';
    header.style.marginTop = '40px';

    const h1 = document.createElement('h1');
    h1.textContent = 'Zonas de Aprendizado';
    h1.style.fontSize = '36px';
    h1.style.margin = '0 0 10px 0';
    h1.style.fontWeight = 'bold';
    h1.style.color = 'white';
    header.appendChild(h1);

    const subtitle = document.createElement('p');
    subtitle.textContent = 'Segurança Psicológica x Motivação e Senso de Dono(a)';
    subtitle.style.fontSize = '18px';
    subtitle.style.color = 'rgba(255, 255, 255, 0.7)';
    subtitle.style.margin = '0 0 10px 0';
    header.appendChild(subtitle);

    const info = document.createElement('div');
    info.textContent = `${this.encontro?.mentorado_nome || 'Mentoria'}`;
    info.style.fontSize = '16px';
    info.style.fontWeight = '600';
    info.style.color = 'rgba(255, 255, 255, 0.8)';
    header.appendChild(info);

    container.appendChild(header);

    // Grid de quadrantes com eixos
    const graficoWrapper = document.createElement('div');
    graficoWrapper.style.position = 'relative';
    graficoWrapper.style.maxWidth = '1200px';
    graficoWrapper.style.margin = '0 auto';
    graficoWrapper.style.padding = '60px';

    // Eixo Y
    const eixoY = document.createElement('div');
    eixoY.style.position = 'absolute';
    eixoY.style.left = '0';
    eixoY.style.top = '30px';
    eixoY.style.bottom = '30px';
    eixoY.style.width = '4px';
    eixoY.style.background = '#00B74F';
    graficoWrapper.appendChild(eixoY);

    // Seta Y
    const setaY = document.createElement('div');
    setaY.style.position = 'absolute';
    setaY.style.top = '-12px';
    setaY.style.left = '-8px';
    setaY.style.width = '0';
    setaY.style.height = '0';
    setaY.style.borderLeft = '10px solid transparent';
    setaY.style.borderRight = '10px solid transparent';
    setaY.style.borderBottom = '15px solid #00B74F';
    eixoY.appendChild(setaY);

    // Label Y
    const labelY = document.createElement('div');
    labelY.textContent = 'Motivação e Senso de Dono(a)';
    labelY.style.position = 'absolute';
    labelY.style.left = '-180px';
    labelY.style.top = '50%';
    labelY.style.transform = 'translateY(-50%) rotate(-90deg)';
    labelY.style.color = 'white';
    labelY.style.fontWeight = '700';
    labelY.style.fontSize = '14px';
    labelY.style.whiteSpace = 'nowrap';
    eixoY.appendChild(labelY);

    // Eixo X
    const eixoX = document.createElement('div');
    eixoX.style.position = 'absolute';
    eixoX.style.left = '0';
    eixoX.style.right = '0';
    eixoX.style.bottom = '0';
    eixoX.style.height = '4px';
    eixoX.style.background = '#00B74F';
    graficoWrapper.appendChild(eixoX);

    // Seta X
    const setaX = document.createElement('div');
    setaX.style.position = 'absolute';
    setaX.style.right = '-12px';
    setaX.style.top = '-8px';
    setaX.style.width = '0';
    setaX.style.height = '0';
    setaX.style.borderTop = '10px solid transparent';
    setaX.style.borderBottom = '10px solid transparent';
    setaX.style.borderLeft = '15px solid #00B74F';
    eixoX.appendChild(setaX);

    // Label X
    const labelX = document.createElement('div');
    labelX.textContent = 'Segurança Psicológica';
    labelX.style.position = 'absolute';
    labelX.style.bottom = '-40px';
    labelX.style.left = '50%';
    labelX.style.transform = 'translateX(-50%)';
    labelX.style.color = 'white';
    labelX.style.fontWeight = '700';
    labelX.style.fontSize = '14px';
    labelX.style.whiteSpace = 'nowrap';
    eixoX.appendChild(labelX);

    // Grid
    const grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = '1fr 1fr';
    grid.style.gridTemplateRows = '1fr 1fr';
    grid.style.gap = '0';
    grid.style.minHeight = '600px';
    grid.style.position = 'relative';

    // Linhas divisórias
    const linhaVertical = document.createElement('div');
    linhaVertical.style.position = 'absolute';
    linhaVertical.style.left = '50%';
    linhaVertical.style.top = '15%';
    linhaVertical.style.bottom = '15%';
    linhaVertical.style.width = '1px';
    linhaVertical.style.background = '#022c22';
    linhaVertical.style.transform = 'translateX(-50%)';
    linhaVertical.style.zIndex = '5';
    grid.appendChild(linhaVertical);

    const linhaHorizontal = document.createElement('div');
    linhaHorizontal.style.position = 'absolute';
    linhaHorizontal.style.top = '50%';
    linhaHorizontal.style.left = '15%';
    linhaHorizontal.style.right = '15%';
    linhaHorizontal.style.height = '1px';
    linhaHorizontal.style.background = '#022c22';
    linhaHorizontal.style.transform = 'translateY(-50%)';
    linhaHorizontal.style.zIndex = '5';
    grid.appendChild(linhaHorizontal);

    // Criar quadrantes
    const zonas = [
      { nome: 'Zona de Ansiedade', zona: 'ansiedade' as const },
      { nome: 'Zona de Aprendizado', zona: 'aprendizado' as const },
      { nome: 'Zona de Apatia', zona: 'apatia' as const },
      { nome: 'Zona de Conforto', zona: 'conforto' as const }
    ];

    zonas.forEach(({ nome, zona }) => {
      const quadrante = document.createElement('div');
      quadrante.style.background = 'white';
      quadrante.style.padding = '30px';
      quadrante.style.minHeight = '300px';
      quadrante.style.display = 'flex';
      quadrante.style.flexDirection = 'column';

      const titulo = document.createElement('h3');
      titulo.textContent = nome;
      titulo.style.fontSize = '20px';
      titulo.style.fontWeight = '700';
      titulo.style.margin = '0 0 20px 0';
      titulo.style.color = '#022c22';
      titulo.style.textAlign = 'center';
      quadrante.appendChild(titulo);

      const palavrasContainer = document.createElement('div');
      palavrasContainer.style.display = 'flex';
      palavrasContainer.style.flexWrap = 'wrap';
      palavrasContainer.style.gap = '10px';

      const palavras = this.getPalavrasPorZona(zona);
      palavras.forEach(palavra => {
        const tag = document.createElement('span');
        tag.textContent = palavra.texto;
        tag.style.display = 'inline-block';
        tag.style.padding = '8px 16px';
        tag.style.background = 'rgba(2, 44, 34, 0.1)';
        tag.style.border = '2px solid rgba(2, 44, 34, 0.2)';
        tag.style.borderRadius = '20px';
        tag.style.fontSize = '14px';
        tag.style.fontWeight = '500';
        tag.style.color = '#022c22';
        palavrasContainer.appendChild(tag);
      });

      quadrante.appendChild(palavrasContainer);
      grid.appendChild(quadrante);
    });

    graficoWrapper.appendChild(grid);
    container.appendChild(graficoWrapper);

    // Footer
    const footer = document.createElement('div');
    footer.style.textAlign = 'center';
    footer.style.marginTop = '40px';
    footer.style.color = 'rgba(255, 255, 255, 0.5)';
    footer.style.fontSize = '12px';
    footer.textContent = 'Fonte: The Fearless Organization Flow';
    container.appendChild(footer);

    return container;
  }

  // ===== THE GOLDEN CIRCLE =====

  salvarGoldenCircle(): void {
    if (!this.token || this.expired) {
      this.toastr.warning('Não foi possível salvar o Golden Circle');
      return;
    }

    const temDados = this.goldenCircle.why || this.goldenCircle.how || this.goldenCircle.what;

    if (!temDados) {
      this.toastr.info('Preencha pelo menos um campo antes de salvar');
      return;
    }

    this.salvandoGoldenCircle = true;

    const dadosParaSalvar = {
      why: this.goldenCircle.why,
      how: this.goldenCircle.how,
      what: this.goldenCircle.what
    };

    console.log('💾 Salvando Golden Circle...', dadosParaSalvar);

    this.mentoriaService.salvarGoldenCircle(this.token, dadosParaSalvar).subscribe({
      next: (response: any) => {
        console.log('✅ Golden Circle salvo com sucesso!', response);
        if (response.data && response.data.id) {
          this.goldenCircleId = response.data.id;
        }
        this.toastr.success('Golden Circle salvo com sucesso!');
        this.salvandoGoldenCircle = false;
      },
      error: (error: any) => {
        console.error('❌ Erro ao salvar Golden Circle:', error);
        this.toastr.error('Erro ao salvar Golden Circle');
        this.salvandoGoldenCircle = false;
      }
    });
  }

  // ===== RODA DA VIDA MAAS =====

  carregarRodaDaVida(): void {
    if (!this.token) return;

    this.mentoriaService.obterRodaDaVidaPublico(this.token).subscribe({
      next: (response: any) => {
        if (response.data) {
          console.log('✅ Roda da Vida carregada:', response.data);
          this.rodaDaVidaId = response.data.id;

          // Carregar dados das áreas
          this.rodaDaVidaAreas.forEach(area => {
            if (response.data[area.key]) {
              this.rodaDaVida[area.key] = response.data[area.key];
            }
          });

          // Carregar pergunta especial
          if (response.data.fichas_caem) {
            this.rodaDaVida.fichas_caem = response.data.fichas_caem;
          }
        }

        // Sempre desenhar gráfico, mesmo sem dados salvos
        setTimeout(() => this.desenharRodaDaVida(), 100);
      },
      error: (error: any) => {
        console.error('❌ Erro ao carregar Roda da Vida:', error);

        // Desenhar gráfico com valores padrão mesmo em caso de erro
        setTimeout(() => this.desenharRodaDaVida(), 100);
      }
    });
  }

  salvarRodaDaVida(): void {
    if (!this.token || this.expired) {
      this.toastr.warning('Não foi possível salvar a Roda da Vida');
      return;
    }

    this.salvandoRodaDaVida = true;

    console.log('💾 Salvando Roda da Vida...', this.rodaDaVida);

    this.mentoriaService.salvarRodaDaVida(this.token, this.rodaDaVida).subscribe({
      next: (response: any) => {
        console.log('✅ Roda da Vida salva com sucesso!', response);
        if (response.data && response.data.id) {
          this.rodaDaVidaId = response.data.id;
        }
        this.toastr.success('Roda da Vida salva com sucesso!');
        this.salvandoRodaDaVida = false;
      },
      error: (error: any) => {
        console.error('❌ Erro ao salvar Roda da Vida:', error);
        this.toastr.error('Erro ao salvar Roda da Vida');
        this.salvandoRodaDaVida = false;
      }
    });
  }

  desenharRodaDaVida(): void {
    const canvas = document.getElementById('rodaDaVidaCanvas') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 160; // Reduzido para dar mais espaço aos labels (canvas 550x550)
    const segments = this.rodaDaVidaAreas.length;
    const angleStep = (2 * Math.PI) / segments;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Desenhar círculos de fundo
    for (let i = 1; i <= 10; i++) {
      ctx.strokeStyle = i % 2 === 0 ? '#f0f0f0' : '#fafafa';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(centerX, centerY, (radius / 10) * i, 0, 2 * Math.PI);
      ctx.stroke();
    }

    // Desenhar segmentos
    for (let i = 0; i < segments; i++) {
      const area = this.rodaDaVidaAreas[i];
      const startAngle = angleStep * i - Math.PI / 2;
      const endAngle = startAngle + angleStep;
      const value = this.rodaDaVida[area.key]?.score ?? 5;
      const segmentRadius = (radius / 10) * value;

      // Gradiente de cor
      const hue = (360 / segments) * i;
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, segmentRadius);
      gradient.addColorStop(0, `hsla(${hue}, 65%, 72%, 0.85)`);
      gradient.addColorStop(1, `hsla(${hue}, 65%, 58%, 0.95)`);

      // Desenhar segmento preenchido
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, segmentRadius, startAngle, endAngle);
      ctx.closePath();
      ctx.fill();

      // Desenhar borda do segmento
      ctx.strokeStyle = 'rgba(0,0,0,0.12)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + radius * Math.cos(startAngle),
        centerY + radius * Math.sin(startAngle)
      );
      ctx.stroke();

      // Desenhar labels com quebra de linha e melhor posicionamento
      const labelAngle = startAngle + angleStep / 2;
      const labelDistance = radius + 75; // 75 pixels de distância = 235 total (bem dentro do canvas 550)
      const labelX = centerX + labelDistance * Math.cos(labelAngle);
      const labelY = centerY + labelDistance * Math.sin(labelAngle);

      ctx.fillStyle = '#1a4d2e';
      ctx.font = 'bold 11px Inter, Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Quebrar texto longo em múltiplas linhas
      const maxWidth = 95;
      const words = area.label.split(' ');
      const lines: string[] = [];
      let currentLine = words[0];

      for (let j = 1; j < words.length; j++) {
        const testLine = currentLine + ' ' + words[j];
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth) {
          lines.push(currentLine);
          currentLine = words[j];
        } else {
          currentLine = testLine;
        }
      }
      lines.push(currentLine);

      // Desenhar cada linha
      const lineHeight = 13;
      const startY = labelY - ((lines.length - 1) * lineHeight) / 2;
      lines.forEach((line, index) => {
        ctx.fillText(line, labelX, startY + index * lineHeight);
      });

      // Desenhar valor no segmento
      if (value > 3) {
        const valueDistance = segmentRadius * 0.65;
        const valueX = centerX + valueDistance * Math.cos(labelAngle);
        const valueY = centerY + valueDistance * Math.sin(labelAngle);

        ctx.fillStyle = 'rgba(26, 77, 46, 0.9)';
        ctx.beginPath();
        ctx.arc(valueX, valueY, 14, 0, 2 * Math.PI);
        ctx.fill();

        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px Inter, Arial';
        ctx.fillText(value.toString(), valueX, valueY);
      }
    }

    // Desenhar círculo central
    const centerGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 12);
    centerGradient.addColorStop(0, '#ffffff');
    centerGradient.addColorStop(1, '#e8f5e9');
    ctx.fillStyle = centerGradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 10, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = '#1a4d2e';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  calcularMediaRodaDaVida(): number {
    let soma = 0;
    this.rodaDaVidaAreas.forEach(area => {
      soma += this.rodaDaVida[area.key]?.score ?? 5;
    });
    return soma / this.rodaDaVidaAreas.length;
  }

  getMelhorAreaRodaDaVida(): string {
    let melhorArea = this.rodaDaVidaAreas[0];
    let melhorScore = this.rodaDaVida[melhorArea.key]?.score ?? 5;

    this.rodaDaVidaAreas.forEach(area => {
      const score = this.rodaDaVida[area.key]?.score ?? 5;
      if (score > melhorScore) {
        melhorScore = score;
        melhorArea = area;
      }
    });

    return `${melhorArea.label} (${melhorScore})`;
  }

  getPiorAreaRodaDaVida(): string {
    let piorArea = this.rodaDaVidaAreas[0];
    let piorScore = this.rodaDaVida[piorArea.key]?.score ?? 5;

    this.rodaDaVidaAreas.forEach(area => {
      const score = this.rodaDaVida[area.key]?.score ?? 5;
      if (score < piorScore) {
        piorScore = score;
        piorArea = area;
      }
    });

    return `${piorArea.label} (${piorScore})`;
  }

  onRodaDaVidaSliderChange(areaKey: string): void {
    // Redesenhar gráfico quando o slider muda
    setTimeout(() => this.desenharRodaDaVida(), 10);
  }

  // ===== GANHOS E PERDAS =====

  carregarGanhosPerdas(): void {
    if (!this.token) return;

    this.mentoriaService.obterGanhosPerdasPublico(this.token).subscribe({
      next: (response: any) => {
        if (response.data) {
          console.log('✅ Ganhos e Perdas carregados:', response.data);
          this.ganhosPerdasId = response.data.id;

          // Carregar meta
          this.ganhosPerdas.meta = response.data.meta || '';

          // Carregar quadrantes (parse JSON arrays)
          const parseQuadrante = (data: any) => {
            if (!data) return [];
            if (typeof data === 'string') {
              try {
                return JSON.parse(data);
              } catch {
                return [];
              }
            }
            return data;
          };

          this.ganhosPerdas.ganhos_obtiver = parseQuadrante(response.data.ganhos_obtiver);
          this.ganhosPerdas.perdas_obtiver = parseQuadrante(response.data.perdas_obtiver);
          this.ganhosPerdas.ganhos_nao_obtiver = parseQuadrante(response.data.ganhos_nao_obtiver);
          this.ganhosPerdas.perdas_nao_obtiver = parseQuadrante(response.data.perdas_nao_obtiver);

          // Garantir pelo menos 1 item em cada quadrante
          if (this.ganhosPerdas.ganhos_obtiver.length === 0) {
            this.ganhosPerdas.ganhos_obtiver = [{ id: this.generateId(), texto: '' }];
          }
          if (this.ganhosPerdas.perdas_obtiver.length === 0) {
            this.ganhosPerdas.perdas_obtiver = [{ id: this.generateId(), texto: '' }];
          }
          if (this.ganhosPerdas.ganhos_nao_obtiver.length === 0) {
            this.ganhosPerdas.ganhos_nao_obtiver = [{ id: this.generateId(), texto: '' }];
          }
          if (this.ganhosPerdas.perdas_nao_obtiver.length === 0) {
            this.ganhosPerdas.perdas_nao_obtiver = [{ id: this.generateId(), texto: '' }];
          }
        }
      },
      error: (error: any) => {
        console.error('❌ Erro ao carregar Ganhos e Perdas:', error);
        // Inicializar com 1 item em cada quadrante em caso de erro
        this.inicializarGanhosPerdasVazio();
      }
    });
  }

  inicializarGanhosPerdasVazio(): void {
    this.ganhosPerdas.ganhos_obtiver = [{ id: this.generateId(), texto: '' }];
    this.ganhosPerdas.perdas_obtiver = [{ id: this.generateId(), texto: '' }];
    this.ganhosPerdas.ganhos_nao_obtiver = [{ id: this.generateId(), texto: '' }];
    this.ganhosPerdas.perdas_nao_obtiver = [{ id: this.generateId(), texto: '' }];
  }

  adicionarItemGanhosPerdas(quadrante: 'ganhos_obtiver' | 'perdas_obtiver' | 'ganhos_nao_obtiver' | 'perdas_nao_obtiver'): void {
    this.ganhosPerdas[quadrante].push({
      id: this.generateId(),
      texto: ''
    });
  }

  removerItemGanhosPerdas(quadrante: 'ganhos_obtiver' | 'perdas_obtiver' | 'ganhos_nao_obtiver' | 'perdas_nao_obtiver', itemId: string): void {
    if (this.ganhosPerdas[quadrante].length <= 1) {
      this.toastr.warning('Deve haver pelo menos um item em cada quadrante!');
      return;
    }

    this.ganhosPerdas[quadrante] = this.ganhosPerdas[quadrante].filter(item => item.id !== itemId);
  }

  salvarGanhosPerdas(): void {
    if (!this.token || this.expired) {
      this.toastr.warning('Não foi possível salvar Ganhos e Perdas');
      return;
    }

    this.salvandoGanhosPerdas = true;

    console.log('💾 Salvando Ganhos e Perdas...', this.ganhosPerdas);

    this.mentoriaService.salvarGanhosPerdas(this.token, this.ganhosPerdas).subscribe({
      next: (response: any) => {
        console.log('✅ Ganhos e Perdas salvos com sucesso!', response);
        if (response.data && response.data.id) {
          this.ganhosPerdasId = response.data.id;
        }
        this.toastr.success('Ganhos e Perdas salvos com sucesso!');
        this.salvandoGanhosPerdas = false;
      },
      error: (error: any) => {
        console.error('❌ Erro ao salvar Ganhos e Perdas:', error);
        this.toastr.error('Erro ao salvar Ganhos e Perdas');
        this.salvandoGanhosPerdas = false;
      }
    });
  }

  async exportarGanhosPerdasPDF(): Promise<void> {
    try {
      this.toastr.info('Gerando PDF de Ganhos e Perdas...');

      // Criar container temporário para renderização
      const container = this.criarContainerGanhosPerdasVisualizacao();
      document.body.appendChild(container);

      // Aguardar renderização
      await new Promise(resolve => setTimeout(resolve, 500));

      // Capturar como imagem
      const canvas = await html2canvas(container, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        width: container.scrollWidth,
        height: container.scrollHeight
      });

      // Remover container temporário
      document.body.removeChild(container);

      // Converter para PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`ganhos-perdas-${this.encontro?.mentorado_nome || 'mentoria'}-${Date.now()}.pdf`);

      this.toastr.success('PDF exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      this.toastr.error('Erro ao exportar PDF');
    }
  }

  private criarContainerGanhosPerdasVisualizacao(): HTMLElement {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.background = '#ffffff';
    container.style.padding = '60px';
    container.style.minWidth = '1400px';
    container.style.fontFamily = 'Inter, Arial, sans-serif';

    // Título
    const titulo = document.createElement('div');
    titulo.style.textAlign = 'center';
    titulo.style.marginBottom = '40px';
    titulo.innerHTML = `
      <h1 style="color: #022c22; font-size: 42px; font-weight: 800; margin-bottom: 10px; letter-spacing: 2px;">
        GANHOS E PERDAS
      </h1>
      <p style="color: #666; font-size: 18px; margin: 0;">
        Matriz de Decisão Estratégica
      </p>
      <p style="color: #999; font-size: 14px; margin-top: 20px;">
        ${this.encontro?.mentorado_nome || 'Mentorado'} - ${new Date().toLocaleDateString('pt-BR')}
      </p>
    `;
    container.appendChild(titulo);

    // Meta
    if (this.ganhosPerdas.meta) {
      const metaSection = document.createElement('div');
      metaSection.style.background = 'linear-gradient(to bottom, #f8fdf9, #ffffff)';
      metaSection.style.padding = '25px';
      metaSection.style.borderRadius = '16px';
      metaSection.style.marginBottom = '40px';
      metaSection.style.border = '2px solid rgba(2, 44, 34, 0.15)';
      metaSection.innerHTML = `
        <div style="font-size: 16px; font-weight: 700; color: #022c22; margin-bottom: 10px; text-transform: uppercase;">META:</div>
        <div style="font-size: 20px; font-weight: 600; color: #022c22;">${this.ganhosPerdas.meta}</div>
      `;
      container.appendChild(metaSection);
    }

    // Grid de quadrantes
    const grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = '1fr 1fr';
    grid.style.gap = '0';
    grid.style.borderRadius = '16px';
    grid.style.overflow = 'hidden';
    grid.style.border = '2px solid rgba(2, 44, 34, 0.2)';

    const quadrantes = [
      { titulo: 'O QUE VOCÊ GANHA SE OBTIVER ISTO?', subtitulo: '(busca do prazer)', items: this.ganhosPerdas.ganhos_obtiver, bg: '#d4f4dd' },
      { titulo: 'O QUE VOCÊ PERDE SE OBTIVER ISTO?', subtitulo: '(perda de valores)', items: this.ganhosPerdas.perdas_obtiver, bg: '#b8e6c9' },
      { titulo: 'O QUE VOCÊ GANHA SE NÃO OBTIVER ISTO?', subtitulo: '(sabotadores)', items: this.ganhosPerdas.ganhos_nao_obtiver, bg: '#9cd4af' },
      { titulo: 'O QUE VOCÊ PERDE SE NÃO OBTIVER ISTO?', subtitulo: '(motivadores-dor)', items: this.ganhosPerdas.perdas_nao_obtiver, bg: '#7fc299' }
    ];

    quadrantes.forEach((quadrante) => {
      const quadDiv = document.createElement('div');
      quadDiv.style.padding = '30px';
      quadDiv.style.background = quadrante.bg;
      quadDiv.style.border = '2px solid rgba(2, 44, 34, 0.2)';
      quadDiv.style.minHeight = '400px';

      let htmlQuad = `
        <div style="background: #022c22; color: white; padding: 14px; margin: -30px -30px 20px -30px; font-weight: 700; font-size: 14px; text-align: center; text-transform: uppercase;">
          ${quadrante.titulo}
        </div>
        <div style="color: #022c22; font-size: 13px; text-align: center; margin-bottom: 20px; font-style: italic; font-weight: 600;">
          ${quadrante.subtitulo}
        </div>
      `;

      quadrante.items.forEach((item, index) => {
        if (item.texto.trim()) {
          htmlQuad += `
            <div style="display: flex; gap: 10px; margin-bottom: 12px;">
              <span style="color: #022c22; font-weight: 700; min-width: 25px;">${index + 1}.</span>
              <div style="flex: 1; color: #022c22; font-size: 14px; line-height: 1.5;">${item.texto}</div>
            </div>
          `;
        }
      });

      quadDiv.innerHTML = htmlQuad;
      grid.appendChild(quadDiv);
    });

    container.appendChild(grid);

    return container;
  }

  // ===== CONTROLE DE HÁBITOS =====

  getNomeMes(mes: number): string {
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                   'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return meses[mes] || 'Janeiro';
  }

  getDiasArray(): number[] {
    return Array.from({ length: this.controleHabitos.totalDias }, (_, i) => i + 1);
  }

  atualizarMesHabitos(): void {
    const novoTotalDias = this.getDiasNoMes(this.controleHabitos.mes, this.controleHabitos.ano);
    this.controleHabitos.totalDias = novoTotalDias;

    // Atualizar dias de cada hábito
    this.controleHabitos.habitos.forEach(habito => {
      if (habito.dias.length < novoTotalDias) {
        // Adicionar dias faltantes
        for (let i = habito.dias.length; i < novoTotalDias; i++) {
          habito.dias.push({ dia: i + 1, status: 'empty' });
        }
      } else if (habito.dias.length > novoTotalDias) {
        // Remover dias excedentes
        habito.dias = habito.dias.slice(0, novoTotalDias);
      }
    });
  }

  adicionarHabito(): void {
    this.novoHabitoNome = '';
    this.novoHabitoMeta = 20;
    this.novoHabitoDescricao = '';
    this.showAddHabitoModal = true;
  }

  fecharModalHabito(): void {
    this.showAddHabitoModal = false;
  }

  confirmarAdicionarHabito(): void {
    if (!this.novoHabitoNome.trim()) {
      alert('Por favor, insira o nome do hábito!');
      return;
    }

    if (!this.novoHabitoMeta || this.novoHabitoMeta < 1) {
      alert('Por favor, insira uma meta válida!');
      return;
    }

    const novoHabito: Habito = {
      id: this.generateId(),
      nome: this.novoHabitoNome,
      meta: this.novoHabitoMeta,
      descricao: this.novoHabitoDescricao,
      notas: '',
      dias: Array.from({ length: this.controleHabitos.totalDias }, (_, i) => ({
        dia: i + 1,
        status: 'empty'
      }))
    };

    this.controleHabitos.habitos.push(novoHabito);
    this.fecharModalHabito();
  }

  removerHabito(habitoId: string): void {
    if (confirm('Tem certeza que deseja excluir este hábito?')) {
      this.controleHabitos.habitos = this.controleHabitos.habitos.filter(h => h.id !== habitoId);
    }
  }

  toggleDiaStatus(habito: Habito, dia: number): void {
    const diaData = habito.dias.find(d => d.dia === dia);
    if (!diaData) return;

    // Ciclo: empty → done → not-done → not-needed → empty
    if (diaData.status === 'empty') {
      diaData.status = 'done';
    } else if (diaData.status === 'done') {
      diaData.status = 'not-done';
    } else if (diaData.status === 'not-done') {
      diaData.status = 'not-needed';
    } else {
      diaData.status = 'empty';
    }
  }

  getHabitoProgresso(habito: Habito): number {
    return habito.dias.filter(d => d.status === 'done').length;
  }

  getHabitoProgressoPercentual(habito: Habito): number {
    const progresso = this.getHabitoProgresso(habito);
    return Math.min((progresso / habito.meta) * 100, 100);
  }

  getMetasAlcancadas(): number {
    return this.controleHabitos.habitos.filter(h => this.getHabitoProgresso(h) >= h.meta).length;
  }

  getTotalDiasRealizados(): number {
    return this.controleHabitos.habitos.reduce((total, habito) => {
      return total + this.getHabitoProgresso(habito);
    }, 0);
  }

  getTaxaConclusao(): number {
    if (this.controleHabitos.habitos.length === 0) return 0;

    const totalPossivel = this.controleHabitos.habitos.length * this.controleHabitos.totalDias;
    const totalRealizado = this.getTotalDiasRealizados();

    return totalPossivel > 0 ? Math.round((totalRealizado / totalPossivel) * 100) : 0;
  }

  // Modal de adicionar hábito
  showAddHabitoModal: boolean = false;
  novoHabitoNome: string = '';
  novoHabitoMeta: number = 20;
  novoHabitoDescricao: string = '';

  carregarControleHabitos(): void {
    if (!this.token) return;

    this.mentoriaService.obterControleHabitosPublico(this.token).subscribe({
      next: (response: any) => {
        if (response.data) {
          console.log('✅ Controle de Hábitos carregado:', response.data);
          this.controleHabitosId = response.data.id;

          this.controleHabitos.ano = response.data.ano || new Date().getFullYear();
          this.controleHabitos.mes = response.data.mes || new Date().getMonth();
          this.controleHabitos.totalDias = response.data.total_dias || this.getDiasNoMes(this.controleHabitos.mes, this.controleHabitos.ano);

          // Parse habitos (JSONB)
          const parseHabitos = (data: any) => {
            if (!data) return [];
            if (typeof data === 'string') {
              try {
                return JSON.parse(data);
              } catch {
                return [];
              }
            }
            return data;
          };

          this.controleHabitos.habitos = parseHabitos(response.data.habitos);
        } else {
          // Inicializar vazio se não houver dados
          this.inicializarControleHabitosVazio();
        }
      },
      error: (error: any) => {
        console.error('❌ Erro ao carregar Controle de Hábitos:', error);
        this.inicializarControleHabitosVazio();
      }
    });
  }

  inicializarControleHabitosVazio(): void {
    this.controleHabitos.habitos = [];
  }

  salvarControleHabitos(): void {
    if (!this.token || this.expired) {
      this.toastr.warning('Não foi possível salvar Controle de Hábitos');
      return;
    }

    this.salvandoControleHabitos = true;

    console.log('💾 Salvando Controle de Hábitos...', this.controleHabitos);

    this.mentoriaService.salvarControleHabitos(this.token, this.controleHabitos).subscribe({
      next: (response: any) => {
        console.log('✅ Controle de Hábitos salvo com sucesso!', response);
        if (response.data && response.data.id) {
          this.controleHabitosId = response.data.id;
        }
        this.toastr.success('Controle de Hábitos salvo com sucesso!');
        this.salvandoControleHabitos = false;
      },
      error: (error: any) => {
        console.error('❌ Erro ao salvar Controle de Hábitos:', error);
        this.toastr.error('Erro ao salvar Controle de Hábitos');
        this.salvandoControleHabitos = false;
      }
    });
  }

  async exportarControleHabitosPDF(): Promise<void> {
    try {
      this.toastr.info('Gerando PDF do Controle de Hábitos...');

      const container = this.criarContainerControleHabitosVisualizacao();
      document.body.appendChild(container);

      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(container, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        width: container.scrollWidth,
        height: container.scrollHeight
      });

      document.body.removeChild(container);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`controle-habitos-${this.encontro?.mentorado_nome || 'mentoria'}-${this.getNomeMes(this.controleHabitos.mes)}-${this.controleHabitos.ano}.pdf`);

      this.toastr.success('PDF exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      this.toastr.error('Erro ao exportar PDF');
    }
  }

  private criarContainerControleHabitosVisualizacao(): HTMLElement {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.background = '#ffffff';
    container.style.padding = '40px';
    container.style.minWidth = '1600px';
    container.style.fontFamily = 'Inter, Arial, sans-serif';

    // Título
    const titulo = document.createElement('div');
    titulo.style.textAlign = 'center';
    titulo.style.marginBottom = '30px';
    titulo.innerHTML = `
      <h1 style="color: #022c22; font-size: 36px; font-weight: 800; margin-bottom: 8px;">
        🌱 CONTROLE DE HÁBITOS
      </h1>
      <p style="color: #666; font-size: 18px; margin: 0;">
        ${this.getNomeMes(this.controleHabitos.mes)} de ${this.controleHabitos.ano}
      </p>
      <p style="color: #999; font-size: 14px; margin-top: 15px;">
        ${this.encontro?.mentorado_nome || 'Mentorado'} - ${new Date().toLocaleDateString('pt-BR')}
      </p>
    `;
    container.appendChild(titulo);

    // Estatísticas
    const stats = document.createElement('div');
    stats.style.display = 'grid';
    stats.style.gridTemplateColumns = 'repeat(4, 1fr)';
    stats.style.gap = '15px';
    stats.style.marginBottom = '30px';
    stats.innerHTML = `
      <div style="background: linear-gradient(135deg, #f0f9f4 0%, #e8f5e9 100%); padding: 20px; border-radius: 12px; border: 2px solid rgba(2, 44, 34, 0.1); text-align: center;">
        <div style="font-size: 11px; color: #666; font-weight: 600; text-transform: uppercase; margin-bottom: 8px;">TOTAL DE HÁBITOS</div>
        <div style="font-size: 28px; font-weight: 800; color: #022c22;">${this.controleHabitos.habitos.length}</div>
      </div>
      <div style="background: linear-gradient(135deg, #f0f9f4 0%, #e8f5e9 100%); padding: 20px; border-radius: 12px; border: 2px solid rgba(2, 44, 34, 0.1); text-align: center;">
        <div style="font-size: 11px; color: #666; font-weight: 600; text-transform: uppercase; margin-bottom: 8px;">METAS ALCANÇADAS</div>
        <div style="font-size: 28px; font-weight: 800; color: #022c22;">${this.getMetasAlcancadas()}/${this.controleHabitos.habitos.length}</div>
      </div>
      <div style="background: linear-gradient(135deg, #f0f9f4 0%, #e8f5e9 100%); padding: 20px; border-radius: 12px; border: 2px solid rgba(2, 44, 34, 0.1); text-align: center;">
        <div style="font-size: 11px; color: #666; font-weight: 600; text-transform: uppercase; margin-bottom: 8px;">TOTAL REALIZADO</div>
        <div style="font-size: 28px; font-weight: 800; color: #022c22;">${this.getTotalDiasRealizados()}</div>
      </div>
      <div style="background: linear-gradient(135deg, #f0f9f4 0%, #e8f5e9 100%); padding: 20px; border-radius: 12px; border: 2px solid rgba(2, 44, 34, 0.1); text-align: center;">
        <div style="font-size: 11px; color: #666; font-weight: 600; text-transform: uppercase; margin-bottom: 8px;">TAXA DE CONCLUSÃO</div>
        <div style="font-size: 28px; font-weight: 800; color: #022c22;">${this.getTaxaConclusao()}%</div>
      </div>
    `;
    container.appendChild(stats);

    // Tabela
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.fontSize = '13px';

    let tableHTML = `
      <thead>
        <tr style="background: #022c22; color: white;">
          <th style="padding: 12px; text-align: left; border: 1px solid rgba(2, 44, 34, 0.3);">Hábito</th>
          <th style="padding: 12px; text-align: center; border: 1px solid rgba(2, 44, 34, 0.3);">Meta</th>
          <th style="padding: 12px; text-align: center; border: 1px solid rgba(2, 44, 34, 0.3);">Progresso</th>
          ${Array.from({ length: this.controleHabitos.totalDias }, (_, i) =>
            `<th style="padding: 8px; text-align: center; border: 1px solid rgba(2, 44, 34, 0.3); min-width: 30px;">${i + 1}</th>`
          ).join('')}
        </tr>
      </thead>
      <tbody>
    `;

    this.controleHabitos.habitos.forEach((habito, index) => {
      const progresso = this.getHabitoProgresso(habito);
      const bgColor = index % 2 === 0 ? '#f8fdf9' : '#ffffff';

      tableHTML += `
        <tr style="background: ${bgColor};">
          <td style="padding: 12px; border: 1px solid #c8e6c9; font-weight: 600; color: #022c22;">${habito.nome || 'Sem nome'}</td>
          <td style="padding: 12px; text-align: center; border: 1px solid #c8e6c9; font-weight: 700; color: #022c22;">${habito.meta}</td>
          <td style="padding: 12px; text-align: center; border: 1px solid #c8e6c9; font-weight: 700; color: ${progresso >= habito.meta ? '#ffa000' : '#022c22'};">${progresso}/${habito.meta}</td>
          ${habito.dias.map(diaData => {
            let bgCell = 'white';
            if (diaData.status === 'done') bgCell = '#66bb6a';
            else if (diaData.status === 'not-done') bgCell = '#ff9800';
            else if (diaData.status === 'not-needed') bgCell = '#9e9e9e';

            return `<td style="padding: 0; height: 40px; border: 1px solid #c8e6c9; background: ${bgCell};"></td>`;
          }).join('')}
        </tr>
      `;
    });

    tableHTML += '</tbody>';
    table.innerHTML = tableHTML;
    container.appendChild(table);

    return container;
  }

  async exportarRodaDaVidaPDF(): Promise<void> {
    try {
      this.toastr.info('Gerando PDF da Roda da Vida...');

      // Criar container temporário para renderização
      const container = this.criarContainerRodaDaVidaVisualizacao();
      document.body.appendChild(container);

      // Aguardar renderização
      await new Promise(resolve => setTimeout(resolve, 500));

      // Capturar como imagem
      const canvas = await html2canvas(container, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        width: container.scrollWidth,
        height: container.scrollHeight
      });

      // Remover container temporário
      document.body.removeChild(container);

      // Converter para PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`roda-da-vida-${this.encontro?.mentorado_nome || 'mentoria'}-${Date.now()}.pdf`);

      this.toastr.success('PDF exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      this.toastr.error('Erro ao exportar PDF');
    }
  }

  private criarContainerRodaDaVidaVisualizacao(): HTMLElement {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.background = '#ffffff';
    container.style.padding = '60px';
    container.style.minWidth = '1200px';
    container.style.fontFamily = 'Inter, Arial, sans-serif';

    // Criar título
    const titulo = document.createElement('div');
    titulo.style.textAlign = 'center';
    titulo.style.marginBottom = '40px';
    titulo.innerHTML = `
      <h1 style="color: #1a4d2e; font-size: 36px; font-weight: 800; margin-bottom: 10px;">
        Roda da Vida MAAS®
      </h1>
      <p style="color: #666; font-size: 18px; margin: 0;">
        Mapa de Autoavaliação Sistêmico - "A Única Coisa"
      </p>
      <p style="color: #999; font-size: 14px; margin-top: 20px;">
        ${this.encontro?.mentorado_nome || 'Mentorado'} - ${new Date().toLocaleDateString('pt-BR')}
      </p>
    `;
    container.appendChild(titulo);

    // Criar seção do gráfico
    const graficosSection = document.createElement('div');
    graficosSection.style.display = 'flex';
    graficosSection.style.gap = '40px';
    graficosSection.style.marginBottom = '40px';
    graficosSection.style.justifyContent = 'center';
    graficosSection.style.alignItems = 'flex-start';

    // Canvas da roda
    const canvasWrapper = document.createElement('div');
    canvasWrapper.style.display = 'flex';
    canvasWrapper.style.justifyContent = 'center';
    canvasWrapper.style.padding = '30px';
    canvasWrapper.style.background = 'linear-gradient(135deg, #f8fdf9 0%, #f0f9f4 100%)';
    canvasWrapper.style.borderRadius = '24px';
    canvasWrapper.style.border = '2px solid rgba(26, 77, 46, 0.1)';

    const canvasClone = document.getElementById('rodaDaVidaCanvas') as HTMLCanvasElement;
    if (canvasClone) {
      const newCanvas = document.createElement('canvas');
      newCanvas.width = 550;
      newCanvas.height = 550;
      const ctx = newCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(canvasClone, 0, 0);
      }
      canvasWrapper.appendChild(newCanvas);
    }

    graficosSection.appendChild(canvasWrapper);

    // Card de resumo
    const resumoCard = document.createElement('div');
    resumoCard.style.background = '#ffffff';
    resumoCard.style.borderRadius = '20px';
    resumoCard.style.border = '2px solid rgba(26, 77, 46, 0.15)';
    resumoCard.style.padding = '30px';
    resumoCard.style.minWidth = '300px';
    resumoCard.innerHTML = `
      <h3 style="color: #1a4d2e; font-size: 22px; font-weight: 800; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 3px solid rgba(26, 77, 46, 0.1);">
        <i class="fa-solid fa-chart-line" style="margin-right: 10px; color: #2d7a4d;"></i>
        Resumo Geral
      </h3>
      <div style="display: flex; flex-direction: column; gap: 15px;">
        <div style="padding: 15px; background: linear-gradient(135deg, #f8fdf9 0%, #f0f9f4 100%); border-radius: 14px; border: 2px solid rgba(26, 77, 46, 0.08); text-align: center;">
          <div style="font-size: 12px; font-weight: 600; color: #666; text-transform: uppercase; margin-bottom: 8px;">MÉDIA GERAL</div>
          <div style="font-size: 32px; font-weight: 800; color: #2d7a4d;">${this.calcularMediaRodaDaVida().toFixed(1)}</div>
        </div>
        <div style="padding: 15px; background: linear-gradient(135deg, #f8fdf9 0%, #f0f9f4 100%); border-radius: 14px; border: 2px solid rgba(26, 77, 46, 0.08); text-align: center;">
          <div style="font-size: 12px; font-weight: 600; color: #666; text-transform: uppercase; margin-bottom: 8px;">MAIOR ÁREA</div>
          <div style="font-size: 18px; font-weight: 800; color: #1a4d2e;">${this.getMelhorAreaRodaDaVida()}</div>
        </div>
        <div style="padding: 15px; background: linear-gradient(135deg, #f8fdf9 0%, #f0f9f4 100%); border-radius: 14px; border: 2px solid rgba(26, 77, 46, 0.08); text-align: center;">
          <div style="font-size: 12px; font-weight: 600; color: #666; text-transform: uppercase; margin-bottom: 8px;">MENOR ÁREA</div>
          <div style="font-size: 18px; font-weight: 800; color: #1a4d2e;">${this.getPiorAreaRodaDaVida()}</div>
        </div>
      </div>
    `;

    graficosSection.appendChild(resumoCard);
    container.appendChild(graficosSection);

    // Tabela de valores
    const tabelaSection = document.createElement('div');
    tabelaSection.style.marginTop = '40px';

    const tabelaTitulo = document.createElement('h3');
    tabelaTitulo.style.color = '#1a4d2e';
    tabelaTitulo.style.fontSize = '24px';
    tabelaTitulo.style.fontWeight = '800';
    tabelaTitulo.style.marginBottom = '20px';
    tabelaTitulo.textContent = 'Detalhamento das Áreas';
    tabelaSection.appendChild(tabelaTitulo);

    const tabela = document.createElement('table');
    tabela.style.width = '100%';
    tabela.style.borderCollapse = 'collapse';

    let tabelaHTML = `
      <thead>
        <tr style="background: linear-gradient(135deg, #1a4d2e 0%, #2d7a4d 100%); color: white;">
          <th style="padding: 15px; text-align: left; border-radius: 10px 0 0 0;">Área</th>
          <th style="padding: 15px; text-align: center;">Pontuação</th>
          <th style="padding: 15px; text-align: left; border-radius: 0 10px 0 0;">Decisão</th>
        </tr>
      </thead>
      <tbody>
    `;

    this.rodaDaVidaAreas.forEach((area, index) => {
      const score = this.rodaDaVida[area.key]?.score ?? 5;
      const note = this.rodaDaVida[area.key]?.note || '-';
      const bgColor = index % 2 === 0 ? '#f8fdf9' : '#ffffff';

      tabelaHTML += `
        <tr style="background: ${bgColor}; border-bottom: 1px solid #e5e5e5;">
          <td style="padding: 15px; font-weight: 600; color: #1a4d2e;">${area.label}</td>
          <td style="padding: 15px; text-align: center;">
            <span style="display: inline-block; background: linear-gradient(135deg, #1a4d2e 0%, #2d7a4d 100%); color: white; padding: 8px 20px; border-radius: 12px; font-weight: 800; font-size: 16px;">
              ${score}
            </span>
          </td>
          <td style="padding: 15px; color: #666; font-size: 14px;">${note}</td>
        </tr>
      `;
    });

    // Adicionar "Que fichas caem?"
    tabelaHTML += `
      <tr style="background: linear-gradient(135deg, #1a4d2e 0%, #2d7a4d 100%); color: white;">
        <td colspan="3" style="padding: 20px; border-radius: 0 0 10px 10px;">
          <div style="font-weight: 700; font-size: 18px; margin-bottom: 10px; color: white;">
            <i class="fa-solid fa-star" style="color: #ffd700; margin-right: 8px;"></i>
            Que fichas caem?
          </div>
          <div style="font-size: 15px; line-height: 1.6; color: white;">
            ${this.rodaDaVida.fichas_caem || 'Não preenchido'}
          </div>
        </td>
      </tr>
    `;

    tabelaHTML += '</tbody>';
    tabela.innerHTML = tabelaHTML;
    tabelaSection.appendChild(tabela);
    container.appendChild(tabelaSection);

    // Rodapé
    const rodape = document.createElement('div');
    rodape.style.marginTop = '40px';
    rodape.style.textAlign = 'center';
    rodape.style.color = '#999';
    rodape.style.fontSize = '11px';
    rodape.style.fontStyle = 'italic';
    rodape.innerHTML = `
      <p>Campos e nomes inspirados no Mapa de Autoavaliação Sistêmico – MAAS® / "A Única Coisa". Uso pessoal.</p>
    `;
    container.appendChild(rodape);

    return container;
  }

  // ===== REFERÊNCIAS - ANOTAÇÕES =====

  salvarTodasAnotacoesReferencias(): void {
    if (!this.token || this.expired) {
      this.toastr.warning('Não foi possível salvar as anotações');
      return;
    }

    if (!this.conteudoEstruturado?.referencias?.itens) {
      return;
    }

    this.salvandoAnotacoes = true;
    let salvasComSucesso = 0;
    const totalParaSalvar = this.conteudoEstruturado.referencias.itens.length;

    // Salvar cada anotação
    this.conteudoEstruturado.referencias.itens.forEach((ref: any, index: number) => {
      this.mentoriaService.salvarInteracao(this.token, {
        bloco_id: 0,
        tipo_interacao: 'anotacao_referencia',
        chave_item: `referencia_${index}`,
        valor: ref.anotacaoMentorado || ''
      }).subscribe({
        next: () => {
          salvasComSucesso++;
          console.log(`✅ Anotação ${salvasComSucesso}/${totalParaSalvar} salva`);

          // Quando todas forem salvas
          if (salvasComSucesso === totalParaSalvar) {
            this.toastr.success('Aprendizados salvos com sucesso!');
            this.salvandoAnotacoes = false;
          }
        },
        error: (error) => {
          console.error('Erro ao salvar anotação:', error);
          this.salvandoAnotacoes = false;
          this.toastr.error('Erro ao salvar alguns aprendizados');
        }
      });
    });
  }

  async exportarGoldenCirclePDF(): Promise<void> {
    const temDados = this.goldenCircle.why || this.goldenCircle.how || this.goldenCircle.what;

    if (!temDados) {
      this.toastr.warning('Preencha os campos antes de exportar');
      return;
    }

    try {
      this.toastr.info('Gerando PDF do Golden Circle...');

      const container = this.criarContainerGoldenCircleVisualizacao();
      document.body.appendChild(container);

      await new Promise(resolve => setTimeout(resolve, 300));

      const canvas = await html2canvas(container, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        width: container.scrollWidth,
        height: container.scrollHeight
      });

      document.body.removeChild(container);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`golden-circle-${this.encontro?.mentorado_nome || 'mentoria'}-${Date.now()}.pdf`);

      this.toastr.success('PDF exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      this.toastr.error('Erro ao exportar PDF');
    }
  }

  private criarContainerGoldenCircleVisualizacao(): HTMLElement {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.background = '#ffffff';
    container.style.padding = '60px';
    container.style.minWidth = '1400px';
    container.style.minHeight = '900px';
    container.style.fontFamily = 'Arial, sans-serif';

    // Logo
    const logo = document.createElement('img');
    logo.src = '/logoNaue.png';
    logo.style.position = 'absolute';
    logo.style.top = '40px';
    logo.style.left = '40px';
    logo.style.height = '45px';
    container.appendChild(logo);

    // Título
    const header = document.createElement('div');
    header.style.textAlign = 'center';
    header.style.marginBottom = '60px';

    const h1 = document.createElement('h1');
    h1.textContent = 'The Golden Circle';
    h1.style.fontSize = '36px';
    h1.style.margin = '0 0 10px 0';
    h1.style.fontWeight = 'bold';
    h1.style.color = '#022c22';
    header.appendChild(h1);

    const info = document.createElement('div');
    info.textContent = `${this.encontro?.mentorado_nome || 'Mentoria'}`;
    info.style.fontSize = '18px';
    info.style.fontWeight = '600';
    info.style.color = '#666';
    header.appendChild(info);

    container.appendChild(header);

    // Círculos e Textos
    const circlesWrapper = document.createElement('div');
    circlesWrapper.style.display = 'flex';
    circlesWrapper.style.gap = '80px';
    circlesWrapper.style.alignItems = 'center';
    circlesWrapper.style.justifyContent = 'center';
    circlesWrapper.style.margin = '0 auto';
    circlesWrapper.style.maxWidth = '1200px';

    // SVG dos círculos
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '500');
    svg.setAttribute('height', '500');
    svg.style.flexShrink = '0';

    // Círculo externo (WHAT)
    const circleWhat = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circleWhat.setAttribute('cx', '250');
    circleWhat.setAttribute('cy', '250');
    circleWhat.setAttribute('r', '200');
    circleWhat.setAttribute('fill', 'none');
    circleWhat.setAttribute('stroke', '#022c22');
    circleWhat.setAttribute('stroke-width', '3');
    svg.appendChild(circleWhat);

    // Texto WHAT
    const textWhat = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    textWhat.setAttribute('x', '250');
    textWhat.setAttribute('y', '430');
    textWhat.setAttribute('text-anchor', 'middle');
    textWhat.setAttribute('font-size', '32');
    textWhat.setAttribute('font-weight', 'bold');
    textWhat.setAttribute('fill', '#022c22');
    textWhat.textContent = 'WHAT';
    svg.appendChild(textWhat);

    // Círculo médio (HOW)
    const circleHow = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circleHow.setAttribute('cx', '250');
    circleHow.setAttribute('cy', '250');
    circleHow.setAttribute('r', '133');
    circleHow.setAttribute('fill', 'none');
    circleHow.setAttribute('stroke', '#022c22');
    circleHow.setAttribute('stroke-width', '3');
    svg.appendChild(circleHow);

    // Texto HOW
    const textHow = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    textHow.setAttribute('x', '250');
    textHow.setAttribute('y', '370');
    textHow.setAttribute('text-anchor', 'middle');
    textHow.setAttribute('font-size', '32');
    textHow.setAttribute('font-weight', 'bold');
    textHow.setAttribute('fill', '#022c22');
    textHow.textContent = 'HOW';
    svg.appendChild(textHow);

    // Círculo interno (WHY)
    const circleWhy = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circleWhy.setAttribute('cx', '250');
    circleWhy.setAttribute('cy', '250');
    circleWhy.setAttribute('r', '66');
    circleWhy.setAttribute('fill', 'none');
    circleWhy.setAttribute('stroke', '#022c22');
    circleWhy.setAttribute('stroke-width', '3');
    svg.appendChild(circleWhy);

    // Texto WHY
    const textWhy = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    textWhy.setAttribute('x', '250');
    textWhy.setAttribute('y', '265');
    textWhy.setAttribute('text-anchor', 'middle');
    textWhy.setAttribute('font-size', '32');
    textWhy.setAttribute('font-weight', 'bold');
    textWhy.setAttribute('fill', '#022c22');
    textWhy.textContent = 'WHY';
    svg.appendChild(textWhy);

    // Definição da ponta de seta
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    marker.setAttribute('id', 'arrowhead');
    marker.setAttribute('markerWidth', '10');
    marker.setAttribute('markerHeight', '10');
    marker.setAttribute('refX', '9');
    marker.setAttribute('refY', '3');
    marker.setAttribute('orient', 'auto');

    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    polygon.setAttribute('points', '0 0, 10 3, 0 6');
    polygon.setAttribute('fill', '#022c22');
    marker.appendChild(polygon);
    defs.appendChild(marker);
    svg.appendChild(defs);

    // Seta para WHY (do círculo interno para cima-direita)
    const arrowWhy = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    arrowWhy.setAttribute('d', 'M 316 240 Q 400 80 500 80');
    arrowWhy.setAttribute('stroke', '#022c22');
    arrowWhy.setAttribute('stroke-width', '3');
    arrowWhy.setAttribute('fill', 'none');
    arrowWhy.setAttribute('marker-end', 'url(#arrowhead)');
    svg.appendChild(arrowWhy);

    // Seta para HOW (horizontal do círculo médio)
    const arrowHow = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    arrowHow.setAttribute('x1', '383');
    arrowHow.setAttribute('y1', '250');
    arrowHow.setAttribute('x2', '500');
    arrowHow.setAttribute('y2', '250');
    arrowHow.setAttribute('stroke', '#022c22');
    arrowHow.setAttribute('stroke-width', '3');
    arrowHow.setAttribute('marker-end', 'url(#arrowhead)');
    svg.appendChild(arrowHow);

    // Seta para WHAT (do círculo externo para baixo-direita)
    const arrowWhat = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    arrowWhat.setAttribute('d', 'M 391 391 Q 440 420 500 420');
    arrowWhat.setAttribute('stroke', '#022c22');
    arrowWhat.setAttribute('stroke-width', '3');
    arrowWhat.setAttribute('fill', 'none');
    arrowWhat.setAttribute('marker-end', 'url(#arrowhead)');
    svg.appendChild(arrowWhat);

    circlesWrapper.appendChild(svg);

    // Textos explicativos
    const textsContainer = document.createElement('div');
    textsContainer.style.display = 'flex';
    textsContainer.style.flexDirection = 'column';
    textsContainer.style.gap = '30px';
    textsContainer.style.maxWidth = '500px';

    const items = [
      { title: 'Por que você faz o que você faz?', subtitle: 'Qual o propósito?', value: this.goldenCircle.why },
      { title: 'Como você faz o que você faz?', subtitle: 'Seu processo.', value: this.goldenCircle.how },
      { title: 'O que você faz?', subtitle: 'Seu resultado.', value: this.goldenCircle.what }
    ];

    items.forEach(item => {
      const itemDiv = document.createElement('div');
      itemDiv.style.borderLeft = '4px solid #022c22';
      itemDiv.style.paddingLeft = '20px';

      const titleEl = document.createElement('div');
      titleEl.textContent = item.title;
      titleEl.style.fontSize = '18px';
      titleEl.style.fontWeight = 'bold';
      titleEl.style.color = '#022c22';
      titleEl.style.marginBottom = '5px';
      itemDiv.appendChild(titleEl);

      const subtitleEl = document.createElement('div');
      subtitleEl.textContent = item.subtitle;
      subtitleEl.style.fontSize = '14px';
      subtitleEl.style.color = '#666';
      subtitleEl.style.marginBottom = '10px';
      itemDiv.appendChild(subtitleEl);

      const valueEl = document.createElement('div');
      valueEl.textContent = item.value || '(Não preenchido)';
      valueEl.style.fontSize = '15px';
      valueEl.style.color = item.value ? '#333' : '#999';
      valueEl.style.fontStyle = item.value ? 'normal' : 'italic';
      valueEl.style.lineHeight = '1.5';
      itemDiv.appendChild(valueEl);

      textsContainer.appendChild(itemDiv);
    });

    circlesWrapper.appendChild(textsContainer);
    container.appendChild(circlesWrapper);

    return container;
  }

  async exportarProximosPassosPDF(): Promise<void> {
    const temDados = this.conteudoEstruturado?.proximosPassos?.blocos?.length > 0;

    if (!temDados) {
      this.toastr.warning('Não há próximos passos para exportar');
      return;
    }

    try {
      this.toastr.info('Gerando PDF de Próximos Passos...');

      const container = this.criarContainerProximosPassosVisualizacao();
      document.body.appendChild(container);

      await new Promise(resolve => setTimeout(resolve, 300));

      const canvas = await html2canvas(container, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        width: container.scrollWidth,
        height: container.scrollHeight
      });

      document.body.removeChild(container);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`proximos-passos-${this.encontro?.mentorado_nome || 'mentoria'}-${Date.now()}.pdf`);

      this.toastr.success('PDF exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      this.toastr.error('Erro ao exportar PDF');
    }
  }

  private criarContainerProximosPassosVisualizacao(): HTMLElement {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.background = '#ffffff';
    container.style.padding = '60px';
    container.style.minWidth = '800px';
    container.style.maxWidth = '1000px';
    container.style.fontFamily = 'Arial, sans-serif';

    // Logo
    const logo = document.createElement('img');
    logo.src = '/logoNaue.png';
    logo.style.position = 'absolute';
    logo.style.top = '40px';
    logo.style.left = '40px';
    logo.style.height = '45px';
    container.appendChild(logo);

    // Título
    const header = document.createElement('div');
    header.style.textAlign = 'center';
    header.style.marginBottom = '60px';

    const h1 = document.createElement('h1');
    h1.textContent = 'Próximos Passos';
    h1.style.fontSize = '36px';
    h1.style.margin = '0 0 10px 0';
    h1.style.fontWeight = 'bold';
    h1.style.color = '#022c22';
    header.appendChild(h1);

    const info = document.createElement('div');
    info.textContent = `${this.encontro?.mentorado_nome || 'Mentoria'}`;
    info.style.fontSize = '18px';
    info.style.fontWeight = '600';
    info.style.color = '#666';
    header.appendChild(info);

    container.appendChild(header);

    // Blocos de Próximos Passos
    const passosWrapper = document.createElement('div');
    passosWrapper.style.display = 'flex';
    passosWrapper.style.flexDirection = 'column';
    passosWrapper.style.gap = '30px';

    this.conteudoEstruturado.proximosPassos.blocos.forEach((bloco: any) => {
      const blocoDiv = document.createElement('div');
      blocoDiv.style.background = '#f8f9fa';
      blocoDiv.style.border = '2px solid #022c22';
      blocoDiv.style.borderRadius = '16px';
      blocoDiv.style.padding = '30px';
      blocoDiv.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';

      // Bloco de Texto
      if (bloco.tipo === 'texto' && bloco.conteudo) {
        const textoDiv = document.createElement('div');
        textoDiv.style.borderLeft = '4px solid #022c22';
        textoDiv.style.paddingLeft = '20px';
        textoDiv.style.fontSize = '16px';
        textoDiv.style.lineHeight = '1.6';
        textoDiv.style.color = '#333';
        textoDiv.innerHTML = bloco.conteudo;
        blocoDiv.appendChild(textoDiv);
      }

      // Bloco de Perguntas
      if (bloco.tipo === 'perguntas' && bloco.perguntas?.length > 0) {
        const titleDiv = document.createElement('div');
        titleDiv.style.fontSize = '22px';
        titleDiv.style.fontWeight = 'bold';
        titleDiv.style.color = '#022c22';
        titleDiv.style.marginBottom = '20px';
        titleDiv.style.display = 'flex';
        titleDiv.style.alignItems = 'center';
        titleDiv.style.gap = '10px';
        titleDiv.innerHTML = `<i class="fa-solid fa-question-circle"></i> ${this.getNomeTemplate(bloco)}`;
        blocoDiv.appendChild(titleDiv);

        bloco.perguntas.forEach((pergunta: any, index: number) => {
          const perguntaDiv = document.createElement('div');
          perguntaDiv.style.marginBottom = '25px';
          perguntaDiv.style.paddingBottom = '25px';
          if (index < bloco.perguntas.length - 1) {
            perguntaDiv.style.borderBottom = '1px solid #dee2e6';
          }

          const numDiv = document.createElement('div');
          numDiv.style.display = 'inline-block';
          numDiv.style.background = '#022c22';
          numDiv.style.color = 'white';
          numDiv.style.borderRadius = '50%';
          numDiv.style.width = '32px';
          numDiv.style.height = '32px';
          numDiv.style.lineHeight = '32px';
          numDiv.style.textAlign = 'center';
          numDiv.style.fontWeight = 'bold';
          numDiv.style.fontSize = '14px';
          numDiv.style.marginBottom = '10px';
          numDiv.textContent = (index + 1).toString();
          perguntaDiv.appendChild(numDiv);

          const questionText = document.createElement('p');
          questionText.textContent = pergunta.pergunta;
          questionText.style.fontWeight = 'bold';
          questionText.style.fontSize = '16px';
          questionText.style.color = '#022c22';
          questionText.style.margin = '10px 0';
          questionText.style.whiteSpace = 'pre-wrap';
          perguntaDiv.appendChild(questionText);

          const answerDiv = document.createElement('div');
          answerDiv.textContent = pergunta.respostaUsuario || '(Não respondido)';
          answerDiv.style.fontSize = '15px';
          answerDiv.style.color = pergunta.respostaUsuario ? '#333' : '#999';
          answerDiv.style.fontStyle = pergunta.respostaUsuario ? 'normal' : 'italic';
          answerDiv.style.lineHeight = '1.6';
          answerDiv.style.paddingLeft = '20px';
          answerDiv.style.borderLeft = '3px solid #dee2e6';
          answerDiv.style.marginTop = '10px';
          answerDiv.style.whiteSpace = 'pre-wrap';
          perguntaDiv.appendChild(answerDiv);

          blocoDiv.appendChild(perguntaDiv);
        });
      }

      // Bloco de Tarefas
      if (bloco.tipo === 'tarefas' && bloco.tarefas?.itens?.length > 0) {
        const titleDiv = document.createElement('div');
        titleDiv.style.fontSize = '22px';
        titleDiv.style.fontWeight = 'bold';
        titleDiv.style.color = '#022c22';
        titleDiv.style.marginBottom = '20px';
        titleDiv.style.display = 'flex';
        titleDiv.style.alignItems = 'center';
        titleDiv.style.gap = '10px';
        titleDiv.innerHTML = `<i class="fa-solid fa-list-check"></i> ${bloco.tarefas.titulo || 'Tarefas'}`;
        blocoDiv.appendChild(titleDiv);

        const listDiv = document.createElement('ul');
        listDiv.style.listStyle = 'none';
        listDiv.style.padding = '0';
        listDiv.style.margin = '0';

        bloco.tarefas.itens.forEach((tarefa: any) => {
          const tarefaItem = document.createElement('li');
          tarefaItem.style.display = 'flex';
          tarefaItem.style.alignItems = 'center';
          tarefaItem.style.gap = '12px';
          tarefaItem.style.padding = '12px 0';
          tarefaItem.style.borderBottom = '1px solid #dee2e6';

          const checkbox = document.createElement('span');
          checkbox.style.display = 'inline-block';
          checkbox.style.width = '24px';
          checkbox.style.height = '24px';
          checkbox.style.border = '2px solid #022c22';
          checkbox.style.borderRadius = '6px';
          checkbox.style.flexShrink = '0';
          checkbox.style.position = 'relative';

          if (tarefa.checked) {
            checkbox.style.background = '#022c22';
            const checkmark = document.createElement('span');
            checkmark.innerHTML = '✓';
            checkmark.style.color = 'white';
            checkmark.style.position = 'absolute';
            checkmark.style.top = '50%';
            checkmark.style.left = '50%';
            checkmark.style.transform = 'translate(-50%, -50%)';
            checkmark.style.fontSize = '16px';
            checkmark.style.fontWeight = 'bold';
            checkbox.appendChild(checkmark);
          }

          tarefaItem.appendChild(checkbox);

          const tarefaText = document.createElement('span');
          tarefaText.textContent = tarefa.texto || tarefa;
          tarefaText.style.fontSize = '15px';
          tarefaText.style.color = '#333';
          tarefaText.style.lineHeight = '1.5';
          tarefaItem.appendChild(tarefaText);

          listDiv.appendChild(tarefaItem);
        });

        blocoDiv.appendChild(listDiv);
      }

      passosWrapper.appendChild(blocoDiv);
    });

    container.appendChild(passosWrapper);

    return container;
  }

  // Métodos para detecção e processamento de vídeos do YouTube
  isYouTubeUrl(url: string): boolean {
    if (!url) return false;
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/)|youtu\.be\/)/;
    return youtubeRegex.test(url);
  }

  getYouTubeVideoId(url: string): string | null {
    if (!url) return null;

    // Expressão regular para capturar diferentes formatos de URLs do YouTube
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtube\.com\/v\/|youtu\.be\/)([^&\n?#]+)/,
      /youtube\.com\/watch.*[?&]v=([^&\n?#]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }

  getYouTubeEmbedUrl(url: string): SafeResourceUrl | null {
    const videoId = this.getYouTubeVideoId(url);
    if (videoId) {
      const embedUrl = `https://www.youtube.com/embed/${videoId}`;
      return this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
    }
    return null;
  }

  // Método para obter o label do tipo de referência
  getReferenciaLabel(tipo: string): string {
    const labels: { [key: string]: string } = {
      'ted': 'TED Talk',
      'livro': 'Livro',
      'leitura': 'Leitura',
      'video': 'Vídeo',
      'link': 'Link',
      'teste': 'Teste',
      'gymrats': 'GymRats',
      'outro': 'Outro'
    };
    return labels[tipo] || tipo;
  }

  // ===== TERMÔMETRO DE GESTÃO =====

  adicionarAtividade(): void {
    if (!this.novaAtividade || !this.novaAtividade.trim()) {
      this.toastr.warning('Digite o nome da atividade');
      return;
    }

    const novaAtividade: TermometroGestaoAtividade = {
      id: `ativ_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      nome: this.novaAtividade.trim(),
      categoria: this.novaAtividadeCategoria
    };

    this.termometroGestao.atividades.push(novaAtividade);
    this.novaAtividade = '';

    // Recalcular percentuais
    this.calcularPercentuais();

    this.toastr.success('Atividade adicionada! Clique em "Gerar Análise" para visualizar os gráficos.');
  }

  removerAtividade(atividadeId: string): void {
    this.termometroGestao.atividades = this.termometroGestao.atividades.filter(
      a => a.id !== atividadeId
    );

    // Recalcular percentuais
    this.calcularPercentuais();
  }

  calcularPercentuais(): void {
    const total = this.termometroGestao.atividades.length;

    if (total === 0) {
      this.termometroGestao.percentualEstrategico = 0;
      this.termometroGestao.percentualTatico = 0;
      this.termometroGestao.percentualOperacional = 0;
      return;
    }

    const counts = {
      strategic: 0,
      tactical: 0,
      operational: 0
    };

    this.termometroGestao.atividades.forEach(ativ => {
      counts[ativ.categoria]++;
    });

    this.termometroGestao.percentualEstrategico = Math.round((counts.strategic / total) * 100);
    this.termometroGestao.percentualTatico = Math.round((counts.tactical / total) * 100);
    this.termometroGestao.percentualOperacional = Math.round((counts.operational / total) * 100);
  }

  onPerfilComparacaoChange(): void {
    // Atualizar apenas gráfico de referência se já tiver atividades
    if (this.termometroGestao.atividades.length > 0) {
      setTimeout(() => {
        const perfil = this.perfisReferencia[this.termometroGestao.perfilComparacao];
        this.criarDonutChartTermometro('referenceDonutTermometro', perfil, 'ref');
        this.criarBarraPerfilTermometro('referenceProfileTermometro', perfil);

        const tituloElement = document.getElementById('referenceTitleTermometro');
        if (tituloElement) {
          tituloElement.textContent = this.termometroGestao.perfilComparacao.toUpperCase();
        }
      }, 100);
    }
  }

  salvarTermometroGestao(): void {
    if (!this.token || this.expired) {
      return;
    }

    if (this.termometroGestao.atividades.length === 0) {
      this.toastr.warning('Adicione pelo menos uma atividade para gerar a análise');
      return;
    }

    this.salvandoTermometro = true;

    // Atualizar gráficos
    this.atualizarGraficosTermometro();

    const dadosParaSalvar = {
      atividades: JSON.stringify(this.termometroGestao.atividades),
      perfil_comparacao: this.termometroGestao.perfilComparacao,
      percentual_estrategico: this.termometroGestao.percentualEstrategico,
      percentual_tatico: this.termometroGestao.percentualTatico,
      percentual_operacional: this.termometroGestao.percentualOperacional
    };

    this.mentoriaService.salvarTermometroGestao(this.token, dadosParaSalvar).subscribe({
      next: (response: any) => {
        if (response.data && response.data.id) {
          this.termometroGestaoId = response.data.id;
        }
        this.toastr.success('Análise gerada e salva com sucesso!');
        this.salvandoTermometro = false;
      },
      error: (error: any) => {
        console.error('Erro ao salvar Termômetro de Gestão:', error);
        this.toastr.error('Erro ao salvar análise');
        this.salvandoTermometro = false;
      }
    });
  }

  getCategoriaNome(categoria: string): string {
    const nomes = {
      'strategic': 'Estratégico',
      'tactical': 'Tático',
      'operational': 'Operacional'
    };
    return nomes[categoria as keyof typeof nomes] || categoria;
  }

  getCategoriaClass(categoria: string): string {
    const classes = {
      'strategic': 'badge-strategic',
      'tactical': 'badge-tactical',
      'operational': 'badge-operational'
    };
    return classes[categoria as keyof typeof classes] || '';
  }

  getComparacaoDiff(tipo: 'strategic' | 'tactical' | 'operational'): number {
    const perfil = this.perfisReferencia[this.termometroGestao.perfilComparacao];
    const atual = tipo === 'strategic'
      ? this.termometroGestao.percentualEstrategico
      : tipo === 'tactical'
      ? this.termometroGestao.percentualTatico
      : this.termometroGestao.percentualOperacional;

    return atual - perfil[tipo];
  }

  getComparacaoStatus(diff: number): 'match' | 'close' | 'far' {
    const absDiff = Math.abs(diff);
    if (absDiff <= 5) return 'match';
    if (absDiff <= 15) return 'close';
    return 'far';
  }

  getComparacaoLabel(diff: number): string {
    const status = this.getComparacaoStatus(diff);
    const labels = {
      'match': 'Alinhado',
      'close': 'Próximo',
      'far': 'Distante'
    };
    return labels[status];
  }

  // Métodos auxiliares para contagem de atividades
  getAtividadesEstrategicasCount(): number {
    return this.termometroGestao.atividades.filter(a => a.categoria === 'strategic').length;
  }

  getAtividadesTaticasCount(): number {
    return this.termometroGestao.atividades.filter(a => a.categoria === 'tactical').length;
  }

  getAtividadesOperacionaisCount(): number {
    return this.termometroGestao.atividades.filter(a => a.categoria === 'operational').length;
  }

  // Atualizar gráficos visuais
  atualizarGraficosTermometro(): void {
    if (this.termometroGestao.atividades.length === 0) {
      return;
    }

    // Aguardar o Angular renderizar o *ngIf
    setTimeout(() => {
      // Verificar se elementos existem
      const userDonutEl = document.getElementById('userDonutTermometro');
      const refDonutEl = document.getElementById('referenceDonutTermometro');
      const userProfileEl = document.getElementById('userProfileTermometro');
      const refProfileEl = document.getElementById('referenceProfileTermometro');

      if (!userDonutEl || !refDonutEl || !userProfileEl || !refProfileEl) {
        // Tentar novamente após mais tempo
        setTimeout(() => {
          this.renderizarGraficosTermometro();
        }, 500);
        return;
      }

      this.renderizarGraficosTermometro();
    }, 300);
  }

  renderizarGraficosTermometro(): void {
    // Atualizar gráfico do usuário
    this.criarDonutChartTermometro('userDonutTermometro', {
      strategic: this.termometroGestao.percentualEstrategico,
      tactical: this.termometroGestao.percentualTatico,
      operational: this.termometroGestao.percentualOperacional
    }, 'user');

    // Atualizar barra do usuário
    this.criarBarraPerfilTermometro('userProfileTermometro', {
      strategic: this.termometroGestao.percentualEstrategico,
      tactical: this.termometroGestao.percentualTatico,
      operational: this.termometroGestao.percentualOperacional
    });

    // Atualizar gráfico de referência
    const perfil = this.perfisReferencia[this.termometroGestao.perfilComparacao];
    this.criarDonutChartTermometro('referenceDonutTermometro', perfil, 'ref');
    this.criarBarraPerfilTermometro('referenceProfileTermometro', perfil);

    // Atualizar título do perfil de referência
    const tituloElement = document.getElementById('referenceTitleTermometro');
    if (tituloElement) {
      tituloElement.textContent = this.termometroGestao.perfilComparacao.toUpperCase();
    }
  }

  criarDonutChartTermometro(elementId: string, data: any, type: 'user' | 'ref'): void {
    const container = document.getElementById(elementId);
    if (!container) return;

    const svg = container.querySelector('svg');
    if (!svg) return;

    // Remover circles antigos (exceto o primeiro que é o background)
    const circles = svg.querySelectorAll('circle:not(:first-child)');
    circles.forEach(c => c.remove());

    const values = [
      { value: data.strategic, color: '#10b981', label: 'Estratégico' },
      { value: data.tactical, color: '#9ca3af', label: 'Tático' },
      { value: data.operational, color: '#1a1a1a', label: 'Operacional' }
    ];

    // Verificar se há valores válidos
    const totalPercentual = values.reduce((sum, item) => sum + item.value, 0);
    if (totalPercentual === 0) return;

    // Ordenar para pegar o maior
    const sorted = [...values].sort((a, b) => b.value - a.value);
    const main = sorted[0];

    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;

    values.forEach((item) => {
      if (item.value > 0) {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        const strokeLength = (item.value / 100) * circumference;

        circle.setAttribute('cx', '100');
        circle.setAttribute('cy', '100');
        circle.setAttribute('r', String(radius));
        circle.setAttribute('fill', 'none');
        circle.setAttribute('stroke', item.color);
        circle.setAttribute('stroke-width', '30');
        circle.setAttribute('stroke-dasharray', `${strokeLength} ${circumference}`);
        circle.setAttribute('stroke-dashoffset', String(-offset));

        svg.appendChild(circle);
        offset += strokeLength;
      }
    });

    // Atualizar centro do donut
    const valueEl = container.querySelector('.termometro-donut-value');
    const labelEl = container.querySelector('.termometro-donut-label');

    if (valueEl) valueEl.textContent = main.value + '%';
    if (labelEl) labelEl.textContent = main.label;
  }

  criarBarraPerfilTermometro(elementId: string, data: any): void {
    const container = document.getElementById(elementId);
    if (!container) return;

    container.innerHTML = '';

    const segments = [
      { value: data.operational, class: 'termometro-segment-operational', label: 'Operacional', color: '#1a1a1a' },
      { value: data.tactical, class: 'termometro-segment-tactical', label: 'Tático', color: '#e5e5e5' },
      { value: data.strategic, class: 'termometro-segment-strategic', label: 'Estratégico', color: '#10b981' }
    ];

    segments.forEach(segment => {
      if (segment.value > 0) {
        const div = document.createElement('div');
        div.className = `termometro-segment ${segment.class}`;
        div.style.height = `${segment.value}%`;
        div.style.backgroundColor = segment.color;
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.style.justifyContent = 'center';
        div.style.textAlign = 'center';

        // Definir cor do texto baseado no fundo
        if (segment.label === 'Operacional' || segment.label === 'Estratégico') {
          div.style.color = 'white';
        } else {
          div.style.color = '#666';
        }

        div.textContent = `${segment.value}%`;
        container.appendChild(div);
      }
    });
  }

  // ===== EXPORTAR TERMÔMETRO DE GESTÃO PARA PDF =====
  async exportarTermometroGestaoPDF(): Promise<void> {
    if (this.termometroGestao.atividades.length === 0) {
      this.toastr.warning('Adicione atividades antes de exportar');
      return;
    }

    try {
      this.toastr.info('Gerando PDF do Termômetro de Gestão...');

      const container = this.criarContainerTermometroVisualizacao();
      document.body.appendChild(container);

      // Aguardar renderização completa dos SVGs
      await new Promise(resolve => setTimeout(resolve, 1500));

      const canvas = await html2canvas(container, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: true,
        useCORS: true,
        allowTaint: true,
        foreignObjectRendering: false,
        imageTimeout: 0
      });

      document.body.removeChild(container);

      const imgData = canvas.toDataURL('image/jpeg', 0.9);

      // Criar PDF com dimensões personalizadas baseadas no conteúdo
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      // Converter pixels para mm (aproximadamente 96 DPI)
      const pdfWidth = imgWidth * 0.264583; // conversão de px para mm
      const pdfHeight = imgHeight * 0.264583;

      const pdf = new jsPDF({
        orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
        unit: 'mm',
        format: [pdfWidth, pdfHeight]
      });

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`termometro-gestao-${this.encontro?.mentorado_nome || 'mentoria'}-${Date.now()}.pdf`);

      this.toastr.success('PDF exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      this.toastr.error('Erro ao exportar PDF');
    }
  }

  private criarContainerTermometroVisualizacao(): HTMLElement {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.background = '#ffffff';
    container.style.padding = '60px';
    container.style.width = '1400px';
    container.style.fontFamily = 'Inter, Arial, sans-serif';
    container.style.minHeight = 'auto';
    container.style.overflow = 'visible';
    container.style.boxSizing = 'border-box';

    // Logo
    const logo = document.createElement('img');
    logo.src = '/logoNaue.png';
    logo.style.position = 'absolute';
    logo.style.top = '40px';
    logo.style.left = '40px';
    logo.style.height = '45px';
    container.appendChild(logo);

    // Título
    const header = document.createElement('div');
    header.style.textAlign = 'center';
    header.style.marginBottom = '40px';

    const h1 = document.createElement('h1');
    h1.textContent = 'Termômetro de Gestão';
    h1.style.fontSize = '32px';
    h1.style.fontWeight = '700';
    h1.style.color = '#2d3748';
    h1.style.marginBottom = '10px';
    header.appendChild(h1);

    const subtitle = document.createElement('p');
    subtitle.textContent = 'Análise de Perfil Profissional';
    subtitle.style.fontSize = '18px';
    subtitle.style.color = '#718096';
    subtitle.style.fontWeight = '500';
    header.appendChild(subtitle);

    container.appendChild(header);

    // Informações do mentorado
    if (this.encontro) {
      const info = document.createElement('div');
      info.style.textAlign = 'center';
      info.style.marginBottom = '40px';
      info.style.fontSize = '16px';
      info.style.color = '#4a5568';
      info.innerHTML = `
        <strong>${this.encontro.mentorado_nome}</strong> | Encontro #${this.encontro.numero_encontro} |
        ${new Date(this.encontro.data_encontro).toLocaleDateString('pt-BR')}
      `;
      container.appendChild(info);
    }

    // Conteúdo principal em grid
    const mainGrid = document.createElement('div');
    mainGrid.style.display = 'grid';
    mainGrid.style.gridTemplateColumns = '1fr 1fr';
    mainGrid.style.gap = '40px';
    mainGrid.style.marginBottom = '40px';

    // Resumo dos Percentuais
    const resumoCard = document.createElement('div');
    resumoCard.style.background = '#f7fafc';
    resumoCard.style.border = '2px solid #e2e8f0';
    resumoCard.style.borderRadius = '16px';
    resumoCard.style.padding = '30px';

    const resumoTitle = document.createElement('h3');
    resumoTitle.textContent = 'Distribuição Atual';
    resumoTitle.style.fontSize = '20px';
    resumoTitle.style.fontWeight = '700';
    resumoTitle.style.marginBottom = '20px';
    resumoTitle.style.color = '#2d3748';
    resumoCard.appendChild(resumoTitle);

    const resumoGrid = document.createElement('div');
    resumoGrid.style.display = 'grid';
    resumoGrid.style.gridTemplateColumns = 'repeat(3, 1fr)';
    resumoGrid.style.gap = '20px';
    resumoGrid.style.textAlign = 'center';

    const categorias = [
      { label: 'Estratégico', valor: this.termometroGestao.percentualEstrategico, cor: '#10b981' },
      { label: 'Tático', valor: this.termometroGestao.percentualTatico, cor: '#9ca3af' },
      { label: 'Operacional', valor: this.termometroGestao.percentualOperacional, cor: '#1a1a1a' }
    ];

    categorias.forEach(cat => {
      const item = document.createElement('div');
      const value = document.createElement('div');
      value.textContent = `${cat.valor}%`;
      value.style.fontSize = '36px';
      value.style.fontWeight = '700';
      value.style.color = cat.cor;
      value.style.marginBottom = '8px';
      item.appendChild(value);

      const label = document.createElement('div');
      label.textContent = cat.label;
      label.style.fontSize = '14px';
      label.style.color = '#718096';
      label.style.textTransform = 'uppercase';
      label.style.letterSpacing = '1px';
      label.style.fontWeight = '600';
      item.appendChild(label);

      resumoGrid.appendChild(item);
    });

    resumoCard.appendChild(resumoGrid);
    mainGrid.appendChild(resumoCard);

    // Perfil de Comparação
    const perfilCard = document.createElement('div');
    perfilCard.style.background = '#f7fafc';
    perfilCard.style.border = '2px solid #e2e8f0';
    perfilCard.style.borderRadius = '16px';
    perfilCard.style.padding = '30px';

    const perfilTitle = document.createElement('h3');
    perfilTitle.textContent = `Perfil de Comparação: ${this.termometroGestao.perfilComparacao}`;
    perfilTitle.style.fontSize = '20px';
    perfilTitle.style.fontWeight = '700';
    perfilTitle.style.marginBottom = '20px';
    perfilTitle.style.color = '#2d3748';
    perfilTitle.style.textTransform = 'capitalize';
    perfilCard.appendChild(perfilTitle);

    const perfil = this.perfisReferencia[this.termometroGestao.perfilComparacao];
    const perfilGrid = document.createElement('div');
    perfilGrid.style.display = 'grid';
    perfilGrid.style.gridTemplateColumns = 'repeat(3, 1fr)';
    perfilGrid.style.gap = '20px';
    perfilGrid.style.textAlign = 'center';

    const referenciaCats = [
      { label: 'Estratégico', valor: perfil.strategic, cor: '#10b981' },
      { label: 'Tático', valor: perfil.tactical, cor: '#9ca3af' },
      { label: 'Operacional', valor: perfil.operational, cor: '#1a1a1a' }
    ];

    referenciaCats.forEach(cat => {
      const item = document.createElement('div');
      const value = document.createElement('div');
      value.textContent = `${cat.valor}%`;
      value.style.fontSize = '36px';
      value.style.fontWeight = '700';
      value.style.color = cat.cor;
      value.style.marginBottom = '8px';
      item.appendChild(value);

      const label = document.createElement('div');
      label.textContent = cat.label;
      label.style.fontSize = '14px';
      label.style.color = '#718096';
      label.style.textTransform = 'uppercase';
      label.style.letterSpacing = '1px';
      label.style.fontWeight = '600';
      item.appendChild(label);

      perfilGrid.appendChild(item);
    });

    perfilCard.appendChild(perfilGrid);
    mainGrid.appendChild(perfilCard);

    container.appendChild(mainGrid);

    // Gráficos Visuais (Donuts e Barras)
    const graficosTitle = document.createElement('h3');
    graficosTitle.textContent = 'Visualização dos Perfis';
    graficosTitle.style.fontSize = '24px';
    graficosTitle.style.fontWeight = '700';
    graficosTitle.style.marginBottom = '30px';
    graficosTitle.style.color = '#2d3748';
    graficosTitle.style.textAlign = 'center';
    container.appendChild(graficosTitle);

    const graficosGrid = document.createElement('div');
    graficosGrid.style.display = 'grid';
    graficosGrid.style.gridTemplateColumns = '1fr 1fr';
    graficosGrid.style.gap = '40px';
    graficosGrid.style.marginBottom = '50px';

    // Card Seu Perfil
    const seuPerfilCard = document.createElement('div');
    seuPerfilCard.style.background = '#ffffff';
    seuPerfilCard.style.border = '2px solid #e2e8f0';
    seuPerfilCard.style.borderRadius = '16px';
    seuPerfilCard.style.padding = '30px';
    seuPerfilCard.style.textAlign = 'center';

    const seuPerfilTitle = document.createElement('h4');
    seuPerfilTitle.textContent = 'Seu Perfil Atual';
    seuPerfilTitle.style.fontSize = '18px';
    seuPerfilTitle.style.fontWeight = '700';
    seuPerfilTitle.style.marginBottom = '20px';
    seuPerfilTitle.style.color = '#2d3748';
    seuPerfilCard.appendChild(seuPerfilTitle);

    // Criar Donut Canvas para Seu Perfil (melhor compatibilidade com PDF)
    const seuDonutCanvas = this.criarDonutCanvas({
      strategic: this.termometroGestao.percentualEstrategico,
      tactical: this.termometroGestao.percentualTatico,
      operational: this.termometroGestao.percentualOperacional
    });
    seuPerfilCard.appendChild(seuDonutCanvas);

    // Criar Barra para Seu Perfil
    const seuBarraWrapper = document.createElement('div');
    seuBarraWrapper.style.marginTop = '30px';
    const seuBarraHeader = document.createElement('div');
    seuBarraHeader.textContent = 'SEU PERFIL';
    seuBarraHeader.style.background = '#022c22';
    seuBarraHeader.style.color = 'white';
    seuBarraHeader.style.padding = '12px';
    seuBarraHeader.style.textAlign = 'center';
    seuBarraHeader.style.fontWeight = '700';
    seuBarraHeader.style.fontSize = '12px';
    seuBarraHeader.style.letterSpacing = '1.5px';
    seuBarraHeader.style.width = '120px';
    seuBarraHeader.style.margin = '0 auto';
    seuBarraHeader.style.boxSizing = 'border-box';
    seuBarraWrapper.appendChild(seuBarraHeader);

    const seuBarraSegments = document.createElement('div');
    seuBarraSegments.style.height = '280px';
    seuBarraSegments.style.width = '120px';
    seuBarraSegments.style.margin = '0 auto';
    seuBarraSegments.style.background = '#fafafa';
    seuBarraSegments.style.border = '1px solid #e5e5e5';
    seuBarraSegments.style.borderTop = 'none';
    seuBarraSegments.style.display = 'flex';
    seuBarraSegments.style.flexDirection = 'column-reverse';

    const seuSegments = [
      { value: this.termometroGestao.percentualOperacional, color: '#1a1a1a', textColor: 'white' },
      { value: this.termometroGestao.percentualTatico, color: '#e5e5e5', textColor: '#666' },
      { value: this.termometroGestao.percentualEstrategico, color: '#10b981', textColor: 'white' }
    ];

    seuSegments.forEach(seg => {
      if (seg.value > 0) {
        const segDiv = document.createElement('div');
        segDiv.style.height = `${seg.value}%`;
        segDiv.style.background = seg.color;
        segDiv.style.color = seg.textColor;
        segDiv.style.display = 'flex';
        segDiv.style.alignItems = 'center';
        segDiv.style.justifyContent = 'center';
        segDiv.style.fontWeight = '600';
        segDiv.style.fontSize = '14px';
        segDiv.textContent = `${seg.value}%`;
        seuBarraSegments.appendChild(segDiv);
      }
    });

    seuBarraWrapper.appendChild(seuBarraSegments);
    seuPerfilCard.appendChild(seuBarraWrapper);
    graficosGrid.appendChild(seuPerfilCard);

    // Card Perfil de Referência
    const refPerfilCard = document.createElement('div');
    refPerfilCard.style.background = '#ffffff';
    refPerfilCard.style.border = '2px solid #e2e8f0';
    refPerfilCard.style.borderRadius = '16px';
    refPerfilCard.style.padding = '30px';
    refPerfilCard.style.textAlign = 'center';

    const refPerfilTitle = document.createElement('h4');
    refPerfilTitle.textContent = 'Perfil de Referência';
    refPerfilTitle.style.fontSize = '18px';
    refPerfilTitle.style.fontWeight = '700';
    refPerfilTitle.style.marginBottom = '20px';
    refPerfilTitle.style.color = '#2d3748';
    refPerfilCard.appendChild(refPerfilTitle);

    // Criar Donut Canvas para Referência (melhor compatibilidade com PDF)
    const refDonutCanvas = this.criarDonutCanvas(perfil);
    refPerfilCard.appendChild(refDonutCanvas);

    // Criar Barra para Referência
    const refBarraWrapper = document.createElement('div');
    refBarraWrapper.style.marginTop = '30px';
    const refBarraHeader = document.createElement('div');
    refBarraHeader.textContent = this.termometroGestao.perfilComparacao.toUpperCase();
    refBarraHeader.style.background = '#022c22';
    refBarraHeader.style.color = 'white';
    refBarraHeader.style.padding = '12px';
    refBarraHeader.style.textAlign = 'center';
    refBarraHeader.style.fontWeight = '700';
    refBarraHeader.style.fontSize = '12px';
    refBarraHeader.style.letterSpacing = '1.5px';
    refBarraHeader.style.width = '120px';
    refBarraHeader.style.margin = '0 auto';
    refBarraHeader.style.boxSizing = 'border-box';
    refBarraWrapper.appendChild(refBarraHeader);

    const refBarraSegments = document.createElement('div');
    refBarraSegments.style.height = '280px';
    refBarraSegments.style.width = '120px';
    refBarraSegments.style.margin = '0 auto';
    refBarraSegments.style.background = '#fafafa';
    refBarraSegments.style.border = '1px solid #e5e5e5';
    refBarraSegments.style.borderTop = 'none';
    refBarraSegments.style.display = 'flex';
    refBarraSegments.style.flexDirection = 'column-reverse';

    const refSegments = [
      { value: perfil.operational, color: '#1a1a1a', textColor: 'white' },
      { value: perfil.tactical, color: '#e5e5e5', textColor: '#666' },
      { value: perfil.strategic, color: '#10b981', textColor: 'white' }
    ];

    refSegments.forEach(seg => {
      if (seg.value > 0) {
        const segDiv = document.createElement('div');
        segDiv.style.height = `${seg.value}%`;
        segDiv.style.background = seg.color;
        segDiv.style.color = seg.textColor;
        segDiv.style.display = 'flex';
        segDiv.style.alignItems = 'center';
        segDiv.style.justifyContent = 'center';
        segDiv.style.fontWeight = '600';
        segDiv.style.fontSize = '14px';
        segDiv.textContent = `${seg.value}%`;
        refBarraSegments.appendChild(segDiv);
      }
    });

    refBarraWrapper.appendChild(refBarraSegments);
    refPerfilCard.appendChild(refBarraWrapper);
    graficosGrid.appendChild(refPerfilCard);

    container.appendChild(graficosGrid);

    // Análise Comparativa
    const comparacaoTitle = document.createElement('h3');
    comparacaoTitle.textContent = 'Análise Comparativa';
    comparacaoTitle.style.fontSize = '24px';
    comparacaoTitle.style.fontWeight = '700';
    comparacaoTitle.style.marginBottom = '30px';
    comparacaoTitle.style.color = '#2d3748';
    comparacaoTitle.style.textAlign = 'center';
    container.appendChild(comparacaoTitle);

    const comparacaoGrid = document.createElement('div');
    comparacaoGrid.style.display = 'grid';
    comparacaoGrid.style.gridTemplateColumns = 'repeat(3, 1fr)';
    comparacaoGrid.style.gap = '30px';
    comparacaoGrid.style.marginBottom = '40px';

    const tipos: Array<'strategic' | 'tactical' | 'operational'> = ['strategic', 'tactical', 'operational'];
    const labels = { strategic: 'Estratégico', tactical: 'Tático', operational: 'Operacional' };
    const cores = { strategic: '#10b981', tactical: '#9ca3af', operational: '#1a1a1a' };

    tipos.forEach(tipo => {
      const diff = this.getComparacaoDiff(tipo);
      const status = this.getComparacaoStatus(diff);
      const statusLabel = this.getComparacaoLabel(diff);

      const atual = tipo === 'strategic' ? this.termometroGestao.percentualEstrategico :
                    tipo === 'tactical' ? this.termometroGestao.percentualTatico :
                    this.termometroGestao.percentualOperacional;

      const ref = perfil[tipo];

      const card = document.createElement('div');
      card.style.background = '#ffffff';
      card.style.border = `3px solid ${cores[tipo]}`;
      card.style.borderRadius = '16px';
      card.style.padding = '30px 20px';
      card.style.textAlign = 'center';

      const title = document.createElement('h4');
      title.textContent = labels[tipo];
      title.style.fontSize = '16px';
      title.style.fontWeight = '700';
      title.style.marginBottom = '20px';
      title.style.color = '#2d3748';
      title.style.textTransform = 'uppercase';
      card.appendChild(title);

      const diffValue = document.createElement('div');
      diffValue.textContent = `${diff > 0 ? '+' : ''}${diff}%`;
      diffValue.style.fontSize = '48px';
      diffValue.style.fontWeight = '700';
      diffValue.style.color = diff > 0 ? '#10b981' : diff < 0 ? '#ef4444' : '#2d3748';
      diffValue.style.marginBottom = '15px';
      card.appendChild(diffValue);

      const values = document.createElement('div');
      values.style.fontSize = '14px';
      values.style.color = '#4a5568';
      values.style.marginBottom = '15px';
      values.innerHTML = `
        <div style="margin: 5px 0;">Atual: ${atual}%</div>
        <div style="margin: 5px 0;">Referência: ${ref}%</div>
      `;
      card.appendChild(values);

      const statusBadge = document.createElement('div');
      statusBadge.textContent = statusLabel;
      statusBadge.style.display = 'inline-block';
      statusBadge.style.padding = '8px 16px';
      statusBadge.style.borderRadius = '20px';
      statusBadge.style.fontSize = '12px';
      statusBadge.style.fontWeight = '700';
      statusBadge.style.textTransform = 'uppercase';
      statusBadge.style.letterSpacing = '1px';

      if (status === 'match') {
        statusBadge.style.background = '#d1fae5';
        statusBadge.style.color = '#065f46';
      } else if (status === 'close') {
        statusBadge.style.background = '#fef3c7';
        statusBadge.style.color = '#92400e';
      } else {
        statusBadge.style.background = '#fee2e2';
        statusBadge.style.color = '#991b1b';
      }

      card.appendChild(statusBadge);
      comparacaoGrid.appendChild(card);
    });

    container.appendChild(comparacaoGrid);

    // Lista de Atividades
    const atividadesTitle = document.createElement('h3');
    atividadesTitle.textContent = 'Atividades Cadastradas';
    atividadesTitle.style.fontSize = '24px';
    atividadesTitle.style.fontWeight = '700';
    atividadesTitle.style.marginBottom = '20px';
    atividadesTitle.style.color = '#2d3748';
    container.appendChild(atividadesTitle);

    const atividadesList = document.createElement('div');
    atividadesList.style.display = 'grid';
    atividadesList.style.gridTemplateColumns = 'repeat(2, 1fr)';
    atividadesList.style.gap = '15px';

    this.termometroGestao.atividades.forEach(ativ => {
      const item = document.createElement('div');
      item.style.background = '#f7fafc';
      item.style.border = '2px solid #e2e8f0';
      item.style.borderRadius = '12px';
      item.style.padding = '15px 20px';
      item.style.display = 'flex';
      item.style.justifyContent = 'space-between';
      item.style.alignItems = 'center';

      const name = document.createElement('span');
      name.textContent = ativ.nome;
      name.style.fontSize = '14px';
      name.style.color = '#2d3748';
      name.style.fontWeight = '500';
      item.appendChild(name);

      const badge = document.createElement('span');
      badge.textContent = this.getCategoriaNome(ativ.categoria);
      badge.style.padding = '6px 12px';
      badge.style.borderRadius = '20px';
      badge.style.fontSize = '11px';
      badge.style.fontWeight = '700';
      badge.style.textTransform = 'uppercase';
      badge.style.letterSpacing = '0.5px';
      badge.style.color = 'white';

      if (ativ.categoria === 'strategic') {
        badge.style.background = '#10b981';
      } else if (ativ.categoria === 'tactical') {
        badge.style.background = '#9ca3af';
      } else {
        badge.style.background = '#1a1a1a';
      }

      item.appendChild(badge);
      atividadesList.appendChild(item);
    });

    container.appendChild(atividadesList);

    return container;
  }

  // Função auxiliar para criar gráfico donut em Canvas (melhor para PDF)
  private criarDonutCanvas(data: any): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    canvas.style.margin = '0 auto';
    canvas.style.display = 'block';

    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    const centerX = 100;
    const centerY = 100;
    const radius = 70;
    const lineWidth = 30;

    const values = [
      { value: data.strategic, color: '#10b981', label: 'Estratégico' },
      { value: data.tactical, color: '#9ca3af', label: 'Tático' },
      { value: data.operational, color: '#1a1a1a', label: 'Operacional' }
    ];

    const totalPercentual = values.reduce((sum, item) => sum + item.value, 0);
    if (totalPercentual === 0) return canvas;

    const sorted = [...values].sort((a, b) => b.value - a.value);
    const main = sorted[0];

    // Desenhar círculo de fundo
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = '#f5f5f5';
    ctx.stroke();

    // Desenhar segmentos
    let startAngle = -Math.PI / 2; // Começar no topo

    values.forEach((item) => {
      if (item.value > 0) {
        const angle = (item.value / 100) * 2 * Math.PI;
        const endAngle = startAngle + angle;

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = item.color;
        ctx.stroke();

        startAngle = endAngle;
      }
    });

    // Desenhar texto central
    ctx.fillStyle = '#2d3748';
    ctx.font = 'bold 36px Inter, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${main.value}%`, centerX, centerY - 10);

    ctx.fillStyle = '#718096';
    ctx.font = '500 12px Inter, Arial, sans-serif';
    ctx.fillText(main.label.toUpperCase(), centerX, centerY + 15);

    return canvas;
  }

  // Função auxiliar para criar gráfico donut em SVG
  private criarDonutSVG(data: any): SVGElement {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '200');
    svg.setAttribute('height', '200');
    svg.setAttribute('viewBox', '0 0 200 200');
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svg.style.margin = '0 auto';
    svg.style.display = 'block';
    svg.style.backgroundColor = 'transparent';

    // Círculo de fundo
    const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    bgCircle.setAttribute('cx', '100');
    bgCircle.setAttribute('cy', '100');
    bgCircle.setAttribute('r', '80');
    bgCircle.setAttribute('fill', 'none');
    bgCircle.setAttribute('stroke', '#f5f5f5');
    bgCircle.setAttribute('stroke-width', '30');
    svg.appendChild(bgCircle);

    const values = [
      { value: data.strategic, color: '#10b981', label: 'Estratégico' },
      { value: data.tactical, color: '#9ca3af', label: 'Tático' },
      { value: data.operational, color: '#1a1a1a', label: 'Operacional' }
    ];

    const totalPercentual = values.reduce((sum, item) => sum + item.value, 0);
    if (totalPercentual === 0) return svg;

    const sorted = [...values].sort((a, b) => b.value - a.value);
    const main = sorted[0];

    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;

    values.forEach((item) => {
      if (item.value > 0) {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        const strokeLength = (item.value / 100) * circumference;

        circle.setAttribute('cx', '100');
        circle.setAttribute('cy', '100');
        circle.setAttribute('r', String(radius));
        circle.setAttribute('fill', 'none');
        circle.setAttribute('stroke', item.color);
        circle.setAttribute('stroke-width', '30');
        circle.setAttribute('stroke-dasharray', `${strokeLength} ${circumference}`);
        circle.setAttribute('stroke-dashoffset', String(-offset));
        circle.setAttribute('transform', 'rotate(-90 100 100)');

        svg.appendChild(circle);
        offset += strokeLength;
      }
    });

    // Texto central
    const centerGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');

    const percentText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    percentText.setAttribute('x', '100');
    percentText.setAttribute('y', '95');
    percentText.setAttribute('text-anchor', 'middle');
    percentText.setAttribute('font-size', '36');
    percentText.setAttribute('font-weight', 'bold');
    percentText.setAttribute('fill', '#2d3748');
    percentText.textContent = `${main.value}%`;
    centerGroup.appendChild(percentText);

    const labelText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    labelText.setAttribute('x', '100');
    labelText.setAttribute('y', '115');
    labelText.setAttribute('text-anchor', 'middle');
    labelText.setAttribute('font-size', '12');
    labelText.setAttribute('font-weight', '500');
    labelText.setAttribute('fill', '#718096');
    labelText.setAttribute('text-transform', 'uppercase');
    labelText.textContent = main.label.toUpperCase();
    centerGroup.appendChild(labelText);

    svg.appendChild(centerGroup);

    return svg;
  }

  // ===== UTILITÁRIOS =====

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
