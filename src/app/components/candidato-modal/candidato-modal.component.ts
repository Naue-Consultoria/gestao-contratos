import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CandidatoService, Candidato } from '../../services/candidato.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-candidato-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './candidato-modal.component.html',
  styleUrl: './candidato-modal.component.css'
})
export class CandidatoModalComponent implements OnInit {
  @Input() isOpen: boolean = false;
  @Input() candidato: Candidato | null = null;
  @Output() modalClosed = new EventEmitter<void>();
  @Output() candidatoSaved = new EventEmitter<Candidato>();

  candidatoForm!: FormGroup;
  isLoading = false;
  isEditMode = false;

  constructor(
    private fb: FormBuilder,
    private candidatoService: CandidatoService,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    this.initForm();
    this.setupModalForEditing();
  }

  initForm() {
    this.candidatoForm = this.fb.group({
      nome: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.email]],
      telefone: [''],
      status: ['pendente', Validators.required]
    });
  }

  setupModalForEditing() {
    if (this.candidato) {
      this.isEditMode = true;
      this.candidatoForm.patchValue({
        nome: this.candidato.nome,
        email: this.candidato.email || '',
        telefone: this.candidato.telefone || '',
        status: this.candidato.status || 'pendente'
      });
    } else {
      this.isEditMode = false;
      this.candidatoForm.reset({
        nome: '',
        email: '',
        telefone: '',
        status: 'pendente'
      });
    }
  }

  get formControls() {
    return this.candidatoForm.controls;
  }

  onSubmit() {
    if (this.candidatoForm.valid) {
      this.isLoading = true;
      const candidatoData: Candidato = this.candidatoForm.value;

      const operation = this.isEditMode && this.candidato?.id
        ? this.candidatoService.updateCandidato(this.candidato.id, candidatoData)
        : this.candidatoService.createCandidato(candidatoData);

      operation.subscribe({
        next: (savedCandidato) => {
          this.toastr.success(
            this.isEditMode ? 'Candidato atualizado com sucesso!' : 'Candidato cadastrado com sucesso!',
            'Sucesso'
          );
          this.candidatoSaved.emit(savedCandidato);
          this.closeModal();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Erro ao salvar candidato:', error);
          this.toastr.error(
            'Erro ao salvar candidato. Tente novamente.',
            'Erro'
          );
          this.isLoading = false;
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  closeModal() {
    this.isOpen = false;
    this.modalClosed.emit();
    this.candidatoForm.reset();
  }

  onBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  onClose() {
    this.closeModal();
  }

  private markFormGroupTouched() {
    Object.keys(this.candidatoForm.controls).forEach(key => {
      const control = this.candidatoForm.get(key);
      control?.markAsTouched();
    });
  }

  formatPhone(event: any) {
    let value = event.target.value.replace(/\D/g, '');

    if (value.length <= 11) {
      value = value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
      if (value.length < 15) {
        value = value.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
      }
    }

    this.candidatoForm.patchValue({ telefone: value });
  }
}