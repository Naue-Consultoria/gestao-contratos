import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { MentoriaTemplatesService, MentoriaTemplate } from '../../services/mentoria-templates.service';

@Component({
  selector: 'app-mentoria-templates-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mentoria-templates-modal.html',
  styleUrl: './mentoria-templates-modal.css'
})
export class MentoriaTemplatesModalComponent implements OnInit {
  @Output() close = new EventEmitter<void>();
  @Output() templateSelecionado = new EventEmitter<any>();

  templates: MentoriaTemplate[] = [];
  isLoading = false;
  isSaving = false;

  // Estado do modal
  modo: 'listar' | 'criar' = 'listar';
  filtroTipo: 'perguntas' | 'tarefas' | null = null;

  // Formulário de criar novo template
  novoTemplate = {
    nome: '',
    descricao: ''
  };
  novoTemplateTipo: 'perguntas' | 'tarefas' = 'perguntas';
  novasPerguntas: { pergunta: string }[] = [{ pergunta: '' }];
  novasTarefas: { titulo: string; itens: { texto: string }[] } = {
    titulo: '',
    itens: [{ texto: '' }]
  };

  // Template selecionado para visualização/edição
  templateDetalhes: MentoriaTemplate | null = null;
  modoEdicao = false;

  constructor(
    private templatesService: MentoriaTemplatesService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.carregarTemplates();
  }

  carregarTemplates(): void {
    this.isLoading = true;
    this.templatesService.listarTemplates().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.templates = response.data;
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erro ao carregar templates:', error);
        this.toastr.error('Erro ao carregar templates');
        this.isLoading = false;
      }
    });
  }

  mudarModo(modo: 'listar' | 'criar'): void {
    this.modo = modo;
    if (modo === 'criar') {
      this.resetarFormulario();
    }
  }

  resetarFormulario(): void {
    this.novoTemplate = { nome: '', descricao: '' };
    this.novoTemplateTipo = 'perguntas';
    this.novasPerguntas = [{ pergunta: '' }];
    this.novasTarefas = { titulo: '', itens: [{ texto: '' }] };
  }

  // Métodos para editor de perguntas
  adicionarPerguntaNova(): void {
    this.novasPerguntas.push({ pergunta: '' });
  }

  removerPerguntaNova(index: number): void {
    if (this.novasPerguntas.length > 1) {
      this.novasPerguntas.splice(index, 1);
    }
  }

  // Métodos para editor de tarefas
  adicionarTarefaNova(): void {
    this.novasTarefas.itens.push({ texto: '' });
  }

  removerTarefaNova(index: number): void {
    if (this.novasTarefas.itens.length > 1) {
      this.novasTarefas.itens.splice(index, 1);
    }
  }

  temConteudoValido(): boolean {
    if (this.novoTemplateTipo === 'perguntas') {
      return this.novasPerguntas.some(p => p.pergunta.trim() !== '');
    } else {
      return this.novasTarefas.itens.some(t => t.texto.trim() !== '');
    }
  }

  salvarNovoTemplate(): void {
    if (!this.novoTemplate.nome.trim()) {
      this.toastr.warning('Digite um nome para o template');
      return;
    }

    if (!this.temConteudoValido()) {
      this.toastr.warning('Adicione pelo menos uma pergunta ou tarefa');
      return;
    }

    this.isSaving = true;

    // Preparar conteúdo baseado no tipo
    let content: any;
    if (this.novoTemplateTipo === 'perguntas') {
      // Filtrar perguntas vazias
      content = this.novasPerguntas.filter(p => p.pergunta.trim() !== '');
    } else {
      // Filtrar tarefas vazias
      content = {
        titulo: this.novasTarefas.titulo,
        itens: this.novasTarefas.itens.filter(t => t.texto.trim() !== '')
      };
    }

    this.templatesService.criarTemplate({
      nome: this.novoTemplate.nome.trim(),
      descricao: this.novoTemplate.descricao.trim() || undefined,
      tipo: this.novoTemplateTipo,
      content: content
    }).subscribe({
      next: (response) => {
        if (response.success) {
          this.toastr.success('Template criado com sucesso!');
          this.carregarTemplates();
          this.mudarModo('listar');
        }
        this.isSaving = false;
      },
      error: (error) => {
        console.error('Erro ao salvar template:', error);
        this.toastr.error('Erro ao salvar template');
        this.isSaving = false;
      }
    });
  }

  carregarTemplate(template: MentoriaTemplate): void {
    // Emitir template com tipo, nome e ID para o editor saber como usar
    this.templateSelecionado.emit({
      tipo: template.tipo,
      content: template.content,
      nomeTemplate: template.nome,
      template_id: template.id
    });
    this.toastr.success(`Template "${template.nome}" carregado!`);
    this.fecharModal();
  }

  visualizarTemplate(template: MentoriaTemplate): void {
    this.templateDetalhes = { ...template };
    this.modoEdicao = false;
  }

  fecharDetalhes(): void {
    this.templateDetalhes = null;
    this.modoEdicao = false;
  }

  editarTemplate(): void {
    this.modoEdicao = true;
  }

  salvarEdicao(): void {
    if (!this.templateDetalhes) return;

    if (!this.templateDetalhes.nome.trim()) {
      this.toastr.warning('Digite um nome para o template');
      return;
    }

    this.isSaving = true;

    this.templatesService.atualizarTemplate(this.templateDetalhes.id, {
      nome: this.templateDetalhes.nome.trim(),
      descricao: this.templateDetalhes.descricao?.trim() || undefined,
      content: this.templateDetalhes.content
    }).subscribe({
      next: (response) => {
        if (response.success) {
          this.toastr.success('Template atualizado com sucesso!');
          this.carregarTemplates();
          this.fecharDetalhes();
        }
        this.isSaving = false;
      },
      error: (error) => {
        console.error('Erro ao atualizar template:', error);
        this.toastr.error('Erro ao atualizar template');
        this.isSaving = false;
      }
    });
  }

  excluirTemplate(template: MentoriaTemplate): void {
    if (!confirm(`Tem certeza que deseja excluir o template "${template.nome}"?`)) {
      return;
    }

    this.templatesService.excluirTemplate(template.id).subscribe({
      next: (response) => {
        if (response.success) {
          this.toastr.success('Template excluído com sucesso!');
          this.carregarTemplates();
          if (this.templateDetalhes?.id === template.id) {
            this.fecharDetalhes();
          }
        }
      },
      error: (error) => {
        console.error('Erro ao excluir template:', error);
        this.toastr.error('Erro ao excluir template');
      }
    });
  }

  fecharModal(): void {
    this.close.emit();
  }

  // Helpers para exibição
  get templatesFiltrados(): MentoriaTemplate[] {
    if (this.filtroTipo === null) {
      return this.templates;
    }
    return this.templates.filter(t => t.tipo === this.filtroTipo);
  }

  contarTemplatesPorTipo(tipo: 'perguntas' | 'tarefas'): number {
    return this.templates.filter(t => t.tipo === tipo).length;
  }

  getPreviewText(content: any, tipo: string): string {
    if (tipo === 'perguntas') {
      const perguntas = content as { pergunta: string }[];
      return `${perguntas.length} pergunta(s)`;
    } else {
      const tarefas = content as { titulo: string; itens: { texto: string }[] };
      return tarefas.titulo || `${tarefas.itens?.length || 0} item(ns)`;
    }
  }

  getContentDetails(content: any, tipo: string): string[] {
    if (tipo === 'perguntas') {
      return (content as { pergunta: string }[]).map(p => p.pergunta);
    } else {
      const tarefas = content as { titulo: string; itens: { texto: string }[] };
      return tarefas.itens?.map(i => i.texto) || [];
    }
  }
}
