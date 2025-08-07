import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContractService, ApiContractService, ServiceComment } from '../../services/contract';
import { AttachmentService, ServiceCommentAttachment, AttachmentUploadProgress } from '../../services/attachment.service';
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

  serviceStatuses = [
    { value: 'not_started', label: 'Não iniciado' },
    { value: 'scheduled', label: 'Agendado' },
    { value: 'in_progress', label: 'Em andamento' },
    { value: 'completed', label: 'Finalizado' }
  ];

  constructor(
    private contractService: ContractService,
    private attachmentService: AttachmentService,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    // Inicializar status dos serviços se não existir e ordenar alfabeticamente
    this.services.forEach(service => {
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
    }
  }
  
  private sortServices() {
    this.services.sort((a, b) => {
      const nameA = a.service.name.toLowerCase();
      const nameB = b.service.name.toLowerCase();
      return nameA.localeCompare(nameB, 'pt-BR');
    });
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