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
  comentario: string;
}

interface BlocoProximosPassos {
  id: string;
  tipo: 'texto' | 'perguntas' | 'tarefas';
  conteudo: string;
  perguntas?: { pergunta: string }[];
  tarefas?: { titulo: string; itens: { texto: string }[] };
}

interface Referencia {
  id: string;
  tipo: 'ted' | 'livro' | 'leitura';
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

interface SecaoReordenavel {
  id: 'testes' | 'proximosPassos' | 'referencias' | 'mapaMental';
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
  encerramento: { ativo: boolean; conteudo: string };
  ordemSecoes?: string[]; // Nova propriedade para controlar a ordem
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
    encerramento: { ativo: true, conteudo: '' },
    ordemSecoes: ['testes', 'proximosPassos', 'referencias', 'mapaMental'] // Ordem padrão
  };

  // Lista de seções reordenáveis
  secoesReordenaveis: SecaoReordenavel[] = [
    { id: 'testes', titulo: 'Testes', icone: 'fa-clipboard-check', ordem: 0 },
    { id: 'proximosPassos', titulo: 'Próximos Passos', icone: 'fa-arrow-right', ordem: 1 },
    { id: 'referencias', titulo: 'Referências / Inspirações', icone: 'fa-book', ordem: 2 },
    { id: 'mapaMental', titulo: 'Mapa Mental Estratégico', icone: 'fa-diagram-project', ordem: 3 }
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

              // Adicionar ordem de seções se não existir (retrocompatibilidade)
              if (!this.conteudo.ordemSecoes) {
                this.conteudo.ordemSecoes = ['testes', 'proximosPassos', 'referencias', 'mapaMental'];
              }
            } catch (e) {
              // Se não for JSON, é conteúdo antigo - manter vazio
              console.log('Conteúdo não é JSON estruturado');
            }
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

  onImagemSelected(event: Event, teste: Teste): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      teste.imagem = input.files[0];
      // Criar preview da imagem
      const reader = new FileReader();
      reader.onload = (e: any) => {
        teste.imagemUrl = e.target.result;
      };
      reader.readAsDataURL(teste.imagem);
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
  }

  removerBlocoProximosPassos(id: string): void {
    this.conteudo.proximosPassos.blocos = this.conteudo.proximosPassos.blocos.filter(b => b.id !== id);
    // Remove from initialized set when block is removed
    this.editorsInitialized.delete(id);
  }

  // ===== REORGANIZAR SEÇÕES =====

  get secoesOrdenadas(): string[] {
    if (!this.conteudo.ordemSecoes || this.conteudo.ordemSecoes.length === 0) {
      return ['testes', 'proximosPassos', 'referencias', 'mapaMental'];
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

  salvarConteudo(): void {
    if (!this.encontroId) {
      this.toastr.error('ID do encontro não encontrado');
      return;
    }

    this.isSaving = true;

    // Converter para JSON antes de salvar
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

  aplicarTemplate(templateData: { tipo: 'perguntas' | 'tarefas'; content: any }): void {
    // Criar novo bloco com o conteúdo do template
    const novoBloco: BlocoProximosPassos = {
      id: this.generateId(),
      tipo: templateData.tipo,
      conteudo: '',
      perguntas: templateData.tipo === 'perguntas' ? templateData.content : undefined,
      tarefas: templateData.tipo === 'tarefas' ? templateData.content : undefined
    };

    this.conteudo.proximosPassos.blocos.push(novoBloco);
    this.fecharModalTemplates();
  }
}
