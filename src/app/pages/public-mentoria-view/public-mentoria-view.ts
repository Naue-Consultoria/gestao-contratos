import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { MentoriaService, MentoriaEncontro, EncontroBloco, BlocoInteracao } from '../../services/mentoria.service';
import { MentoriaHelpers } from '../../types/mentoria.types';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface TocItem {
  id: string;
  text: string;
  level: number;
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

  // ViewChild para o container de visualização do mapa
  @ViewChild('mapaMentalVisualizacao', { static: false }) mapaMentalVisualizacao?: ElementRef;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private mentoriaService: MentoriaService,
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
}
