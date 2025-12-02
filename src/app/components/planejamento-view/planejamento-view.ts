import { Component, OnInit, OnDestroy, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';
import { PlanejamentoEstrategicoService, PlanejamentoEstrategico, Departamento, Grupo, CreateDepartamentoRequest, UpdateDepartamentoRequest, CreateGrupoRequest, UpdateGrupoRequest, DepartamentoComOkr, OkrObjetivo, OkrKeyResult, OkrTarefa } from '../../services/planejamento-estrategico.service';
import { AuthService } from '../../services/auth';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-planejamento-view',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    BreadcrumbComponent
  ],
  templateUrl: './planejamento-view.html',
  styleUrls: ['./planejamento-view.css'],
})
export class PlanejamentoViewComponent implements OnInit, OnDestroy {

  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private planejamentoService = inject(PlanejamentoEstrategicoService);
  public authService = inject(AuthService);
  private toastr = inject(ToastrService);

  planejamentoId: number | null = null;
  planejamento: PlanejamentoEstrategico | null = null;
  departamentos: Departamento[] = [];
  grupos: Grupo[] = [];

  isLoading = true;
  error = '';

  // Tabs
  activeTab: 'departamentos' | 'grupos' | 'okrs' | 'arvore-problemas' | 'okr-departamental' = 'arvore-problemas';

  // Modal de departamento
  showDepartamentoModal = false;
  isEditingDepartamento = false;
  departamentoForm = {
    id: 0,
    nome_departamento: '',
    responsavel_nome: '',
    responsavel_email: ''
  };

  // Modal de exclusão departamento
  showDeleteModal = false;
  departamentoToDelete: Departamento | null = null;

  // Menu dropdown departamento
  openMenuId: number | null = null;

  // Modal de grupo
  showGrupoModal = false;
  isEditingGrupo = false;
  grupoForm = {
    id: 0,
    nome_grupo: '',
    integrantes: ''
  };

  // Modal de exclusão grupo
  showDeleteGrupoModal = false;
  grupoToDelete: Grupo | null = null;

  // Menu dropdown grupo
  openGrupoMenuId: number | null = null;

  // Objetivos Estratégicos
  okrs: any[] = [];
  novoObjetivo: string = '';
  editingOkrId: number | null = null;
  editingOkrText: string = '';
  showDeleteOkrModal = false;
  okrToDelete: any = null;

  // Sub-objetivos
  expandedOkrs: { [okrId: number]: boolean } = {};
  novoSubObjetivo: { [okrId: number]: string } = {};
  addingSubObjetivoToId: number | null = null;
  openOkrEstrategicoMenuId: number | null = null;

  // Árvore de Problemas
  arvores: any[] = [];
  arvoresItens: { [arvoreId: number]: any[] } = {};
  editingItemId: { [arvoreId: number]: number | null } = {};
  editingItem: { [arvoreId: number]: any } = {};
  showDeleteItemModal = false;
  itemToDelete: any = null;
  showDeleteArvoreModal = false;
  arvoreToDelete: any = null;
  novaArvoreNome: string = '';
  expandedArvores: { [arvoreId: number]: boolean } = {};
  openArvoreMenuId: number | null = null;
  openItemMenuId: string | null = null; // formato: "arvoreId-itemIndex"

  // OKR - Objectives and Key Results
  okrDepartamentos: DepartamentoComOkr[] = [];
  expandedOkrDepartamentos: { [depId: number]: boolean } = {};
  expandedObjetivos: { [objId: number]: boolean } = {};
  expandedKeyResults: { [krId: number]: boolean } = {};

  // Estado de menus abertos OKR
  openOkrMenus: Map<string, number | null> = new Map([
    ['objetivo', null],
    ['kr', null],
    ['tarefa', null]
  ]);

  // Modal Objetivo
  showObjetivoModal = false;
  isEditingObjetivo = false;
  objetivoForm: {
    id: number;
    departamento_id: number;
    titulo: string;
    descricao: string;
    objetivo_estrategico_id: number | null;
  } = {
    id: 0,
    departamento_id: 0,
    titulo: '',
    descricao: '',
    objetivo_estrategico_id: null
  };
  showDeleteObjetivoModal = false;
  objetivoToDelete: OkrObjetivo | null = null;
  objetivosEstrategicosFlat: { id: number; objetivo: string; isSubObjetivo: boolean }[] = [];

  // Modal Key Result
  showKeyResultModal = false;
  isEditingKeyResult = false;
  keyResultForm = {
    id: 0,
    objetivo_id: 0,
    titulo: '',
    descricao: '',
    status: 'pendente' as 'pendente' | 'em_progresso' | 'concluido' | 'cancelado'
  };
  showDeleteKeyResultModal = false;
  keyResultToDelete: OkrKeyResult | null = null;

  // Modal Tarefa
  showTarefaModal = false;
  isEditingTarefa = false;
  tarefaForm = {
    id: 0,
    key_result_id: 0,
    titulo: '',
    descricao: '',
    data_limite: '',
    responsavel: ''
  };
  showDeleteTarefaModal = false;
  tarefaToDelete: OkrTarefa | null = null;

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.planejamentoId = +params['id'];
        this.loadPlanejamento();
      }
    });
  }

  ngOnDestroy(): void {
    // Cleanup
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.dep-actions')) {
      this.closeMenu();
    }
    if (!target.closest('.dep-actions')) {
      this.closeGrupoMenu();
    }
    if (!target.closest('.arvore-header-actions')) {
      this.closeArvoreMenu();
    }
    if (!target.closest('.arvore-item-actions')) {
      this.closeItemMenu();
    }
    if (!target.closest('.dropdown-menu-container')) {
      this.closeAllOkrMenus();
      this.closeOkrEstrategicoMenu();
    }
  }

  async loadPlanejamento(): Promise<void> {
    if (!this.planejamentoId) return;

    this.isLoading = true;
    this.error = '';

    try {
      const response = await firstValueFrom(
        this.planejamentoService.obterPlanejamento(this.planejamentoId)
      );

      if (response.success && response.data) {
        this.planejamento = response.data;
        this.departamentos = response.data.departamentos || [];

        // Carregar árvores de problemas já que é a aba padrão
        if (this.activeTab === 'arvore-problemas') {
          await this.loadArvores();
        }
      }
    } catch (err: any) {
      console.error('Erro ao carregar planejamento:', err);
      this.error = 'Não foi possível carregar o planejamento.';
      this.toastr.error('Erro ao carregar planejamento', 'Erro');
    } finally {
      this.isLoading = false;
    }
  }

  getClientName(): string {
    if (!this.planejamento?.client) return 'N/A';

    const client = this.planejamento.client;

    // Tenta pegar o nome de diferentes possíveis estruturas
    if (client.name) return client.name;
    if (client.full_name) return client.full_name;
    if (client.company_name) return client.company_name;
    if (client.trade_name) return client.trade_name;

    // Tenta estruturas aninhadas (objeto direto, não array)
    if (client.clients_pf) {
      return client.clients_pf.full_name || 'N/A';
    }
    if (client.clients_pj) {
      return client.clients_pj.trade_name || client.clients_pj.company_name || 'N/A';
    }

    return 'N/A';
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'ativo':
        return 'badge-success';
      case 'concluido':
        return 'badge-info';
      case 'cancelado':
        return 'badge-danger';
      default:
        return 'badge-secondary';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'ativo':
        return 'Ativo';
      case 'concluido':
        return 'Concluído';
      case 'cancelado':
        return 'Cancelado';
      case 'pendente':
        return 'Pendente';
      case 'em_progresso':
        return 'Em Progresso';
      default:
        return status;
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'pendente': return 'status-pendente';
      case 'em_progresso': return 'status-em-progresso';
      case 'concluido': return 'status-concluido';
      case 'cancelado': return 'status-cancelado';
      default: return '';
    }
  }

  formatDate(dateString: string | null | undefined): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  }

  formatDateTime(dateTimeString: string | null | undefined): string {
    if (!dateTimeString) return 'N/A';
    const date = new Date(dateTimeString);
    return date.toLocaleString('pt-BR');
  }

  isPrazoVencido(): boolean {
    if (!this.planejamento?.prazo_preenchimento) return false;
    return new Date(this.planejamento.prazo_preenchimento) < new Date();
  }

  isMatrizPreenchida(departamento: Departamento): boolean {
    return !!departamento.matriz?.preenchido_em;
  }

  getMatrizPreenchimentoPercentage(): number {
    if (this.departamentos.length === 0) return 0;
    const preenchidos = this.getMatrizesPreenchidas();
    return Math.round((preenchidos / this.departamentos.length) * 100);
  }

  getMatrizesPreenchidas(): number {
    return this.departamentos.filter(d => this.isMatrizPreenchida(d)).length;
  }

  // Ações do planejamento
  editarPlanejamento(): void {
    if (this.planejamentoId) {
      this.router.navigate(['/home/planejamento-estrategico/editar', this.planejamentoId]);
    }
  }

  visualizarPlanejamento(): void {
    if (this.planejamento) {
      const url = this.planejamentoService.gerarUrlPublica(this.planejamento.unique_token);
      window.open(url, '_blank');
    }
  }

  async loadGrupos(): Promise<void> {
    if (!this.planejamentoId) return;

    try {
      const response = await firstValueFrom(
        this.planejamentoService.listarGrupos(this.planejamentoId)
      );

      if (response.success) {
        this.grupos = response.data;
      }
    } catch (err: any) {
      console.error('Erro ao carregar grupos:', err);
      this.toastr.error('Erro ao carregar grupos', 'Erro');
    }
  }

  copiarLinkPublico(): void {
    if (!this.planejamento) return;

    const url = this.planejamentoService.gerarUrlPublica(this.planejamento.unique_token);

    navigator.clipboard.writeText(url).then(() => {
      this.toastr.success('Link da Matriz Consciente copiado', 'Sucesso');
    }).catch(err => {
      console.error('Erro ao copiar link:', err);
      this.toastr.error('Erro ao copiar link', 'Erro');
    });
  }

  copiarLinkArvores(): void {
    if (!this.planejamento) return;

    const url = this.planejamentoService.gerarUrlPublicaArvores(this.planejamento.unique_token);

    navigator.clipboard.writeText(url).then(() => {
      this.toastr.success('Link das Árvores de Problemas copiado', 'Sucesso');
    }).catch(err => {
      console.error('Erro ao copiar link:', err);
      this.toastr.error('Erro ao copiar link', 'Erro');
    });
  }

  visualizarArvoresPublico(): void {
    if (!this.planejamento) return;

    const url = this.planejamentoService.gerarUrlPublicaArvores(this.planejamento.unique_token);
    window.open(url, '_blank');
  }

  copiarLinkDepartamento(departamento: Departamento): void {
    if (!departamento.unique_token) {
      this.toastr.error('Este departamento não possui um token único', 'Erro');
      return;
    }

    const url = this.planejamentoService.gerarUrlPublicaDepartamento(departamento.unique_token);

    navigator.clipboard.writeText(url).then(() => {
      this.toastr.success(`Link do departamento "${departamento.nome_departamento}" copiado`, 'Sucesso');
    }).catch(err => {
      console.error('Erro ao copiar link:', err);
      this.toastr.error('Erro ao copiar link', 'Erro');
    });
  }

  copiarLinkOkrDepartamento(departamento: DepartamentoComOkr): void {
    if (!departamento.unique_token) {
      this.toastr.error('Este departamento não possui um token único', 'Erro');
      return;
    }

    const url = this.planejamentoService.gerarUrlPublicaOkr(departamento.unique_token);

    navigator.clipboard.writeText(url).then(() => {
      this.toastr.success(`Link OKR do departamento "${departamento.nome_departamento}" copiado`, 'Sucesso');
    }).catch(err => {
      console.error('Erro ao copiar link:', err);
      this.toastr.error('Erro ao copiar link', 'Erro');
    });
  }

  visualizarDepartamento(departamento: Departamento): void {
    if (!departamento.unique_token) {
      this.toastr.error('Este departamento não possui um token único', 'Erro');
      return;
    }

    const url = this.planejamentoService.gerarUrlPublicaDepartamento(departamento.unique_token);
    window.open(url, '_blank');
  }

  voltarParaLista(): void {
    this.router.navigate(['/home/planejamento-estrategico']);
  }

  visualizarConsolidado(): void {
    if (this.planejamentoId) {
      this.router.navigate(['/home/planejamento-estrategico/swot-consolidado', this.planejamentoId]);
    }
  }

  visualizarCruzamento(): void {
    if (this.planejamentoId) {
      this.router.navigate(['/home/planejamento-estrategico/swot-cruzamento', this.planejamentoId]);
    }
  }

  visualizarSwotConsolidadoPublico(): void {
    if (!this.planejamento) return;

    const url = this.planejamentoService.gerarUrlPublicaSwotConsolidado(this.planejamento.unique_token);
    window.open(url, '_blank');
  }

  copiarLinkSwotConsolidado(): void {
    if (!this.planejamento) return;

    const url = this.planejamentoService.gerarUrlPublicaSwotConsolidado(this.planejamento.unique_token);

    navigator.clipboard.writeText(url).then(() => {
      this.toastr.success('Link da Matriz SWOT Consolidada copiado', 'Sucesso');
    }).catch(err => {
      console.error('Erro ao copiar link:', err);
      this.toastr.error('Erro ao copiar link', 'Erro');
    });
  }

  visualizarClassificacaoRiscos(): void {
    if (!this.planejamento) return;

    const url = this.planejamentoService.gerarUrlPublicaClassificacaoRiscos(this.planejamento.unique_token);
    window.open(url, '_blank');
  }

  copiarLinkClassificacaoRiscos(): void {
    if (!this.planejamento) return;

    const url = this.planejamentoService.gerarUrlPublicaClassificacaoRiscos(this.planejamento.unique_token);

    navigator.clipboard.writeText(url).then(() => {
      this.toastr.success('Link de Classificação de Riscos copiado', 'Sucesso');
    }).catch(err => {
      console.error('Erro ao copiar link:', err);
      this.toastr.error('Erro ao copiar link', 'Erro');
    });
  }

  // Menu dropdown actions
  toggleMenu(depId: number): void {
    this.openMenuId = this.openMenuId === depId ? null : depId;
  }

  closeMenu(): void {
    this.openMenuId = null;
  }

  // Gestão de departamentos
  openNovoDepartamentoModal(): void {
    this.isEditingDepartamento = false;
    this.departamentoForm = {
      id: 0,
      nome_departamento: '',
      responsavel_nome: '',
      responsavel_email: ''
    };
    this.showDepartamentoModal = true;
  }

  openEditarDepartamentoModal(departamento: Departamento): void {
    this.isEditingDepartamento = true;
    this.departamentoForm = {
      id: departamento.id,
      nome_departamento: departamento.nome_departamento,
      responsavel_nome: departamento.responsavel_nome || '',
      responsavel_email: departamento.responsavel_email || ''
    };
    this.showDepartamentoModal = true;
  }

  closeDepartamentoModal(): void {
    this.showDepartamentoModal = false;
    this.departamentoForm = {
      id: 0,
      nome_departamento: '',
      responsavel_nome: '',
      responsavel_email: ''
    };
  }

  async saveDepartamento(): Promise<void> {
    if (!this.departamentoForm.nome_departamento.trim()) {
      this.toastr.warning('Por favor, informe o nome do departamento', 'Atenção');
      return;
    }

    if (!this.planejamentoId) return;

    try {
      if (this.isEditingDepartamento && this.departamentoForm.id) {
        // Atualizar departamento
        const updateData: UpdateDepartamentoRequest = {
          nome_departamento: this.departamentoForm.nome_departamento,
          responsavel_nome: this.departamentoForm.responsavel_nome || undefined,
          responsavel_email: this.departamentoForm.responsavel_email || undefined
        };

        const response = await firstValueFrom(
          this.planejamentoService.atualizarDepartamento(this.departamentoForm.id, updateData)
        );

        if (response.success) {
          this.toastr.success('Departamento atualizado com sucesso', 'Sucesso');
        }
      } else {
        // Criar novo departamento
        const createData: CreateDepartamentoRequest = {
          nome_departamento: this.departamentoForm.nome_departamento,
          responsavel_nome: this.departamentoForm.responsavel_nome || undefined,
          responsavel_email: this.departamentoForm.responsavel_email || undefined
        };

        const response = await firstValueFrom(
          this.planejamentoService.adicionarDepartamento(this.planejamentoId, createData)
        );

        if (response.success) {
          this.toastr.success('Departamento adicionado com sucesso', 'Sucesso');
        }
      }

      this.closeDepartamentoModal();
      this.loadPlanejamento();
    } catch (err: any) {
      console.error('Erro ao salvar departamento:', err);
      this.toastr.error(err.error?.message || 'Erro ao salvar departamento', 'Erro');
    }
  }

  openDeleteModal(departamento: Departamento): void {
    this.departamentoToDelete = departamento;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.departamentoToDelete = null;
  }

  async confirmDeleteDepartamento(): Promise<void> {
    if (!this.departamentoToDelete) return;

    try {
      const response = await firstValueFrom(
        this.planejamentoService.deletarDepartamento(this.departamentoToDelete.id)
      );

      if (response.success) {
        this.toastr.success('Departamento excluído com sucesso', 'Sucesso');
        this.closeDeleteModal();
        this.loadPlanejamento();
      }
    } catch (err: any) {
      console.error('Erro ao deletar departamento:', err);
      this.toastr.error('Erro ao deletar departamento', 'Erro');
    }
  }

  // ===== GESTÃO DE GRUPOS (MATRIZ SWOT) =====

  toggleGrupoMenu(grupoId: number): void {
    this.openGrupoMenuId = this.openGrupoMenuId === grupoId ? null : grupoId;
  }

  closeGrupoMenu(): void {
    this.openGrupoMenuId = null;
  }

  openNovoGrupoModal(): void {
    this.isEditingGrupo = false;
    this.grupoForm = {
      id: 0,
      nome_grupo: '',
      integrantes: ''
    };
    this.showGrupoModal = true;
  }

  openEditarGrupoModal(grupo: Grupo): void {
    this.isEditingGrupo = true;
    this.grupoForm = {
      id: grupo.id,
      nome_grupo: grupo.nome_grupo,
      integrantes: grupo.integrantes || ''
    };
    this.showGrupoModal = true;
  }

  closeGrupoModal(): void {
    this.showGrupoModal = false;
    this.grupoForm = {
      id: 0,
      nome_grupo: '',
      integrantes: ''
    };
  }

  async saveGrupo(): Promise<void> {
    if (!this.grupoForm.nome_grupo.trim()) {
      this.toastr.warning('Por favor, informe o nome do grupo', 'Atenção');
      return;
    }

    if (!this.planejamentoId) return;

    try {
      if (this.isEditingGrupo && this.grupoForm.id) {
        // Atualizar grupo
        const updateData: UpdateGrupoRequest = {
          nome_grupo: this.grupoForm.nome_grupo,
          integrantes: this.grupoForm.integrantes || undefined
        };

        const response = await firstValueFrom(
          this.planejamentoService.atualizarGrupo(this.grupoForm.id, updateData)
        );

        if (response.success) {
          this.toastr.success('Grupo atualizado com sucesso', 'Sucesso');
        }
      } else {
        // Criar novo grupo
        const createData: CreateGrupoRequest = {
          nome_grupo: this.grupoForm.nome_grupo,
          integrantes: this.grupoForm.integrantes || undefined
        };

        const response = await firstValueFrom(
          this.planejamentoService.adicionarGrupo(this.planejamentoId, createData)
        );

        if (response.success) {
          this.toastr.success('Grupo adicionado com sucesso', 'Sucesso');
        }
      }

      this.closeGrupoModal();
      this.loadGrupos();
    } catch (err: any) {
      console.error('Erro ao salvar grupo:', err);
      this.toastr.error(err.error?.message || 'Erro ao salvar grupo', 'Erro');
    }
  }

  openDeleteGrupoModal(grupo: Grupo): void {
    this.grupoToDelete = grupo;
    this.showDeleteGrupoModal = true;
  }

  closeDeleteGrupoModal(): void {
    this.showDeleteGrupoModal = false;
    this.grupoToDelete = null;
  }

  async confirmDeleteGrupo(): Promise<void> {
    if (!this.grupoToDelete) return;

    try {
      const response = await firstValueFrom(
        this.planejamentoService.deletarGrupo(this.grupoToDelete.id)
      );

      if (response.success) {
        this.toastr.success('Grupo excluído com sucesso', 'Sucesso');
        this.closeDeleteGrupoModal();
        this.loadGrupos();
      }
    } catch (err: any) {
      console.error('Erro ao deletar grupo:', err);
      this.toastr.error('Erro ao deletar grupo', 'Erro');
    }
  }

  isMatrizSwotPreenchida(grupo: Grupo): boolean {
    return !!grupo.matriz_swot?.preenchido_em;
  }

  visualizarGrupo(grupo: Grupo): void {
    const url = this.planejamentoService.gerarUrlPublicaSwot(grupo.unique_token);
    window.open(url, '_blank');
  }

  copiarLinkGrupo(grupo: Grupo): void {
    const url = this.planejamentoService.gerarUrlPublicaSwot(grupo.unique_token);

    navigator.clipboard.writeText(url).then(() => {
      this.toastr.success('Link do grupo copiado', 'Sucesso');
    }).catch(err => {
      console.error('Erro ao copiar link:', err);
      this.toastr.error('Erro ao copiar link', 'Erro');
    });
  }

  // ===== GESTÃO DE OBJETIVOS ESTRATÉGICOS =====

  async loadOkrs(): Promise<void> {
    if (!this.planejamentoId) return;

    try {
      const response = await firstValueFrom(
        this.planejamentoService.listarOkrs(this.planejamentoId)
      );

      if (response.success) {
        this.okrs = response.data;
      }
    } catch (err: any) {
      console.error('Erro ao carregar objetivos estratégicos:', err);
      this.toastr.error('Erro ao carregar objetivos estratégicos', 'Erro');
    }
  }

  async adicionarNovoOkr(): Promise<void> {
    if (!this.novoObjetivo.trim()) {
      this.toastr.warning('Por favor, informe o objetivo estratégico', 'Atenção');
      return;
    }

    if (!this.planejamentoId) return;

    try {
      const response = await firstValueFrom(
        this.planejamentoService.adicionarOkr(this.planejamentoId, {
          objetivo: this.novoObjetivo.trim()
        })
      );

      if (response.success) {
        this.toastr.success('Objetivo estratégico adicionado com sucesso', 'Sucesso');
        this.novoObjetivo = '';
        this.loadOkrs();
      }
    } catch (err: any) {
      console.error('Erro ao adicionar objetivo estratégico:', err);
      this.toastr.error(err.error?.message || 'Erro ao adicionar objetivo estratégico', 'Erro');
    }
  }

  iniciarEdicaoOkr(okr: any): void {
    this.editingOkrId = okr.id;
    this.editingOkrText = okr.objetivo;
  }

  cancelarEdicaoOkr(): void {
    this.editingOkrId = null;
    this.editingOkrText = '';
  }

  async salvarEdicaoOkr(okrId: number): Promise<void> {
    if (!this.editingOkrText.trim()) {
      this.toastr.warning('Por favor, informe o objetivo estratégico', 'Atenção');
      return;
    }

    try {
      const response = await firstValueFrom(
        this.planejamentoService.atualizarOkr(okrId, {
          objetivo: this.editingOkrText.trim()
        })
      );

      if (response.success) {
        this.toastr.success('Objetivo estratégico atualizado com sucesso', 'Sucesso');
        this.editingOkrId = null;
        this.editingOkrText = '';
        this.loadOkrs();
      }
    } catch (err: any) {
      console.error('Erro ao atualizar objetivo estratégico:', err);
      this.toastr.error(err.error?.message || 'Erro ao atualizar objetivo estratégico', 'Erro');
    }
  }

  openDeleteOkrModal(okr: any): void {
    this.okrToDelete = okr;
    this.showDeleteOkrModal = true;
  }

  closeDeleteOkrModal(): void {
    this.showDeleteOkrModal = false;
    this.okrToDelete = null;
  }

  async confirmDeleteOkr(): Promise<void> {
    if (!this.okrToDelete) return;

    try {
      const response = await firstValueFrom(
        this.planejamentoService.deletarOkr(this.okrToDelete.id)
      );

      if (response.success) {
        this.toastr.success('Objetivo estratégico excluído com sucesso', 'Sucesso');
        this.closeDeleteOkrModal();
        this.loadOkrs();
      }
    } catch (err: any) {
      console.error('Erro ao deletar objetivo estratégico:', err);
      this.toastr.error('Erro ao deletar objetivo estratégico', 'Erro');
    }
  }

  // ===== SUB-OBJETIVOS =====

  toggleOkrEstrategicoMenu(okrId: number): void {
    this.openOkrEstrategicoMenuId = this.openOkrEstrategicoMenuId === okrId ? null : okrId;
  }

  closeOkrEstrategicoMenu(): void {
    this.openOkrEstrategicoMenuId = null;
  }

  toggleOkr(okrId: number): void {
    this.expandedOkrs[okrId] = !this.expandedOkrs[okrId];
  }

  isOkrExpanded(okrId: number): boolean {
    return this.expandedOkrs[okrId] || false;
  }

  hasSubObjetivos(okr: any): boolean {
    return okr.sub_objetivos && okr.sub_objetivos.length > 0;
  }

  startAddSubObjetivo(okrId: number): void {
    this.addingSubObjetivoToId = okrId;
    this.novoSubObjetivo[okrId] = '';
    // Expandir o objetivo para mostrar o input
    this.expandedOkrs[okrId] = true;
  }

  cancelAddSubObjetivo(): void {
    if (this.addingSubObjetivoToId) {
      this.novoSubObjetivo[this.addingSubObjetivoToId] = '';
    }
    this.addingSubObjetivoToId = null;
  }

  async adicionarSubObjetivo(parentId: number): Promise<void> {
    const texto = this.novoSubObjetivo[parentId]?.trim();
    if (!texto) {
      this.toastr.warning('Por favor, informe o sub-objetivo', 'Atenção');
      return;
    }

    if (!this.planejamentoId) return;

    try {
      const response = await firstValueFrom(
        this.planejamentoService.adicionarOkr(this.planejamentoId, {
          objetivo: texto,
          parent_id: parentId
        })
      );

      if (response.success) {
        this.toastr.success('Sub-objetivo adicionado com sucesso', 'Sucesso');
        this.novoSubObjetivo[parentId] = '';
        this.addingSubObjetivoToId = null;
        this.loadOkrs();
      }
    } catch (err: any) {
      console.error('Erro ao adicionar sub-objetivo:', err);
      this.toastr.error(err.error?.message || 'Erro ao adicionar sub-objetivo', 'Erro');
    }
  }

  // ===== GESTÃO DE ÁRVORE DE PROBLEMAS =====

  async loadArvores(): Promise<void> {
    if (!this.planejamentoId) return;

    try {
      const response = await firstValueFrom(
        this.planejamentoService.listarArvores(this.planejamentoId)
      );

      if (response.success) {
        this.arvores = response.data;
        // Carregar itens de cada árvore
        for (const arvore of this.arvores) {
          await this.loadItensArvore(arvore.id);
          this.expandedArvores[arvore.id] = false; // Retraídas por padrão
        }
      }
    } catch (err: any) {
      console.error('Erro ao carregar árvores:', err);
      this.toastr.error('Erro ao carregar árvores', 'Erro');
    }
  }

  async loadItensArvore(arvoreId: number): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.planejamentoService.listarItensArvore(arvoreId)
      );

      if (response.success) {
        this.arvoresItens[arvoreId] = response.data;
      }
    } catch (err: any) {
      console.error('Erro ao carregar itens da árvore:', err);
    }
  }

  async criarNovaArvore(): Promise<void> {
    if (!this.novaArvoreNome.trim()) {
      this.toastr.warning('Por favor, informe o nome da árvore', 'Atenção');
      return;
    }

    if (!this.planejamentoId) return;

    try {
      const response = await firstValueFrom(
        this.planejamentoService.criarArvore(this.planejamentoId, {
          nome_arvore: this.novaArvoreNome.trim()
        })
      );

      if (response.success) {
        this.toastr.success('Árvore criada com sucesso', 'Sucesso');
        this.novaArvoreNome = '';
        this.loadArvores();
      }
    } catch (err: any) {
      console.error('Erro ao criar árvore:', err);
      this.toastr.error(err.error?.message || 'Erro ao criar árvore', 'Erro');
    }
  }

  async criarArvoresPadrao(): Promise<void> {
    if (!this.planejamentoId) return;

    try {
      const response = await firstValueFrom(
        this.planejamentoService.criarArvoresPadrao(this.planejamentoId)
      );

      if (response.success) {
        this.toastr.success(response.message || 'Árvores padrão criadas com sucesso', 'Sucesso');
        this.loadArvores();
      }
    } catch (err: any) {
      console.error('Erro ao criar árvores padrão:', err);
      this.toastr.error(err.error?.message || 'Erro ao criar árvores padrão', 'Erro');
    }
  }

  openDeleteArvoreModal(arvore: any): void {
    this.arvoreToDelete = arvore;
    this.showDeleteArvoreModal = true;
  }

  closeDeleteArvoreModal(): void {
    this.showDeleteArvoreModal = false;
    this.arvoreToDelete = null;
  }

  async confirmDeleteArvore(): Promise<void> {
    if (!this.arvoreToDelete) return;

    try {
      const response = await firstValueFrom(
        this.planejamentoService.deletarArvore(this.arvoreToDelete.id)
      );

      if (response.success) {
        this.toastr.success('Árvore excluída com sucesso', 'Sucesso');
        this.closeDeleteArvoreModal();
        this.loadArvores();
      }
    } catch (err: any) {
      console.error('Erro ao deletar árvore:', err);
      this.toastr.error('Erro ao deletar árvore', 'Erro');
    }
  }

  toggleArvore(arvoreId: number): void {
    this.expandedArvores[arvoreId] = !this.expandedArvores[arvoreId];
  }

  isArvoreExpanded(arvoreId: number): boolean {
    return this.expandedArvores[arvoreId] || false;
  }

  toggleArvoreMenu(arvoreId: number): void {
    this.openArvoreMenuId = this.openArvoreMenuId === arvoreId ? null : arvoreId;
  }

  closeArvoreMenu(): void {
    this.openArvoreMenuId = null;
  }

  toggleItemMenu(arvoreId: number, itemIndex: number): void {
    const menuId = `${arvoreId}-${itemIndex}`;
    this.openItemMenuId = this.openItemMenuId === menuId ? null : menuId;
  }

  closeItemMenu(): void {
    this.openItemMenuId = null;
  }

  isItemMenuOpen(arvoreId: number, itemIndex: number): boolean {
    return this.openItemMenuId === `${arvoreId}-${itemIndex}`;
  }

  adicionarNovaLinha(arvoreId: number): void {
    const novaLinha = {
      id: null,
      topico: '',
      pergunta_norteadora: '',
      gravidade: null,
      urgencia: null,
      tendencia: null,
      nota: null,
      isNew: true
    };

    if (!this.arvoresItens[arvoreId]) {
      this.arvoresItens[arvoreId] = [];
    }

    this.arvoresItens[arvoreId].push(novaLinha);
    const index = this.arvoresItens[arvoreId].length - 1;
    this.editingItemId[arvoreId] = index;
    this.editingItem[arvoreId] = { ...novaLinha };
  }

  iniciarEdicaoItem(arvoreId: number, item: any, index: number): void {
    this.editingItemId[arvoreId] = index;
    this.editingItem[arvoreId] = { ...item };
  }

  cancelarEdicaoItem(arvoreId: number): void {
    const itens = this.arvoresItens[arvoreId] || [];
    const editingIndex = this.editingItemId[arvoreId];

    // Se for item novo, remove da lista
    if (editingIndex !== null && itens[editingIndex]?.isNew) {
      this.arvoresItens[arvoreId].splice(editingIndex, 1);
    }

    this.editingItemId[arvoreId] = null;
    this.editingItem[arvoreId] = null;
  }

  // Converter vírgula para ponto e validar número
  converterNumero(valor: any): number | null {
    if (!valor) return null;

    // Converter para string e trocar vírgula por ponto
    const valorStr = String(valor).replace(',', '.');
    const num = parseFloat(valorStr);

    if (isNaN(num)) return null;

    // Arredondar para 1 casa decimal
    return Math.round(num * 10) / 10;
  }

  async salvarItem(arvoreId: number, index: number): Promise<void> {
    const item = this.editingItem[arvoreId];

    if (!item.topico || !item.topico.trim()) {
      this.toastr.warning('O tópico é obrigatório', 'Atenção');
      return;
    }

    // Converter vírgula para ponto nos números
    const gravidade = this.converterNumero(item.gravidade);
    const urgencia = this.converterNumero(item.urgencia);
    const tendencia = this.converterNumero(item.tendencia);

    // Validar range
    if (gravidade !== null && (gravidade < 1 || gravidade > 5)) {
      this.toastr.warning('Gravidade deve estar entre 1 e 5', 'Atenção');
      return;
    }
    if (urgencia !== null && (urgencia < 1 || urgencia > 5)) {
      this.toastr.warning('Urgência deve estar entre 1 e 5', 'Atenção');
      return;
    }
    if (tendencia !== null && (tendencia < 1 || tendencia > 5)) {
      this.toastr.warning('Tendência deve estar entre 1 e 5', 'Atenção');
      return;
    }

    try {
      if (item.isNew) {
        // Criar novo item
        const response = await firstValueFrom(
          this.planejamentoService.adicionarItemArvore(arvoreId, {
            topico: item.topico.trim(),
            pergunta_norteadora: item.pergunta_norteadora?.trim() || null,
            gravidade,
            urgencia,
            tendencia
          })
        );

        if (response.success) {
          this.toastr.success('Item adicionado com sucesso', 'Sucesso');
          await this.loadItensArvore(arvoreId);
        }
      } else {
        // Atualizar item existente
        const response = await firstValueFrom(
          this.planejamentoService.atualizarItemArvore(item.id, {
            topico: item.topico.trim(),
            pergunta_norteadora: item.pergunta_norteadora?.trim() || null,
            gravidade,
            urgencia,
            tendencia
          })
        );

        if (response.success) {
          this.toastr.success('Item atualizado com sucesso', 'Sucesso');
          await this.loadItensArvore(arvoreId);
        }
      }

      this.editingItemId[arvoreId] = null;
      this.editingItem[arvoreId] = null;
    } catch (err: any) {
      console.error('Erro ao salvar item:', err);
      this.toastr.error(err.error?.message || 'Erro ao salvar item', 'Erro');
    }
  }

  getItensArvore(arvoreId: number): any[] {
    return this.arvoresItens[arvoreId] || [];
  }

  isItemEditing(arvoreId: number, index: number): boolean {
    return this.editingItemId[arvoreId] === index;
  }

  getEditingItem(arvoreId: number): any {
    return this.editingItem[arvoreId];
  }

  // Formatar número com vírgula
  formatarNumero(valor: any): string {
    if (valor === null || valor === undefined) return '-';
    return String(valor).replace('.', ',');
  }

  // Exportar árvores para PDF
  exportarArvoresPDF(): void {
    if (!this.planejamentoId) return;

    const url = this.planejamentoService.gerarUrlPdfArvores(this.planejamentoId);
    window.open(url, '_blank');
    this.toastr.info('PDF sendo gerado...', 'Download');
  }

  // Exportar OKRs para PDF
  exportarOkrsPDF(): void {
    if (!this.planejamentoId) return;

    const url = this.planejamentoService.gerarUrlPdfOkrs(this.planejamentoId);
    window.open(url, '_blank');
    this.toastr.info('PDF sendo gerado...', 'Download');
  }

  // Exportar OKRs por Departamento para PDF
  exportarOkrDepartamentosPDF(): void {
    if (!this.planejamentoId) return;

    const url = this.planejamentoService.gerarUrlPdfOkrDepartamentos(this.planejamentoId);
    window.open(url, '_blank');
    this.toastr.info('PDF sendo gerado...', 'Download');
  }

  // Obter pilares de dor (itens com nota > 20)
  getPilaresDeDor(): any[] {
    const pilares: any[] = [];

    for (const arvore of this.arvores) {
      const itens = this.arvoresItens[arvore.id] || [];
      for (const item of itens) {
        if (item.nota && item.nota > 20) {
          pilares.push({
            ...item,
            arvore_nome: arvore.nome_arvore
          });
        }
      }
    }

    // Ordenar por nota decrescente
    return pilares.sort((a, b) => (b.nota || 0) - (a.nota || 0));
  }

  openDeleteItemModal(item: any, arvoreId: number): void {
    this.itemToDelete = { ...item, arvoreId };
    this.showDeleteItemModal = true;
  }

  closeDeleteItemModal(): void {
    this.showDeleteItemModal = false;
    this.itemToDelete = null;
  }

  async confirmDeleteItem(): Promise<void> {
    if (!this.itemToDelete) return;

    const arvoreId = this.itemToDelete.arvoreId;

    try {
      const response = await firstValueFrom(
        this.planejamentoService.deletarItemArvore(this.itemToDelete.id)
      );

      if (response.success) {
        this.toastr.success('Item excluído com sucesso', 'Sucesso');
        this.closeDeleteItemModal();
        await this.loadItensArvore(arvoreId);
      }
    } catch (err: any) {
      console.error('Erro ao deletar item:', err);
      this.toastr.error('Erro ao deletar item', 'Erro');
    }
  }

  // ===== OKR - OBJECTIVES AND KEY RESULTS =====

  async loadOkrCompleto(): Promise<void> {
    if (!this.planejamentoId) return;

    try {
      const response = await firstValueFrom(
        this.planejamentoService.obterOkrCompleto(this.planejamentoId)
      );

      if (response.success) {
        this.okrDepartamentos = response.data;
        // Expandir primeiro departamento se houver
        if (this.okrDepartamentos.length > 0) {
          this.expandedOkrDepartamentos[this.okrDepartamentos[0].id] = true;
        }
      }
    } catch (err: any) {
      console.error('Erro ao carregar OKRs:', err);
      this.toastr.error('Erro ao carregar OKRs', 'Erro');
    }
  }

  toggleOkrDepartamento(depId: number): void {
    this.expandedOkrDepartamentos[depId] = !this.expandedOkrDepartamentos[depId];
  }

  isOkrDepartamentoExpanded(depId: number): boolean {
    return this.expandedOkrDepartamentos[depId] || false;
  }

  toggleObjetivo(objetivo: OkrObjetivo): void {
    const isExpanding = !this.expandedObjetivos[objetivo.id];
    this.expandedObjetivos[objetivo.id] = isExpanding;

    // Ao expandir, também expande todos os KRs filhos
    if (isExpanding && objetivo.key_results) {
      objetivo.key_results.forEach(kr => {
        this.expandedKeyResults[kr.id] = true;
      });
    }
  }

  isObjetivoExpanded(objId: number): boolean {
    return this.expandedObjetivos[objId] || false;
  }

  toggleKeyResult(krId: number): void {
    this.expandedKeyResults[krId] = !this.expandedKeyResults[krId];
  }

  isKeyResultExpanded(krId: number): boolean {
    return this.expandedKeyResults[krId] || false;
  }

  // --- OKR Menu Operations ---
  toggleOkrMenu(type: string, id: number): void {
    const currentOpen = this.openOkrMenus.get(type);
    this.closeAllOkrMenus();
    if (currentOpen !== id) {
      this.openOkrMenus.set(type, id);
    }
  }

  isOkrMenuOpen(type: string, id: number): boolean {
    return this.openOkrMenus.get(type) === id;
  }

  closeAllOkrMenus(): void {
    this.openOkrMenus.set('objetivo', null);
    this.openOkrMenus.set('kr', null);
    this.openOkrMenus.set('tarefa', null);
  }

  // --- OBJETIVOS ---

  async openNovoObjetivoModal(departamentoId: number): Promise<void> {
    this.isEditingObjetivo = false;
    this.objetivoForm = {
      id: 0,
      departamento_id: departamentoId,
      titulo: '',
      descricao: '',
      objetivo_estrategico_id: null
    };
    await this.loadObjetivosEstrategicosParaSelect();
    this.showObjetivoModal = true;
  }

  async openEditarObjetivoModal(objetivo: OkrObjetivo): Promise<void> {
    this.isEditingObjetivo = true;
    this.objetivoForm = {
      id: objetivo.id,
      departamento_id: objetivo.departamento_id,
      titulo: objetivo.titulo,
      descricao: objetivo.descricao || '',
      objetivo_estrategico_id: objetivo.objetivo_estrategico_id || null
    };
    await this.loadObjetivosEstrategicosParaSelect();
    this.showObjetivoModal = true;
  }

  closeObjetivoModal(): void {
    this.showObjetivoModal = false;
    this.objetivoForm = {
      id: 0,
      departamento_id: 0,
      titulo: '',
      descricao: '',
      objetivo_estrategico_id: null
    };
  }

  async loadObjetivosEstrategicosParaSelect(): Promise<void> {
    if (!this.planejamentoId) return;

    try {
      const response = await firstValueFrom(
        this.planejamentoService.listarOkrs(this.planejamentoId)
      );

      if (response.success) {
        this.objetivosEstrategicosFlat = [];
        for (const okr of response.data) {
          this.objetivosEstrategicosFlat.push({
            id: okr.id,
            objetivo: okr.objetivo,
            isSubObjetivo: false
          });
          if (okr.sub_objetivos && okr.sub_objetivos.length > 0) {
            for (const sub of okr.sub_objetivos) {
              this.objetivosEstrategicosFlat.push({
                id: sub.id,
                objetivo: sub.objetivo,
                isSubObjetivo: true
              });
            }
          }
        }
      }
    } catch (err: any) {
      console.error('Erro ao carregar objetivos estratégicos para select:', err);
    }
  }

  async saveObjetivo(): Promise<void> {
    if (!this.objetivoForm.titulo.trim()) {
      this.toastr.warning('Por favor, informe o título do objetivo', 'Atenção');
      return;
    }

    try {
      if (this.isEditingObjetivo && this.objetivoForm.id) {
        const response = await firstValueFrom(
          this.planejamentoService.atualizarOkrObjetivo(this.objetivoForm.id, {
            titulo: this.objetivoForm.titulo,
            descricao: this.objetivoForm.descricao || undefined,
            objetivo_estrategico_id: this.objetivoForm.objetivo_estrategico_id
          })
        );

        if (response.success) {
          this.toastr.success('Objetivo atualizado com sucesso', 'Sucesso');
        }
      } else {
        const response = await firstValueFrom(
          this.planejamentoService.criarOkrObjetivo(this.objetivoForm.departamento_id, {
            titulo: this.objetivoForm.titulo,
            descricao: this.objetivoForm.descricao || undefined,
            objetivo_estrategico_id: this.objetivoForm.objetivo_estrategico_id
          })
        );

        if (response.success) {
          this.toastr.success('Objetivo criado com sucesso', 'Sucesso');
        }
      }

      this.closeObjetivoModal();
      await this.loadOkrCompleto();
    } catch (err: any) {
      console.error('Erro ao salvar objetivo:', err);
      this.toastr.error(err.error?.message || 'Erro ao salvar objetivo', 'Erro');
    }
  }

  openDeleteObjetivoModal(objetivo: OkrObjetivo): void {
    this.objetivoToDelete = objetivo;
    this.showDeleteObjetivoModal = true;
  }

  closeDeleteObjetivoModal(): void {
    this.showDeleteObjetivoModal = false;
    this.objetivoToDelete = null;
  }

  async confirmDeleteObjetivo(): Promise<void> {
    if (!this.objetivoToDelete) return;

    try {
      const response = await firstValueFrom(
        this.planejamentoService.deletarOkrObjetivo(this.objetivoToDelete.id)
      );

      if (response.success) {
        this.toastr.success('Objetivo excluído com sucesso', 'Sucesso');
        this.closeDeleteObjetivoModal();
        await this.loadOkrCompleto();
      }
    } catch (err: any) {
      console.error('Erro ao deletar objetivo:', err);
      this.toastr.error('Erro ao deletar objetivo', 'Erro');
    }
  }

  // --- KEY RESULTS ---

  openNovoKeyResultModal(objetivoId: number): void {
    this.isEditingKeyResult = false;
    this.keyResultForm = {
      id: 0,
      objetivo_id: objetivoId,
      titulo: '',
      descricao: '',
      status: 'pendente'
    };
    this.showKeyResultModal = true;
  }

  openEditarKeyResultModal(kr: OkrKeyResult): void {
    this.isEditingKeyResult = true;
    this.keyResultForm = {
      id: kr.id,
      objetivo_id: kr.objetivo_id,
      titulo: kr.titulo,
      descricao: kr.descricao || '',
      status: kr.status
    };
    this.showKeyResultModal = true;
  }

  closeKeyResultModal(): void {
    this.showKeyResultModal = false;
    this.keyResultForm = {
      id: 0,
      objetivo_id: 0,
      titulo: '',
      descricao: '',
      status: 'pendente'
    };
  }

  async saveKeyResult(): Promise<void> {
    if (!this.keyResultForm.titulo.trim()) {
      this.toastr.warning('Por favor, informe o título do Key Result', 'Atenção');
      return;
    }

    try {
      if (this.isEditingKeyResult && this.keyResultForm.id) {
        const response = await firstValueFrom(
          this.planejamentoService.atualizarKeyResult(this.keyResultForm.id, {
            titulo: this.keyResultForm.titulo,
            descricao: this.keyResultForm.descricao || undefined,
            status: this.keyResultForm.status
          })
        );

        if (response.success) {
          this.toastr.success('Key Result atualizado com sucesso', 'Sucesso');
        }
      } else {
        const response = await firstValueFrom(
          this.planejamentoService.criarKeyResult(this.keyResultForm.objetivo_id, {
            titulo: this.keyResultForm.titulo,
            descricao: this.keyResultForm.descricao || undefined,
            status: this.keyResultForm.status
          })
        );

        if (response.success) {
          this.toastr.success('Key Result criado com sucesso', 'Sucesso');
        }
      }

      this.closeKeyResultModal();
      await this.loadOkrCompleto();
    } catch (err: any) {
      console.error('Erro ao salvar Key Result:', err);
      this.toastr.error(err.error?.message || 'Erro ao salvar Key Result', 'Erro');
    }
  }

  openDeleteKeyResultModal(kr: OkrKeyResult): void {
    this.keyResultToDelete = kr;
    this.showDeleteKeyResultModal = true;
  }

  closeDeleteKeyResultModal(): void {
    this.showDeleteKeyResultModal = false;
    this.keyResultToDelete = null;
  }

  async confirmDeleteKeyResult(): Promise<void> {
    if (!this.keyResultToDelete) return;

    try {
      const response = await firstValueFrom(
        this.planejamentoService.deletarKeyResult(this.keyResultToDelete.id)
      );

      if (response.success) {
        this.toastr.success('Key Result excluído com sucesso', 'Sucesso');
        this.closeDeleteKeyResultModal();
        await this.loadOkrCompleto();
      }
    } catch (err: any) {
      console.error('Erro ao deletar Key Result:', err);
      this.toastr.error('Erro ao deletar Key Result', 'Erro');
    }
  }

  // --- TAREFAS ---

  openNovaTarefaModal(keyResultId: number): void {
    this.isEditingTarefa = false;
    this.tarefaForm = {
      id: 0,
      key_result_id: keyResultId,
      titulo: '',
      descricao: '',
      data_limite: '',
      responsavel: ''
    };
    this.showTarefaModal = true;
  }

  openEditarTarefaModal(tarefa: OkrTarefa): void {
    this.isEditingTarefa = true;
    this.tarefaForm = {
      id: tarefa.id,
      key_result_id: tarefa.key_result_id,
      titulo: tarefa.titulo,
      descricao: tarefa.descricao || '',
      data_limite: tarefa.data_limite || '',
      responsavel: tarefa.responsavel || ''
    };
    this.showTarefaModal = true;
  }

  closeTarefaModal(): void {
    this.showTarefaModal = false;
    this.tarefaForm = {
      id: 0,
      key_result_id: 0,
      titulo: '',
      descricao: '',
      data_limite: '',
      responsavel: ''
    };
  }

  async saveTarefa(): Promise<void> {
    if (!this.tarefaForm.titulo.trim()) {
      this.toastr.warning('Por favor, informe o título da tarefa', 'Atenção');
      return;
    }

    try {
      if (this.isEditingTarefa && this.tarefaForm.id) {
        const response = await firstValueFrom(
          this.planejamentoService.atualizarTarefa(this.tarefaForm.id, {
            titulo: this.tarefaForm.titulo,
            descricao: this.tarefaForm.descricao || undefined,
            data_limite: this.tarefaForm.data_limite || undefined,
            responsavel: this.tarefaForm.responsavel || undefined
          })
        );

        if (response.success) {
          this.toastr.success('Tarefa atualizada com sucesso', 'Sucesso');
        }
      } else {
        const response = await firstValueFrom(
          this.planejamentoService.criarTarefa(this.tarefaForm.key_result_id, {
            titulo: this.tarefaForm.titulo,
            descricao: this.tarefaForm.descricao || undefined,
            data_limite: this.tarefaForm.data_limite || undefined,
            responsavel: this.tarefaForm.responsavel || undefined
          })
        );

        if (response.success) {
          this.toastr.success('Tarefa criada com sucesso', 'Sucesso');
        }
      }

      this.closeTarefaModal();
      await this.loadOkrCompleto();
    } catch (err: any) {
      console.error('Erro ao salvar tarefa:', err);
      this.toastr.error(err.error?.message || 'Erro ao salvar tarefa', 'Erro');
    }
  }

  openDeleteTarefaModal(tarefa: OkrTarefa): void {
    this.tarefaToDelete = tarefa;
    this.showDeleteTarefaModal = true;
  }

  closeDeleteTarefaModal(): void {
    this.showDeleteTarefaModal = false;
    this.tarefaToDelete = null;
  }

  async confirmDeleteTarefa(): Promise<void> {
    if (!this.tarefaToDelete) return;

    try {
      const response = await firstValueFrom(
        this.planejamentoService.deletarTarefa(this.tarefaToDelete.id)
      );

      if (response.success) {
        this.toastr.success('Tarefa excluída com sucesso', 'Sucesso');
        this.closeDeleteTarefaModal();
        await this.loadOkrCompleto();
      }
    } catch (err: any) {
      console.error('Erro ao deletar tarefa:', err);
      this.toastr.error('Erro ao deletar tarefa', 'Erro');
    }
  }

  async toggleTarefaConcluida(tarefa: OkrTarefa): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.planejamentoService.toggleTarefa(tarefa.id)
      );

      if (response.success) {
        // Atualizar localmente sem recarregar tudo
        tarefa.concluida = response.data.concluida;
      }
    } catch (err: any) {
      console.error('Erro ao alternar tarefa:', err);
      this.toastr.error('Erro ao alternar tarefa', 'Erro');
    }
  }
}
