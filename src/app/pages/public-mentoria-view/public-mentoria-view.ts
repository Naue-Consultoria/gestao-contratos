import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { MentoriaService, MentoriaEncontro, EncontroBloco, BlocoInteracao } from '../../services/mentoria.service';
import { MentoriaHelpers } from '../../types/mentoria.types';

interface TocItem {
  id: string;
  text: string;
  level: number;
}

@Component({
  selector: 'app-public-mentoria-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
    if (!this.token || !this.conteudoEstruturado) return;

    // Carregar interações salvas do backend
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
                          // Converter para objeto se for string
                          if (typeof bloco.tarefas.itens[index] === 'string') {
                            bloco.tarefas.itens[index] = {
                              texto: bloco.tarefas.itens[index],
                              checked: tarefaSalva.checked || false
                            };
                          } else {
                            bloco.tarefas.itens[index].checked = tarefaSalva.checked || false;
                          }
                        }
                      });
                    }
                  });
                }
              }
            } catch (e) {
              console.error('Erro ao processar interação:', e);
            }
          });
          console.log('Estados carregados do banco de dados');
        }
      },
      error: (error: any) => {
        console.error('Erro ao carregar interações:', error);
        // Se falhar, não faz nada (usuário começa do zero)
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
}
