import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContractService, ApiContractService, ServiceComment } from '../../services/contract';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-contract-services-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contract-services-manager.html',
  styleUrls: ['./contract-services-manager.css']
})
export class ContractServicesManagerComponent implements OnInit {
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

  serviceStatuses = [
    { value: 'not_started', label: 'Não iniciado' },
    { value: 'scheduled', label: 'Agendado' },
    { value: 'in_progress', label: 'Em andamento' },
    { value: 'completed', label: 'Finalizado' }
  ];

  constructor(
    private contractService: ContractService,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    // Inicializar status dos serviços se não existir
    this.services.forEach(service => {
      if (!service.status) {
        service.status = 'not_started';
      }
    });
  }

  formatValue(value: number): string {
    return this.contractService.formatValue(value);
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
    if (!this.canEdit || !newStatus) return;

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
    if (!this.canEdit) return;

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
    this.showComments[serviceId] = !this.showComments[serviceId];
    
    if (this.showComments[serviceId] && !this.comments[serviceId]) {
      this.loadComments(serviceId);
    }
  }

  loadComments(serviceId: number) {
    this.loadingComments[serviceId] = true;
    
    this.contractService.getServiceComments(serviceId).subscribe({
      next: (response) => {
        this.comments[serviceId] = response.comments;
        this.loadingComments[serviceId] = false;
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
    const currentUserId = parseInt(localStorage.getItem('userId') || '0');
    return comment.user.id === currentUserId;
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
}