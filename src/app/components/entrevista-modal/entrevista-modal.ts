import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { EntrevistaService, Entrevista, Entrevistador } from '../../services/entrevista.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-entrevista-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './entrevista-modal.html',
  styleUrl: './entrevista-modal.css'
})
export class EntrevistaModal implements OnInit {
  @Input() isOpen: boolean = false;
  @Input() entrevista: Entrevista | null = null;
  @Input() vagaCandidatoId: number | null = null;
  @Input() candidatoNome: string = '';
  @Output() modalClosed = new EventEmitter<void>();
  @Output() entrevistaSaved = new EventEmitter<Entrevista>();

  entrevistaForm!: FormGroup;
  isLoading = false;
  isEditMode = false;
  entrevistadores: Entrevistador[] = [];

  constructor(
    private fb: FormBuilder,
    private entrevistaService: EntrevistaService,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    this.initForm();
    this.loadEntrevistadores();
    this.setupModalForEditing();
  }

  initForm() {
    this.entrevistaForm = this.fb.group({
      data_entrevista: ['', Validators.required],
      hora_entrevista: ['', Validators.required],
      link_chamada: ['']
    });
  }

  loadEntrevistadores() {
    // Removido - não é mais necessário
  }

  setupModalForEditing() {
    if (this.entrevista) {
      this.isEditMode = true;
      this.entrevistaForm.patchValue({
        data_entrevista: this.entrevista.data_entrevista,
        hora_entrevista: this.entrevista.hora_entrevista,
        link_chamada: this.entrevista.link_chamada || ''
      });
    } else {
      this.isEditMode = false;
      this.entrevistaForm.reset({
        data_entrevista: '',
        hora_entrevista: '',
        link_chamada: ''
      });
    }
  }

  get formControls() {
    return this.entrevistaForm.controls;
  }

  onSubmit() {
    if (this.entrevistaForm.valid && this.vagaCandidatoId) {
      this.isLoading = true;
      this.entrevistaForm.disable();

      const entrevistaData: Entrevista = {
        ...this.entrevistaForm.value,
        vaga_candidato_id: this.vagaCandidatoId
      };

      const operation = this.isEditMode && this.entrevista?.id
        ? this.entrevistaService.updateEntrevista(this.entrevista.id, entrevistaData)
        : this.entrevistaService.createEntrevista(entrevistaData);

      operation.subscribe({
        next: (savedEntrevista) => {
          this.toastr.success(
            this.isEditMode ? 'Entrevista atualizada com sucesso!' : 'Entrevista agendada com sucesso!',
            'Sucesso'
          );
          this.entrevistaSaved.emit(savedEntrevista);
          this.closeModal();
          this.isLoading = false;
          this.entrevistaForm.enable();
        },
        error: (error) => {
          console.error('Erro ao salvar entrevista:', error);
          this.toastr.error(
            'Erro ao agendar entrevista. Tente novamente.',
            'Erro'
          );
          this.isLoading = false;
          this.entrevistaForm.enable();
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  closeModal() {
    this.isOpen = false;
    this.modalClosed.emit();
    this.entrevistaForm.reset();
  }

  onBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  private markFormGroupTouched() {
    Object.keys(this.entrevistaForm.controls).forEach(key => {
      const control = this.entrevistaForm.get(key);
      control?.markAsTouched();
    });
  }
}
