import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { MentoriaService, MentoriaEncontro, EncontroBloco, BlocoInteracao } from '../../services/mentoria.service';
import { MentoriaTemplatesService } from '../../services/mentoria-templates.service';
import { MentoriaHelpers } from '../../types/mentoria.types';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

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
  imports: [CommonModule, FormsModule, DragDropModule],
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

  // ViewChild para o container de visualização do mapa
  @ViewChild('mapaMentalVisualizacao', { static: false }) mapaMentalVisualizacao?: ElementRef;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private mentoriaService: MentoriaService,
    private templatesService: MentoriaTemplatesService,
    private toastr: ToastrService
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
        this.notFound = true;
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
      mdLines.push(`# Mapa Mental Estratégico`);
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
    h1.textContent = 'Mapa Mental Estratégico';
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
}
