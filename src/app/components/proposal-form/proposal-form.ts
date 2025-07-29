import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

import { ProposalService, CreateProposalData, Proposal } from '../../services/proposal';
import { CompanyService, ApiCompany, CreateCompanyRequest } from '../../services/company';
import { ServiceService, ApiService } from '../../services/service';

@Component({
  selector: 'app-proposal-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './proposal-form.html',
  styleUrls: ['./proposal-form.css']
})
export class ProposalFormComponent implements OnInit, OnDestroy {
  @Input() proposalId?: number;
  @Input() isModal = false;
  @Output() onSave = new EventEmitter<Proposal>();
  @Output() onCancel = new EventEmitter<void>();

  proposalForm!: FormGroup;
  companies: ApiCompany[] = [];
  services: ApiService[] = [];
  isLoading = false;
  isSubmitting = false;
  isEditMode = false;
  showNewCompanyForm = false;
  newCompanyForm!: FormGroup;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private proposalService: ProposalService,
    private companyService: CompanyService,
    private serviceService: ServiceService,
    private toastr: ToastrService
  ) {
    this.initializeForms();
  }

  ngOnInit(): void {
    this.loadInitialData();
    
    if (this.proposalId) {
      this.isEditMode = true;
      this.loadProposal();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForms(): void {
    this.proposalForm = this.fb.group({
      company_id: ['', Validators.required],
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      services: this.fb.array([]),
      valid_until: [''],
      observations: ['']
    });

    this.newCompanyForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      headquarters: [''],
      market_sector: [''],
      description: ['']
    });

    // Adicionar pelo menos um serviço vazio
    this.addService();
  }

  private loadInitialData(): void {
    this.isLoading = true;
    
    forkJoin({
      companies: this.companyService.getCompanies({ is_active: true }),
      services: this.serviceService.getServices({ is_active: true })
    }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (data) => {
        this.companies = data.companies.companies || [];
        this.services = data.services.services || [];
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erro ao carregar dados:', error);
        this.toastr.error('Erro ao carregar dados necessários');
        this.isLoading = false;
      }
    });
  }

  private loadProposal(): void {
    if (!this.proposalId) return;

    this.proposalService.getProposal(this.proposalId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.populateForm(response.data);
          }
        },
        error: (error) => {
          console.error('Erro ao carregar proposta:', error);
          this.toastr.error('Erro ao carregar proposta');
        }
      });
  }

  private populateForm(proposal: Proposal): void {
    this.proposalForm.patchValue({
      company_id: proposal.company_id,
      title: proposal.title,
      description: proposal.description,
      valid_until: proposal.valid_until ? proposal.valid_until.split('T')[0] : '',
      observations: proposal.observations
    });

    // Limpar serviços e adicionar os da proposta
    this.servicesArray.clear();
    proposal.services.forEach(service => {
      this.addService(service);
    });
  }

  get servicesArray(): FormArray {
    return this.proposalForm.get('services') as FormArray;
  }

  addService(serviceData?: any): void {
    const serviceForm = this.fb.group({
      service_id: [serviceData?.service_id || '', Validators.required],
      quantity: [serviceData?.quantity || 1, [Validators.required, Validators.min(1)]],
      custom_value: [serviceData?.custom_value || null]
    });

    this.servicesArray.push(serviceForm);
  }

  removeService(index: number): void {
    if (this.servicesArray.length > 1) {
      this.servicesArray.removeAt(index);
    }
  }

  getServiceById(serviceId: number): ApiService | undefined {
    return this.services.find(s => s.id === serviceId);
  }

  getServiceValue(index: number): number {
    const serviceForm = this.servicesArray.at(index);
    const serviceId = serviceForm.get('service_id')?.value;
    const customValue = serviceForm.get('custom_value')?.value;
    
    if (customValue) return customValue;
    
    const service = this.getServiceById(serviceId);
    return service?.value || 0;
  }

  getServiceTotal(index: number): number {
    const serviceForm = this.servicesArray.at(index);
    const quantity = serviceForm.get('quantity')?.value || 1;
    const value = this.getServiceValue(index);
    return value * quantity;
  }

  getTotalValue(): number {
    let total = 0;
    for (let i = 0; i < this.servicesArray.length; i++) {
      total += this.getServiceTotal(i);
    }
    return total;
  }

  formatCurrency(value: number): string {
    return this.proposalService.formatCurrency(value);
  }

  onServiceChange(index: number): void {
    const serviceForm = this.servicesArray.at(index);
    const serviceId = serviceForm.get('service_id')?.value;
    
    if (serviceId) {
      const service = this.getServiceById(serviceId);
      if (service) {
        // Limpar valor personalizado quando mudar o serviço
        serviceForm.get('custom_value')?.setValue(null);
      }
    }
  }

  toggleNewCompanyForm(): void {
    this.showNewCompanyForm = !this.showNewCompanyForm;
    if (!this.showNewCompanyForm) {
      this.newCompanyForm.reset();
    }
  }

  createNewCompany(): void {
    if (this.newCompanyForm.invalid) {
      this.toastr.error('Preencha os campos obrigatórios da nova empresa');
      return;
    }

    const companyData: CreateCompanyRequest = this.newCompanyForm.value;
    
    this.companyService.createCompany(companyData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.companies.push(response.company);
          this.proposalForm.get('company_id')?.setValue(response.company.id);
          this.showNewCompanyForm = false;
          this.newCompanyForm.reset();
          this.toastr.success(response.message || 'Empresa criada com sucesso');
        },
        error: (error) => {
          console.error('Erro ao criar empresa:', error);
          this.toastr.error('Erro ao criar empresa');
        }
      });
  }

  onSubmit(): void {
    if (this.proposalForm.invalid) {
      this.markFormGroupTouched(this.proposalForm);
      this.toastr.error('Preencha todos os campos obrigatórios');
      return;
    }

    // Validar se há pelo menos um serviço
    if (this.servicesArray.length === 0) {
      this.toastr.error('Adicione pelo menos um serviço');
      return;
    }

    // Validar serviços
    let hasValidService = false;
    for (let i = 0; i < this.servicesArray.length; i++) {
      const serviceForm = this.servicesArray.at(i);
      if (serviceForm.valid && serviceForm.get('service_id')?.value) {
        hasValidService = true;
        break;
      }
    }

    if (!hasValidService) {
      this.toastr.error('Pelo menos um serviço deve ser válido');
      return;
    }

    this.isSubmitting = true;
    
    const formData: CreateProposalData = {
      ...this.proposalForm.value,
      services: this.servicesArray.value.filter((s: any) => s.service_id)
    };

    const operation = this.isEditMode 
      ? this.proposalService.updateProposal(this.proposalId!, formData)
      : this.proposalService.createProposal(formData);

    operation.pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        if (response.success) {
          this.toastr.success(
            this.isEditMode ? 'Proposta atualizada com sucesso' : 'Proposta criada com sucesso'
          );
          this.onSave.emit(response.data);
          
          if (!this.isModal) {
            this.resetForm();
          }
        }
        this.isSubmitting = false;
      },
      error: (error) => {
        console.error('Erro ao salvar proposta:', error);
        this.toastr.error('Erro ao salvar proposta');
        this.isSubmitting = false;
      }
    });
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      } else if (control instanceof FormArray) {
        control.controls.forEach(arrayControl => {
          if (arrayControl instanceof FormGroup) {
            this.markFormGroupTouched(arrayControl);
          }
        });
      }
    });
  }

  private resetForm(): void {
    this.proposalForm.reset();
    this.servicesArray.clear();
    this.addService();
    this.proposalForm.get('company_id')?.setValue('');
  }

  cancel(): void {
    this.onCancel.emit();
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.proposalForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  isServiceFieldInvalid(index: number, fieldName: string): boolean {
    const serviceForm = this.servicesArray.at(index);
    const field = serviceForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }
}