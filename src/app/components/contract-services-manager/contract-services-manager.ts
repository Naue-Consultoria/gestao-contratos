import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
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
export class ContractServicesManagerComponent implements OnInit, OnChanges {
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
    
    // Inicializar status dos serviços se não existir e ordenar alfabeticamente
    this.services.forEach((service, index) => {
      if (!service.status) {
        service.status = 'not_started';
      }
      // Inicializar o array de comentários vazio para cada serviço
      if (!this.comments[service.id]) {
        this.comments[service.id] = [];
      }
    });
    
    // Ordenar serviços por nome alfabeticamente
    this.sortServices();
    
    // Carregar progresso dos serviços
    this.loadServicesProgress();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['services'] && changes['services'].currentValue) {
      // Inicializar comentários para novos serviços
      this.services.forEach(service => {
        if (!this.comments[service.id]) {
          this.comments[service.id] = [];
        }
      });
      this.sortServices();
      this.loadServicesProgress();
    }
  }
  
  private sortServices() {
    this.services.sort((a, b) => {
      const nameA = a.service.name.toLowerCase();
      const nameB = b.service.name.toLowerCase();
      return nameA.localeCompare(nameB, 'pt-BR');
    });
  }

  // Método para calcular progresso das tarefas baseado nas etapas
  getTasksProgress(): number {
    if (!this.services || this.services.length === 0) {
      return 0;
    }

    // Filtrar serviços internos do cálculo de progresso
    const nonInternalServices = this.services.filter(service => 
      service.service.category !== 'Interno'
    );

    if (nonInternalServices.length === 0) {
      return 0;
    }

    // Calcular progresso médio baseado nas etapas de cada serviço (excluindo internos)
    let totalProgress = 0;
    let servicesWithProgress = 0;

    nonInternalServices.forEach(service => {
      const progress = this.serviceProgresses[service.service.id];
      if (progress !== undefined) {
        totalProgress += progress.progressPercentage;
        servicesWithProgress++;
      } else if (!this.loadingProgresses[service.service.id]) {
        // Se não está carregando e não tem progresso, assumir que não há etapas (0%)
        totalProgress += 0;
        servicesWithProgress++;
      }
    });

    // Se ainda não carregou o progresso de nenhum serviço, usar método fallback
    if (servicesWithProgress === 0) {
      return this.getTasksProgressFallback();
    }

    // Calcular progresso médio ponderado
    const averageProgress = totalProgress / servicesWithProgress;
    return Math.round(averageProgress);
  }

  // Método fallback para calcular progresso baseado em status (usado até carregar as etapas)
  private getTasksProgressFallback(): number {
    if (!this.services || this.services.length === 0) {
      return 0;
    }

    // Filtrar serviços internos do cálculo de progresso
    const nonInternalServices = this.services.filter(service => 
      service.service.category !== 'Interno'
    );

    if (nonInternalServices.length === 0) {
      return 0;
    }

    const completedTasks = nonInternalServices.filter(service => {
      const status = this.getRoutineStatus(service);
      return status === 'completed';
    }).length;

    return Math.round((completedTasks / nonInternalServices.length) * 100);
  }

  // Método para obter contagem de tarefas baseado nas etapas
  getTasksCounts(): { completed: number; total: number } {
    if (!this.services || this.services.length === 0) {
      return { completed: 0, total: 0 };
    }

    // Filtrar serviços internos do cálculo de progresso
    const nonInternalServices = this.services.filter(service => 
      service.service.category !== 'Interno'
    );

    if (nonInternalServices.length === 0) {
      return { completed: 0, total: 0 };
    }

    let totalStages = 0;
    let completedStages = 0;
    let servicesWithProgress = 0;

    nonInternalServices.forEach(service => {
      const progress = this.serviceProgresses[service.service.id];
      if (progress !== undefined) {
        totalStages += progress.totalStages;
        completedStages += progress.completedStages;
        servicesWithProgress++;
      } else if (!this.loadingProgresses[service.service.id]) {
        // Se não está carregando e não tem progresso, assumir que não há etapas
        totalStages += 0;
        completedStages += 0;
        servicesWithProgress++;
      }
    });

    // Se ainda não carregou progresso de nenhum serviço, usar método fallback
    if (servicesWithProgress === 0) {
      return this.getTasksCountsFallback();
    }

    return { completed: completedStages, total: totalStages };
  }

  // Método fallback para contagem baseado em status
  private getTasksCountsFallback(): { completed: number; total: number } {
    // Filtrar serviços internos do cálculo de progresso
    const nonInternalServices = this.services.filter(service => 
      service.service.category !== 'Interno'
    );

    const completed = nonInternalServices.filter(service => {
      const status = this.getRoutineStatus(service);
      return status === 'completed';
    }).length;

    return { completed, total: nonInternalServices.length };
  }

  // Método para carregar progresso de todos os serviços
  loadServicesProgress() {
    this.services.forEach(service => {
      this.loadServiceProgress(service.service.id);
    });
  }

  // Método para carregar progresso de um serviço específico
  loadServiceProgress(serviceId: number) {
    this.loadingProgresses[serviceId] = true;
    
    this.serviceStageService.getServiceProgress(serviceId).subscribe({
      next: (response) => {
        this.serviceProgresses[serviceId] = response.progress;
        this.loadingProgresses[serviceId] = false;
        // Forçar atualização da barra de progresso geral após carregar progresso individual
        this.triggerProgressUpdate();
      },
      error: (error) => {
        console.log(`Service ${serviceId} has no stages configured or error loading progress:`, error);
        // Em caso de erro ou serviço sem etapas, assumir 0% de progresso
        this.serviceProgresses[serviceId] = {
          totalStages: 0,
          completedStages: 0,
          progressPercentage: 0,
          stages: []
        };
        this.loadingProgresses[serviceId] = false;
        this.triggerProgressUpdate();
      }
    });
  }

  // Método para forçar atualização da view (necessário para Angular detectar mudanças)
  private triggerProgressUpdate() {
    // Força detecção de mudanças para atualizar a barra de progresso
    // Como os métodos getTasksProgress() e getTasksCounts() são chamados no template,
    // esta chamada vazia força o Angular a recalcular os valores
  }

  // Método para obter progresso de um serviço
  getServiceProgressPercentage(serviceId: number): number {
    const progress = this.serviceProgresses[serviceId];
    return progress ? progress.progressPercentage : 0;
  }

  // Método para verificar se está carregando progresso
  isLoadingProgress(serviceId: number): boolean {
    return this.loadingProgresses[serviceId] || false;
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
}