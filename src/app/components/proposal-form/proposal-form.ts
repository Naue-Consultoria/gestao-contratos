import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { CurrencyMaskDirective } from '../../directives/currency-mask.directive';
import { DocumentMaskDirective } from '../../directives/document-mask.directive';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Subject, takeUntil, forkJoin, BehaviorSubject } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { Router, ActivatedRoute } from '@angular/router';

import { ProposalService, CreateProposalData, Proposal } from '../../services/proposal';
import { ClientService, ApiClient, CreateClientRequest } from '../../services/client';
import { ServiceService, ApiService } from '../../services/service';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';

interface SelectedService {
  service_id: number;
  id: number;
  name: string;
  unit_value: number;
  total_value: number;
  duration: number | null;
  duration_unit: string | null;
  category: string;
  isRecruitment?: boolean;
  recruitmentPercentages?: {
    administrativo_gestao: number;
    comercial: number;
    operacional: number;
    estagio_jovem: number;
  };
}

@Component({
  selector: 'app-proposal-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, CurrencyMaskDirective, DocumentMaskDirective, BreadcrumbComponent],
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
  selectedServices: SelectedService[] = [];
  availableServices: ApiService[] = [];
  showServiceModal = false;
  serviceSearchTerm = '';
  serviceCategoryFilter = '';
  isLoading = false;
  isSubmitting = false;
  isEditMode = false;
  showNewClientForm = false;
  newClientForm!: FormGroup;

  // Observable para valor total reativo
  private totalValue$ = new BehaviorSubject<number>(0);
  updateCounter: number = 0;
  isCreatingClient: boolean = false;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private proposalService: ProposalService,
    private clientService: ClientService,
    private serviceService: ServiceService,
    private toastr: ToastrService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
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

    // Observar mudanças no tipo de cliente para ajustar validações
    this.newClientForm.get('client_type')?.valueChanges.subscribe(value => {
      this.updateDocumentValidation(value);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForms(): void {
    this.proposalForm = this.fb.group({
      client_id: ['', Validators.required],
      type: ['Full', Validators.required],
      end_date: [''],
      observations: [''],
      max_installments: [12, [Validators.required, Validators.min(1), Validators.max(24)]],
      status: ['draft'], // Campo de status adicionado
      solicitante_name: [''],
      solicitante_email: ['', Validators.email],
      solicitante_phone: ['']
    });

    this.newClientForm = this.fb.group({
      client_type: ['', Validators.required],
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      cpf: [''],
      cnpj: [''],
      trade_name: [''] // Apenas para PJ, opcional
    });

    // Não adiciona serviço vazio - agora é via modal
  }

  private loadInitialData(): void {
    this.isLoading = true;
    
    forkJoin({
      clients: this.clientService.getClients({}),
      services: this.serviceService.getServicesForContracts({ is_active: true })
    }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (data) => {
        this.clients = (data.clients.clients || []).sort((a, b) => 
          a.name.toLowerCase().localeCompare(b.name.toLowerCase())
        );
        // Filtrar apenas serviços ativos e ordenar alfabeticamente
        this.services = (data.services.services || [])
          .filter(service => service.is_active)
          .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
        this.availableServices = [...this.services];
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
      type: proposal.type || 'Full',
      end_date: proposal.end_date ? proposal.end_date.split('T')[0] : '',
      observations: proposal.notes || '',
      max_installments: proposal.max_installments ?? 12, // Usar nullish coalescing para preservar valor do BD
      status: proposal.status || 'draft', // Carregar status da proposta
      solicitante_name: proposal.solicitante_name || '',
      solicitante_email: proposal.solicitante_email || '',
      solicitante_phone: proposal.solicitante_phone || ''
    });

    // Carregar serviços da proposta
    this.selectedServices = proposal.services.map(service => {
      const serviceData = this.services.find(s => s.id === service.service_id);
      const selectedService: SelectedService = {
        service_id: service.service_id,
        id: service.service_id,
        name: serviceData?.name || '',
        unit_value: service.unit_value || 0,
        total_value: service.total_value || 0,
        duration: serviceData?.duration_amount || null,
        duration_unit: serviceData?.duration_unit || null,
        category: serviceData?.category || 'Geral'
      };

      // Se é serviço de Recrutamento & Seleção, adicionar campos de porcentagem
      if (serviceData?.category === 'Recrutamento & Seleção') {
        selectedService.isRecruitment = true;
        selectedService.recruitmentPercentages = service.recruitmentPercentages || {
          administrativo_gestao: 100,
          comercial: 100,
          operacional: 100,
          estagio_jovem: 50
        };
      }

      return selectedService;
    }).filter(service => service.id);
    
    // Atualização concluída - serviços carregados
  }

  // Service Modal Methods (igual ao contrato)
  openServiceModal(): void {
    this.showServiceModal = true;
    this.serviceSearchTerm = '';
    this.serviceCategoryFilter = '';
  }

  closeServiceModal(): void {
    this.showServiceModal = false;
    this.serviceSearchTerm = '';
    this.serviceCategoryFilter = '';
  }

  addService(service: ApiService): void {
    const newService: any = {
      service_id: service.id,
      id: service.id, // Para compatibilidade
      name: service.name,
      unit_value: 0,
      total_value: 0,
      duration: service.duration_amount || null,
      duration_unit: service.duration_unit || null,
      category: service.category || 'Geral'
    };

    // Se é serviço de Recrutamento & Seleção, adicionar campos de porcentagem
    if (service.category === 'Recrutamento & Seleção') {
      newService.isRecruitment = true;
      newService.recruitmentPercentages = {
        administrativo_gestao: 100,  // Administrativo/Gestão
        comercial: 100,              // Comercial
        operacional: 100,            // Operacional
        estagio_jovem: 50           // Estágio/Jovem Aprendiz
      };
    }

    this.selectedServices.push(newService);

    // Atualizar valor total
    this.updateTotalValue();

    // Fechar modal após adicionar
    this.closeServiceModal();
  }

  removeService(index: number): void {
    this.selectedServices.splice(index, 1);
    // Atualizar valor total após remover serviço
    this.updateTotalValue();
  }

  get filteredServices(): ApiService[] {
    let services = this.availableServices;

    if (this.serviceCategoryFilter) {
      services = services.filter(s => s.category === this.serviceCategoryFilter);
    }

    if (this.serviceSearchTerm) {
      services = services.filter(s =>
        s.name.toLowerCase().includes(this.serviceSearchTerm.toLowerCase()) ||
        s.category?.toLowerCase().includes(this.serviceSearchTerm.toLowerCase())
      );
    }

    return services.sort((a, b) => 
      a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    );
  }

  get serviceCategories(): string[] {
    const categories = Array.from(new Set(
      this.availableServices
        .map(s => s.category)
        .filter((category): category is string => Boolean(category))
    ));
    return categories.sort();
  }

  onPriceChange(index: number, priceInReais: number): void {
    this.updateServicePrice(index, priceInReais);
  }

  onPriceInput(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const rawValue = input.value;
    
    // Extrai valor numérico do input formatado
    const numericValue = this.extractNumericValue(rawValue);
    this.updateServicePriceImmediate(index, numericValue);
  }

  onPriceKeyup(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const rawValue = input.value;
    
    // Extrai valor numérico do input formatado
    const numericValue = this.extractNumericValue(rawValue);
    this.updateServicePriceImmediate(index, numericValue);
  }

  private updateServicePriceImmediate(index: number, priceInReais: number): void {
    if (index < 0 || index >= this.selectedServices.length) return;
    
    const service = this.selectedServices[index];
    if (priceInReais < 0) {
      priceInReais = 0;
    }
    
    service.unit_value = priceInReais;
    service.total_value = service.unit_value;
    
    // Atualização imediata
    this.updateCounter++;
    this.cdr.detectChanges();
  }

  private extractNumericValue(formattedValue: string): number {
    // Remove formatação de moeda e converte para número
    if (!formattedValue) return 0;
    
    // Remove R$, espaços, pontos de milhar e converte vírgula para ponto
    const cleanValue = formattedValue
      .replace(/[R$\s]/g, '')
      .replace(/\./g, '')
      .replace(',', '.');
    
    const numericValue = parseFloat(cleanValue) || 0;
    return numericValue;
  }

  private updateServicePrice(index: number, priceInReais: number): void {
    if (index < 0 || index >= this.selectedServices.length) return;
    
    const service = this.selectedServices[index];
    if (priceInReais < 0) {
      priceInReais = 0;
    }
    
    service.unit_value = priceInReais;
    service.total_value = service.unit_value;
    
    // Log do valor total antes e depois
    const oldTotal = this.getTotalValue();
    
    // Força múltiplas atualizações
    this.updateTotalValue();
    
    // Log do novo total
    const newTotal = this.getTotalValue();
  }

  private updateTotalValue(): void {   
    // Calcular novo total
    const newTotal = this.calculateTotal();
    this.updateCounter++;
    
    // Atualizar observable
    this.totalValue$.next(newTotal);
    
    // Forçar detecção de mudanças
    this.cdr.detectChanges();
    this.cdr.markForCheck();
    
    // Backup async update
    setTimeout(() => {
      this.cdr.detectChanges();
    }, 0);
  }

  private calculateTotal(): number {
    return this.selectedServices.reduce((sum, service) => {
      const serviceValue = parseFloat(service.unit_value?.toString()) || 0;
      return sum + serviceValue;
    }, 0);
  }

  getTotalValue(): number {
    const total = this.selectedServices.reduce((sum, service) => {
      const serviceValue = parseFloat(service.unit_value?.toString()) || 0;
      return sum + serviceValue;
    }, 0);
    
    return total;
  }

  getTotalValueFormatted(): string {
    const total = this.getTotalValue();
    const formatted = this.formatCurrency(total);
    return formatted;
  }

  formatCurrency(value: number): string {
    return this.proposalService.formatCurrency(value);
  }

  // Debug method
  debugComponent(): void {
  }

  toggleNewClientForm(): void {
    this.showNewClientForm = !this.showNewClientForm;
    if (!this.showNewClientForm) {
      this.newClientForm.reset();
    }
  }

  createNewClient(): void {
    // Prevenir múltiplos cliques/submissions
    if (this.isCreatingClient) {
      this.toastr.warning('Aguarde... Cliente sendo criado.');
      return;
    }

    if (this.newClientForm.invalid) {
      this.toastr.error('Preencha os campos obrigatórios do novo cliente');
      this.markNewClientFormGroupTouched();
      return;
    }

    this.isCreatingClient = true;
    const formValue = this.newClientForm.value;
    const clientType = formValue.client_type;
    
    
    // Build comprehensive client data with ALL potentially required fields
    const clientData: CreateClientRequest = {
      type: clientType === 'pf' ? 'PF' : 'PJ',
      // Endereço - campos obrigatórios conforme schema
      street: 'Rua temporária',
      number: '123',
      complement: '', // pode ser null conforme schema
      neighborhood: 'Centro',
      city: 'São Paulo',
      state: 'SP',
      zipcode: '01310100',
      phone: '' // pode ser null conforme schema
    };

    // Configurar email e campos específicos por tipo
    if (clientType === 'pf') {
      // Pessoa Física - usa email único
      clientData.email = formValue.email || '';
      clientData.cpf = formValue.cpf?.replace(/\D/g, '') || '00000000000'; // Remove formatação do CPF
      clientData.full_name = formValue.name || '';
    } else {
      // Pessoa Jurídica - pode usar array de emails
      clientData.email = formValue.email || ''; // Tentar email único também
      clientData.emails = [formValue.email || '']; // E array de emails
      clientData.cnpj = formValue.cnpj?.replace(/\D/g, '') || '00000000000000'; // Remove formatação do CNPJ
      clientData.company_name = formValue.name || '';
      clientData.trade_name = formValue.trade_name || '';
      
      // Campos específicos PJ que podem ser obrigatórios
      clientData.legal_representative = 'A definir';
      clientData.employee_count = 1;
      clientData.business_segment = 'A definir';
    }
    
    console.log('🆕 Client data being sent:', JSON.stringify(clientData, null, 2));
    console.log('📧 Email configuration:', {
      clientType,
      email: clientData.email,
      emails: clientData.emails,
      formEmail: formValue.email
    });
    
    this.clientService.createClient(clientData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.clients.push(response.client);
          this.proposalForm.get('client_id')?.setValue(response.client.id);
          this.showNewClientForm = false;
          this.newClientForm.reset();
          this.isCreatingClient = false;
          this.toastr.success('Cliente criado com sucesso! Complete as informações depois editando o cliente.');
        },
        error: (error) => {
          console.error('❌ Error creating client:', error);
          console.error('📋 Complete error details:', {
            status: error.status,
            statusText: error.statusText,
            message: error?.error?.message,
            details: error?.error?.details,
            validationErrors: error?.error?.errors,
            fullError: error?.error,
            requestPayload: clientData
          });
          
          // Log específico do erro para debug
          if (error?.error?.message) {
            console.error('🚨 Server error message:', error.error.message);
          }
          
          // Tratamento específico por tipo de erro
          if (error.status === 429) {
            this.isCreatingClient = false;
            this.toastr.error('Muitas tentativas. Aguarde alguns segundos antes de tentar novamente.', 'Limite de Tentativas');
          } else if (error.status === 400) {
            this.tryAlternativeClientCreation(formValue, clientType);
          } else if (error.status === 500) {
            this.trySimplifiedClientCreation(formValue, clientType);
          } else {
            this.isCreatingClient = false;
            this.handleClientCreationError(error);
          }
        }
      });
  }

  private tryAlternativeClientCreation(formValue: any, clientType: string): void {
    console.log('🎯 Trying alternative strategies for 400 error...');
    
    // Strategy 1: Try with minimal required fields only
    const minimalData: CreateClientRequest = {
      type: clientType === 'pf' ? 'PF' : 'PJ',
      street: 'A definir',
      number: '0',
      neighborhood: 'A definir',
      city: 'A definir',
      state: 'SP',
      zipcode: '00000000'
    };

    if (clientType === 'pf') {
      minimalData.email = formValue.email || '';
      minimalData.cpf = formValue.cpf?.replace(/\D/g, '') || '00000000000';
      minimalData.full_name = formValue.name || '';
    } else {
      // Try only with email field (not emails array) for PJ
      minimalData.email = formValue.email || '';
      minimalData.cnpj = formValue.cnpj?.replace(/\D/g, '') || '00000000000000';
      minimalData.company_name = formValue.name || '';
      minimalData.trade_name = formValue.trade_name || '';
      minimalData.legal_representative = 'A definir';
      minimalData.employee_count = 1;
      minimalData.business_segment = 'A definir';
    }


    this.clientService.createClient(minimalData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.clients.push(response.client);
          this.proposalForm.get('client_id')?.setValue(response.client.id);
          this.showNewClientForm = false;
          this.newClientForm.reset();
          this.isCreatingClient = false;
          this.toastr.success('Cliente criado com sucesso! Complete as informações obrigatórias depois editando o cliente.');
        },
        error: (error) => {
          console.error('❌ Alternative strategy 1 failed:', error);
          console.log('🔄 Trying alternative strategy 2 - emails array for PJ...');
          this.tryEmailsArrayStrategy(formValue, clientType);
        }
      });
  }

  private tryEmailsArrayStrategy(formValue: any, clientType: string): void {
    if (clientType !== 'pj') {
      // If not PJ, fallback to simplified creation
      this.trySimplifiedClientCreation(formValue, clientType);
      return;
    }

    // Strategy 2: For PJ, try with emails array instead of email field
    const emailsArrayData: CreateClientRequest = {
      type: 'PJ',
      street: 'A definir',
      number: '0', 
      neighborhood: 'A definir',
      city: 'A definir',
      state: 'SP',
      zipcode: '00000000',
      // Use emails array, NOT email field for PJ
      emails: [formValue.email || ''],
      cnpj: formValue.cnpj?.replace(/\D/g, '') || '00000000000000',
      company_name: formValue.name || '',
      trade_name: formValue.trade_name || '',
      legal_representative: 'A definir',
      employee_count: 1,
      business_segment: 'A definir'
    };

    // Explicitly remove email field
    delete (emailsArrayData as any).email;


    this.clientService.createClient(emailsArrayData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.clients.push(response.client);
          this.proposalForm.get('client_id')?.setValue(response.client.id);
          this.showNewClientForm = false;
          this.newClientForm.reset();
          this.isCreatingClient = false;
          this.toastr.success('Cliente criado com sucesso! Complete as informações obrigatórias depois editando o cliente.');
        },
        error: (error) => {
          console.error('❌ Alternative strategy 2 also failed:', error);
          console.log('🔄 Falling back to simplified strategy...');
          this.trySimplifiedClientCreation(formValue, clientType);
        }
      });
  }

  private trySimplifiedClientCreation(formValue: any, clientType: string): void {
    // Payload mais simples sem dados temporários complexos
    const simplifiedData: CreateClientRequest = {
      type: clientType === 'pf' ? 'PF' : 'PJ',
      phone: '',
      street: 'Não informado',
      number: '0',
      neighborhood: 'Não informado',
      city: 'Não informado',
      state: 'SP',
      zipcode: '00000000'
    };

    // Configurar email de acordo com o tipo (mesma lógica)
    if (clientType === 'pj') {
      simplifiedData.emails = [formValue.email || ''];
    } else {
      simplifiedData.email = formValue.email || '';
    }

    if (clientType === 'pf') {
      simplifiedData.cpf = formValue.cpf?.replace(/\D/g, '') || '00000000000'; // CPF com zeros para editar depois
      simplifiedData.full_name = formValue.name || '';
    } else {
      simplifiedData.cnpj = formValue.cnpj?.replace(/\D/g, '') || '00000000000000'; // CNPJ com zeros para editar depois
      simplifiedData.company_name = formValue.name || '';
      simplifiedData.trade_name = formValue.trade_name || '';
      // Campos adicionais mínimos para PJ
      simplifiedData.legal_representative = 'A definir';
      simplifiedData.employee_count = 1;
      simplifiedData.business_segment = 'Outros';
    }

    console.log('🔄 Trying simplified payload:', simplifiedData);
    console.log('📧 Simplified email setup:', {
      clientType,
      email: simplifiedData.email,
      emails: simplifiedData.emails,
      formEmail: formValue.email
    });

    this.clientService.createClient(simplifiedData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.clients.push(response.client);
          this.proposalForm.get('client_id')?.setValue(response.client.id);
          this.showNewClientForm = false;
          this.newClientForm.reset();
          this.isCreatingClient = false;
          this.toastr.success('Cliente criado com sucesso! Complete as informações obrigatórias depois editando o cliente.');
        },
        error: (error) => {
          console.error('❌ Simplified creation also failed:', error);
          this.isCreatingClient = false;
          this.handleClientCreationError(error);
        }
      });
  }

  private handleClientCreationError(error: any): void {
    let errorMessage = 'Erro ao criar cliente após todas as tentativas';
    let errorTitle = 'Erro ao criar cliente';
    
    // Log detalhado final para debug
    console.error('🚨 FINAL ERROR after all strategies failed:', {
      status: error.status,
      message: error?.error?.message,
      details: error?.error?.details,
      validationErrors: error?.error?.errors,
      fullError: error?.error
    });
    
    if (error.status === 429) {
      errorMessage = 'Muitas tentativas. Aguarde alguns segundos antes de tentar novamente.';
      errorTitle = 'Limite de Tentativas Excedido';
    } else if (error?.error?.message) {
      errorMessage = `${error.error.message}. Verifique se todos os campos obrigatórios estão preenchidos.`;
    } else if (error?.error?.errors) {
      // Se tiver erros de validação específicos
      const validationErrors = error.error.errors;
      const errorMessages = Object.keys(validationErrors).map(key => 
        `${key}: ${validationErrors[key]}`
      );
      errorMessage = `Erro de validação: ${errorMessages.join(', ')}`;
      errorTitle = 'Erro de Validação';
    } else if (error?.error?.details) {
      errorMessage = `${error.error.details}. Entre em contato com o suporte se o problema persistir.`;
    } else if (error.status === 500) {
      errorMessage = 'Erro interno do servidor. Tente novamente ou contate o suporte.';
      errorTitle = 'Erro do Servidor';
    } else if (error.status === 400) {
      errorMessage = 'Dados inválidos ou campos obrigatórios faltando. Entre em contato com o suporte para verificar a configuração.';
      errorTitle = 'Dados Inválidos';
    } else {
      errorMessage = `Erro desconhecido (${error.status}). Entre em contato com o suporte.`;
      errorTitle = 'Erro Desconhecido';
    }
    
    this.toastr.error(errorMessage, errorTitle, {
      timeOut: 10000, // Mais tempo para ler a mensagem
      closeButton: true
    });
  }

  private markNewClientFormGroupTouched(): void {
    Object.keys(this.newClientForm.controls).forEach(key => {
      const control = this.newClientForm.get(key);
      control?.markAsTouched();
    });
  }

  onSubmit(): void {
    
    if (this.proposalForm.invalid) {
      this.markFormGroupTouched(this.proposalForm);
      this.toastr.error('Preencha todos os campos obrigatórios');
      return;
    }

    // Validar se há pelo menos um serviço
    if (this.selectedServices.length === 0) {
      this.toastr.error('Adicione pelo menos um serviço');
      return;
    }

    // Validar se todos os serviços têm valor (exceto Recrutamento & Seleção)
    const invalidServices = this.selectedServices.filter(service =>
      !service.isRecruitment && (!service.unit_value || service.unit_value <= 0)
    );

    if (invalidServices.length > 0) {
      this.toastr.error('Todos os serviços devem ter um valor válido');
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
    const clientType = selectedClient.cpf ? 'pf' : 'pj';
    
    const formData: CreateProposalData = {
      client_id: clientId,
      type: this.proposalForm.value.type || 'Full',
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
      solicitante_name: this.proposalForm.value.solicitante_name || undefined,
      solicitante_email: this.proposalForm.value.solicitante_email || undefined,
      solicitante_phone: this.proposalForm.value.solicitante_phone || undefined,
      end_date: this.proposalForm.value.end_date || null,
      max_installments: this.proposalForm.value.max_installments || 12,
      validity_days: 30, // Valor padrão
      services: this.selectedServices.map(service => ({
        service_id: service.id,
        unit_value: service.unit_value || 0,
        recruitmentPercentages: service.recruitmentPercentages
      }))
    };

    // Adicionar status apenas quando estiver em modo de edição
    if (this.isEditMode && this.proposalForm.value.status) {
      (formData as any).status = this.proposalForm.value.status;
    }


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
                this.router.navigate(['/home/propostas']);
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
    this.selectedServices = [];
    this.proposalForm.patchValue({
      type: 'Full',
      client_id: ''
    });
  }

  cancel(): void {
    if (this.isModal) {
      this.onCancel.emit();
    } else {
      // Se não é modal, redirecionar para a lista de propostas
      this.router.navigate(['/home/propostas']);
    }
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.proposalForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }



  getNewClientNamePlaceholder(): string {
    const clientType = this.newClientForm.get('client_type')?.value;
    if (clientType === 'pf') {
      return 'Ex: João da Silva Santos';
    } else if (clientType === 'pj') {
      return 'Ex: Empresa LTDA';
    }
    return 'Nome completo ou razão social';
  }

  getNewClientNameLabel(): string {
    const clientType = this.newClientForm.get('client_type')?.value;
    if (clientType === 'pf') {
      return 'Nome completo';
    } else if (clientType === 'pj') {
      return 'Razão social';
    }
    return 'Nome';
  }

  cancelNewClient(): void {
    this.showNewClientForm = false;
    this.newClientForm.reset();
    this.isCreatingClient = false; // Reset do flag de criação
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

  private updateDocumentValidation(clientType: string): void {
    const cpfControl = this.newClientForm.get('cpf');
    const cnpjControl = this.newClientForm.get('cnpj');

    // Reset validators
    cpfControl?.clearValidators();
    cnpjControl?.clearValidators();

    if (clientType === 'pf') {
      // CPF é obrigatório para PF
      cpfControl?.setValidators([Validators.required]);
    } else if (clientType === 'pj') {
      // CNPJ é obrigatório para PJ
      cnpjControl?.setValidators([Validators.required]);
    }

    // Update validity
    cpfControl?.updateValueAndValidity();
    cnpjControl?.updateValueAndValidity();
  }


}