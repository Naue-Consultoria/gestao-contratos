import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ContractService, ApiContractService } from '../../services/contract';
import { RoutineService, ServiceRoutine, RoutineComment } from '../../services/routine.service';
import { ServiceStageService, ServiceStage, ServiceProgress } from '../../services/service-stage.service';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';
import { BreadcrumbService, BreadcrumbItem } from '../../services/breadcrumb.service';
import { ToastrService } from 'ngx-toastr';
import { RoutineAttachmentService } from '../../services/routine-attachment.service';

@Component({
  selector: 'app-service-tracking-page',
  standalone: true,
  imports: [CommonModule, FormsModule, BreadcrumbComponent],
  templateUrl: './service-tracking-page.html',
  styleUrls: ['./service-tracking-page.css']
})
export class ServiceTrackingPageComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private contractService = inject(ContractService);
  private breadcrumbService = inject(BreadcrumbService);
  private toastr = inject(ToastrService);
  private serviceStageService = inject(ServiceStageService);

  routineId!: number;
  serviceId!: number;
  service: ApiContractService | null = null;
  contract: any = null;
  routine: ServiceRoutine | null = null;
  isLoading = true;
  error: string | null = null;
  canEdit = false;

  // Service stages properties
  serviceStages: ServiceStage[] = [];
  stageProgress = 0;
  isLoadingStages = false;
  isMarkingAll = false;

  // Propriedades do formulário de controle
  selectedStatus: 'not_started' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled' = 'not_started';
  selectedDate = '';
  routineNotes = '';
  isSaving = false;
  
  // Propriedades de comentários
  comments: RoutineComment[] = [];
  newComment = '';
  selectedStageId: number | null = null;
  isLoadingComments = false;
  isSendingComment = false;
  selectedFiles: File[] = [];
  uploadProgress: { [key: string]: number } = {};
  attachmentService = inject(RoutineAttachmentService);
  routineService = inject(RoutineService);
  Object = Object; // Expose Object to template
  
  serviceStatuses = [
    { value: 'not_started', label: 'Não iniciado', color: '#6c757d', icon: 'fas fa-pause' },
    { value: 'scheduled', label: 'Agendado', color: '#17a2b8', icon: 'fas fa-calendar-check' },
    { value: 'in_progress', label: 'Em andamento', color: '#ffc107', icon: 'fas fa-play' },
    { value: 'completed', label: 'Finalizado', color: '#28a745', icon: 'fas fa-check' },
    { value: 'cancelled', label: 'Cancelado', color: '#dc3545', icon: 'fas fa-times-circle' }
  ];

  constructor() {}

  ngOnInit() {
    // Configurar breadcrumb inicial
    this.breadcrumbService.setBreadcrumbs([
      {
        label: 'Home',
        url: '/home',
        icon: 'fas fa-home'
      },
      {
        label: 'Carregando...'
      }
    ]);

    this.route.params.subscribe(params => {
      this.routineId = +params['routineId'];
      this.serviceId = +params['serviceId'];
      
      if (this.routineId && this.serviceId) {
        this.loadServiceData();
      } else {
        this.error = 'Parâmetros inválidos';
        this.isLoading = false;
      }
    });
  }

  async loadServiceData() {
    try {
      this.isLoading = true;
      this.error = null;


      // Buscar a rotina pelo ID da rotina (routineId da URL)
      try {
        const routine = await this.routineService.getRoutineById(this.routineId).toPromise();

        if (routine) {
          this.routine = routine;

          // Usar o contract_service_id da rotina para buscar o service
          const contractServiceId = routine.contract_service_id;

          // Validar se o serviceId da URL bate com o contract_service_id da rotina
          if (contractServiceId !== this.serviceId) {
          }

          const contractService = await this.contractService.getContractServiceById(contractServiceId).toPromise();
          if (contractService) {
            this.service = contractService;

            // Carregar dados do contrato
            if (contractService.contract_id) {
              const contractResponse = await this.contractService.getContract(contractService.contract_id).toPromise();
              if (contractResponse) {
                this.contract = contractResponse.contract;

                // Configurar breadcrumb com o caminho completo
                this.setupBreadcrumb();
              }
            }
          } else {
            this.error = 'Serviço do contrato não encontrado';
            this.isLoading = false;
            return;
          }
        } else {
          this.error = 'Rotina não encontrada';
          this.isLoading = false;
          return;
        }
      } catch (serviceError: any) {
        console.error('Erro ao carregar dados:', serviceError);

        // Tratamento específico para erro 403 (Acesso negado)
        if (serviceError.status === 403) {
          this.isLoading = false;
          this.toastr.warning(
            'Você não tem permissão para acessar esta rotina. Verifique se está atribuído ao contrato.',
            'Acesso Negado',
            {
              timeOut: 5000,
              progressBar: true,
              closeButton: true,
              positionClass: 'toast-top-center'
            }
          );

          // Aguardar 3 segundos antes de redirecionar para o usuário ler a mensagem
          setTimeout(() => {
            this.router.navigate(['/home/dashboard']);
          }, 3000);
          return;
        }

        this.error = 'Erro ao carregar dados';
        this.isLoading = false;
        return;
      }
      
      // Para simplicidade, vamos assumir que o usuário pode editar
      this.canEdit = true;
      
      // Configurar valores iniciais do formulário
      this.selectedStatus = this.routine?.status || 'not_started';
      this.selectedDate = this.routine?.scheduled_date || '';
      this.routineNotes = this.routine?.notes || '';
      
      // Carregar dados adicionais de forma sequencial para evitar sobrecarga de recursos
      if (this.routine?.id) {
        await this.loadComments();
      }

      // Carregar etapas do serviço se disponível
      if (this.service?.service?.id) {
        await this.loadServiceStages();
      }

    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
      this.error = 'Erro ao carregar dados';
    } finally {
      this.isLoading = false;
    }
  }

  async loadServiceStages() {
    if (!this.service?.service?.id) return;

    try {
      this.isLoadingStages = true;

      // Implementar retry com backoff exponencial para resolver ERR_INSUFFICIENT_RESOURCES
      const maxRetries = 3;
      let retryCount = 0;
      let response = null;

      while (retryCount < maxRetries && !response) {
        try {
          response = await this.serviceStageService.getServiceStages(this.service.id).toPromise();
          break;
        } catch (retryError: any) {
          retryCount++;

          // Se for erro de recursos insuficientes ou erro de rede, tentar novamente
          if ((retryError.status === 0 || retryError.message?.includes('ERR_INSUFFICIENT_RESOURCES')) && retryCount < maxRetries) {
            console.warn(`Tentativa ${retryCount}/${maxRetries} falhou, tentando novamente em ${retryCount * 1000}ms...`);
            await new Promise(resolve => setTimeout(resolve, retryCount * 1000)); // Backoff exponencial
            continue;
          } else {
            throw retryError; // Re-lançar erro se não for recuperável
          }
        }
      }

      if (response) {
        this.serviceStages = response.stages;
        this.stageProgress = response.progress.progressPercentage;
        console.log('Etapas do serviço carregadas:', this.serviceStages);
      } else {
        // Se todas as tentativas falharam
        console.warn('Não foi possível carregar etapas após todas as tentativas');
        this.serviceStages = [];
        this.stageProgress = 0;
      }
    } catch (error: any) {
      console.error('Erro ao carregar etapas do serviço:', error);

      // Tratamento específico para diferentes tipos de erro
      if (error.status === 0) {
        // Erro de conectividade/recursos
        console.warn('🌐 Erro de conexão com o servidor');
        this.serviceStages = [];
        this.stageProgress = 0;
        // Não mostrar toastr para erro de conectividade, apenas log
      } else if (error.status === 404 || (error.error && error.error.error === 'Serviço não encontrado')) {
        // Serviço não encontrado - normal, não há etapas ainda
        console.log('Nenhuma etapa encontrada para este serviço');
        this.serviceStages = [];
        this.stageProgress = 0;
      } else {
        // Outros erros - mostrar ao usuário
        console.error('Service', this.service.service.id, 'has no stages configured or error loading progress:', error);
        this.serviceStages = [];
        this.stageProgress = 0;
        this.toastr.warning('Não foi possível carregar as etapas do serviço');
      }
    } finally {
      this.isLoadingStages = false;
    }
  }

  async toggleStageStatus(stage: ServiceStage, event: any) {
    if (!this.canEdit) {
      this.toastr.warning('Você não tem permissão para alterar as etapas');
      // Reverter o checkbox
      event.target.checked = stage.status === 'completed';
      return;
    }

    // Se a etapa está marcada como N/A, não permitir marcar como concluída
    if (stage.is_not_applicable) {
      this.toastr.warning('Etapa marcada como não aplicável não pode ser concluída');
      event.target.checked = false;
      return;
    }

    const newStatus: 'pending' | 'completed' = event.target.checked ? 'completed' : 'pending';
    const oldProgress = this.stageProgress;

    try {
      const response = await this.serviceStageService.updateStageStatus(stage.id, newStatus).toPromise();

      if (response) {
        // Atualizar o stage na lista
        const stageIndex = this.serviceStages.findIndex(s => s.id === stage.id);
        if (stageIndex !== -1) {
          this.serviceStages[stageIndex] = response.stage;
        }

        // Atualizar o progresso
        if (response.progress) {
          this.stageProgress = response.progress.progressPercentage;
        } else {
          // Calcular progresso localmente
          this.stageProgress = this.serviceStageService.calculateProgress(this.serviceStages);
        }

        // Lógica automática de mudança de status baseada no progresso
        await this.updateStatusBasedOnProgress(oldProgress, this.stageProgress);
      }
    } catch (error: any) {
      console.error('Erro ao atualizar status da etapa:', error);
      this.toastr.error('Erro ao atualizar status da etapa');

      // Reverter o checkbox
      event.target.checked = stage.status === 'completed';
    }
  }

  async toggleStageNotApplicable(stage: ServiceStage, event: any) {
    if (!this.canEdit) {
      this.toastr.warning('Você não tem permissão para alterar as etapas');
      // Reverter o checkbox
      event.target.checked = stage.is_not_applicable || false;
      return;
    }

    // Se a etapa está marcada como concluída, não permitir marcar como N/A
    if (stage.status === 'completed') {
      this.toastr.warning('Etapa concluída não pode ser marcada como não aplicável');
      event.target.checked = false;
      return;
    }

    const isNotApplicable = event.target.checked;
    const oldProgress = this.stageProgress;

    try {
      const response = await this.serviceStageService.updateStageNotApplicable(stage.id, isNotApplicable).toPromise();

      if (response) {
        // Atualizar o stage na lista
        const stageIndex = this.serviceStages.findIndex(s => s.id === stage.id);
        if (stageIndex !== -1) {
          this.serviceStages[stageIndex] = response.stage;
        }

        // Atualizar o progresso
        if (response.progress) {
          this.stageProgress = response.progress.progressPercentage;
        } else {
          // Calcular progresso localmente
          this.stageProgress = this.serviceStageService.calculateProgress(this.serviceStages);
        }

        // Lógica automática de mudança de status baseada no progresso
        await this.updateStatusBasedOnProgress(oldProgress, this.stageProgress);

        this.toastr.success(`Etapa marcada como ${isNotApplicable ? 'não aplicável' : 'aplicável'}`);
      }
    } catch (error: any) {
      console.error('Erro ao atualizar etapa N/A:', error);
      this.toastr.error('Erro ao atualizar etapa');

      // Reverter o checkbox
      event.target.checked = stage.is_not_applicable || false;
    }
  }

  async updateStatusBasedOnProgress(oldProgress: number, newProgress: number) {
    // Não fazer nada se o progresso não mudou
    if (oldProgress === newProgress) {
      return;
    }

    let newStatus: 'not_started' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | null = null;
    let statusMessage = '';

    // Se chegou a 100%, marcar como finalizado (exceto se já estiver cancelado)
    if (newProgress === 100 && this.selectedStatus !== 'cancelled' && this.selectedStatus !== 'completed') {
      newStatus = 'completed';
      statusMessage = 'Rotina marcada como finalizada automaticamente (100% concluído)';
    }
    // Se saiu de 0% e não está cancelado, marcar como em andamento
    else if (oldProgress === 0 && newProgress > 0 && this.selectedStatus === 'not_started') {
      newStatus = 'in_progress';
      statusMessage = 'Rotina marcada como em andamento automaticamente';
    }

    // Se houver mudança de status, atualizar
    if (newStatus) {
      try {
        this.selectedStatus = newStatus;

        const updates = {
          status: this.selectedStatus,
          scheduled_date: this.selectedDate || null,
          notes: this.routineNotes || null
        };

        // Atualizar a rotina no backend
        if (this.service?.id) {
          const updatedRoutine = await this.routineService.updateRoutine(this.service.id, updates).toPromise();
          if (updatedRoutine) {
            this.routine = updatedRoutine;
            this.toastr.success(statusMessage);
          }
        }
      } catch (error: any) {
        console.error('Erro ao atualizar status automaticamente:', error);
        // Não mostrar erro ao usuário, pois a etapa já foi atualizada com sucesso
      }
    }
  }

  getCurrentStatusInfo() {
    return this.serviceStatuses.find(status => status.value === this.selectedStatus)
           || this.serviceStatuses[0];
  }

  setupBreadcrumb() {
    const breadcrumbs: BreadcrumbItem[] = [
      {
        label: 'Home',
        url: '/home',
        icon: 'fas fa-home'
      },
      {
        label: 'Rotinas',
        url: '/home/rotinas'
      }
    ];

    // Adicionar "Visualizar rotinas" com o ID do contrato
    if (this.contract) {
      breadcrumbs.push({
        label: 'Visualizar rotinas',
        url: `/home/rotinas/visualizar/${this.contract.id}`
      });
    }

    // Adicionar o nome do serviço como último item
    if (this.service && this.service.service) {
      breadcrumbs.push({
        label: this.service.service.name
      });
    }

    this.breadcrumbService.setBreadcrumbs(breadcrumbs);
  }

  async saveServiceData() {
    if (!this.service || !this.canEdit) {
      this.toastr.warning('Você não tem permissão para editar este serviço');
      return;
    }

    if (this.isSaving) {
      return; // Evitar múltiplos cliques
    }

    try {
      this.isSaving = true;
      
      const updates = {
        status: this.selectedStatus,
        scheduled_date: null as string | null,
        notes: null as string | null
      };
      
      // Adicionar data se fornecida
      if (this.selectedDate) {
        updates.scheduled_date = this.selectedDate;
      } else {
        updates.scheduled_date = null;
      }
      
      // Adicionar notas se fornecidas
      if (this.routineNotes?.trim()) {
        updates.notes = this.routineNotes.trim();
      } else {
        updates.notes = null;
      }

      // Fazer a atualização da rotina
      const updatedRoutine = await this.routineService.updateRoutine(this.service.id, updates).toPromise();
      
      if (updatedRoutine) {
        this.routine = updatedRoutine;
        this.toastr.success('Alterações salvas com sucesso!', 'Sucesso', {
          timeOut: 3000,
          progressBar: true,
          closeButton: true
        });
      }

    } catch (error: any) {
      console.error('Erro ao atualizar rotina:', error);
      this.toastr.error(error.error?.message || 'Erro ao salvar alterações', 'Erro', {
        timeOut: 5000,
        progressBar: true,
        closeButton: true
      });
    } finally {
      this.isSaving = false;
    }
  }

  goBackToContract() {
    if (this.contract) {
      this.router.navigate(['/home/contratos/visualizar', this.contract.id]);
    } else {
      this.router.navigate(['/home/rotinas']);
    }
  }

  formatCurrency(value: number | undefined): string {
    if (!value) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }

  formatDate(date: string | null | undefined): string {
    if (!date) return 'Não definida';
    return new Date(date).toLocaleDateString('pt-BR');
  }

  formatCommentDate(date: string): string {
    const commentDate = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - commentDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins} min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays}d atrás`;
    
    return commentDate.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    });
  }

  getCurrentUserId(): number {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        return user.id || 0;
      } catch (e) {
        return 0;
      }
    }
    return 0;
  }

  getCompletedStagesCount(): number {
    return this.serviceStages.filter(stage => stage.status === 'completed').length;
  }


  async loadComments() {
    if (!this.routine?.id) {
      this.comments = [];
      return;
    }

    try {
      this.isLoadingComments = true;

      // Implementar retry para comentários também
      const maxRetries = 2;
      let retryCount = 0;
      let comments = null;

      while (retryCount < maxRetries && !comments) {
        try {
          comments = await this.routineService.getRoutineComments(this.routine.id).toPromise();
          break;
        } catch (retryError: any) {
          retryCount++;

          if ((retryError.status === 0 || retryError.message?.includes('ERR_INSUFFICIENT_RESOURCES')) && retryCount < maxRetries) {
            console.warn(`Tentativa de carregar comentários ${retryCount}/${maxRetries} falhou, tentando novamente...`);
            await new Promise(resolve => setTimeout(resolve, retryCount * 500));
            continue;
          } else {
            throw retryError;
          }
        }
      }

      if (comments) {
        // Debug: verificar se os anexos estão vindo do backend
        console.log('Comentários carregados:', comments);
        this.comments = comments;

        // Verificar cada comentário e seus anexos
        this.comments.forEach(comment => {
          if (comment.has_attachments) {
            console.log(`Comentário ${comment.id} tem anexos:`, comment.attachments);
          }
        });
      } else {
        console.warn('Não foi possível carregar comentários após todas as tentativas');
        this.comments = [];
      }
    } catch (error: any) {
      console.error('Erro ao carregar comentários:', error);
      this.comments = [];

      // Tratamento específico para erro 403 (Acesso negado)
      if (error.status === 403) {
        this.toastr.warning(
          'Você não tem permissão para acessar os comentários desta rotina.',
          'Acesso Negado',
          {
            timeOut: 5000,
            progressBar: true,
            closeButton: true,
            positionClass: 'toast-top-center'
          }
        );
      } else if (error.status !== 0) {
        this.toastr.error('Erro ao carregar comentários');
      }
    } finally {
      this.isLoadingComments = false;
    }
  }

  onCommentKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && event.ctrlKey) {
      event.preventDefault();
      this.sendComment();
    }
  }

  async sendComment() {
    if (!this.newComment.trim() || this.isSendingComment || !this.canEdit) {
      return;
    }

    // Se a rotina ainda não foi criada no banco, criar primeiro
    if (!this.routine?.id) {
      try {
        const updatedRoutine = await this.routineService.updateRoutine(this.serviceId, {
          status: this.selectedStatus,
          scheduled_date: this.selectedDate || null,
          notes: this.routineNotes || null
        }).toPromise();
        
        if (updatedRoutine) {
          this.routine = updatedRoutine;
        } else {
          this.toastr.error('Erro ao criar rotina');
          return;
        }
      } catch (error) {
        console.error('Erro ao criar rotina:', error);
        this.toastr.error('Erro ao criar rotina antes de adicionar comentário');
        return;
      }
    }

    try {
      this.isSendingComment = true;

      // BUGFIX: Validar se this.routine.id corresponde ao routineId da URL
      // Previne race condition onde this.routine ainda não foi atualizado
      if (!this.routine || !this.routine.id) {
        this.toastr.error('Erro: Rotina não carregada. Aguarde o carregamento completo.');
        this.isSendingComment = false;
        return;
      }

      if (this.routine.id !== this.routineId) {
        console.error('🚨 RACE CONDITION DETECTADA!', {
          routineIdFromObject: this.routine.id,
          routineIdFromURL: this.routineId,
          timestamp: new Date().toISOString()
        });
        this.toastr.error('Erro: Dados desatualizados. Aguarde o carregamento completo.');
        this.isSendingComment = false;
        return;
      }

      console.log('✅ Validação OK: Enviando comentário para rotina', {
        routineId: this.routine.id,
        routineIdFromURL: this.routineId,
        comment: this.newComment.substring(0, 50)
      });

      // Enviar comentário para a rotina usando o ID da URL (fonte da verdade)
      const newComment = await this.routineService.addComment(this.routineId, this.newComment.trim(), this.selectedStageId || undefined).toPromise();
      
      if (newComment) {
        // Se houver arquivos selecionados, fazer upload primeiro
        if (this.selectedFiles.length > 0 && newComment.id) {
          // Adicionar comentário temporariamente sem anexos
          newComment.attachments = [];
          this.comments.push(newComment);
          
          // Fazer upload dos arquivos
          await this.uploadAttachments(newComment.id);
        } else {
          // Adicionar comentário sem anexos
          this.comments.push(newComment);
        }
        
        // Limpar formulário
        this.newComment = '';
        this.selectedStageId = null;
        this.selectedFiles = [];
        this.toastr.success('Comentário adicionado com sucesso');
        
        // Scroll para o final da lista
        setTimeout(() => {
          const commentsList = document.querySelector('.comments-list');
          if (commentsList) {
            commentsList.scrollTop = commentsList.scrollHeight;
          }
        }, 100);
      }
      
    } catch (error: any) {
      console.error('Erro ao enviar comentário:', error);
      this.toastr.error(error.error?.error || 'Erro ao enviar comentário');
    } finally {
      this.isSendingComment = false;
    }
  }

  async uploadAttachments(commentId: number) {
    let uploadedCount = 0;
    const totalFiles = this.selectedFiles.length;
    
    for (const file of this.selectedFiles) {
      try {
        const uploadKey = `${commentId}_${file.name}`;
        this.uploadProgress[uploadKey] = 0;
        
        this.attachmentService.uploadFile(commentId, file).subscribe({
          next: async (progress) => {
            console.log('Progress update:', progress);
            this.uploadProgress[uploadKey] = progress.progress;
            
            if (progress.status === 'completed') {
              console.log('Upload completed, attachment data:', progress.attachment);
              
              // Atualizar o comentário com o novo anexo
              const comment = this.comments.find(c => c.id === commentId);
              if (comment) {
                console.log('Found comment to update:', comment);
                comment.has_attachments = true;
                if (!comment.attachments) {
                  comment.attachments = [];
                }
                comment.attachments.push(progress.attachment);
                console.log('Updated comment with attachment:', comment);
              } else {
                console.error('Comment not found for ID:', commentId);
              }
              
              delete this.uploadProgress[uploadKey];
              uploadedCount++;
              
              // Se todos os arquivos foram enviados, recarregar os comentários para garantir sincronização
              if (uploadedCount === totalFiles) {
                console.log('All files uploaded, reloading comments...');
                await this.loadComments();
              }
              
              this.toastr.success(`Arquivo ${file.name} enviado com sucesso!`);
            }
          },
          error: (error) => {
            console.error('Erro no upload:', error);
            this.toastr.error(`Erro ao enviar arquivo ${file.name}: ${error.error || error}`);
            delete this.uploadProgress[uploadKey];
          }
        });
      } catch (error) {
        console.error('Erro ao fazer upload de anexo:', error);
        this.toastr.error(`Erro ao processar arquivo ${file.name}`);
      }
    }
  }

  onFileSelect(event: any) {
    const files = Array.from(event.target.files) as File[];
    for (const file of files) {
      const validation = this.attachmentService.validateFile(file);
      if (validation.valid) {
        this.selectedFiles.push(file);
      } else {
        this.toastr.error(validation.error || 'Arquivo inválido');
      }
    }
    // Limpar input para permitir selecionar o mesmo arquivo novamente
    event.target.value = '';
  }

  removeSelectedFile(index: number) {
    this.selectedFiles.splice(index, 1);
  }

  formatFileSize(bytes: number): string {
    return this.attachmentService.formatFileSize(bytes);
  }

  getFileIcon(mimeType: string): string {
    return this.attachmentService.getFileIcon(mimeType);
  }

  downloadAttachment(attachment: any) {
    console.log('Iniciando download do anexo:', attachment);
    
    this.attachmentService.downloadAttachment(attachment.id).subscribe({
      next: (blob) => {
        console.log('Blob recebido, tamanho:', blob.size);
        
        if (blob.size === 0) {
          this.toastr.error('Arquivo vazio recebido');
          return;
        }
        
        // Criar URL para o blob e iniciar download
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = attachment.original_name;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        this.toastr.success(`Arquivo ${attachment.original_name} baixado com sucesso!`);
      },
      error: (error) => {
        console.error('Erro ao baixar anexo:', error);
        
        let errorMessage = 'Erro ao baixar o arquivo';
        if (error.status === 404) {
          errorMessage = 'Arquivo não encontrado';
        } else if (error.status === 403) {
          errorMessage = 'Sem permissão para baixar este arquivo';
        } else if (error.error && error.error.message) {
          errorMessage = error.error.message;
        }
        
        this.toastr.error(errorMessage);
      }
    });
  }

  async deleteComment(commentId: number) {
    if (!this.canEdit) {
      this.toastr.warning('Você não tem permissão para deletar comentários');
      return;
    }

    // Confirmação antes de deletar
    if (!confirm('Tem certeza que deseja deletar este comentário? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      const result = await this.routineService.deleteComment(commentId).toPromise();

      if (result && result.success) {
        // Remover comentário da lista
        this.comments = this.comments.filter(comment => comment.id !== commentId);

        this.toastr.success('Comentário deletado com sucesso!', 'Sucesso', {
          timeOut: 3000,
          progressBar: true,
          closeButton: true
        });
      }
    } catch (error: any) {
      console.error('Erro ao deletar comentário:', error);

      if (error.status === 403) {
        this.toastr.error('Você só pode deletar seus próprios comentários', 'Erro', {
          timeOut: 5000,
          progressBar: true,
          closeButton: true
        });
      } else if (error.status === 404) {
        this.toastr.error('Comentário não encontrado', 'Erro', {
          timeOut: 5000,
          progressBar: true,
          closeButton: true
        });
      } else {
        this.toastr.error(
          error.error?.message || 'Erro ao deletar comentário',
          'Erro',
          {
            timeOut: 5000,
            progressBar: true,
            closeButton: true
          }
        );
      }
    }
  }

  async markAllStagesComplete() {
    if (!this.canEdit || this.isMarkingAll) {
      return;
    }

    // Filtrar apenas as etapas que podem ser marcadas (não N/A e não já completas)
    const stagesToComplete = this.serviceStages.filter(
      stage => stage.status !== 'completed' && !stage.is_not_applicable
    );

    if (stagesToComplete.length === 0) {
      this.toastr.info('Todas as etapas aplicáveis já estão concluídas');
      return;
    }

    // Confirmação
    const confirmMessage = `Tem certeza que deseja marcar ${stagesToComplete.length} etapa(s) como concluída(s)?`;
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      this.isMarkingAll = true;
      const oldProgress = this.stageProgress;
      let successCount = 0;
      let errorCount = 0;

      // Marcar todas as etapas pendentes como concluídas
      for (const stage of stagesToComplete) {
        try {
          const response = await this.serviceStageService.updateStageStatus(stage.id, 'completed').toPromise();

          if (response) {
            // Atualizar o stage na lista
            const stageIndex = this.serviceStages.findIndex(s => s.id === stage.id);
            if (stageIndex !== -1) {
              this.serviceStages[stageIndex] = response.stage;
            }
            successCount++;
          }
        } catch (error) {
          console.error(`Erro ao marcar etapa ${stage.id}:`, error);
          errorCount++;
        }
      }

      // Recarregar o progresso após marcar todas
      if (successCount > 0) {
        await this.loadServiceStages();

        // Lógica automática de mudança de status baseada no progresso
        await this.updateStatusBasedOnProgress(oldProgress, this.stageProgress);

        if (errorCount === 0) {
          this.toastr.success(`${successCount} etapa(s) marcada(s) como concluída(s) com sucesso!`);
        } else {
          this.toastr.warning(`${successCount} etapa(s) marcada(s), mas ${errorCount} falharam`);
        }
      } else {
        this.toastr.error('Não foi possível marcar nenhuma etapa');
      }

    } catch (error: any) {
      console.error('Erro ao marcar todas as etapas:', error);
      this.toastr.error('Erro ao marcar todas as etapas');
    } finally {
      this.isMarkingAll = false;
    }
  }
}