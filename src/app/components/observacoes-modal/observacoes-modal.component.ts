import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CandidatoService } from '../../services/candidato.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-observacoes-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './observacoes-modal.component.html',
  styleUrl: './observacoes-modal.component.css'
})
export class ObservacoesModalComponent implements OnInit {
  @Input() isOpen: boolean = false;
  @Input() candidato: any = null;
  @Output() modalClosed = new EventEmitter<void>();
  @Output() observacoesSaved = new EventEmitter<any>();

  observacoes: string = '';
  isLoading: boolean = false;
  originalObservacoes: string = '';

  constructor(
    private candidatoService: CandidatoService,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    if (this.candidato?.observacoes) {
      this.observacoes = this.candidato.observacoes;
      this.originalObservacoes = this.candidato.observacoes;
    }
  }

  ngOnChanges() {
    if (this.isOpen && this.candidato) {
      this.observacoes = this.candidato.observacoes || '';
      this.originalObservacoes = this.candidato.observacoes || '';
    }
  }

  onSave() {
    if (this.candidato && this.candidato.id) {
      this.isLoading = true;

      this.candidatoService.updateCandidato(this.candidato.id, {
        ...this.candidato,
        observacoes: this.observacoes
      }).subscribe({
        next: (updatedCandidato) => {
          this.toastr.success('Observações salvas com sucesso!', 'Sucesso');
          this.observacoesSaved.emit(updatedCandidato);
          this.closeModal();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Erro ao salvar observações:', error);
          this.toastr.error('Erro ao salvar observações. Tente novamente.', 'Erro');
          this.isLoading = false;
        }
      });
    }
  }

  closeModal() {
    this.modalClosed.emit();
    this.isOpen = false;
  }

  onBackdropClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal')) {
      this.closeModal();
    }
  }

  hasChanges(): boolean {
    return this.observacoes !== this.originalObservacoes;
  }
}