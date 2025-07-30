import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { Subject, takeUntil } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface PublicProposal {
  id: number;
  title: string;
  description?: string;
  total_value: number;
  valid_until?: string;
  observations?: string;
  sent_at?: string;
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  client_document?: string;
  signature_data?: string;
  signed_at?: string;
  accepted_value?: number;
  client_observations?: string;
  company: {
    id: number;
    name: string;
    headquarters?: string;
    market_sector?: string;
    description?: string;
  };
  services: PublicProposalService[];
}

export interface PublicProposalService {
  id: number;
  service_id: number;
  quantity: number;
  custom_value?: number;
  selected_by_client?: boolean;
  client_notes?: string;
  service: {
    id: number;
    name: string;
    value: number;
    duration_amount?: number;
    duration_unit?: string;
    category: string;
    description?: string;
  };
}

@Component({
  selector: 'app-public-proposal-view',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './public-proposal-view.html',
  styleUrls: ['./public-proposal-view.css']
})
export class PublicProposalViewComponent implements OnInit, OnDestroy {
  proposal: PublicProposal | null = null;
  isLoading = true;
  error: string | null = null;
  token: string = '';
  
  // Estados do processo
  currentStep: 'view' | 'services' | 'signature' | 'completed' = 'view';
  selectedServices: { [key: number]: boolean } = {};
  serviceNotes: { [key: number]: string } = {};
  
  // Forms
  signatureForm!: FormGroup;
  
  // Signature pad
  signaturePad: any = null;
  signatureImage: string = '';
  
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private toastr: ToastrService,
    private http: HttpClient
  ) {
    this.initializeForms();
  }

  ngOnInit(): void {
    this.token = this.route.snapshot.params['token'];
    if (!this.token) {
      this.error = 'Token inválido';
      this.isLoading = false;
      return;
    }

    this.loadProposal();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForms(): void {
    this.signatureForm = this.fb.group({
      client_name: ['', [Validators.required, Validators.minLength(2)]],
      client_email: ['', [Validators.required, Validators.email]],
      client_phone: [''],
      client_document: [''],
      client_observations: ['']
    });
  }

  private loadProposal(): void {
    this.isLoading = true;
    
    this.http.get<any>(`${environment.apiUrl}/public/proposals/${this.token}`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.proposal = response.data;
            this.initializeServiceSelection();
            this.populateClientData();
          } else {
            this.error = response.message || 'Erro ao carregar proposta';
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Erro ao carregar proposta:', error);
          this.error = error.error?.message || 'Proposta não encontrada ou expirada';
          this.isLoading = false;
        }
      });
  }

  private initializeServiceSelection(): void {
    if (!this.proposal) return;
    
    this.proposal.services.forEach(service => {
      // Inicializar como selecionado se já foi selecionado antes
      this.selectedServices[service.service_id] = service.selected_by_client || false;
      this.serviceNotes[service.service_id] = service.client_notes || '';
    });
  }

  private populateClientData(): void {
    if (!this.proposal) return;
    
    if (this.proposal.client_name) {
      this.signatureForm.patchValue({
        client_name: this.proposal.client_name,
        client_email: this.proposal.client_email,
        client_phone: this.proposal.client_phone,
        client_document: this.proposal.client_document,
        client_observations: this.proposal.client_observations
      });
    }
  }

  getServiceValue(service: PublicProposalService): number {
    return service.custom_value || service.service.value;
  }

  getServiceTotal(service: PublicProposalService): number {
    return this.getServiceValue(service) * service.quantity;
  }

  getSelectedTotal(): number {
    if (!this.proposal) return 0;
    
    return this.proposal.services
      .filter(service => this.selectedServices[service.service_id])
      .reduce((total, service) => total + this.getServiceTotal(service), 0);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    }).format(value / 100);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('pt-BR');
  }

  hasSelectedServices(): boolean {
    return Object.values(this.selectedServices).some(selected => selected);
  }

  proceedToServiceSelection(): void {
    this.currentStep = 'services';
  }

  saveServiceSelection(): void {
    if (!this.proposal || !this.hasSelectedServices()) {
      this.toastr.error('Selecione pelo menos um serviço');
      return;
    }

    const selectedServicesData = this.proposal.services
      .map(service => ({
        service_id: service.service_id,
        selected: this.selectedServices[service.service_id],
        client_notes: this.serviceNotes[service.service_id] || ''
      }))
      .filter(item => item.selected);

    const requestData = {
      selected_services: selectedServicesData,
      client_info: {
        notes: this.signatureForm.get('client_observations')?.value || ''
      }
    };

    this.http.post<any>(`${environment.apiUrl}/public/proposals/${this.token}/services`, requestData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.toastr.success('Seleção de serviços salva com sucesso');
            this.currentStep = 'signature';
          } else {
            this.toastr.error(response.message || 'Erro ao salvar seleção');
          }
        },
        error: (error) => {
          console.error('Erro ao salvar seleção:', error);
          this.toastr.error('Erro ao salvar seleção de serviços');
        }
      });
  }

  proceedToSignature(): void {
    this.saveServiceSelection();
  }

  initializeSignaturePad(): void {
    // Implementar signature pad aqui
    // Por simplicidade, vamos usar um input de texto para simular a assinatura
    this.signatureImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  }

  clearSignature(): void {
    this.signatureImage = '';
  }

  isFormValid(): boolean {
    return this.signatureForm.valid && this.signatureImage !== '' && this.hasSelectedServices();
  }

  signProposal(): void {
    if (!this.isFormValid() || !this.proposal) {
      this.toastr.error('Preencha todos os campos obrigatórios e assine o documento');
      return;
    }

    const formValue = this.signatureForm.value;
    const acceptedValue = this.getSelectedTotal();

    const signatureData = {
      signature_data: this.signatureImage,
      client_name: formValue.client_name,
      client_email: formValue.client_email,
      client_phone: formValue.client_phone || '',
      client_document: formValue.client_document || '',
      client_observations: formValue.client_observations || '',
      accepted_value: acceptedValue
    };

    this.http.post<any>(`${environment.apiUrl}/public/proposals/${this.token}/sign`, signatureData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.toastr.success('Proposta assinada com sucesso!');
            this.currentStep = 'completed';
            this.loadProposal(); // Recarregar para ver o status atualizado
          } else {
            this.toastr.error(response.message || 'Erro ao assinar proposta');
          }
        },
        error: (error) => {
          console.error('Erro ao assinar proposta:', error);
          this.toastr.error('Erro ao assinar proposta');
        }
      });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.signatureForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  backToServices(): void {
    this.currentStep = 'services';
  }

  backToView(): void {
    this.currentStep = 'view';
  }

  // Simulação de signature pad (para demo)
  simulateSignature(): void {
    this.signatureImage = `data:text/plain;base64,${btoa(`Assinatura digital de ${this.signatureForm.get('client_name')?.value} em ${new Date().toISOString()}`)}`;
    this.toastr.info('Assinatura simulada adicionada');
  }

  getSelectedServicesCount(): number {
    return Object.values(this.selectedServices).filter(selected => selected).length;
  }

  printReceipt(): void {
    window.print();
  }

  goHome(): void {
    this.router.navigate(['/']);
  }
}