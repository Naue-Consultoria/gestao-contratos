import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ContractService, ApiContractService } from '../../services/contract';
import { RoutineService, ServiceRoutine, RoutineComment } from '../../services/routine.service';
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

  routineId!: number;
  serviceId!: number;
  service: ApiContractService | null = null;
  contract: any = null;
  routine: ServiceRoutine | null = null;
  isLoading = true;
  error: string | null = null;
  canEdit = false;

  // Propriedades do formulário de controle
  selectedStatus: 'not_started' | 'scheduled' | 'in_progress' | 'completed' = 'not_started';
  selectedDate = '';
  routineNotes = '';
  isSaving = false;
  
  // Propriedades de comentários
  comments: RoutineComment[] = [];
  newComment = '';
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
    { value: 'completed', label: 'Finalizado', color: '#28a745', icon: 'fas fa-check' }
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
      } catch (serviceError) {
        console.error('Erro ao carregar dados:', serviceError);
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
      
      // Carregar comentários da rotina
      if (this.routine?.id) {
        this.loadComments();
      }

    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
      this.error = 'Erro ao carregar dados';
    } finally {
      this.isLoading = false;
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


  async loadComments() {
    if (!this.routine?.id) {
      this.comments = [];
      return;
    }
    
    try {
      this.isLoadingComments = true;
      const comments = await this.routineService.getRoutineComments(this.routine.id).toPromise();
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
      }
    } catch (error) {
      console.error('Erro ao carregar comentários:', error);
      this.toastr.error('Erro ao carregar comentários');
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
      
      // Enviar comentário para a rotina
      const newComment = await this.routineService.addComment(this.routine.id!, this.newComment.trim()).toPromise();
      
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
    // Implementar download do anexo
    this.attachmentService.downloadAttachment(attachment.id).subscribe({
      next: (blob) => {
        // Criar URL para o blob e iniciar download
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = attachment.original_name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        this.toastr.success(`Arquivo ${attachment.original_name} baixado com sucesso!`);
      },
      error: (error) => {
        console.error('Erro ao baixar anexo:', error);
        this.toastr.error('Erro ao baixar o arquivo');
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
}