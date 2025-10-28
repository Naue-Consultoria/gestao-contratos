import { Component, Input, Output, EventEmitter, OnInit, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ContractService, ApiContractService, ServiceComment } from '../../services/contract';
import { RoutineService } from '../../services/routine.service';
import { AttachmentService, ServiceCommentAttachment, AttachmentUploadProgress } from '../../services/attachment.service';
import { ServiceStageService, ServiceProgress } from '../../services/service-stage.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-contract-services-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contract-services-manager.html',
  styleUrls: ['./contract-services-manager.css']
})
export class ContractServicesManagerComponent implements OnInit, OnChanges, OnDestroy {
  @Input() services: ApiContractService[] = [];
  @Input() contractId!: number;
  @Input() canEdit: boolean = false;
  @Input() viewOnly: boolean = false; // Força modo somente leitura
  @Output() serviceUpdated = new EventEmitter<void>();

  selectedService: ApiContractService | null = null;
  showComments: { [serviceId: number]: boolean } = {};
  comments: { [serviceId: number]: ServiceComment[] } = {};
  newComments: { [serviceId: number]: string } = {};
  editingComment: { [commentId: number]: string } = {};
  loadingComments: { [serviceId: number]: boolean } = {};
  
  // Propriedades para anexos
  attachments: { [commentId: number]: ServiceCommentAttachment[] } = {};
  uploadingFiles: { [commentId: number]: AttachmentUploadProgress } = {};
  
  // Propriedades para novos comentários com arquivos
  newCommentFiles: { [serviceId: number]: File[] } = {};
  isAddingComment: { [serviceId: number]: boolean } = {};
  
  // Propriedades para progresso dos serviços
  serviceProgresses: { [serviceId: number]: ServiceProgress } = {};
  loadingProgresses: { [serviceId: number]: boolean } = {};
  progressRequestCache: { [serviceId: number]: boolean } = {};

  // Subject para controlar o ciclo de vida do componente
  private destroy$ = new Subject<void>();
  private isComponentActive = true;

  serviceStatuses = [
    { value: 'not_started', label: 'Não iniciado' },
    { value: 'scheduled', label: 'Agendado' },
    { value: 'in_progress', label: 'Em andamento' },
    { value: 'completed', label: 'Finalizado' },
    { value: 'cancelled', label: 'Cancelado' }
  ];

  constructor(
    private contractService: ContractService,
    private routineService: RoutineService,
    private attachmentService: AttachmentService,
    private serviceStageService: ServiceStageService,
    private toastr: ToastrService,
    private router: Router
  ) {}

  // Helper para determinar se os campos devem estar em modo de edição
  isEditMode(): boolean {
    return this.canEdit && !this.viewOnly;
  }

  ngOnInit() {
    // Limpar cache ao inicializar para garantir dados frescos após migração
    this.serviceStageService.clearAllCaches();

    // Inicializar status dos serviços se não existir e ordenar com prioridade personalizada
    this.services.forEach((service, index) => {
      if (!service.status) {
        service.status = 'not_started';
      }
      // Inicializar o array de comentários vazio para cada serviço
      if (!this.comments[service.id]) {
        this.comments[service.id] = [];
      }
    });

    // Ordenar serviços com prioridade personalizada
    this.sortServices();

    // Carregar progresso dos serviços com debounce
    this.debounceLoadProgress();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['services'] && changes['services'].currentValue) {
      // Verificar se realmente houve mudança nos serviços
      const previousServices = changes['services'].previousValue || [];
      const currentServices = changes['services'].currentValue || [];

      // Só limpar cache se a quantidade ou IDs dos serviços mudaram
      const servicesChanged = previousServices.length !== currentServices.length ||
        !currentServices.every((service: any, index: number) =>
          previousServices[index]?.id === service.id
        );

      if (servicesChanged) {
        // Limpar estados anteriores apenas se os serviços realmente mudaram
        this.serviceProgresses = {};
        this.loadingProgresses = {};
        this.progressRequestCache = {};
      }

      // Inicializar comentários para novos serviços
      this.services.forEach(service => {
        if (!this.comments[service.id]) {
          this.comments[service.id] = [];
        }
      });

      this.sortServices();

      // Só carregar progresso se os serviços mudaram
      if (servicesChanged) {
        this.debounceLoadProgress();
      }
    }
  }

  
  private sortServices() {
    this.services.sort((a, b) => {
      const serviceNameA = a.service?.name || '';
      const serviceNameB = b.service?.name || '';

      // Definir prioridades numéricas para garantir ordem correta
      const getPriority = (serviceName: string): number => {
        if (serviceName === 'Entrada de Cliente') return 1;
        if (serviceName === 'Encerramento') return 999; // Sempre por último
        return 2; // Todos os outros serviços
      };

      const priorityA = getPriority(serviceNameA);
      const priorityB = getPriority(serviceNameB);

      // Se as prioridades são diferentes, ordenar por prioridade
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // Se as prioridades são iguais (ambos são serviços normais), ordenar alfabeticamente
      return serviceNameA.localeCompare(serviceNameB, 'pt-BR', { sensitivity: 'base' });
    });
  }

  // Método para calcular progresso das tarefas baseado nas etapas
  getTasksProgress(): number {
    if (!this.services || this.services.length === 0) {
      return 0;
    }

    // Usar TODOS os serviços (incluindo internos)
    const allServices = this.services;

    let totalSteps = 0;
    let completedSteps = 0;

    allServices.forEach(service => {
      const progress = this.serviceProgresses[service.id];
      if (progress) {
        totalSteps += progress.totalStages;
        completedSteps += progress.completedStages;
      }
    });

    return totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  }


  // Método para obter contagem de tarefas baseado nas etapas
  getTasksCounts(): { completed: number; total: number } {
    if (!this.services || this.services.length === 0) {
      return { completed: 0, total: 0 };
    }

    // Usar TODOS os serviços (incluindo internos)
    const allServices = this.services;

    let totalStages = 0;
    let completedStages = 0;

    allServices.forEach(service => {
      const progress = this.serviceProgresses[service.id];
      if (progress) {
        totalStages += progress.totalStages;
        completedStages += progress.completedStages;
      }
    });

    return { completed: completedStages, total: totalStages };
  }


  // Debounce timer para evitar múltiplas chamadas
  private debounceTimer: any;

  // Método com debounce para carregar progresso
  private debounceLoadProgress() {
    if (!this.isComponentActive) {
      return;
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      if (this.isComponentActive) {
        this.loadServicesProgress();
      }
    }, 500); // Aumentado para 500ms para reduzir chamadas
  }

  // Método para carregar progresso de todos os serviços
  loadServicesProgress() {
    if (!this.isComponentActive || !this.services || this.services.length === 0) {
      return;
    }

    // Limitar a 2 requisições simultâneas para reduzir carga
    let activeRequests = 0;
    const maxConcurrentRequests = 2;
    const delayBetweenRequests = 750; // 750ms entre requisições

    this.services.forEach((service, index) => {
      if (!this.isComponentActive) return;

      if (service?.id &&
          !this.loadingProgresses[service.id] &&
          !this.progressRequestCache[service.id]) {

        if (activeRequests < maxConcurrentRequests) {
          // Executar imediatamente para as primeiras requisições
          this.loadServiceProgress(service.id);
          activeRequests++;
        } else {
          // Atrasar as demais requisições de forma escalonada
          const delay = (index - maxConcurrentRequests + 1) * delayBetweenRequests;
          setTimeout(() => {
            if (this.isComponentActive &&
                !this.loadingProgresses[service.id] &&
                !this.progressRequestCache[service.id]) {
              this.loadServiceProgress(service.id);
            }
          }, delay);
        }
      }
    });
  }

  // Método para carregar progresso de um contract_service específico
  loadServiceProgress(contractServiceId: number) {
    // Verificar se o componente ainda está ativo
    if (!this.isComponentActive) {
      return;
    }

    // Verificar se já está carregando este serviço ou já foi carregado
    if (this.loadingProgresses[contractServiceId] || this.progressRequestCache[contractServiceId]) {
      return;
    }

    // Marcar como sendo processado
    this.loadingProgresses[contractServiceId] = true;
    this.progressRequestCache[contractServiceId] = true;

    // Timeout mais agressivo para evitar acúmulo de requisições
    const timeoutId = setTimeout(() => {
      if (this.loadingProgresses[contractServiceId] && this.isComponentActive) {
        this.handleProgressError(contractServiceId, 'timeout');
      }
    }, 3000); // 3 segundos timeout

    this.serviceStageService.getServiceProgress(contractServiceId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (!this.isComponentActive) return;

          clearTimeout(timeoutId);
          this.serviceProgresses[contractServiceId] = response.progress;
          this.loadingProgresses[contractServiceId] = false;

          // Manter cache por 2 minutos para evitar requisições desnecessárias
          setTimeout(() => {
            if (this.isComponentActive) {
              delete this.progressRequestCache[contractServiceId];
            }
          }, 120000);
        },
        error: (error) => {
          if (!this.isComponentActive) return;

          clearTimeout(timeoutId);
          this.handleProgressError(contractServiceId, error);

          // Permitir nova tentativa após 30 segundos em caso de erro
          setTimeout(() => {
            if (this.isComponentActive) {
              delete this.progressRequestCache[contractServiceId];
            }
          }, 30000);
        }
      });
  }

  // Método para lidar com erros de progresso
  private handleProgressError(serviceId: number, error: any) {
    // Em caso de erro ou serviço sem etapas, assumir 0% de progresso
    this.serviceProgresses[serviceId] = {
      totalStages: 0,
      completedStages: 0,
      progressPercentage: 0,
      stages: []
    };
    
    // Garantir que o loading seja definido como false
    this.loadingProgresses[serviceId] = false;
  }


  // Método para obter progresso de um contract_service
  getServiceProgressPercentage(contractServiceId: number): number {
    const progress = this.serviceProgresses[contractServiceId];
    return progress ? progress.progressPercentage : 0;
  }


  // Método para verificar se está carregando progresso
  isLoadingProgress(contractServiceId: number): boolean {
    return this.loadingProgresses[contractServiceId] || false;
  }

  formatDate(date: string | null | undefined): string {
    if (!date) return '-';
    return this.contractService.formatDate(date);
  }

  getStatusColor(status: string | undefined): string {
    return this.contractService.getServiceStatusColor(status || 'not_started');
  }

  getStatusText(status: string | undefined): string {
    return this.contractService.getServiceStatusText(status || 'not_started');
  }

  getStatusIcon(status: string | undefined): string {
    return this.contractService.getServiceStatusIcon(status || 'not_started');
  }

  // Métodos para obter status da rotina (quando aplicável)
  getRoutineStatus(service: ApiContractService): string {
    // Se estamos em modo de visualização de rotinas
    if (this.viewOnly) {
      // Se há dados de rotina, usar o status da rotina
      if ((service as any).service_routines && (service as any).service_routines.length > 0) {
        return (service as any).service_routines[0].status;
      }
      // Se não há rotina mas há status do serviço, usar esse (para compatibilidade)
      return service.status || 'not_started';
    }
    
    // Para modo de edição (contratos), sempre usar o status do contract_service
    return service.status || 'not_started';
  }

  getRoutineDate(service: ApiContractService): string | null {
    // Primeiro, verificar se estamos em modo de visualização de rotinas
    if (this.viewOnly) {
      // Se há dados de rotina, usar a data da rotina
      if ((service as any).service_routines && (service as any).service_routines.length > 0) {
        return (service as any).service_routines[0].scheduled_date || null;
      }
      // Se não há rotina mas há data do serviço, usar essa (para compatibilidade)
      return service.scheduled_start_date || null;
    }
    
    // Para modo de edição (contratos), sempre usar a data do contract_service
    return service.scheduled_start_date || null;
  }

  updateServiceStatus(service: ApiContractService, newStatus: string | undefined) {
    if (!this.canEdit) {
      this.toastr.warning('Você não tem permissão para editar este serviço');
      return;
    }
    
    if (!newStatus) return;

    const oldStatus = service.status;
    service.status = newStatus as any;

    this.contractService.updateContractService(service.id, { status: newStatus }).subscribe({
      next: () => {
        this.toastr.success('Status do serviço atualizado com sucesso');
        this.serviceUpdated.emit();
      },
      error: (error) => {
        service.status = oldStatus; // Reverter em caso de erro
        this.toastr.error(error.error?.error || 'Erro ao atualizar status do serviço');
      }
    });
  }

  updateServiceDate(service: ApiContractService, event: Event) {
    if (!this.canEdit) {
      this.toastr.warning('Você não tem permissão para editar este serviço');
      return;
    }

    const input = event.target as HTMLInputElement;
    const newDate = input.value || null;
    const oldDate = service.scheduled_start_date;

    service.scheduled_start_date = newDate;

    this.contractService.updateContractService(service.id, { scheduled_start_date: newDate }).subscribe({
      next: () => {
        this.toastr.success('Data de início agendada com sucesso');
        this.serviceUpdated.emit();
      },
      error: (error) => {
        service.scheduled_start_date = oldDate; // Reverter em caso de erro
        this.toastr.error(error.error?.error || 'Erro ao agendar data de início');
      }
    });
  }

  toggleComments(serviceId: number) {
    // Se já está aberto, apenas fechar
    if (this.showComments[serviceId]) {
      this.showComments[serviceId] = false;
      return;
    }
    
    // Fechar todos os outros comentários (comportamento accordion)
    Object.keys(this.showComments).forEach(key => {
      this.showComments[parseInt(key)] = false;
    });
    
    // Abrir o comentário clicado
    this.showComments[serviceId] = true;
    
    // Carregar comentários se ainda não foram carregados
    if (!this.comments[serviceId]) {
      this.loadComments(serviceId);
    }
  }

  loadComments(serviceId: number) {
    this.loadingComments[serviceId] = true;
    
    this.contractService.getServiceComments(serviceId).subscribe({
      next: (response) => {
        this.comments[serviceId] = response.comments;
        this.loadingComments[serviceId] = false;
        
        // Carregar anexos para cada comentário automaticamente
        response.comments.forEach(comment => {
          this.loadAttachments(comment.id);
        });
      },
      error: (error) => {
        this.toastr.error('Erro ao carregar comentários');
        this.loadingComments[serviceId] = false;
      }
    });
  }

  addComment(serviceId: number) {
    const comment = this.newComments[serviceId]?.trim();
    if (!comment) return;

    this.contractService.addServiceComment(serviceId, comment).subscribe({
      next: (response) => {
        this.toastr.success('Comentário adicionado com sucesso');
        this.newComments[serviceId] = '';
        this.loadComments(serviceId);
      },
      error: (error) => {
        this.toastr.error(error.error?.error || 'Erro ao adicionar comentário');
      }
    });
  }

  startEditComment(comment: ServiceComment) {
    this.editingComment[comment.id] = comment.comment;
  }

  cancelEditComment(commentId: number) {
    delete this.editingComment[commentId];
  }

  updateComment(comment: ServiceComment) {
    const newText = this.editingComment[comment.id]?.trim();
    if (!newText || newText === comment.comment) {
      this.cancelEditComment(comment.id);
      return;
    }

    this.contractService.updateServiceComment(comment.id, newText).subscribe({
      next: () => {
        this.toastr.success('Comentário atualizado com sucesso');
        comment.comment = newText;
        this.cancelEditComment(comment.id);
      },
      error: (error) => {
        this.toastr.error(error.error?.error || 'Erro ao atualizar comentário');
      }
    });
  }

  deleteComment(serviceId: number, comment: ServiceComment) {
    if (!confirm('Tem certeza que deseja excluir este comentário?')) return;

    this.contractService.deleteServiceComment(comment.id).subscribe({
      next: () => {
        this.toastr.success('Comentário excluído com sucesso');
        this.loadComments(serviceId);
      },
      error: (error) => {
        this.toastr.error(error.error?.error || 'Erro ao excluir comentário');
      }
    });
  }

  canEditComment(comment: ServiceComment): boolean {
    // Recuperar ID do usuário corretamente do localStorage
    const userJson = localStorage.getItem('user');
    if (userJson) {
      try {
        const user = JSON.parse(userJson);
        return comment.user.id === user.id;
      } catch (error) {
        return false;
      }
    }
    return false;
  }

  formatCommentDate(date: string): string {
    const d = new Date(date);
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Métodos para gerenciar anexos (apenas para carregar anexos existentes)

  loadAttachments(commentId: number) {
    // Sempre carregar anexos para garantir que apareçam no comentário
    this.attachmentService.getCommentAttachments(commentId).subscribe({
      next: (response) => {
        this.attachments[commentId] = response.attachments;
      },
      error: (error) => {
        console.error('Erro ao carregar anexos:', error);
      }
    });
  }


  downloadAttachment(attachment: ServiceCommentAttachment) {
    this.attachmentService.downloadAttachment(attachment.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = attachment.original_name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        this.toastr.error('Erro ao baixar arquivo');
      }
    });
  }

  deleteAttachment(attachment: ServiceCommentAttachment) {
    if (!confirm(`Tem certeza que deseja excluir o arquivo "${attachment.original_name}"?`)) {
      return;
    }

    this.attachmentService.deleteAttachment(attachment.id).subscribe({
      next: (response) => {
        // Remover da lista local
        const commentAttachments = this.attachments[attachment.comment_id];
        if (commentAttachments) {
          const index = commentAttachments.findIndex(a => a.id === attachment.id);
          if (index > -1) {
            commentAttachments.splice(index, 1);
          }
        }
        
        this.toastr.success('Arquivo excluído com sucesso');
      },
      error: (error) => {
        this.toastr.error('Erro ao excluir arquivo');
      }
    });
  }

  // Métodos utilitários para anexos
  getFileIcon(mimeType: string): string {
    return this.attachmentService.getFileIcon(mimeType);
  }

  formatFileSize(bytes: number): string {
    return this.attachmentService.formatFileSize(bytes);
  }


  canEditAttachment(attachment: ServiceCommentAttachment): boolean {
    const userJson = localStorage.getItem('user');
    if (userJson) {
      try {
        const user = JSON.parse(userJson);
        return attachment.uploaded_by === user.id;
      } catch (error) {
        return false;
      }
    }
    return false;
  }

  hasAttachments(commentId: number): boolean {
    return this.attachments[commentId]?.length > 0;
  }

  getAttachmentsCount(commentId: number): number {
    return this.attachments[commentId]?.length || 0;
  }

  async navigateToServiceTracking(service: ApiContractService, event?: Event) {
    if (event) {
      event.stopPropagation();
    }

    console.log('🚀 Navegando para service tracking:', service);
    console.log('🔍 Service ID:', service.id);
    console.log('🔍 Contract ID:', this.contractId);

    try {
      // Buscar a rotina pelo serviceId (contract_service_id)
      let routine = await this.routineService.getRoutineByContractServiceId(service.id).toPromise();
      
      if (!routine || !routine.id) {
        // Se não existe rotina, criar uma automaticamente
        console.log('⚠️ Rotina não encontrada para serviço', service.id, '- criando automaticamente...');
        
        try {
          const newRoutine = await this.routineService.createRoutine({
            contract_service_id: service.id,
            status: 'not_started',
            scheduled_date: null,
            notes: null
          }).toPromise();
          
          if (newRoutine && newRoutine.success && newRoutine.data) {
            routine = newRoutine.data;
            console.log('✅ Rotina criada com sucesso:', routine.id);
          } else {
            console.error('❌ Falha ao criar rotina automaticamente');
            alert('Erro: Não foi possível criar a rotina para este serviço. Por favor, tente novamente.');
            return;
          }
        } catch (createError) {
          console.error('❌ Erro ao criar rotina automaticamente:', createError);
          alert('Erro: Não foi possível criar a rotina para este serviço. Por favor, tente novamente.');
          return;
        }
      }
      
      if (routine && routine.id) {
        // Navegar para a rotina
        this.router.navigate(['/home/rotinas', routine.id, 'servico', service.id]);
      } else {
        console.error('❌ Rotina ainda não disponível após tentativa de criação');
        alert('Erro: Não foi possível acessar a rotina. Por favor, tente novamente.');
      }
    } catch (error) {
      console.error('❌ Erro ao buscar/criar rotina:', error);
      alert('Erro ao acessar rotina. Por favor, tente novamente.');
      return;
    }
  }

  // Novas funções para comentários com anexos
  onNewCommentFileSelected(event: Event, serviceId: number) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    
    if (files.length === 0) return;

    // Validar cada arquivo
    const validFiles: File[] = [];
    for (const file of files) {
      const validation = this.attachmentService.validateFile(file);
      if (validation.valid) {
        validFiles.push(file);
      } else {
        this.toastr.error(`${file.name}: ${validation.error}`);
      }
    }

    // Adicionar arquivos válidos à lista
    if (validFiles.length > 0) {
      if (!this.newCommentFiles[serviceId]) {
        this.newCommentFiles[serviceId] = [];
      }
      this.newCommentFiles[serviceId].push(...validFiles);
      this.toastr.success(`${validFiles.length} arquivo(s) adicionado(s)`);
    }

    // Limpar input
    input.value = '';
  }

  removePendingFile(serviceId: number, index: number) {
    if (this.newCommentFiles[serviceId]) {
      this.newCommentFiles[serviceId].splice(index, 1);
      if (this.newCommentFiles[serviceId].length === 0) {
        delete this.newCommentFiles[serviceId];
      }
    }
  }

  clearNewComment(serviceId: number) {
    this.newComments[serviceId] = '';
    delete this.newCommentFiles[serviceId];
  }

  addCommentWithFiles(serviceId: number) {
    const comment = this.newComments[serviceId]?.trim();
    const files = this.newCommentFiles[serviceId] || [];
    
    // Deve ter pelo menos comentário ou arquivos
    if (!comment && files.length === 0) {
      this.toastr.warning('Adicione um comentário ou anexos');
      return;
    }

    this.isAddingComment[serviceId] = true;

    // Primeiro, criar o comentário
    const commentText = comment || '(Arquivos anexados)';
    
    this.contractService.addServiceComment(serviceId, commentText).subscribe({
      next: (response) => {
        // Se há arquivos para anexar, fazer upload de cada um
        if (files.length > 0 && response.comment?.id) {
          this.uploadFilesForComment(response.comment.id, files, serviceId);
        } else {
          // Se não há arquivos, finalizar
          this.finalizeCommentCreation(serviceId);
        }
      },
      error: (error) => {
        this.toastr.error(error.error?.error || 'Erro ao adicionar comentário');
        this.isAddingComment[serviceId] = false;
      }
    });
  }

  private uploadFilesForComment(commentId: number, files: File[], serviceId: number) {
    let uploadedCount = 0;
    let failedCount = 0;

    files.forEach(file => {
      this.attachmentService.uploadFile(commentId, file).subscribe({
        next: (progress) => {
          if (progress.status === 'completed') {
            uploadedCount++;
            // Adicionar anexo à lista local se necessário
            if (progress.attachment) {
              if (!this.attachments[commentId]) {
                this.attachments[commentId] = [];
              }
              this.attachments[commentId].push(progress.attachment);
            }
          } else if (progress.status === 'error') {
            failedCount++;
          }

          // Verificar se todos os uploads terminaram
          if (uploadedCount + failedCount === files.length) {
            this.finalizeCommentCreation(serviceId, uploadedCount, failedCount);
          }
        },
        error: () => {
          failedCount++;
          if (uploadedCount + failedCount === files.length) {
            this.finalizeCommentCreation(serviceId, uploadedCount, failedCount);
          }
        }
      });
    });
  }

  private finalizeCommentCreation(serviceId: number, uploadedCount?: number, failedCount?: number) {
    this.isAddingComment[serviceId] = false;
    
    // Limpar formulário
    this.newComments[serviceId] = '';
    delete this.newCommentFiles[serviceId];
    
    // Recarregar comentários com um pequeno delay para garantir que o banco foi atualizado
    setTimeout(() => {
      this.loadComments(serviceId);
    }, 500);
    
    // Mostrar mensagem de sucesso
    if (uploadedCount !== undefined) {
      if (failedCount === 0) {
        this.toastr.success(`Comentário adicionado com ${uploadedCount} arquivo(s)!`);
      } else {
        this.toastr.warning(`Comentário adicionado. ${uploadedCount} arquivo(s) enviado(s), ${failedCount} falhou(aram)`);
      }
    } else {
      this.toastr.success('Comentário adicionado com sucesso!');
    }
  }

  // Funções utilitárias para os novos arquivos
  getFileIconFromFile(file: File): string {
    return this.attachmentService.getFileIcon(file.type);
  }

  formatFileSizeBytes(bytes: number): string {
    return this.attachmentService.formatFileSize(bytes);
  }

  // Cleanup de recursos quando o componente for destruído
  ngOnDestroy() {
    // Marcar componente como inativo
    this.isComponentActive = false;

    // Completar o subject para cancelar todas as observações
    this.destroy$.next();
    this.destroy$.complete();

    // Limpar timer de debounce
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Limpar cache de progresso
    this.progressRequestCache = {};
    this.loadingProgresses = {};
    this.serviceProgresses = {};
  }

  // Método para forçar limpeza do cache (útil para refresh manual)
  clearProgressCache() {
    this.progressRequestCache = {};
    this.serviceProgresses = {};
    this.loadingProgresses = {};
  }
}