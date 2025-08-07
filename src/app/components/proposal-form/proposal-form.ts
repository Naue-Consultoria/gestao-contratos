import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { DocumentMaskDirective } from '../../directives/document-mask.directive';
import { CurrencyMaskDirective } from '../../directives/currency-mask.directive';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { Router, ActivatedRoute } from '@angular/router';

import { ProposalService, CreateProposalData, Proposal } from '../../services/proposal';
import { ClientService, ApiClient, CreateClientRequest } from '../../services/client';
import { ServiceService, ApiService } from '../../services/service';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-proposal-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, DocumentMaskDirective, CurrencyMaskDirective, BreadcrumbComponent],
  templateUrl: './proposal-form.html',
  styleUrls: ['./proposal-form.css'],
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ transform: 'translateY(-10px)', opacity: 0 }),
        animate('200ms ease-out', style({ transform: 'translateY(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ transform: 'translateY(-10px)', opacity: 0 }))
      ])
    ])
  ]
})
export class ProposalFormComponent implements OnInit, OnDestroy {
  @Input() proposalId?: number;
  @Input() isModal = false;
  @Output() onSave = new EventEmitter<Proposal>();
  @Output() onCancel = new EventEmitter<void>();

  proposalForm!: FormGroup;
  clients: ApiClient[] = [];
  services: ApiService[] = [];
  isLoading = false;
  isSubmitting = false;
  isEditMode = false;
  showNewClientForm = false;
  newClientForm!: FormGroup;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private proposalService: ProposalService,
    private clientService: ClientService,
    private serviceService: ServiceService,
    private toastr: ToastrService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.initializeForms();
  }

  ngOnInit(): void {
    this.loadInitialData();
    
    // Verificar se há ID na rota (para edit/view mode)
    const routeId = this.route.snapshot.paramMap.get('id');
    if (routeId || this.proposalId) {
      this.proposalId = this.proposalId || parseInt(routeId!, 10);
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
      client_id: ['', Validators.required],
      end_date: [''],
      observations: [''],
      services: this.fb.array([]),
    });

    this.newClientForm = this.fb.group({
      client_type: ['', Validators.required],
      name: ['', [Validators.required, Validators.minLength(2)]],
      document: ['', [Validators.required, Validators.minLength(5)]],
      rg: [''],
      trade_name: [''],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      street: ['', Validators.required],
      number: ['', Validators.required],
      complement: [''],
      neighborhood: ['', Validators.required],
      city: ['', Validators.required],
      state: ['', Validators.required],
      zipcode: ['', [Validators.required, Validators.minLength(8)]],
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
      clients: this.clientService.getClients({}),
      services: this.serviceService.getServices({ is_active: true })
    }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (data) => {
        this.clients = data.clients.clients || [];
        // Filtrar apenas serviços ativos
        this.services = (data.services.services || []).filter(service => service.is_active);
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
      client_id: proposal.client_id,
      end_date: proposal.end_date ? proposal.end_date.split('T')[0] : '',
    });

    // Limpar serviços e adicionar os da proposta
    this.servicesArray.clear();
    proposal.services.forEach(service => {
      this.addService({
        service_id: service.service_id,
        quantity: service.quantity,
        unit_value: service.unit_value, // Already in reais
        total_value: service.total_value // Already in reais
      });
    });
  }

  get servicesArray(): FormArray {
    return this.proposalForm.get('services') as FormArray;
  }

  addService(serviceData?: any): void {
    const serviceForm = this.fb.group({
      service_id: [serviceData?.service_id || '', Validators.required],
      quantity: [serviceData?.quantity || 1, [Validators.required, Validators.min(1)]],
      unit_value: [serviceData?.unit_value || null, [Validators.min(0)]],
      total_value: [serviceData?.total_value || null, [Validators.min(0)]]
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
    const unitValue = serviceForm.get('unit_value')?.value;
    
    // If unit_value is provided and greater than 0, use it (already in reais)
    if (unitValue !== null && unitValue !== undefined && unitValue > 0) {
        return unitValue; // Already in reais
    }
    
    // If no unit_value, try to get from selected service
    const serviceId = serviceForm.get('service_id')?.value;
    // Serviços agora não têm valor pré-definido
    return 0;
  }

  getServiceTotal(index: number): number {
    const serviceForm = this.servicesArray.at(index);
    const quantity = serviceForm.get('quantity')?.value || 1;
    const unitValue = this.getServiceValue(index); // This returns value in cents
    return unitValue * quantity;
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
        // Serviços não têm mais valor pré-definido, mantém valor atual ou 0
        // Não altera o valor automaticamente
      }
    } else {
      // Limpar valor quando nenhum serviço está selecionado
      serviceForm.get('unit_value')?.setValue(null);
    }
  }

  toggleNewClientForm(): void {
    this.showNewClientForm = !this.showNewClientForm;
    if (!this.showNewClientForm) {
      this.newClientForm.reset();
    }
  }

  createNewClient(): void {
    if (this.newClientForm.invalid) {
      this.toastr.error('Preencha os campos obrigatórios do novo cliente');
      return;
    }

    const formValue = this.newClientForm.value;
    const clientType = formValue.client_type;
    
    // Build client data according to the expected API format
    const clientData: CreateClientRequest = {
      type: clientType === 'pf' ? 'PF' : 'PJ',
      email: formValue.email || '',
      phone: formValue.phone || undefined,
      street: formValue.street || '',
      number: formValue.number || '',
      complement: formValue.complement || undefined,
      neighborhood: formValue.neighborhood || '',
      city: formValue.city || '',
      state: formValue.state || '',
      zipcode: formValue.zipcode || ''
    };

    // Add type-specific fields
    if (clientType === 'pf') {
      clientData.cpf = formValue.document || '';
      clientData.full_name = formValue.name || '';
      clientData.rg = formValue.rg || undefined;
    } else {
      clientData.cnpj = formValue.document || '';
      clientData.company_name = formValue.name || '';
      clientData.trade_name = formValue.trade_name || undefined;
    }
    
    this.clientService.createClient(clientData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.clients.push(response.client);
          this.proposalForm.get('client_id')?.setValue(response.client.id);
          this.showNewClientForm = false;
          this.newClientForm.reset();
          this.toastr.success(response.message || 'Cliente criado com sucesso');
        },
        error: (error) => {
          console.error('Erro ao criar cliente:', error);
          this.toastr.error('Erro ao criar cliente');
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
    
    // Mostrar feedback de salvamento no banco
    const loadingToast = this.toastr.info('Salvando proposta no banco de dados...', 'Processando', {
      disableTimeOut: true,
      closeButton: false
    });
    
    // Obter dados do cliente selecionado
    const clientId = parseInt(this.proposalForm.value.client_id) || 0;
    const selectedClient = this.clients.find(c => c.id === clientId);
    
    if (!selectedClient) {
      this.toastr.error('Cliente selecionado não encontrado');
      this.isSubmitting = false;
      return;
    }

    // Determinar tipo do cliente baseado no documento
    const clientType = this.detectClientType(selectedClient.cpf || selectedClient.cnpj || '');
    
    const formData: CreateProposalData = {
      client_id: clientId,
      proposal_type: 'prestacao_servicos', // Valor padrão
      client_name: selectedClient.full_name || selectedClient.company_name || '',
      client_document: selectedClient.cpf || selectedClient.cnpj || '',
      client_email: selectedClient.email || '',
      client_phone: selectedClient.phone || undefined,
      client_street: selectedClient.street || '',
      client_number: selectedClient.number || '',
      client_complement: selectedClient.complement || undefined,
      client_neighborhood: selectedClient.neighborhood || '',
      client_city: selectedClient.city || '',
      client_state: selectedClient.state || '',
      client_zipcode: selectedClient.zipcode || '',
      end_date: this.proposalForm.value.end_date || null,
      validity_days: 30, // Valor padrão
      services: this.servicesArray.value
        .filter((s: any) => s.service_id)
        .map((s: any) => ({
          service_id: parseInt(s.service_id) || 0,
          quantity: parseInt(s.quantity) || 1,
          unit_value: parseFloat(s.unit_value) || 0 // Already in reais
        }))
    };

    console.log('📤 Dados enviados para backend:', JSON.stringify(formData, null, 2));

    const operation = this.isEditMode 
      ? this.proposalService.updateProposal(this.proposalId!, formData)
      : this.proposalService.createProposal(formData);

    operation.pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        // Limpar toast de loading
        this.toastr.clear();
        
        if (response.success) {
          const successMessage = this.isEditMode ? 'Proposta atualizada com sucesso' : 'Proposta criada com sucesso';
          
          // Sempre mostrar sucesso primeiro
          this.toastr.success(successMessage);
          
          // Se não está editando, redirecionar para a lista
          if (!this.isEditMode) {
            // Redirecionar para a lista de propostas após um delay
            setTimeout(() => {
              if (!this.isModal) {
                this.router.navigate(['/home/proposals']);
              }
            }, 1500);
          }
          
          // Emitir evento de salvamento
          this.onSave.emit(response.data);
          
          // Reset form apenas se é modal e está editando
          if (!this.isModal && this.isEditMode) {
            this.resetForm();
          }
        } else {
          this.toastr.error(response.message || 'Erro ao salvar proposta');
        }
        this.isSubmitting = false;
      },
      error: (error) => {
        // Limpar toast de loading
        this.toastr.clear();
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
    this.proposalForm.get('client_id')?.setValue('');
  }

  cancel(): void {
    if (this.isModal) {
      this.onCancel.emit();
    } else {
      // Se não é modal, redirecionar para a lista de propostas
      this.router.navigate(['/home/proposals']);
    }
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


  getNewClientNamePlaceholder(): string {
    const clientType = this.newClientForm.get('client_type')?.value;
    if (clientType === 'pf') {
      return 'Nome completo da pessoa';
    } else if (clientType === 'pj') {
      return 'Razão social da empresa';
    }
    return 'Nome completo ou razão social';
  }

  getNewClientDocumentPlaceholder(): string {
    const clientType = this.newClientForm.get('client_type')?.value;
    if (clientType === 'pf') {
      return '000.000.000-00';
    } else if (clientType === 'pj') {
      return '00.000.000/0001-00';
    }
    return '000.000.000-00 ou 00.000.000/0001-00';
  }

  isNewClientFieldInvalid(fieldName: string): boolean {
    const field = this.newClientForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  private detectClientType(document: string): 'pf' | 'pj' | '' {
    if (!document) return '';
    
    // Remove all non-numeric characters
    const cleanDocument = document.replace(/\D/g, '');
    
    // CPF has 11 digits, CNPJ has 14 digits
    if (cleanDocument.length === 11) {
      return 'pf';
    } else if (cleanDocument.length === 14) {
      return 'pj';
    }
    
    return '';
  }

}