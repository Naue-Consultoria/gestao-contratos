import { Component, OnInit, OnDestroy, AfterViewChecked, QueryList, ViewChildren, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { MentoriaService, MentoriaEncontro } from '../../services/mentoria.service';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';
import { BreadcrumbService } from '../../services/breadcrumb.service';
import { MentoriaTemplatesModalComponent } from '../mentoria-templates-modal/mentoria-templates-modal';

interface Teste {
  id: string;
  nome: string;
  imagem?: File;
  imagemUrl?: string;
  isPdf?: boolean;
  nomeArquivo?: string;
  comentario: string;
}

interface BlocoProximosPassos {
  id: string;
  tipo: 'texto' | 'perguntas' | 'tarefas';
  conteudo: string;
  perguntas?: { pergunta: string }[];
  tarefas?: { titulo: string; itens: { texto: string }[] };
  nomeTemplate?: string;
  template_id?: number;
}

interface Referencia {
  id: string;
  tipo: 'ted' | 'livro' | 'leitura' | 'video' | 'link' | 'teste' | 'gymrats' | 'outro';
  titulo: string;
  link: string;
}

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

// Tipos de blocos disponíveis
type TipoBloco = 'visaoGeral' | 'mentoria' | 'testes' | 'proximosPassos' | 'referencias' |
                  'mapaMental' | 'modeloABC' | 'zonasAprendizado' | 'goldenCircle' | 'rodaDaVida' | 'termometroGestao' | 'ganhosPerdas' | 'controleHabitos' | 'matrizRaci' | 'analiseProblemas' | 'erros' | 'encerramento';

interface BlocoEditor {
  id: string;
  tipo: TipoBloco;
  titulo: string;
  icone: string;
  ordem: number;
  dados?: any; // Dados específicos do bloco
}

interface SecaoReordenavel {
  id: 'testes' | 'proximosPassos' | 'referencias' | 'mapaMental' | 'modeloABC' | 'zonasAprendizado' | 'goldenCircle' | 'rodaDaVida' | 'termometroGestao' | 'ganhosPerdas' | 'controleHabitos' | 'matrizRaci' | 'analiseProblemas' | 'erros';
  titulo: string;
  icone: string;
  ordem: number;
}

interface ConteudoMentoria {
  visaoGeral: { ativo: boolean; conteudo: string };
  mentoria: { ativo: boolean; conteudo: string };
  testes: { ativo: boolean; itens: Teste[] };
  proximosPassos: { ativo: boolean; blocos: BlocoProximosPassos[] };
  referencias: { ativo: boolean; itens: Referencia[] };
  mapaMental: { ativo: boolean; data: MapaMentalData };
  modeloABC: { ativo: boolean };
  zonasAprendizado: { ativo: boolean };
  goldenCircle: { ativo: boolean };
  rodaDaVida: { ativo: boolean };
  termometroGestao: { ativo: boolean };
  ganhosPerdas: { ativo: boolean };
  controleHabitos: { ativo: boolean };
  matrizRaci: { ativo: boolean };
  analiseProblemas: { ativo: boolean };
  erros: { ativo: boolean };
  encerramento: { ativo: boolean; conteudo: string };
  ordemSecoes?: string[]; // Nova propriedade para controlar a ordem
  blocosAtivos?: BlocoEditor[]; // Nova propriedade para controlar blocos ativos
}

@Component({
  selector: 'app-mentoria-conteudo-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, BreadcrumbComponent, MentoriaTemplatesModalComponent],
  templateUrl: './mentoria-conteudo-editor.html',
  styleUrl: './mentoria-conteudo-editor.css'
})
export class MentoriaConteudoEditor implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChildren('richEditor') richEditors!: QueryList<ElementRef>;

  encontroId: number | null = null;
  encontro: MentoriaEncontro | null = null;
  isSaving = false;
  isLoading = false;
  private editorsInitialized = new Set<string>();

  // Controle de blocos dinâmicos
  blocosAtivos: BlocoEditor[] = [];
  mostrarBarraFerramentas = true;

  // Rich editor properties
  showTitleDropdown: { [blocoId: string]: boolean } = {};
  selectedTitle: { [blocoId: string]: string } = {};
  titleOptions = [
    { label: 'Normal', value: 'p', icon: 'T' },
    { label: 'Título 1', value: 'h1', icon: 'H1' },
    { label: 'Título 2', value: 'h2', icon: 'H2' },
    { label: 'Título 3', value: 'h3', icon: 'H3' },
    { label: 'Título 4', value: 'h4', icon: 'H4' },
    { label: 'Título 5', value: 'h5', icon: 'H5' }
  ];

  // Definição de todos os blocos disponíveis
  blocosDisponiveis: Array<{tipo: TipoBloco, titulo: string, icone: string, descricao: string}> = [
    { tipo: 'visaoGeral', titulo: 'Visão Geral', icone: 'fa-bullseye', descricao: 'Visão geral do encontro' },
    { tipo: 'mentoria', titulo: 'Mentoria', icone: 'fa-graduation-cap', descricao: 'Conteúdo principal da mentoria' },
    { tipo: 'testes', titulo: 'Testes', icone: 'fa-clipboard-check', descricao: 'Testes e avaliações' },
    { tipo: 'proximosPassos', titulo: 'Próximos Passos', icone: 'fa-arrow-right', descricao: 'Ações e tarefas futuras' },
    { tipo: 'referencias', titulo: 'Referências', icone: 'fa-book', descricao: 'Links e materiais de apoio' },
    { tipo: 'mapaMental', titulo: 'Mapa Mental', icone: 'fa-diagram-project', descricao: 'PDM | Plano de Desenvolvimento de Metas' },
    { tipo: 'modeloABC', titulo: 'Modelo ABC', icone: 'fa-brain', descricao: 'Análise comportamental' },
    { tipo: 'zonasAprendizado', titulo: 'Zonas de Aprendizado', icone: 'fa-chart-simple', descricao: 'Níveis de desenvolvimento' },
    { tipo: 'goldenCircle', titulo: 'Golden Circle', icone: 'fa-bullseye', descricao: 'Why, How, What' },
    { tipo: 'rodaDaVida', titulo: 'Roda da Vida MAAS', icone: 'fa-dharmachakra', descricao: 'Autoavaliação Sistêmica' },
    { tipo: 'termometroGestao', titulo: 'Termômetro de Gestão', icone: 'fa-chart-column', descricao: 'Análise de Perfil Profissional' },
    { tipo: 'ganhosPerdas', titulo: 'Ganhos e Perdas', icone: 'fa-scale-balanced', descricao: 'Matriz de Decisão Estratégica' },
    { tipo: 'controleHabitos', titulo: 'Controle de Hábitos', icone: 'fa-calendar-check', descricao: 'Rastreador Mensal de Hábitos' },
    { tipo: 'matrizRaci', titulo: 'Matriz RACI', icone: 'fa-table', descricao: 'Matriz de Responsabilidades RACI' },
    { tipo: 'analiseProblemas', titulo: 'Análise de Problemas', icone: 'fa-sitemap', descricao: 'Análise Sistêmica de Problemas' },
    { tipo: 'erros', titulo: 'Erros', icone: 'fa-exclamation-triangle', descricao: 'Análise e Gestão de Erros' },
    { tipo: 'encerramento', titulo: 'Encerramento', icone: 'fa-flag-checkered', descricao: 'Conclusão do encontro' }
  ];

  // Mapa Mental - Variáveis de controle
  mapaMentalConectando: string | null = null;
  mostrarCalendarioMapaMental = false;
  mostrarExportacaoMapaMental = false;

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

  conteudo: ConteudoMentoria = {
    visaoGeral: { ativo: true, conteudo: '' },
    mentoria: { ativo: true, conteudo: '' },
    testes: { ativo: false, itens: [] },
    proximosPassos: { ativo: true, blocos: [] },
    referencias: { ativo: false, itens: [] },
    mapaMental: {
      ativo: false,
      data: {
        colunas: [
          { id: 'nivelA', nome: 'Nível A', cor: '#3B82F6', corBg: 'bg-blue-600', corBorda: 'border-blue-600' },
          { id: 'metas', nome: 'Metas', cor: '#F59E0B', corBg: 'bg-amber-600', corBorda: 'border-amber-600' },
          { id: 'visao', nome: 'Visão', cor: '#0D9488', corBg: 'bg-teal-600', corBorda: 'border-teal-600' }
        ],
        cards: {},
        conexoes: []
      }
    },
    modeloABC: { ativo: false },
    zonasAprendizado: { ativo: false },
    goldenCircle: { ativo: false },
    rodaDaVida: { ativo: false },
    termometroGestao: { ativo: false },
    ganhosPerdas: { ativo: false },
    controleHabitos: { ativo: false },
    matrizRaci: { ativo: false },
    analiseProblemas: { ativo: false },
    erros: { ativo: false },
    encerramento: { ativo: true, conteudo: '' },
    ordemSecoes: ['testes', 'proximosPassos', 'referencias', 'mapaMental', 'modeloABC', 'zonasAprendizado', 'goldenCircle', 'rodaDaVida', 'termometroGestao', 'ganhosPerdas', 'controleHabitos', 'matrizRaci', 'analiseProblemas', 'erros'] // Ordem padrão
  };

  // Lista de seções reordenáveis
  secoesReordenaveis: SecaoReordenavel[] = [
    { id: 'testes', titulo: 'Testes', icone: 'fa-clipboard-check', ordem: 0 },
    { id: 'proximosPassos', titulo: 'Próximos Passos', icone: 'fa-arrow-right', ordem: 1 },
    { id: 'referencias', titulo: 'Referências / Inspirações', icone: 'fa-book', ordem: 2 },
    { id: 'mapaMental', titulo: 'PDM | Plano de Desenvolvimento de Metas', icone: 'fa-diagram-project', ordem: 3 },
    { id: 'modeloABC', titulo: 'Modelo ABC', icone: 'fa-brain', ordem: 4 },
    { id: 'zonasAprendizado', titulo: 'Zonas de Aprendizado', icone: 'fa-chart-simple', ordem: 5 },
    { id: 'goldenCircle', titulo: 'The Golden Circle', icone: 'fa-bullseye', ordem: 6 },
    { id: 'rodaDaVida', titulo: 'Roda da Vida MAAS', icone: 'fa-dharmachakra', ordem: 7 },
    { id: 'termometroGestao', titulo: 'Termômetro de Gestão', icone: 'fa-chart-column', ordem: 8 },
    { id: 'ganhosPerdas', titulo: 'Ganhos e Perdas', icone: 'fa-scale-balanced', ordem: 9 },
    { id: 'controleHabitos', titulo: 'Controle de Hábitos', icone: 'fa-calendar-check', ordem: 10 },
    { id: 'matrizRaci', titulo: 'Matriz RACI', icone: 'fa-table', ordem: 11 },
    { id: 'analiseProblemas', titulo: 'Análise de Problemas', icone: 'fa-sitemap', ordem: 12 },
    { id: 'erros', titulo: 'Erros', icone: 'fa-exclamation-triangle', ordem: 13 }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private mentoriaService: MentoriaService,
    private toastr: ToastrService,
    private breadcrumbService: BreadcrumbService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.encontroId = parseInt(id, 10);
      this.carregarEncontro();
    } else {
      this.toastr.error('ID do encontro não fornecido');
      this.router.navigate(['/home/mentorias']);
    }
    this.setBreadcrumb(id || undefined);
  }

  ngOnDestroy(): void {
    // Cleanup if needed
    this.editorsInitialized.clear();
  }

  ngAfterViewChecked(): void {
    // Initialize content for rich editors that haven't been initialized yet
    this.richEditors.forEach((editorRef, index) => {
      const editor = editorRef.nativeElement as HTMLDivElement;
      const bloco = this.conteudo.proximosPassos.blocos.find((b, i) =>
        b.tipo === 'texto' && this.getTextBlockIndex(b) === index
      );

      if (bloco && !this.editorsInitialized.has(bloco.id)) {
        if (bloco.conteudo && bloco.conteudo.trim()) {
          editor.innerHTML = bloco.conteudo;
        }
        this.editorsInitialized.add(bloco.id);
      }
    });
  }

  private getTextBlockIndex(bloco: BlocoProximosPassos): number {
    return this.conteudo.proximosPassos.blocos
      .filter(b => b.tipo === 'texto')
      .findIndex(b => b.id === bloco.id);
  }

  carregarEncontro(): void {
    if (!this.encontroId) return;

    this.isLoading = true;

    this.mentoriaService.obterEncontro(this.encontroId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.encontro = response.data;

          // Carregar conteúdo estruturado se existir
          if (this.encontro.conteudo_html) {
            try {
              this.conteudo = JSON.parse(this.encontro.conteudo_html);

              // Migrar para o novo formato de blocos dinâmicos
              this.migrarParaBlocosDinamicos();

              // Converter dados antigos de tarefas (string[]) para novo formato ({ texto: string }[])
              if (this.conteudo.proximosPassos && this.conteudo.proximosPassos.blocos) {
                this.conteudo.proximosPassos.blocos.forEach(bloco => {
                  if (bloco.tipo === 'tarefas' && bloco.tarefas && bloco.tarefas.itens) {
                    // Verificar se os itens são strings simples (formato antigo)
                    if (bloco.tarefas.itens.length > 0 && typeof bloco.tarefas.itens[0] === 'string') {
                      // Converter strings para objetos
                      bloco.tarefas.itens = bloco.tarefas.itens.map(item =>
                        typeof item === 'string' ? { texto: item } : item
                      );
                    }
                  }
                });
              }

              // Adicionar mapaMental se não existir (retrocompatibilidade)
              if (!this.conteudo.mapaMental) {
                this.conteudo.mapaMental = {
                  ativo: false,
                  data: {
                    colunas: [
                      { id: 'nivelA', nome: 'Nível A', cor: '#3B82F6', corBg: 'bg-blue-600', corBorda: 'border-blue-600' },
                      { id: 'metas', nome: 'Metas', cor: '#F59E0B', corBg: 'bg-amber-600', corBorda: 'border-amber-600' },
                      { id: 'visao', nome: 'Visão', cor: '#0D9488', corBg: 'bg-teal-600', corBorda: 'border-teal-600' }
                    ],
                    cards: {},
                    conexoes: []
                  }
                };
              }

              // Adicionar modeloABC se não existir (retrocompatibilidade)
              if (!this.conteudo.modeloABC) {
                this.conteudo.modeloABC = { ativo: false };
              }

              // Adicionar zonasAprendizado se não existir (retrocompatibilidade)
              if (!this.conteudo.zonasAprendizado) {
                this.conteudo.zonasAprendizado = { ativo: false };
              }

              // Adicionar goldenCircle se não existir (retrocompatibilidade)
              if (!this.conteudo.goldenCircle) {
                this.conteudo.goldenCircle = { ativo: false };
              }

              // Adicionar rodaDaVida se não existir (retrocompatibilidade)
              if (!this.conteudo.rodaDaVida) {
                this.conteudo.rodaDaVida = { ativo: false };
              }

              // Adicionar termometroGestao se não existir (retrocompatibilidade)
              if (!this.conteudo.termometroGestao) {
                this.conteudo.termometroGestao = { ativo: false };
              }

              // Adicionar ganhosPerdas se não existir (retrocompatibilidade)
              if (!this.conteudo.ganhosPerdas) {
                this.conteudo.ganhosPerdas = { ativo: false };
              }

              // Adicionar controleHabitos se não existir (retrocompatibilidade)
              if (!this.conteudo.controleHabitos) {
                this.conteudo.controleHabitos = { ativo: false };
              }

              // Adicionar matrizRaci se não existir (retrocompatibilidade)
              if (!this.conteudo.matrizRaci) {
                this.conteudo.matrizRaci = { ativo: false };
              }

              // Adicionar ordem de seções se não existir (retrocompatibilidade)
              if (!this.conteudo.ordemSecoes) {
                this.conteudo.ordemSecoes = ['testes', 'proximosPassos', 'referencias', 'mapaMental', 'modeloABC', 'zonasAprendizado', 'goldenCircle', 'rodaDaVida', 'termometroGestao', 'ganhosPerdas', 'controleHabitos', 'matrizRaci'];
              } else if (this.conteudo.ordemSecoes.length < 12) {
                // Migrar para incluir novas ferramentas se ainda não estiverem
                if (!this.conteudo.ordemSecoes.includes('ganhosPerdas')) {
                  this.conteudo.ordemSecoes.push('ganhosPerdas');
                }
                if (!this.conteudo.ordemSecoes.includes('controleHabitos')) {
                  this.conteudo.ordemSecoes.push('controleHabitos');
                }
                if (!this.conteudo.ordemSecoes.includes('matrizRaci')) {
                  this.conteudo.ordemSecoes.push('matrizRaci');
                }
              }
            } catch (e) {
              // Se não for JSON, é conteúdo antigo - manter vazio
              console.log('Conteúdo não é JSON estruturado');
            }
          }

          // Inicializar selectedTitle para todos os blocos de texto em próximos passos
          if (this.conteudo.proximosPassos && this.conteudo.proximosPassos.blocos) {
            this.conteudo.proximosPassos.blocos.forEach(bloco => {
              if (bloco.tipo === 'texto') {
                this.selectedTitle[bloco.id] = 'Normal';
              }
            });
          }
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erro ao carregar encontro:', error);
        this.toastr.error('Erro ao carregar encontro');
        this.isLoading = false;
        this.router.navigate(['/home/mentorias']);
      }
    });
  }

  // ===== GERENCIAMENTO DE BLOCOS DINÂMICOS =====

  migrarParaBlocosDinamicos(): void {
    // Se já tem blocos ativos salvos, usar eles
    if (this.conteudo.blocosAtivos && this.conteudo.blocosAtivos.length > 0) {
      this.blocosAtivos = [...this.conteudo.blocosAtivos];
      return;
    }

    // Caso contrário, migrar do formato antigo
    this.blocosAtivos = [];
    let ordem = 0;

    // Adicionar blocos existentes que estão ativos
    if (this.conteudo.visaoGeral.ativo) {
      this.blocosAtivos.push({
        id: this.generateId(),
        tipo: 'visaoGeral',
        titulo: 'Visão Geral',
        icone: 'fa-bullseye',
        ordem: ordem++
      });
    }

    if (this.conteudo.mentoria.ativo) {
      this.blocosAtivos.push({
        id: this.generateId(),
        tipo: 'mentoria',
        titulo: 'Mentoria',
        icone: 'fa-graduation-cap',
        ordem: ordem++
      });
    }

    // Adicionar seções reordenáveis que estão ativas
    const secoesMap: Record<string, any> = {
      'testes': { ativo: this.conteudo.testes.ativo, titulo: 'Testes', icone: 'fa-clipboard-check' },
      'proximosPassos': { ativo: this.conteudo.proximosPassos.ativo, titulo: 'Próximos Passos', icone: 'fa-arrow-right' },
      'referencias': { ativo: this.conteudo.referencias.ativo, titulo: 'Referências', icone: 'fa-book' },
      'mapaMental': { ativo: this.conteudo.mapaMental.ativo, titulo: 'Mapa Mental', icone: 'fa-diagram-project' },
      'modeloABC': { ativo: this.conteudo.modeloABC.ativo, titulo: 'Modelo ABC', icone: 'fa-brain' },
      'zonasAprendizado': { ativo: this.conteudo.zonasAprendizado.ativo, titulo: 'Zonas de Aprendizado', icone: 'fa-chart-simple' },
      'goldenCircle': { ativo: this.conteudo.goldenCircle.ativo, titulo: 'Golden Circle', icone: 'fa-bullseye' },
      'rodaDaVida': { ativo: this.conteudo.rodaDaVida.ativo, titulo: 'Roda da Vida MAAS', icone: 'fa-dharmachakra' },
      'termometroGestao': { ativo: this.conteudo.termometroGestao.ativo, titulo: 'Termômetro de Gestão', icone: 'fa-chart-column' },
      'ganhosPerdas': { ativo: this.conteudo.ganhosPerdas.ativo, titulo: 'Ganhos e Perdas', icone: 'fa-scale-balanced' },
      'controleHabitos': { ativo: this.conteudo.controleHabitos.ativo, titulo: 'Controle de Hábitos', icone: 'fa-calendar-check' },
      'matrizRaci': { ativo: this.conteudo.matrizRaci.ativo, titulo: 'Matriz RACI', icone: 'fa-table' },
      'analiseProblemas': { ativo: this.conteudo.analiseProblemas.ativo, titulo: 'Análise de Problemas', icone: 'fa-sitemap' },
      'erros': { ativo: this.conteudo.erros.ativo, titulo: 'Erros', icone: 'fa-exclamation-triangle' }
    };

    const secoesJaAdicionadas = new Set<string>();

    // Se existe ordem salva, usar ela primeiro
    if (this.conteudo.ordemSecoes && this.conteudo.ordemSecoes.length > 0) {
      this.conteudo.ordemSecoes.forEach(secaoId => {
        const secao = secoesMap[secaoId];
        if (secao && secao.ativo) {
          this.blocosAtivos.push({
            id: this.generateId(),
            tipo: secaoId as TipoBloco,
            titulo: secao.titulo,
            icone: secao.icone,
            ordem: ordem++
          });
          secoesJaAdicionadas.add(secaoId);
        }
      });

      // Adicionar seções ativas que não estão na ordem salva (novas seções ativadas)
      Object.keys(secoesMap).forEach(secaoId => {
        const secao = secoesMap[secaoId];
        if (secao.ativo && !secoesJaAdicionadas.has(secaoId)) {
          this.blocosAtivos.push({
            id: this.generateId(),
            tipo: secaoId as TipoBloco,
            titulo: secao.titulo,
            icone: secao.icone,
            ordem: ordem++
          });
        }
      });
    } else {
      // Se não existe ordem salva, usar ordem padrão
      Object.keys(secoesMap).forEach(secaoId => {
        const secao = secoesMap[secaoId];
        if (secao.ativo) {
          this.blocosAtivos.push({
            id: this.generateId(),
            tipo: secaoId as TipoBloco,
            titulo: secao.titulo,
            icone: secao.icone,
            ordem: ordem++
          });
        }
      });
    }

    if (this.conteudo.encerramento.ativo) {
      this.blocosAtivos.push({
        id: this.generateId(),
        tipo: 'encerramento',
        titulo: 'Encerramento',
        icone: 'fa-flag-checkered',
        ordem: ordem++
      });
    }
  }

  adicionarBloco(tipo: TipoBloco): void {
    // Verificar se o bloco já existe
    if (this.blocosAtivos.some(b => b.tipo === tipo)) {
      this.toastr.warning('Este bloco já foi adicionado');
      return;
    }

    const blocoConfig = this.blocosDisponiveis.find(b => b.tipo === tipo);
    if (!blocoConfig) return;

    const novoBloco: BlocoEditor = {
      id: this.generateId(),
      tipo,
      titulo: blocoConfig.titulo,
      icone: blocoConfig.icone,
      ordem: this.blocosAtivos.length
    };

    this.blocosAtivos.push(novoBloco);

    // Ativar o bloco correspondente no conteúdo
    this.ativarBlocoConteudo(tipo, true);

    // Scroll suave para o novo bloco
    setTimeout(() => {
      const elemento = document.getElementById(`bloco-${novoBloco.id}`);
      if (elemento) {
        elemento.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }

  removerBloco(blocoId: string): void {
    const bloco = this.blocosAtivos.find(b => b.id === blocoId);
    if (!bloco) return;

    // Desativar o bloco no conteúdo
    this.ativarBlocoConteudo(bloco.tipo, false);

    // Remover da lista de blocos ativos
    this.blocosAtivos = this.blocosAtivos.filter(b => b.id !== blocoId);

    // Reordenar os blocos restantes
    this.blocosAtivos.forEach((b, index) => {
      b.ordem = index;
    });
  }

  ativarBlocoConteudo(tipo: TipoBloco, ativar: boolean): void {
    switch (tipo) {
      case 'visaoGeral':
        this.conteudo.visaoGeral.ativo = ativar;
        break;
      case 'mentoria':
        this.conteudo.mentoria.ativo = ativar;
        break;
      case 'testes':
        this.conteudo.testes.ativo = ativar;
        break;
      case 'proximosPassos':
        this.conteudo.proximosPassos.ativo = ativar;
        break;
      case 'referencias':
        this.conteudo.referencias.ativo = ativar;
        break;
      case 'mapaMental':
        this.conteudo.mapaMental.ativo = ativar;
        break;
      case 'modeloABC':
        this.conteudo.modeloABC.ativo = ativar;
        break;
      case 'zonasAprendizado':
        this.conteudo.zonasAprendizado.ativo = ativar;
        break;
      case 'goldenCircle':
        this.conteudo.goldenCircle.ativo = ativar;
        break;
      case 'rodaDaVida':
        this.conteudo.rodaDaVida.ativo = ativar;
        break;
      case 'termometroGestao':
        this.conteudo.termometroGestao.ativo = ativar;
        break;
      case 'ganhosPerdas':
        this.conteudo.ganhosPerdas.ativo = ativar;
        break;
      case 'controleHabitos':
        this.conteudo.controleHabitos.ativo = ativar;
        break;
      case 'matrizRaci':
        this.conteudo.matrizRaci.ativo = ativar;
        break;
      case 'analiseProblemas':
        this.conteudo.analiseProblemas.ativo = ativar;
        break;
      case 'erros':
        this.conteudo.erros.ativo = ativar;
        break;
      case 'encerramento':
        this.conteudo.encerramento.ativo = ativar;
        break;
    }
  }

  moverBlocoCima(blocoId: string): void {
    const index = this.blocosAtivos.findIndex(b => b.id === blocoId);
    if (index <= 0) return;

    [this.blocosAtivos[index - 1], this.blocosAtivos[index]] =
    [this.blocosAtivos[index], this.blocosAtivos[index - 1]];

    // Atualizar ordem
    this.blocosAtivos.forEach((b, i) => b.ordem = i);
  }

  moverBlocoBaixo(blocoId: string): void {
    const index = this.blocosAtivos.findIndex(b => b.id === blocoId);
    if (index === -1 || index >= this.blocosAtivos.length - 1) return;

    [this.blocosAtivos[index], this.blocosAtivos[index + 1]] =
    [this.blocosAtivos[index + 1], this.blocosAtivos[index]];

    // Atualizar ordem
    this.blocosAtivos.forEach((b, i) => b.ordem = i);
  }

  podeBlocoSubir(blocoId: string): boolean {
    const index = this.blocosAtivos.findIndex(b => b.id === blocoId);
    return index > 0;
  }

  podeBlocoDescer(blocoId: string): boolean {
    const index = this.blocosAtivos.findIndex(b => b.id === blocoId);
    return index !== -1 && index < this.blocosAtivos.length - 1;
  }

  isBlocoAdicionado(tipo: TipoBloco): boolean {
    return this.blocosAtivos.some(b => b.tipo === tipo);
  }

  // ===== TESTES =====

  adicionarTeste(): void {
    this.conteudo.testes.itens.push({
      id: this.generateId(),
      nome: '',
      comentario: ''
    });
  }

  removerTeste(id: string): void {
    this.conteudo.testes.itens = this.conteudo.testes.itens.filter(t => t.id !== id);
  }

  async onArquivoSelected(event: Event, teste: Teste): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];

      // Fazer upload imediatamente
      if (!this.encontroId) {
        this.toastr.error('ID do encontro não encontrado');
        return;
      }

      try {
        this.toastr.info('Fazendo upload do arquivo...');

        const uploadResponse = await this.mentoriaService
          .uploadArquivoTeste(this.encontroId, file)
          .toPromise();

        if (uploadResponse?.success && uploadResponse.data) {
          // Atualizar com a URL do Supabase Storage
          teste.imagemUrl = uploadResponse.data.url;
          teste.isPdf = uploadResponse.data.isPdf;
          teste.nomeArquivo = uploadResponse.data.originalName;
          teste.imagem = undefined; // Remover File object

          this.toastr.success('Arquivo enviado com sucesso!');

          // Salvar automaticamente o conteúdo após upload
          await this.salvarConteudoAposUpload();
        }
      } catch (error: any) {
        console.error('Erro ao fazer upload:', error);
        this.toastr.error('Erro ao fazer upload do arquivo');
      }

      // Limpar input
      input.value = '';
    }
  }

  // Método auxiliar para salvar apenas o conteúdo após upload
  private async salvarConteudoAposUpload(): Promise<void> {
    if (!this.encontroId) return;

    try {
      // Salvar blocos ativos
      this.conteudo.blocosAtivos = this.blocosAtivos;

      // Extrair ordem das seções
      const secoesReordenaveis = ['testes', 'proximosPassos', 'referencias', 'mapaMental', 'modeloABC', 'zonasAprendizado', 'goldenCircle', 'rodaDaVida', 'termometroGestao', 'ganhosPerdas', 'controleHabitos', 'matrizRaci', 'analiseProblemas', 'erros'];
      this.conteudo.ordemSecoes = this.blocosAtivos
        .filter(bloco => secoesReordenaveis.includes(bloco.tipo))
        .sort((a, b) => a.ordem - b.ordem)
        .map(bloco => bloco.tipo);

      const conteudoJson = JSON.stringify(this.conteudo);

      await this.mentoriaService.atualizarEncontro(
        this.encontroId,
        { conteudo_html: conteudoJson }
      ).toPromise();

      this.toastr.success('Arquivo salvo com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar conteúdo após upload:', error);
      this.toastr.warning('Arquivo enviado mas houve erro ao salvar. Clique em Salvar para confirmar.');
    }
  }

  // ===== PRÓXIMOS PASSOS =====

  adicionarBlocoProximosPassos(tipo: 'texto' | 'perguntas' | 'tarefas'): void {
    const bloco: BlocoProximosPassos = {
      id: this.generateId(),
      tipo,
      conteudo: '',
      perguntas: tipo === 'perguntas' ? [{ pergunta: '' }] : undefined,
      tarefas: tipo === 'tarefas' ? { titulo: '', itens: [{ texto: '' }] } : undefined
    };
    this.conteudo.proximosPassos.blocos.push(bloco);
    // Inicializar título para blocos de texto
    if (tipo === 'texto') {
      this.selectedTitle[bloco.id] = 'Normal';
    }
  }

  removerBlocoProximosPassos(id: string): void {
    this.conteudo.proximosPassos.blocos = this.conteudo.proximosPassos.blocos.filter(b => b.id !== id);
    // Remove from initialized set when block is removed
    this.editorsInitialized.delete(id);
  }

  // ===== REORGANIZAR SEÇÕES =====

  get secoesOrdenadas(): string[] {
    if (!this.conteudo.ordemSecoes || this.conteudo.ordemSecoes.length === 0) {
      return ['testes', 'proximosPassos', 'referencias', 'mapaMental', 'modeloABC', 'zonasAprendizado', 'goldenCircle', 'rodaDaVida', 'termometroGestao'];
    }
    return this.conteudo.ordemSecoes;
  }

  moverSecaoParaCima(secaoId: string): void {
    const index = this.conteudo.ordemSecoes!.indexOf(secaoId);
    if (index <= 0) return; // Já está no topo ou não encontrado

    const novaOrdem = [...this.conteudo.ordemSecoes!];
    [novaOrdem[index - 1], novaOrdem[index]] = [novaOrdem[index], novaOrdem[index - 1]];
    this.conteudo.ordemSecoes = novaOrdem;
  }

  moverSecaoParaBaixo(secaoId: string): void {
    const index = this.conteudo.ordemSecoes!.indexOf(secaoId);
    if (index === -1 || index >= this.conteudo.ordemSecoes!.length - 1) return; // Já está no final ou não encontrado

    const novaOrdem = [...this.conteudo.ordemSecoes!];
    [novaOrdem[index], novaOrdem[index + 1]] = [novaOrdem[index + 1], novaOrdem[index]];
    this.conteudo.ordemSecoes = novaOrdem;
  }

  podeSecaoSubir(secaoId: string): boolean {
    const index = this.conteudo.ordemSecoes?.indexOf(secaoId) ?? -1;
    return index > 0;
  }

  podeSecaoDescer(secaoId: string): boolean {
    const index = this.conteudo.ordemSecoes?.indexOf(secaoId) ?? -1;
    return index !== -1 && index < (this.conteudo.ordemSecoes?.length ?? 0) - 1;
  }

  // ===== REORGANIZAR BLOCOS COM SETAS =====

  moverBlocoParaCima(index: number): void {
    if (index === 0) return; // Já está no topo

    const blocos = [...this.conteudo.proximosPassos.blocos];
    // Trocar posições
    [blocos[index - 1], blocos[index]] = [blocos[index], blocos[index - 1]];
    this.conteudo.proximosPassos.blocos = blocos;
    console.log('✅ Bloco movido para cima. Nova ordem:', this.conteudo.proximosPassos.blocos.map(b => b.tipo));
  }

  moverBlocoParaBaixo(index: number): void {
    if (index === this.conteudo.proximosPassos.blocos.length - 1) return; // Já está no final

    const blocos = [...this.conteudo.proximosPassos.blocos];
    // Trocar posições
    [blocos[index], blocos[index + 1]] = [blocos[index + 1], blocos[index]];
    this.conteudo.proximosPassos.blocos = blocos;
    console.log('✅ Bloco movido para baixo. Nova ordem:', this.conteudo.proximosPassos.blocos.map(b => b.tipo));
  }

  podeSubir(index: number): boolean {
    return index > 0;
  }

  podeDescer(index: number): boolean {
    return index < this.conteudo.proximosPassos.blocos.length - 1;
  }

  adicionarPergunta(bloco: BlocoProximosPassos): void {
    if (!bloco.perguntas) bloco.perguntas = [];
    bloco.perguntas.push({ pergunta: '' });
  }

  removerPergunta(bloco: BlocoProximosPassos, index: number): void {
    if (bloco.perguntas) {
      bloco.perguntas.splice(index, 1);
    }
  }

  adicionarTarefa(bloco: BlocoProximosPassos): void {
    if (!bloco.tarefas) bloco.tarefas = { titulo: '', itens: [] };
    bloco.tarefas.itens.push({ texto: '' });
  }

  removerTarefa(bloco: BlocoProximosPassos, index: number): void {
    if (bloco.tarefas) {
      bloco.tarefas.itens.splice(index, 1);
    }
  }

  // ===== REFERÊNCIAS =====

  adicionarReferencia(): void {
    this.conteudo.referencias.itens.push({
      id: this.generateId(),
      tipo: 'ted',
      titulo: '',
      link: ''
    });
  }

  removerReferencia(id: string): void {
    this.conteudo.referencias.itens = this.conteudo.referencias.itens.filter(r => r.id !== id);
  }

  // ===== SALVAR =====

  async salvarConteudo(): Promise<void> {
    if (!this.encontroId) {
      this.toastr.error('ID do encontro não encontrado');
      return;
    }

    this.isSaving = true;

    try {
      // 1. Fazer upload dos arquivos de testes para Supabase Storage
      if (this.conteudo.testes.ativo && this.conteudo.testes.itens.length > 0) {
        for (const teste of this.conteudo.testes.itens) {
          // Se tem arquivo para upload (File object)
          if (teste.imagem && teste.imagem instanceof File) {
            try {
              const uploadResponse = await this.mentoriaService
                .uploadArquivoTeste(this.encontroId, teste.imagem)
                .toPromise();

              if (uploadResponse?.success && uploadResponse.data) {
                // Atualizar com a URL do Supabase Storage
                teste.imagemUrl = uploadResponse.data.url;
                teste.isPdf = uploadResponse.data.isPdf;
                teste.nomeArquivo = uploadResponse.data.originalName;
                // Remover o File object para não tentar serializar
                teste.imagem = undefined;
              }
            } catch (uploadError: any) {
              console.error('Erro ao fazer upload do arquivo:', uploadError);

              // Verificar se é erro de bucket não existir
              if (uploadError.status === 500) {
                this.toastr.error('Erro: Bucket do Supabase não configurado. Crie o bucket "mentoria-fotos" no Supabase Dashboard.');
                this.isSaving = false;
                return;
              }

              this.toastr.warning(`Erro ao fazer upload do arquivo: ${teste.nome || 'teste'}`);
            }
          }
        }
      }

      // 2. Salvar blocos ativos no conteúdo
      this.conteudo.blocosAtivos = this.blocosAtivos;

      // 2.1 Extrair ordem das seções reordenáveis para a página pública
      // Filtra apenas as seções reordenáveis (não incluindo visaoGeral, mentoria e encerramento que têm posições fixas)
      const secoesReordenaveis = ['testes', 'proximosPassos', 'referencias', 'mapaMental', 'modeloABC', 'zonasAprendizado', 'goldenCircle', 'rodaDaVida', 'termometroGestao', 'ganhosPerdas', 'controleHabitos', 'matrizRaci', 'analiseProblemas', 'erros'];
      this.conteudo.ordemSecoes = this.blocosAtivos
        .filter(bloco => secoesReordenaveis.includes(bloco.tipo))
        .sort((a, b) => a.ordem - b.ordem)
        .map(bloco => bloco.tipo);

      // 3. Converter para JSON e salvar
      const conteudoJson = JSON.stringify(this.conteudo);

      this.mentoriaService.atualizarEncontro(
        this.encontroId,
        { conteudo_html: conteudoJson }
      ).subscribe({
        next: (response) => {
          if (response?.success) {
            this.toastr.success('Conteúdo salvo com sucesso!');
            this.router.navigate(['/home/mentorias']);
          }
          this.isSaving = false;
        },
        error: (error) => {
          console.error('Erro ao salvar conteúdo:', error);
          this.toastr.error('Erro ao salvar conteúdo');
          this.isSaving = false;
        }
      });
    } catch (error) {
      console.error('Erro ao processar salvamento:', error);
      this.toastr.error('Erro ao processar salvamento');
      this.isSaving = false;
    }
  }

  voltar(): void {
    this.router.navigate(['/home/mentorias']);
  }

  // ===== MAPA MENTAL =====

  adicionarNivelMapaMental(): void {
    const niveisAtuais = this.conteudo.mapaMental.data.colunas.length - 2;
    const proximaLetra = this.nivelLetras[niveisAtuais];
    const corConfig = this.coresPredefinidas[niveisAtuais % this.coresPredefinidas.length];

    const novaColuna: MapaMentalColuna = {
      id: `nivel${proximaLetra}`,
      nome: `Nível ${proximaLetra}`,
      ...corConfig
    };

    this.conteudo.mapaMental.data.colunas = [novaColuna, ...this.conteudo.mapaMental.data.colunas];
  }

  adicionarCardMapaMental(colunaId: string): void {
    const novoCard: MapaMentalCard = {
      id: `card-${Date.now()}`,
      colunaId,
      meta: '',
      indicador: '',
      prazo: ''
    };

    if (!this.conteudo.mapaMental.data.cards[colunaId]) {
      this.conteudo.mapaMental.data.cards[colunaId] = [];
    }

    this.conteudo.mapaMental.data.cards[colunaId].push(novoCard);
  }

  atualizarCardMapaMental(colunaId: string, cardId: string, campo: keyof MapaMentalCard, valor: string): void {
    const cards = this.conteudo.mapaMental.data.cards[colunaId];
    if (!cards) return;

    const card = cards.find(c => c.id === cardId);
    if (card) {
      (card as any)[campo] = valor;
    }
  }

  removerCardMapaMental(colunaId: string, cardId: string): void {
    const cards = this.conteudo.mapaMental.data.cards[colunaId];
    if (!cards) return;

    this.conteudo.mapaMental.data.cards[colunaId] = cards.filter(c => c.id !== cardId);

    // Remove conexões relacionadas
    this.conteudo.mapaMental.data.conexoes = this.conteudo.mapaMental.data.conexoes.filter(
      c => c.de !== cardId && c.para !== cardId
    );
  }

  iniciarConexaoMapaMental(cardId: string): void {
    if (this.mapaMentalConectando === cardId) {
      this.mapaMentalConectando = null;
    } else if (this.mapaMentalConectando) {
      this.conteudo.mapaMental.data.conexoes.push({
        de: this.mapaMentalConectando,
        para: cardId
      });
      this.mapaMentalConectando = null;
      this.toastr.success('Conexão criada!');
    } else {
      this.mapaMentalConectando = cardId;
    }
  }

  removerConexaoMapaMental(index: number): void {
    this.conteudo.mapaMental.data.conexoes.splice(index, 1);
  }

  obterCardPorId(cardId: string): MapaMentalCard | undefined {
    for (const colunaId in this.conteudo.mapaMental.data.cards) {
      const card = this.conteudo.mapaMental.data.cards[colunaId].find(c => c.id === cardId);
      if (card) return card;
    }
    return undefined;
  }

  obterConexoesDoCard(cardId: string): MapaMentalConexao[] {
    return this.conteudo.mapaMental.data.conexoes.filter(c => c.de === cardId);
  }

  // ===== UTILITÁRIOS =====

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private setBreadcrumb(encontroId?: string): void {
    this.breadcrumbService.setBreadcrumbs([
      { label: 'Home', url: '/home' },
      { label: 'Mentorias', url: '/home/mentorias' },
      { label: encontroId ? `Editar Conteúdo #${encontroId}` : 'Editar Conteúdo' }
    ]);
  }

  trackByFn(index: number, item: any): string {
    return item?.id || index.toString();
  }

  trackByIndex(index: number): number {
    return index;
  }

  // ===== RICH EDITOR FUNCTIONS =====

  execCommand(command: string, value: string | undefined = undefined): void {
    document.execCommand(command, false, value);
  }

  insertLink(): void {
    const url = prompt('Digite a URL do link:');
    if (url) {
      this.execCommand('createLink', url);
    }
  }

  toggleTitleDropdown(blocoId: string): void {
    this.showTitleDropdown[blocoId] = !this.showTitleDropdown[blocoId];
  }

  applyTitle(option: any, blocoId: string): void {
    this.selectedTitle[blocoId] = option.label;
    this.showTitleDropdown[blocoId] = false;

    if (option.value === 'p') {
      this.execCommand('formatBlock', '<p>');
    } else {
      this.execCommand('formatBlock', `<${option.value}>`);
    }
  }

  onEditorImageSelected(event: Event, bloco: BlocoProximosPassos): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.toastr.error('A imagem deve ter no máximo 5MB');
        return;
      }

      // Convert to base64
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const base64Image = e.target.result;

        // Insert image at cursor position
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);

          // Create image element
          const img = document.createElement('img');
          img.src = base64Image;
          img.style.maxWidth = '100%';
          img.style.height = 'auto';
          img.style.borderRadius = '8px';
          img.style.margin = '1rem 0';
          img.style.display = 'block';

          // Insert the image
          range.deleteContents();
          range.insertNode(img);

          // Move cursor after the image
          range.setStartAfter(img);
          range.setEndAfter(img);
          selection.removeAllRanges();
          selection.addRange(range);

          // Update the bloco content
          const editorDiv = (event.target as HTMLInputElement)
            .closest('.rich-editor-container')
            ?.querySelector('.rich-editor') as HTMLDivElement;

          if (editorDiv) {
            bloco.conteudo = editorDiv.innerHTML;
          }
        } else {
          // If no selection, append at the end
          const editorDiv = (event.target as HTMLInputElement)
            .closest('.rich-editor-container')
            ?.querySelector('.rich-editor') as HTMLDivElement;

          if (editorDiv) {
            const img = `<img src="${base64Image}" style="max-width: 100%; height: auto; border-radius: 8px; margin: 1rem 0; display: block;">`;
            editorDiv.innerHTML += img;
            bloco.conteudo = editorDiv.innerHTML;
          }
        }

        this.toastr.success('Imagem inserida com sucesso!');
      };

      reader.onerror = () => {
        this.toastr.error('Erro ao carregar a imagem');
      };

      reader.readAsDataURL(file);

      // Reset input for next use
      input.value = '';
    }
  }

  onEditorChange(event: Event, bloco: BlocoProximosPassos): void {
    const target = event.target as HTMLDivElement;
    bloco.conteudo = target.innerHTML;
  }

  onEditorInput(event: Event, bloco: BlocoProximosPassos): void {
    const target = event.target as HTMLDivElement;
    // Apenas atualiza o conteúdo no modelo, sem alterar o innerHTML
    bloco.conteudo = target.innerHTML;
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    const target = event.target as HTMLElement;
    const editor = target.closest('.rich-editor') as HTMLDivElement;
    if (editor) {
      editor.classList.add('drag-over');
    }
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    const target = event.target as HTMLElement;
    const editor = target.closest('.rich-editor') as HTMLDivElement;
    if (editor) {
      editor.classList.remove('drag-over');
    }
  }

  onDrop(event: DragEvent, bloco: BlocoProximosPassos): void {
    event.preventDefault();
    event.stopPropagation();

    const target = event.target as HTMLElement;
    const editor = target.closest('.rich-editor') as HTMLDivElement;
    if (editor) {
      editor.classList.remove('drag-over');
    }

    if (event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
      const file = event.dataTransfer.files[0];

      // Check if it's an image
      if (!file.type.startsWith('image/')) {
        this.toastr.error('Por favor, arraste apenas arquivos de imagem');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.toastr.error('A imagem deve ter no máximo 5MB');
        return;
      }

      // Convert to base64 and insert
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const base64Image = e.target.result;

        // Get the drop position
        const range = document.caretRangeFromPoint(event.clientX, event.clientY);

        if (range) {
          // Create image element
          const img = document.createElement('img');
          img.src = base64Image;
          img.style.maxWidth = '100%';
          img.style.height = 'auto';
          img.style.borderRadius = '8px';
          img.style.margin = '1rem 0';
          img.style.display = 'block';

          // Insert at drop position
          range.insertNode(img);

          // Update the bloco content
          if (editor) {
            bloco.conteudo = editor.innerHTML;
          }
        } else {
          // If no drop position, append at the end
          const img = `<img src="${base64Image}" style="max-width: 100%; height: auto; border-radius: 8px; margin: 1rem 0; display: block;">`;
          editor.innerHTML += img;
          bloco.conteudo = editor.innerHTML;
        }

        this.toastr.success('Imagem inserida com sucesso!');
      };

      reader.onerror = () => {
        this.toastr.error('Erro ao carregar a imagem');
      };

      reader.readAsDataURL(file);
    }
  }

  // ===== TEMPLATES =====

  mostrarModalTemplates = false;

  abrirGerenciadorTemplates(): void {
    this.mostrarModalTemplates = true;
  }

  fecharModalTemplates(): void {
    this.mostrarModalTemplates = false;
  }

  aplicarTemplate(templateData: { tipo: 'perguntas' | 'tarefas'; content: any; nomeTemplate?: string; template_id?: number }): void {
    // Criar novo bloco com o conteúdo do template
    const novoBloco: BlocoProximosPassos = {
      id: this.generateId(),
      tipo: templateData.tipo,
      conteudo: '',
      perguntas: templateData.tipo === 'perguntas' ? templateData.content : undefined,
      tarefas: templateData.tipo === 'tarefas' ? templateData.content : undefined,
      nomeTemplate: templateData.nomeTemplate,
      template_id: templateData.template_id
    };

    this.conteudo.proximosPassos.blocos.push(novoBloco);
    this.fecharModalTemplates();
  }
}
