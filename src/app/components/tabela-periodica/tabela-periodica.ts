import { Component, Input, OnInit, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { MentoriaService, ForcaRanking } from '../../services/mentoria.service';
import * as pdfjsLib from 'pdfjs-dist';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Definição das 24 forças de caráter
interface ForcaCarater {
  id: string;
  nome: string;
  nomeExibicao: string;
  categoria: 'sabedoria' | 'humanidade' | 'justica' | 'moderacao' | 'coragem' | 'transcendencia';
  descricao: string;
}

// Dados das virtudes/categorias
interface VirtudeDados {
  nome: string;
  cor: string;
  corBg: string;
  icon: string;
}

@Component({
  selector: 'app-tabela-periodica',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tabela-periodica.html',
  styleUrl: './tabela-periodica.css'
})
export class TabelaPeriodicaComponent implements OnInit {
  @Input() token: string = '';
  @Input() readOnly: boolean = false;
  @Output() onSave = new EventEmitter<void>();

  // Dados
  nomeUsuario: string = '';
  forcasRanking: ForcaRanking[] = [];
  isLoading: boolean = false;
  isSaving: boolean = false;
  hasChanges: boolean = false;

  // PDF Upload
  isProcessingPdf: boolean = false;
  isDragOver: boolean = false;
  pdfProcessado: boolean = false;

  // Modal
  showModal: boolean = false;
  forcaSelecionada: ForcaCarater | null = null;
  rankSelecionado: number = 0;

  // Virtudes (categorias)
  virtudes: { [key: string]: VirtudeDados } = {
    sabedoria: { nome: 'Sabedoria', cor: '#D4A017', corBg: 'rgba(245, 185, 66, 0.1)', icon: '💡' },
    humanidade: { nome: 'Humanidade', cor: '#C9A227', corBg: 'rgba(245, 215, 66, 0.1)', icon: '❤️' },
    justica: { nome: 'Justiça', cor: '#2980B9', corBg: 'rgba(93, 173, 226, 0.1)', icon: '⚖️' },
    moderacao: { nome: 'Moderação', cor: '#27AE60', corBg: 'rgba(88, 214, 141, 0.1)', icon: '🧘' },
    coragem: { nome: 'Coragem', cor: '#C0392B', corBg: 'rgba(205, 97, 85, 0.1)', icon: '🦁' },
    transcendencia: { nome: 'Transcendência', cor: '#8E44AD', corBg: 'rgba(155, 89, 182, 0.1)', icon: '✨' }
  };

  // As 24 forças de caráter organizadas
  forcas: ForcaCarater[] = [
    // SABEDORIA (5 forças)
    { id: 'criatividade', nome: 'Criatividade', nomeExibicao: 'CRIATIVIDADE', categoria: 'sabedoria', descricao: 'Pensar em formas novas e produtivas de conceituar e fazer as coisas; inclui a realização artística, mas não se limita a ela.' },
    { id: 'curiosidade', nome: 'Curiosidade', nomeExibicao: 'CURIOSIDADE', categoria: 'sabedoria', descricao: 'Ter interesse em experiências por si mesmas; achar assuntos fascinantes; explorar e descobrir.' },
    { id: 'aprendizado', nome: 'Amor ao Aprendizado', nomeExibicao: 'AMOR AO\nAPRENDIZADO', categoria: 'sabedoria', descricao: 'Dominar novas habilidades, tópicos e corpos de conhecimento, seja por conta própria ou formalmente.' },
    { id: 'menteaberta', nome: 'Mente Aberta', nomeExibicao: 'MENTE ABERTA', categoria: 'sabedoria', descricao: 'Pensar as coisas e examiná-las por todos os lados; não tirar conclusões precipitadas; ser capaz de mudar de opinião diante de evidências.' },
    { id: 'perspectiva', nome: 'Perspectiva', nomeExibicao: 'PERSPECTIVA', categoria: 'sabedoria', descricao: 'Ser capaz de fornecer conselhos sábios para os outros; ter formas de olhar o mundo que fazem sentido para si mesmo e para os outros.' },

    // HUMANIDADE (3 forças)
    { id: 'generosidade', nome: 'Generosidade', nomeExibicao: 'GENEROSIDADE', categoria: 'humanidade', descricao: 'Fazer favores e boas ações para os outros; ajudá-los; cuidar deles.' },
    { id: 'amor', nome: 'Amor', nomeExibicao: 'AMOR', categoria: 'humanidade', descricao: 'Valorizar relações íntimas com os outros, especialmente aquelas em que o compartilhamento e o cuidado são recíprocos.' },
    { id: 'inteligenciasocial', nome: 'Inteligência Social', nomeExibicao: 'INTELIGÊNCIA\nEMOCIONAL', categoria: 'humanidade', descricao: 'Estar consciente dos motivos e sentimentos dos outros e de si mesmo; saber o que fazer para se adequar a diferentes situações sociais.' },

    // JUSTIÇA (3 forças)
    { id: 'justica', nome: 'Justiça', nomeExibicao: 'JUSTIÇA', categoria: 'justica', descricao: 'Tratar todas as pessoas da mesma forma, de acordo com noções de justiça e equidade; não deixar sentimentos pessoais influenciarem decisões sobre outros.' },
    { id: 'lideranca', nome: 'Liderança', nomeExibicao: 'LIDERANÇA', categoria: 'justica', descricao: 'Encorajar um grupo do qual se é membro a fazer as coisas e ao mesmo tempo manter boas relações dentro do grupo.' },
    { id: 'trabalhoequipe', nome: 'Trabalho em Equipe', nomeExibicao: 'TRABALHO\nEM EQUIPE', categoria: 'justica', descricao: 'Trabalhar bem como membro de um grupo ou equipe; ser leal ao grupo; fazer sua parte.' },

    // MODERAÇÃO (4 forças)
    { id: 'perdao', nome: 'Perdão', nomeExibicao: 'PERDÃO', categoria: 'moderacao', descricao: 'Perdoar aqueles que fizeram mal; aceitar as falhas dos outros; dar às pessoas uma segunda chance; não ser vingativo.' },
    { id: 'humildade', nome: 'Humildade', nomeExibicao: 'HUMILDADE', categoria: 'moderacao', descricao: 'Deixar as próprias realizações falarem por si mesmas; não se considerar mais especial do que é.' },
    { id: 'prudencia', nome: 'Prudência', nomeExibicao: 'PRUDÊNCIA', categoria: 'moderacao', descricao: 'Ser cuidadoso sobre as próprias escolhas; não dizer ou fazer coisas das quais possa se arrepender depois.' },
    { id: 'autocontrole', nome: 'Autocontrole', nomeExibicao: 'AUTO-CONTROLE', categoria: 'moderacao', descricao: 'Regular o que se sente e faz; ser disciplinado; controlar seus apetites e emoções.' },

    // CORAGEM (4 forças)
    { id: 'bravura', nome: 'Bravura', nomeExibicao: 'BRAVURA', categoria: 'coragem', descricao: 'Não recuar diante de ameaças, desafios, dificuldades ou dor; falar pelo que é certo mesmo que haja oposição.' },
    { id: 'integridade', nome: 'Integridade', nomeExibicao: 'INTEGRIDADE', categoria: 'coragem', descricao: 'Dizer a verdade, mas de forma mais ampla apresentar-se de forma genuína e agir de forma sincera.' },
    { id: 'perseveranca', nome: 'Perseverança', nomeExibicao: 'PERSEVERANÇA', categoria: 'coragem', descricao: 'Terminar o que começa; persistir em um curso de ação apesar dos obstáculos.' },
    { id: 'vitalidade', nome: 'Vitalidade', nomeExibicao: 'VITALIDADE', categoria: 'coragem', descricao: 'Abordar a vida com entusiasmo e energia; não fazer as coisas pela metade; viver a vida como uma aventura.' },

    // TRANSCENDÊNCIA (5 forças)
    { id: 'apreciacao', nome: 'Apreciação da Beleza', nomeExibicao: 'ADMIRAÇÃO\nDA BELEZA E\nEXCELÊNCIA', categoria: 'transcendencia', descricao: 'Notar e apreciar a beleza, excelência e/ou desempenho habilidoso em vários domínios da vida.' },
    { id: 'gratidao', nome: 'Gratidão', nomeExibicao: 'GRATIDÃO', categoria: 'transcendencia', descricao: 'Estar consciente e grato pelas coisas boas que acontecem; reservar tempo para expressar agradecimento.' },
    { id: 'esperanca', nome: 'Esperança', nomeExibicao: 'ESPERANÇA', categoria: 'transcendencia', descricao: 'Esperar o melhor do futuro e trabalhar para alcançá-lo; acreditar que um bom futuro é algo que pode ser alcançado.' },
    { id: 'humor', nome: 'Humor', nomeExibicao: 'HUMOR', categoria: 'transcendencia', descricao: 'Gostar de rir e provocar risos nos outros; ver o lado mais leve; fazer piadas (não necessariamente contar piadas).' },
    { id: 'espiritualidade', nome: 'Espiritualidade', nomeExibicao: 'ESPIRITUALIDADE', categoria: 'transcendencia', descricao: 'Ter crenças coerentes sobre o propósito maior e significado do universo; saber onde se encaixa no esquema maior.' }
  ];

  // Layout da tabela (matriz 5x6)
  tabelaLayout: (string | null)[][] = [
    ['criatividade', null, null, null, null, 'apreciacao'],
    ['curiosidade', null, null, 'perdao', 'bravura', 'gratidao'],
    ['aprendizado', 'generosidade', 'justica', 'humildade', 'integridade', 'esperanca'],
    ['menteaberta', 'amor', 'lideranca', 'prudencia', 'perseveranca', 'humor'],
    ['perspectiva', 'inteligenciasocial', 'trabalhoequipe', 'autocontrole', 'vitalidade', 'espiritualidade']
  ];

  categoriasColunas: string[] = ['sabedoria', 'humanidade', 'justica', 'moderacao', 'coragem', 'transcendencia'];

  constructor(
    private mentoriaService: MentoriaService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    if (this.token) {
      this.carregarDados();
    }
  }

  carregarDados(): void {
    this.isLoading = true;

    this.mentoriaService.obterTabelaPeriodica(this.token).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.nomeUsuario = response.data.nome_usuario || '';
          this.forcasRanking = response.data.forcas_ranking || [];
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erro ao carregar Tabela Periódica:', error);
        this.isLoading = false;
      }
    });
  }

  salvarDados(): void {
    if (this.readOnly) return;

    this.isSaving = true;

    this.mentoriaService.salvarTabelaPeriodica(this.token, {
      nome_usuario: this.nomeUsuario,
      forcas_ranking: this.forcasRanking
    }).subscribe({
      next: (response) => {
        if (response.success) {
          this.toastr.success('Tabela Periódica salva com sucesso!');
          this.hasChanges = false;
          this.onSave.emit();
        }
        this.isSaving = false;
      },
      error: (error) => {
        console.error('Erro ao salvar Tabela Periódica:', error);
        this.toastr.error('Erro ao salvar Tabela Periódica');
        this.isSaving = false;
      }
    });
  }

  // Obter força por ID
  getForcaById(id: string): ForcaCarater | undefined {
    return this.forcas.find(f => f.id === id);
  }

  // Obter ranking de uma força
  getRanking(forcaId: string): number | null {
    const ranking = this.forcasRanking.find(r => r.id === forcaId);
    return ranking ? ranking.rank : null;
  }

  // Obter descrição personalizada do PDF (ou descrição padrão)
  getDescricaoPersonalizada(forcaId: string): string {
    const ranking = this.forcasRanking.find(r => r.id === forcaId);
    if (ranking && ranking.description) {
      return ranking.description;
    }
    // Fallback para descrição padrão
    const forca = this.getForcaById(forcaId);
    return forca?.descricao || '';
  }

  // Verificar se força está no top 5
  isTop5(forcaId: string): boolean {
    const rank = this.getRanking(forcaId);
    return rank !== null && rank <= 5;
  }

  // Verificar se força tem ranking
  hasRanking(forcaId: string): boolean {
    return this.getRanking(forcaId) !== null;
  }

  // Clique na célula - abre modal para visualizar descrição
  onCellClick(forcaId: string | null): void {
    if (!forcaId) return;

    // Só abre o modal se a força tiver ranking (foi importada do PDF)
    if (!this.hasRanking(forcaId)) return;

    const forca = this.getForcaById(forcaId);
    if (forca) {
      this.forcaSelecionada = forca;
      this.rankSelecionado = this.getRanking(forcaId) || 0;
      this.showModal = true;
    }
  }

  // Fechar modal
  closeModal(): void {
    this.showModal = false;
    this.forcaSelecionada = null;
    this.rankSelecionado = 0;
  }

  // Salvar ranking da força
  salvarRanking(): void {
    if (!this.forcaSelecionada) return;

    const forcaId = this.forcaSelecionada.id;

    // Remover ranking anterior se existir
    this.forcasRanking = this.forcasRanking.filter(r => r.id !== forcaId);

    // Adicionar novo ranking se não for 0
    if (this.rankSelecionado > 0 && this.rankSelecionado <= 24) {
      // Verificar se já existe outra força com este ranking
      const existente = this.forcasRanking.find(r => r.rank === this.rankSelecionado);
      if (existente) {
        this.toastr.warning(`A posição ${this.rankSelecionado} já está ocupada por "${this.getForcaById(existente.id)?.nome}"`);
        return;
      }

      this.forcasRanking.push({
        id: forcaId,
        rank: this.rankSelecionado,
        name: this.forcaSelecionada.nome,
        category: this.forcaSelecionada.categoria,
        description: this.forcaSelecionada.descricao
      });

      // Ordenar por ranking
      this.forcasRanking.sort((a, b) => a.rank - b.rank);
    }

    this.hasChanges = true;
    this.closeModal();
  }

  // Remover ranking
  removerRanking(): void {
    if (!this.forcaSelecionada) return;

    this.forcasRanking = this.forcasRanking.filter(r => r.id !== this.forcaSelecionada!.id);
    this.hasChanges = true;
    this.closeModal();
  }

  // Obter top 5 forças
  getTop5(): ForcaRanking[] {
    return this.forcasRanking.filter(r => r.rank <= 5).sort((a, b) => a.rank - b.rank);
  }

  // Resetar tabela
  resetarTabela(): void {
    if (this.readOnly) return;

    if (confirm('Tem certeza que deseja limpar todos os rankings?')) {
      this.forcasRanking = [];
      this.nomeUsuario = '';
      this.hasChanges = true;
    }
  }

  // Obter cor da categoria (para células)
  getCategoriaCor(categoria: string): string {
    return this.virtudes[categoria]?.cor || '#666';
  }

  // Obter cor escura da categoria (para headers)
  getCategoriaCorHeader(categoria: string): string {
    const coresHeader: { [key: string]: string } = {
      sabedoria: '#8B6914',
      humanidade: '#7D6608',
      justica: '#1A5276',
      moderacao: '#1D6F42',
      coragem: '#7B241C',
      transcendencia: '#5B2C6F'
    };
    return coresHeader[categoria] || '#444';
  }

  // Obter nome da categoria
  getCategoriaNome(categoria: string): string {
    return this.virtudes[categoria]?.nome || categoria;
  }

  // ===== FUNCIONALIDADE DE LEITURA DO PDF VIA =====

  // Mapeamento de nomes das forças (português/inglês do PDF -> ID interno)
  private mapeamentoForcas: { [key: string]: string } = {
    // Português
    'criatividade': 'criatividade',
    'curiosidade': 'curiosidade',
    'amor ao aprendizado': 'aprendizado',
    'mente aberta': 'menteaberta',
    'critério': 'menteaberta', // Sinônimo usado no PDF
    'perspectiva': 'perspectiva',
    'generosidade': 'generosidade',
    'amor': 'amor',
    'inteligência social': 'inteligenciasocial',
    'justiça': 'justica',
    'liderança': 'lideranca',
    'trabalho em equipe': 'trabalhoequipe',
    'perdão': 'perdao',
    'humildade': 'humildade',
    'prudência': 'prudencia',
    'autocontrole': 'autocontrole',
    'auto-controle': 'autocontrole',
    'bravura': 'bravura',
    'integridade': 'integridade',
    'perseverança': 'perseveranca',
    'vitalidade': 'vitalidade',
    'apreciação da beleza': 'apreciacao',
    'apreciação da beleza e excelência': 'apreciacao',
    'gratidão': 'gratidao',
    'esperança': 'esperanca',
    'humor': 'humor',
    'espiritualidade': 'espiritualidade',
    // Inglês
    'creativity': 'criatividade',
    'curiosity': 'curiosidade',
    'love of learning': 'aprendizado',
    'judgment': 'menteaberta',
    'open-mindedness': 'menteaberta',
    'perspective': 'perspectiva',
    'kindness': 'generosidade',
    'love': 'amor',
    'social intelligence': 'inteligenciasocial',
    'fairness': 'justica',
    'leadership': 'lideranca',
    'teamwork': 'trabalhoequipe',
    'forgiveness': 'perdao',
    'humility': 'humildade',
    'prudence': 'prudencia',
    'self-regulation': 'autocontrole',
    'self-control': 'autocontrole',
    'bravery': 'bravura',
    'honesty': 'integridade',
    'integrity': 'integridade',
    'perseverance': 'perseveranca',
    'zest': 'vitalidade',
    'vitality': 'vitalidade',
    'appreciation of beauty': 'apreciacao',
    'appreciation of beauty and excellence': 'apreciacao',
    'gratitude': 'gratidao',
    'hope': 'esperanca',
    'spirituality': 'espiritualidade'
  };

  // Mapeamento de categorias (inglês -> interno)
  private mapeamentoCategorias: { [key: string]: 'sabedoria' | 'humanidade' | 'justica' | 'moderacao' | 'coragem' | 'transcendencia' } = {
    'wisdom': 'sabedoria',
    'humanity': 'humanidade',
    'justice': 'justica',
    'temperance': 'moderacao',
    'courage': 'coragem',
    'transcendence': 'transcendencia'
  };

  // Drag and Drop handlers
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.readOnly) {
      this.isDragOver = true;
    }
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    if (this.readOnly) return;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.processarArquivo(files[0]);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.processarArquivo(input.files[0]);
      input.value = ''; // Limpar para permitir selecionar o mesmo arquivo novamente
    }
  }

  private async processarArquivo(file: File): Promise<void> {
    if (file.type !== 'application/pdf') {
      this.toastr.error('Por favor, selecione um arquivo PDF válido.');
      return;
    }

    this.isProcessingPdf = true;
    this.toastr.info('Processando PDF do VIA Institute...');

    try {
      // Configurar o worker do PDF.js (usando unpkg CDN)
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@5.4.449/build/pdf.worker.min.mjs';

      // Ler o arquivo como ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();

      // Carregar o PDF
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      // Extrair texto de todas as páginas
      let textoCompleto = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        textoCompleto += pageText + '\n';
      }

      // Extrair nome do usuário (primeira linha geralmente é o nome)
      const nomeMatch = textoCompleto.match(/^([A-Za-zÀ-ÿ\s]+)\s*VIA Character/i);
      if (nomeMatch) {
        this.nomeUsuario = nomeMatch[1].trim();
      }

      // Processar as forças do texto
      const forcasExtraidas = this.extrairForcasDoPdf(textoCompleto);

      if (forcasExtraidas.length > 0) {
        // Limpar rankings anteriores
        this.forcasRanking = [];

        // Adicionar as forças extraídas com a descrição personalizada do PDF
        forcasExtraidas.forEach(forca => {
          const forcaInterna = this.getForcaById(forca.id);
          if (forcaInterna) {
            this.forcasRanking.push({
              id: forca.id,
              rank: forca.rank,
              name: forcaInterna.nome,
              category: forcaInterna.categoria,
              // Usar descrição do PDF se disponível, senão usar a padrão
              description: forca.descricao || forcaInterna.descricao
            });
          }
        });

        // Ordenar por ranking
        this.forcasRanking.sort((a, b) => a.rank - b.rank);

        this.pdfProcessado = true;
        this.hasChanges = true;
        this.toastr.success(`PDF processado com sucesso! ${forcasExtraidas.length} forças identificadas.`);
      } else {
        this.toastr.warning('Não foi possível identificar as forças no PDF. Verifique se é um PDF válido do VIA Institute.');
      }

    } catch (error) {
      console.error('Erro ao processar PDF:', error);
      this.toastr.error('Erro ao processar o PDF. Verifique se o arquivo é válido.');
    } finally {
      this.isProcessingPdf = false;
    }
  }

  private extrairForcasDoPdf(texto: string): { id: string; rank: number; descricao: string }[] {
    const forcasExtraidas: { id: string; rank: number; descricao: string }[] = [];

    // Normalizar texto - remover quebras de linha extras
    const textoNormalizado = texto.replace(/\r\n/g, ' ').replace(/\n/g, ' ').replace(/\s+/g, ' ');

    console.log('Texto normalizado (primeiros 2000 chars):', textoNormalizado.substring(0, 2000));

    // Lista de nomes de forças em português para buscar diretamente
    const forcasParaBuscar = [
      { nome: 'Justiça', id: 'justica' },
      { nome: 'Integridade', id: 'integridade' },
      { nome: 'Espiritualidade', id: 'espiritualidade' },
      { nome: 'Gratidão', id: 'gratidao' },
      { nome: 'Trabalho em Equipe', id: 'trabalhoequipe' },
      { nome: 'Vitalidade', id: 'vitalidade' },
      { nome: 'Generosidade', id: 'generosidade' },
      { nome: 'Amor ao Aprendizado', id: 'aprendizado' },
      { nome: 'Humildade', id: 'humildade' },
      { nome: 'Perspectiva', id: 'perspectiva' },
      { nome: 'Inteligência Social', id: 'inteligenciasocial' },
      { nome: 'Bravura', id: 'bravura' },
      { nome: 'Liderança', id: 'lideranca' },
      { nome: 'Critério', id: 'menteaberta' },
      { nome: 'Apreciação da Beleza', id: 'apreciacao' },
      { nome: 'Prudência', id: 'prudencia' },
      { nome: 'Humor', id: 'humor' },
      { nome: 'Criatividade', id: 'criatividade' },
      { nome: 'Perdão', id: 'perdao' },
      { nome: 'Perseverança', id: 'perseveranca' },
      { nome: 'Esperança', id: 'esperanca' },
      { nome: 'Curiosidade', id: 'curiosidade' },
      { nome: 'Amor', id: 'amor' },
      { nome: 'Autocontrole', id: 'autocontrole' }
    ];

    // Para cada força, buscar no texto com regex específico
    for (const forca of forcasParaBuscar) {
      // Escapar caracteres especiais do nome para usar no regex
      const nomeEscapado = forca.nome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      // Regex: "N. NomeDaForça CATEGORIA NomeDaForça: descrição..."
      // Captura: (1) número, (2) descrição até próximo "N. " ou "©"
      const regex = new RegExp(
        `(\\d{1,2})\\.\\s*${nomeEscapado}\\s+(?:WISDOM|COURAGE|HUMANITY|JUSTICE|TEMPERANCE|TRANSCENDENCE)\\s+(?:[^:]+):\\s*(.+?)(?=\\s+\\d{1,2}\\.\\s+[A-Z]|©2|$)`,
        'i'
      );

      const match = textoNormalizado.match(regex);
      if (match) {
        const rank = parseInt(match[1], 10);
        let descricao = match[2].trim().replace(/\s+/g, ' ');

        if (rank >= 1 && rank <= 24 && !forcasExtraidas.find(f => f.id === forca.id)) {
          forcasExtraidas.push({ id: forca.id, rank, descricao });
          console.log(`Encontrada: ${forca.nome} - Rank: ${rank}`);
        }
      } else {
        console.log(`Não encontrada: ${forca.nome}`);
      }
    }

    console.log(`Total de forças extraídas: ${forcasExtraidas.length}`);

    return forcasExtraidas.sort((a, b) => a.rank - b.rank);
  }

  // ===== EXPORTAR PARA PDF =====

  async exportarPdf(): Promise<void> {
    try {
      const element = document.querySelector('.tabela-wrapper') as HTMLElement;
      if (!element) {
        this.toastr.error('Erro ao gerar PDF');
        return;
      }

      this.toastr.info('Gerando PDF da Tabela Periódica...', '', { timeOut: 2000 });

      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false
      });

      const imgWidth = 297; // A4 landscape width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      // Adicionar título
      pdf.setFontSize(20);
      pdf.setTextColor(2, 44, 34);
      pdf.text('Tabela Periódica - 24 Forças de Caráter', 148.5, 15, { align: 'center' });

      // Adicionar legenda das virtudes
      pdf.setFontSize(9);
      pdf.setTextColor(100, 100, 100);
      pdf.text('Sabedoria | Humanidade | Justiça | Moderação | Coragem | Transcendência', 148.5, 23, { align: 'center' });

      // Adicionar Top 5 se existir
      const top5 = this.getTop5();
      if (top5.length > 0) {
        pdf.setFontSize(10);
        pdf.setTextColor(14, 155, 113); // Verde do sistema
        const top5Text = `Top 5: ${top5.map(f => `${f.rank}. ${f.name}`).join(' | ')}`;
        pdf.text(top5Text, 148.5, 30, { align: 'center' });
      }

      // Adicionar imagem da tabela
      const yPosition = top5.length > 0 ? 38 : 30;
      const availableHeight = 210 - yPosition - 15;
      const finalHeight = Math.min(imgHeight, availableHeight);
      const finalWidth = (canvas.width * finalHeight) / canvas.height;

      const imgData = canvas.toDataURL('image/png');
      const xPosition = (297 - finalWidth) / 2;
      pdf.addImage(imgData, 'PNG', xPosition, yPosition, finalWidth, finalHeight);

      // Adicionar rodapé
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 148.5, 200, { align: 'center' });

      pdf.save('tabela_periodica_forcas.pdf');
      this.toastr.success('PDF da Tabela Periódica gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      this.toastr.error('Erro ao gerar PDF da tabela');
    }
  }
}
