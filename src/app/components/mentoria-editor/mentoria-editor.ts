import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CdkDragDrop, moveItemInArray, DragDropModule } from '@angular/cdk/drag-drop';
import { ToastrService } from 'ngx-toastr';
import { MentoriaService, MentoriaEncontro, EncontroBloco } from '../../services/mentoria.service';
import { TIPOS_BLOCOS_DISPONIVEIS, MentoriaHelpers, BlocoTipo } from '../../types/mentoria.types';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';
import { BreadcrumbService } from '../../services/breadcrumb.service';
import { ClientService, ClientsResponse } from '../../services/client';
import { ContractService, ContractsResponse } from '../../services/contract';

@Component({
  selector: 'app-mentoria-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, DragDropModule, BreadcrumbComponent],
  templateUrl: './mentoria-editor.html',
  styleUrl: './mentoria-editor.css'
})
export class MentoriaEditor implements OnInit, AfterViewInit {
  encontroForm!: FormGroup;
  encontroId: number | null = null;
  encontro: MentoriaEncontro | null = null;

  blocos: EncontroBloco[] = [];
  blocosDisponiveis = TIPOS_BLOCOS_DISPONIVEIS;

  // Blocos agrupados por categoria
  blocosPorCategoria = {
    conteudo: TIPOS_BLOCOS_DISPONIVEIS.filter(b => b.categoria === 'conteudo'),
    interacao: TIPOS_BLOCOS_DISPONIVEIS.filter(b => b.categoria === 'interacao'),
    midia: TIPOS_BLOCOS_DISPONIVEIS.filter(b => b.categoria === 'midia'),
    visual: TIPOS_BLOCOS_DISPONIVEIS.filter(b => b.categoria === 'visual')
  };

  // Listas para selects
  clientes: any[] = [];
  contratos: any[] = [];
  contratosFiltrados: any[] = [];

  // Estados
  isLoading = false;
  isSaving = false;
  isEditMode = false;
  showPreview = false;
  loadingClientes = false;
  loadingContratos = false;

  // Bloco sendo editado
  blocoEditando: number | null = null;

  // Upload de imagem
  uploadingImage = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private mentoriaService: MentoriaService,
    private clientService: ClientService,
    private contractService: ContractService,
    private toastr: ToastrService,
    private breadcrumbService: BreadcrumbService
  ) {}

  ngOnInit(): void {
    this.initForm();

    // Carregar clientes e contratos primeiro, depois o encontro
    Promise.all([
      this.carregarClientesPromise(),
      this.carregarContratosPromise()
    ]).then(() => {
      const id = this.route.snapshot.paramMap.get('id');
      if (id) {
        this.encontroId = parseInt(id, 10);
        this.isEditMode = true;
        this.carregarEncontro();
      }
    });

    const id = this.route.snapshot.paramMap.get('id');
    this.setBreadcrumb(id || undefined);
  }

  private carregarClientesPromise(): Promise<void> {
    return new Promise((resolve) => {
      this.loadingClientes = true;
      this.encontroForm.get('client_id')?.disable();

      this.clientService.getClients().subscribe({
        next: (response: ClientsResponse) => {
          this.clientes = response.clients || [];
          this.loadingClientes = false;
          this.encontroForm.get('client_id')?.enable();
          resolve();
        },
        error: (error: any) => {
          console.error('Erro ao carregar clientes:', error);
          this.toastr.error('Erro ao carregar clientes');
          this.loadingClientes = false;
          this.encontroForm.get('client_id')?.enable();
          resolve();
        }
      });
    });
  }

  private carregarContratosPromise(): Promise<void> {
    return new Promise((resolve) => {
      this.loadingContratos = true;

      this.contractService.getContracts().subscribe({
        next: (response: ContractsResponse) => {
          this.contratos = response.contracts || [];
          this.contratosFiltrados = this.contratos;
          this.loadingContratos = false;
          resolve();
        },
        error: (error: any) => {
          console.error('Erro ao carregar contratos:', error);
          this.toastr.error('Erro ao carregar contratos');
          this.loadingContratos = false;
          resolve();
        }
      });
    });
  }

  ngAfterViewInit(): void {
    // Este componente não usa mais editor TipTap
  }

  initForm(): void {
    this.encontroForm = this.fb.group({
      client_id: ['', Validators.required],
      contract_id: [{ value: '', disabled: true }, Validators.required],
      mentorado_nome: ['', [Validators.required, Validators.minLength(2)]],
      numero_encontro: [''],
      numero_encontros: [5, [Validators.required, Validators.min(1), Validators.max(50)]], // Para criar mentoria
      data_encontro: [''], // Não obrigatório no modo criação
      token_expira_em: ['']
    });

    // Ajustar validações dinamicamente baseado no modo
    if (!this.isEditMode) {
      // Modo criação: data_encontro não é obrigatória
      this.encontroForm.get('data_encontro')?.clearValidators();
      this.encontroForm.get('data_encontro')?.updateValueAndValidity();
    }
  }

  carregarEncontro(): void {
    if (!this.encontroId) return;

    this.isLoading = true;

    this.mentoriaService.obterEncontro(this.encontroId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.encontro = response.data;
          this.blocos = response.data.blocos || [];

          // Buscar client_id do contrato (após contratos estarem carregados)
          const contrato = this.contratos.find(c => c.id === this.encontro!.contract_id);
          const clientId = contrato?.client_id;

          console.log('📋 Encontro carregado:', this.encontro);
          console.log('📋 Contrato encontrado:', contrato);
          console.log('📋 Client ID:', clientId);

          // Filtrar contratos pelo cliente e habilitar o select
          if (clientId) {
            this.onClienteChange(clientId);
          }

          // Preencher formulário
          this.encontroForm.patchValue({
            client_id: clientId || '',
            contract_id: this.encontro.contract_id,
            mentorado_nome: this.encontro.mentorado_nome,
            numero_encontro: this.encontro.numero_encontro,
            data_encontro: this.encontro.data_encontro,
            token_expira_em: this.encontro.token_expira_em
          });
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

  // ===== GERENCIAMENTO DE BLOCOS =====

  adicionarBloco(tipo: BlocoTipo): void {
    const novoBloco: Partial<EncontroBloco> = {
      tipo,
      ordem: this.blocos.length + 1,
      configuracao: this.mentoriaService.getConfiguracaoPadrao(tipo)
    };

    if (this.isEditMode && this.encontroId) {
      // Se já existe encontro, salvar bloco no backend
      this.mentoriaService.adicionarBloco(this.encontroId, novoBloco).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.blocos.push(response.data);
            this.toastr.success('Bloco adicionado');
            this.blocoEditando = response.data.id;
          }
        },
        error: (error) => {
          console.error('Erro ao adicionar bloco:', error);
          this.toastr.error('Erro ao adicionar bloco');
        }
      });
    } else {
      // Modo criação - adicionar localmente
      const tempId = -1 * (this.blocos.length + 1);
      this.blocos.push({
        id: tempId,
        encontro_id: 0,
        tipo,
        ordem: this.blocos.length + 1,
        configuracao: this.mentoriaService.getConfiguracaoPadrao(tipo),
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString()
      });
      this.blocoEditando = tempId;
    }
  }

  removerBloco(index: number): void {
    const bloco = this.blocos[index];

    if (!confirm('Tem certeza que deseja remover este bloco?')) {
      return;
    }

    if (this.isEditMode && bloco.id > 0) {
      // Deletar do backend
      this.mentoriaService.deletarBloco(bloco.id).subscribe({
        next: (response) => {
          if (response.success) {
            this.blocos.splice(index, 1);
            this.atualizarOrdem();
            this.toastr.success('Bloco removido');
          }
        },
        error: (error) => {
          console.error('Erro ao remover bloco:', error);
          this.toastr.error('Erro ao remover bloco');
        }
      });
    } else {
      // Remover localmente
      this.blocos.splice(index, 1);
      this.atualizarOrdem();
    }
  }

  reordenarBlocos(event: CdkDragDrop<EncontroBloco[]>): void {
    moveItemInArray(this.blocos, event.previousIndex, event.currentIndex);
    this.atualizarOrdem();

    if (this.isEditMode && this.encontroId) {
      const blocosOrdem = this.blocos.map((bloco, index) => ({
        id: bloco.id,
        ordem: index + 1
      }));

      this.mentoriaService.reordenarBlocos(this.encontroId, blocosOrdem).subscribe({
        next: (response) => {
          if (response.success) {
            this.toastr.success('Ordem atualizada');
          }
        },
        error: (error) => {
          console.error('Erro ao reordenar blocos:', error);
          this.toastr.error('Erro ao reordenar blocos');
        }
      });
    }
  }

  atualizarOrdem(): void {
    this.blocos.forEach((bloco, index) => {
      bloco.ordem = index + 1;
    });
  }

  editarBloco(blocoId: number): void {
    this.blocoEditando = this.blocoEditando === blocoId ? null : blocoId;
  }

  salvarBloco(bloco: EncontroBloco): void {
    if (this.isEditMode && bloco.id > 0) {
      this.mentoriaService.atualizarBloco(bloco.id, {
        configuracao: bloco.configuracao
      }).subscribe({
        next: (response) => {
          if (response.success) {
            this.toastr.success('Bloco atualizado');
            this.blocoEditando = null;
          }
        },
        error: (error) => {
          console.error('Erro ao atualizar bloco:', error);
          this.toastr.error('Erro ao atualizar bloco');
        }
      });
    } else {
      this.blocoEditando = null;
    }
  }

  // ===== UPLOAD DE IMAGEM =====

  onFileSelected(event: any, blocoIndex: number): void {
    const file: File = event.target.files[0];
    if (!file) return;

    // Validar tamanho (10MB)
    if (file.size > 10 * 1024 * 1024) {
      this.toastr.error('Imagem muito grande. Máximo 10MB.');
      return;
    }

    // Validar tipo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      this.toastr.error('Formato não suportado. Use: JPEG, PNG, GIF ou WEBP.');
      return;
    }

    this.uploadingImage = true;

    this.mentoriaService.uploadImagem(file).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.blocos[blocoIndex].configuracao.url = response.data.url;
          this.toastr.success('Imagem enviada com sucesso!');
        }
        this.uploadingImage = false;
      },
      error: (error) => {
        console.error('Erro ao fazer upload:', error);
        this.toastr.error('Erro ao fazer upload da imagem');
        this.uploadingImage = false;
      }
    });
  }

  // ===== SALVAR ENCONTRO =====

  async salvarEncontro(): Promise<void> {
    console.log('🔍 salvarEncontro chamado');
    console.log('📝 Formulário válido?', this.encontroForm.valid);
    console.log('📝 Valores do formulário:', this.encontroForm.value);
    console.log('📝 Erros do formulário:', this.encontroForm.errors);

    if (this.encontroForm.invalid) {
      this.toastr.error('Preencha todos os campos obrigatórios');
      Object.keys(this.encontroForm.controls).forEach(key => {
        const control = this.encontroForm.get(key);
        if (control?.invalid) {
          console.log(`❌ Campo inválido: ${key}`, control.errors);
        }
        control?.markAsTouched();
      });
      return;
    }

    this.isSaving = true;

    try {
      if (this.isEditMode && this.encontroId) {
        console.log('✏️ Modo edição - Atualizando encontro');
        // Atualizar encontro existente
        const response = await this.mentoriaService.atualizarEncontro(
          this.encontroId,
          this.encontroForm.value
        ).toPromise();

        if (response?.success) {
          this.toastr.success('Encontro salvo com sucesso!');
          // Redirecionar para editor de conteúdo
          this.router.navigate(['/home/mentorias', this.encontroId, 'conteudo']);
        }
      } else {
        console.log('➕ Modo criação - Criando nova mentoria');
        // CRIAR NOVA MENTORIA (não mais encontro individual)
        const formValue = this.encontroForm.value;

        // Habilitar contract_id temporariamente para pegar o valor
        this.encontroForm.get('contract_id')?.enable();
        const contractId = this.encontroForm.get('contract_id')?.value;
        this.encontroForm.get('contract_id')?.disable();

        const dados = {
          client_id: formValue.client_id,
          contract_id: contractId,
          numero_encontros: formValue.numero_encontros,
          mentorado_nome: formValue.mentorado_nome
        };

        console.log('📤 Enviando dados:', dados);

        const response = await this.mentoriaService.criarMentoria(dados).toPromise();

        console.log('📥 Resposta recebida:', response);

        if (response?.success && response.data) {
          this.toastr.success(
            `Mentoria criada com ${response.data.numero_encontros} encontros!`,
            'Sucesso',
            { timeOut: 5000 }
          );
          // Redirecionar para listagem de mentorias
          this.router.navigate(['/home/mentorias']);
        }
      }
    } catch (error: any) {
      console.error('❌ Erro ao salvar:', error);
      const errorMessage = error?.error?.message || error?.message || 'Erro desconhecido';
      this.toastr.error(
        this.isEditMode ? `Erro ao salvar encontro: ${errorMessage}` : `Erro ao criar mentoria: ${errorMessage}`,
        'Erro',
        { timeOut: 5000 }
      );
    } finally {
      this.isSaving = false;
    }
  }

  async salvarBlocosLocais(encontroId: number): Promise<void> {
    for (const bloco of this.blocos) {
      try {
        await this.mentoriaService.adicionarBloco(encontroId, {
          tipo: bloco.tipo,
          ordem: bloco.ordem,
          configuracao: bloco.configuracao
        }).toPromise();
      } catch (error) {
        console.error('Erro ao salvar bloco:', error);
      }
    }
  }

  salvarRascunho(): void {
    this.salvarEncontro();
  }

  publicarEncontro(): void {
    if (!this.encontroId) {
      this.toastr.error('Salve o encontro antes de publicar');
      return;
    }

    if (!confirm('Deseja publicar este encontro? Ele ficará visível via link público.')) {
      return;
    }

    this.mentoriaService.publicarEncontro(this.encontroId).subscribe({
      next: (response) => {
        if (response.success) {
          this.toastr.success('Encontro publicado com sucesso!');
          this.router.navigate(['/home/mentorias']);
        }
      },
      error: (error) => {
        console.error('Erro ao publicar:', error);
        this.toastr.error('Erro ao publicar encontro');
      }
    });
  }

  // ===== HELPERS =====

  getNomeTipo(tipo: BlocoTipo): string {
    return MentoriaHelpers.getNomeTipo(tipo);
  }

  getIconeTipo(tipo: BlocoTipo): string {
    return MentoriaHelpers.getIconeTipo(tipo);
  }

  togglePreview(): void {
    this.showPreview = !this.showPreview;
  }

  voltar(): void {
    if (confirm('Tem certeza? Alterações não salvas serão perdidas.')) {
      this.router.navigate(['/home/mentorias']);
    }
  }

  irParaEditorConteudo(): void {
    if (this.encontroId) {
      this.router.navigate(['/home/mentorias', this.encontroId, 'conteudo']);
    }
  }

  // Helpers para edição de blocos específicos
  adicionarItemLista(bloco: EncontroBloco): void {
    if (!bloco.configuracao.itens) {
      bloco.configuracao.itens = [];
    }
    bloco.configuracao.itens.push({
      principal: 'Novo item',
      descricao: '',
      destaque: null
    });
  }

  removerItemLista(bloco: EncontroBloco, index: number): void {
    bloco.configuracao.itens.splice(index, 1);
  }

  adicionarPergunta(bloco: EncontroBloco): void {
    if (!bloco.configuracao.perguntas) {
      bloco.configuracao.perguntas = [];
    }
    bloco.configuracao.perguntas.push({
      id: MentoriaHelpers.gerarIdUnico('p'),
      texto: 'Nova pergunta',
      resposta: ''
    });
  }

  removerPergunta(bloco: EncontroBloco, index: number): void {
    bloco.configuracao.perguntas.splice(index, 1);
  }

  adicionarCheckbox(bloco: EncontroBloco): void {
    if (!bloco.configuracao.itens) {
      bloco.configuracao.itens = [];
    }
    bloco.configuracao.itens.push({
      id: MentoriaHelpers.gerarIdUnico('ch'),
      texto: 'Nova tarefa',
      checked: false
    });
  }

  removerCheckbox(bloco: EncontroBloco, index: number): void {
    bloco.configuracao.itens.splice(index, 1);
  }

  adicionarLinhaTabela(bloco: EncontroBloco): void {
    if (!bloco.configuracao.linhas) {
      bloco.configuracao.linhas = [];
    }
    const numColunas = bloco.configuracao.colunas?.length || 2;
    const novaLinha = Array(numColunas).fill('');
    bloco.configuracao.linhas.push(novaLinha);
  }

  removerLinhaTabela(bloco: EncontroBloco, index: number): void {
    bloco.configuracao.linhas.splice(index, 1);
  }

  adicionarColunaTabela(bloco: EncontroBloco): void {
    if (!bloco.configuracao.colunas) {
      bloco.configuracao.colunas = [];
    }
    bloco.configuracao.colunas.push('Nova Coluna');

    // Adicionar célula vazia em cada linha
    if (bloco.configuracao.linhas) {
      bloco.configuracao.linhas.forEach((linha: string[]) => {
        linha.push('');
      });
    }
  }

  removerColunaTabela(bloco: EncontroBloco, index: number): void {
    bloco.configuracao.colunas.splice(index, 1);

    // Remover célula de cada linha
    if (bloco.configuracao.linhas) {
      bloco.configuracao.linhas.forEach((linha: string[]) => {
        linha.splice(index, 1);
      });
    }
  }

  // ===== CLIENTES E CONTRATOS =====

  onClienteChange(clienteId: number): void {
    this.encontroForm.patchValue({ contract_id: '' });

    if (clienteId) {
      const clienteIdNum = Number(clienteId);

      // Filtrar apenas por client_id (is_active não vem do backend)
      this.contratosFiltrados = this.contratos.filter(
        c => Number(c.client_id) === clienteIdNum
      );

      this.encontroForm.get('contract_id')?.enable();
    } else {
      this.contratosFiltrados = [];
      this.encontroForm.get('contract_id')?.disable();
    }
  }

  getClienteNome(cliente: any): string {
    if (!cliente) return 'CLIENTE';

    // Para PJ: priorizar trade_name (nome fantasia), depois company_name (razão social)
    // Para PF: usar full_name
    let nome = '';

    if (cliente.trade_name) {
      nome = cliente.trade_name;
    } else if (cliente.company_name) {
      nome = cliente.company_name;
    } else if (cliente.full_name) {
      nome = cliente.full_name;
    } else {
      nome = 'Cliente';
    }

    return nome.toUpperCase();
  }

  // ===== BREADCRUMB =====

  setBreadcrumb(id?: string): void {
    const baseBreadcrumbs: any[] = [
      { label: 'Home', url: '/home/dashboard', icon: 'fas fa-home' },
      { label: 'Mentorias', url: '/home/mentorias', icon: 'fas fa-chalkboard-teacher' }
    ];

    if (id) {
      baseBreadcrumbs.push({
        label: `Editar Encontro #${id}`,
        icon: 'fas fa-edit'
      });
    } else {
      baseBreadcrumbs.push({
        label: 'Novo Encontro',
        icon: 'fas fa-plus'
      });
    }

    this.breadcrumbService.setBreadcrumbs(baseBreadcrumbs);
  }
}
