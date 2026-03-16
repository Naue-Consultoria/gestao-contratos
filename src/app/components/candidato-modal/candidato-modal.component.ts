import { Component, EventEmitter, Input, OnInit, OnChanges, SimpleChanges, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { CandidatoService, Candidato } from '../../services/candidato.service';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-candidato-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './candidato-modal.component.html',
  styleUrl: './candidato-modal.component.css'
})
export class CandidatoModalComponent implements OnInit, OnChanges {
  @Input() isOpen: boolean = false;
  @Input() candidato: Candidato | null = null;
  @Input() vagaId: number | null = null;
  @Input() candidatosVinculados: number[] = [];
  @Output() modalClosed = new EventEmitter<void>();
  @Output() candidatoSaved = new EventEmitter<Candidato>();
  @Output() candidatoSelecionado = new EventEmitter<Candidato>();

  candidatoForm!: FormGroup;
  isLoading = false;
  isEditMode = false;

  // Abas: 'novo' ou 'existente'
  activeTab: 'novo' | 'existente' = 'novo';

  // Busca de candidatos existentes
  searchTerm = '';
  searchResults: Candidato[] = [];
  isSearching = false;
  private searchSubject = new Subject<string>();

  constructor(
    private fb: FormBuilder,
    private candidatoService: CandidatoService,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    this.initForm();
    this.setupModalForEditing();
    this.setupSearch();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['candidato'] && this.candidatoForm) {
      this.setupModalForEditing();
    }
    if (changes['isOpen'] && this.isOpen) {
      // Reset ao abrir o modal
      if (!this.candidato) {
        this.activeTab = 'novo';
        this.searchTerm = '';
        this.searchResults = [];
      }
    }
  }

  initForm() {
    this.candidatoForm = this.fb.group({
      nome: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.email]],
      telefone: [''],
      status: ['pendente', Validators.required]
    });
  }

  setupSearch() {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(term => {
        if (term.length < 2) {
          this.searchResults = [];
          this.isSearching = false;
          return [];
        }
        this.isSearching = true;
        return this.candidatoService.searchCandidatos(term);
      })
    ).subscribe({
      next: (response: any) => {
        this.searchResults = response?.data || response || [];
        this.isSearching = false;
      },
      error: () => {
        this.searchResults = [];
        this.isSearching = false;
      }
    });
  }

  onSearchChange() {
    this.searchSubject.next(this.searchTerm);
  }

  isCandidatoJaVinculado(candidato: Candidato): boolean {
    return this.candidatosVinculados.includes(candidato.id!);
  }

  selecionarCandidato(candidato: Candidato) {
    if (this.isCandidatoJaVinculado(candidato)) {
      this.toastr.warning('Este candidato já está vinculado a esta vaga.', 'Aviso');
      return;
    }
    this.candidatoSelecionado.emit(candidato);
    this.closeModal();
  }

  setupModalForEditing() {
    if (this.candidato) {
      this.isEditMode = true;
      this.activeTab = 'novo';
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

  setActiveTab(tab: 'novo' | 'existente') {
    this.activeTab = tab;
  }

  onSubmit() {
    if (this.candidatoForm.valid) {
      this.isLoading = true;
      this.candidatoForm.disable();

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
          this.candidatoForm.enable();
        },
        error: (error) => {
          console.error('Erro ao salvar candidato:', error);
          this.toastr.error(
            'Erro ao salvar candidato. Tente novamente.',
            'Erro'
          );
          this.isLoading = false;
          this.candidatoForm.enable();
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
    this.searchTerm = '';
    this.searchResults = [];
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

    // Limitar a 11 dígitos
    if (value.length > 11) {
      value = value.slice(0, 11);
    }

    // Aplicar máscara baseado no tamanho
    if (value.length <= 10) {
      // Formato: (11) 1234-5678
      value = value.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
    } else {
      // Formato: (11) 91234-5678
      value = value.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, '($1) $2-$3');
    }

    // Remover traço se não houver números depois dele
    value = value.replace(/-$/, '');

    // Atualizar o campo
    event.target.value = value;
    this.candidatoForm.patchValue({ telefone: value }, { emitEvent: false });
  }
}
